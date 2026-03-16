import json
from typing import Optional
from loguru import logger
from fastapi import HTTPException
from datetime import datetime


from db import LLMInsight, SessionLocal, UploadedFileMeta, LLMJob
from .llm_service import LLMService


def generate_fixed_insights_job_for_file(
    file_id: int, user_id: int, limit: int = 500
) -> None:
    """Trigger LLM processing to refresh stored insights for a specific uploaded file."""
    LLMService().generate_fixed_insights(file_id=file_id, user_id=user_id, limit=limit)


def get_fixed_insights_result_for_file(
    user_id: int, file_id: Optional[int] = None
) -> dict:
    """Fetch the latest cached fixed insights for the specified user and (optionally) file."""
    database = SessionLocal()
    try:
        uploaded_file_id = file_id
        if uploaded_file_id is None:
            metadata = (
                database.query(UploadedFileMeta)
                .filter(UploadedFileMeta.user_id == user_id)
                .order_by(UploadedFileMeta.uploaded_at.desc())
                .first()
            )
            if not metadata:
                raise HTTPException(status_code=404, detail="No uploaded file for user")
            uploaded_file_id = metadata.id

        record = (
            database.query(LLMInsight)
            .filter(
                LLMInsight.user_id == user_id,
                LLMInsight.uploaded_file_id == uploaded_file_id,
            )
            .order_by(LLMInsight.created_at.desc())
            .first()
        )
        if not record:
            raise HTTPException(status_code=404, detail="Fixed insights not found yet")
        return json.loads(record.insights_json)
    finally:
        database.close()


# Job-oriented API
def create_llm_job(uploaded_file_id: Optional[int], user_id: int) -> int:
    """
    Create a new LLM job with status 'queued' and return job id.
    Rejects redundant requests if a job is already queued/in_progress for this user.
    (Because label is removed, we deduplicate at user level or optionally by uploaded_file_id.)
    """
    db = SessionLocal()
    try:
        existing = (
            db.query(LLMJob)
            .filter(
                LLMJob.user_id == user_id,
                LLMJob.status.in_(["queued", "in_progress"]),
            )
            .order_by(LLMJob.created_at.desc())
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Job already `{existing.status}` for this user (job_id={existing.id})",
            )

        job = LLMJob(
            label=None,
            uploaded_file_id=uploaded_file_id,
            user_id=user_id,
            status="queued",
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        logger.debug(
            f"Created llm job for user_id : {user_id} with status '{job.status}' and jobID '{job.id}'"
        )
        return job.id
    finally:
        db.close()


def process_llm_job(
    job_id: int,
    limit: int = 500,
    order: Optional[str] = None,
    order_direction: str = "asc",
    since: Optional[str] = None,
    until: Optional[str] = None,
) -> None:
    """
    Process a queued job: mark in_progress, run insights generation on the data
    filtered by (limit, order, order_direction, since, until), persist result, mark completed.

    The worker will:
      - Load the job by id
      - Update status -> in_progress
      - Call LLMService.generate_fixed_insights with file_id (if job.uploaded_file_id present)
        or user_id (so the service can pick the latest upload), and pass the filter params
      - Persist the JSON payload into the job.result_json and mark job completed
    """
    db = SessionLocal()
    try:
        job = db.query(LLMJob).filter(LLMJob.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.status not in ("queued", "in_progress"):
            return

        job.status = "in_progress"
        job.updated_at = datetime.utcnow()
        db.commit()

        logger.debug(f"Job with jobID {job.id} updated with status : {job.status}")
        # Run the fixed insights pipeline and attach result
        payload = LLMService().generate_fixed_insights(
            file_id=job.uploaded_file_id,
            user_id=job.user_id,
            limit=limit,
            order=order,
            order_direction=order_direction,
            since=since,
            until=until,
        )

        job.result_json = json.dumps(payload)
        job.status = "completed"
        job.updated_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        job = locals().get("job")
        if job is not None:
            job.status = "failed"
            job.error = str(e)
            job.updated_at = datetime.utcnow()
            db.commit()
        else:
            raise
    finally:
        db.close()


def get_llm_job(job_id: Optional[int], user_id: int) -> dict:
    """
    Return job status and payload if available, scoped to the requesting user.

    Behavior:
    - If job_id is provided: return that job (same behavior as before).
    - If job_id is None: return the most recent *successful* (completed) job for the user.
      If no completed jobs exist for the user, raises HTTPException(404) with message:
      "No LLM inference jobs have been run completely for this user"
    """
    db = SessionLocal()
    try:
        if job_id is None:
            logger.info(
                f"Returning the most recent completed job for userID '{user_id}' that has a 'completed' job"
            )
            job = (
                db.query(LLMJob)
                .filter(
                    LLMJob.user_id == user_id,
                    LLMJob.status == "completed",
                    LLMJob.result_json.isnot(None),  # ensure there's a result
                )
                .order_by(LLMJob.updated_at.desc(), LLMJob.created_at.desc())
                .first()
            )
            if not job:
                raise HTTPException(
                    status_code=404,
                    detail="No LLM inference jobs have been run completely for this user",
                )
        else:
            job = (
                db.query(LLMJob)
                .filter(
                    LLMJob.id == job_id,
                    LLMJob.user_id == user_id,
                )
                .first()
            )
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")

        resp: dict = {"job_id": job.id, "status": job.status}

        if job.status == "completed" and job.result_json:
            try:
                resp["result"] = json.loads(job.result_json)
            except Exception:
                # Fall back to raw string if JSON parsing fails
                resp["result"] = job.result_json

        if job.status == "failed" and job.error:
            resp["error"] = job.error

        return resp
    finally:
        db.close()
