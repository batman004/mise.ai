"""Compatibility layer re-exporting service-level functions."""

import json
import os
import uuid
from typing import Optional
from datetime import datetime
from loguru import logger
import httpx
from fastapi import HTTPException
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
import aiosmtplib
import asyncio

from services.upload_service import df_parsing_and_loading, save_uploaded
from services.query_service import query_csv_by_label
from services.insights_service import (
    generate_fixed_insights_job_for_file,
    get_fixed_insights_result_for_file,
)
from models import PredictionRequest, PredictionResponse, PredictionResult


class PredictionController:
    """Controller for handling prediction business logic"""

    def __init__(self):
        self.ml_server_url = os.getenv("ML_SERVER_URL", "http://ml-server:8001")

    async def create_prediction(self, request: PredictionRequest) -> PredictionResponse:
        """
        Create a new prediction request with priority support.
        - High priority: Direct synchronous call to ML server
        - Low priority: Asynchronous queue-based processing via ML server
        """
        try:
            job_id = str(uuid.uuid4())

            if request.priority == "high":
                return await self._handle_high_priority_prediction(request, job_id)
            else:
                return await self._handle_low_priority_prediction(request, job_id)

        except Exception as e:
            logger.error(f"Error creating prediction: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def _handle_high_priority_prediction(
        self, request: PredictionRequest, job_id: str, return_raw_data: bool = False
    ) -> PredictionResponse:
        """Handle high priority prediction with direct ML server call"""
        try:
            if request.prediction_type == "specific":
                endpoint = f"{self.ml_server_url}/predict/quantity"
                params = {"date": request.input_data.get("date")}
            elif request.prediction_type == "general":
                endpoint = f"{self.ml_server_url}/predict/general_info"
                params = request.input_data
            else:
                raise HTTPException(status_code=400, detail="Invalid prediction_type")

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(endpoint, params=params)

                if response.status_code != 200:
                    raise HTTPException(status_code=503, detail="ML server error")

                prediction_data = response.json()

            # Store result in database immediately
            await self._store_prediction_result(
                job_id=job_id,
                user_id=request.user_id,
                prediction_data=prediction_data,
                status="completed",
            )

            if return_raw_data:
                return PredictionResponse(
                    job_id=job_id,
                    status="completed",
                    message="High priority prediction completed",
                    prediction_data=prediction_data,
                )

            return PredictionResponse(
                job_id=job_id,
                status="completed",
                message="High priority prediction completed",
            )

        except httpx.TimeoutException:
            # Store error result
            await self._store_prediction_result(
                job_id=job_id,
                user_id=request.user_id,
                prediction_data={},
                status="failed",
                error_message="ML server timeout",
            )
            raise HTTPException(status_code=504, detail="ML server timeout")
        except HTTPException:
            raise
        except Exception as e:
            # Store error result
            await self._store_prediction_result(
                job_id=job_id,
                user_id=request.user_id,
                prediction_data={},
                status="failed",
                error_message=str(e),
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def _handle_low_priority_prediction(
        self, request: PredictionRequest, job_id: str
    ) -> PredictionResponse:
        """Handle low priority prediction by sending to ML server for queuing"""
        try:
            # Send request to ML server for queuing
            payload = {
                "job_id": job_id,
                "user_id": request.user_id,
                "prediction_type": request.prediction_type,
                "input_data": request.input_data,
                "priority": "low",
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.ml_server_url}/queue-prediction", json=payload
                )

                if response.status_code != 200:
                    raise HTTPException(
                        status_code=503, detail="ML server queuing error"
                    )

            # Store initial job record
            await self._store_prediction_result(
                job_id=job_id,
                user_id=request.user_id,
                prediction_data={},
                status="queued",
            )

            return PredictionResponse(
                job_id=job_id,
                status="queued",
                message="Low priority prediction queued successfully",
            )

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="ML server timeout")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error handling low priority prediction: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def get_prediction_result(self, job_id: str) -> PredictionResult:
        """Get the result of a prediction request by job ID"""
        try:
            from db import get_db_connection

            conn = get_db_connection()
            if not conn:
                raise HTTPException(status_code=503, detail="Database unavailable")

            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM prediction_results WHERE job_id = %s", (job_id,)
            )

            result = cursor.fetchone()
            cursor.close()
            conn.close()

            if not result:
                raise HTTPException(
                    status_code=404, detail="Prediction result not found"
                )

            # Handle prediction_data - it might be a string, list, or dict
            prediction_data = result[3]
            if isinstance(prediction_data, str):
                try:
                    prediction_data = json.loads(prediction_data)
                except (json.JSONDecodeError, TypeError):
                    prediction_data = {}
            elif isinstance(prediction_data, (list, dict)):
                # Already parsed, use as is
                pass
            else:
                prediction_data = {}

            return PredictionResult(
                id=result[0],
                job_id=result[1],
                user_id=result[2],
                prediction_data=prediction_data,
                status=result[4],
                error_message=result[5],
                created_at=result[6],
                updated_at=result[7],
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting prediction result: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def get_user_predictions(
        self, user_id: str, limit: int = 50, offset: int = 0
    ) -> list[PredictionResult]:
        """Get all prediction results for a specific user"""
        try:
            from db import get_db_connection

            conn = get_db_connection()
            if not conn:
                raise HTTPException(status_code=503, detail="Database unavailable")

            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM prediction_results
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                (user_id, limit, offset),
            )

            results = cursor.fetchall()
            cursor.close()
            conn.close()

            predictions = []
            for result in results:
                # Handle prediction_data - it might be a string, list, or dict
                prediction_data = result[3]
                if isinstance(prediction_data, str):
                    try:
                        prediction_data = json.loads(prediction_data)
                    except (json.JSONDecodeError, TypeError):
                        prediction_data = {}
                elif isinstance(prediction_data, (list, dict)):
                    # Already parsed, use as is
                    pass
                else:
                    prediction_data = {}

                predictions.append(
                    PredictionResult(
                        id=result[0],
                        job_id=result[1],
                        user_id=result[2],
                        prediction_data=prediction_data,
                        status=result[4],
                        error_message=result[5],
                        created_at=result[6],
                        updated_at=result[7],
                    )
                )

            return predictions

        except Exception as e:
            logger.error(f"Error getting user predictions: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def _store_prediction_result(
        self,
        job_id: str,
        user_id: str,
        prediction_data,
        status: str,
        error_message: str = None,
    ) -> bool:
        """Store prediction result in database"""
        try:
            from db import get_db_connection

            conn = get_db_connection()
            if not conn:
                return False

            cursor = conn.cursor()

            # Handle different prediction_data formats
            if isinstance(prediction_data, list):
                # Handle list of prediction items (like the sample data)
                logger.debug(
                    f"Storing list of {len(prediction_data)} prediction items for job {job_id}"
                )
                serialized_data = json.dumps(prediction_data)
            elif isinstance(prediction_data, dict):
                # Handle dictionary format
                logger.debug(f"Storing dictionary prediction data for job {job_id}")
                serialized_data = json.dumps(prediction_data)
            elif isinstance(prediction_data, str):
                # Handle already serialized string
                logger.debug(f"Storing string prediction data for job {job_id}")
                serialized_data = prediction_data
            else:
                # Handle other types by converting to string
                logger.debug(
                    f"Storing {type(prediction_data)} prediction data for job {job_id}"
                )
                serialized_data = json.dumps(prediction_data)

            # Insert or update prediction result
            query = """
                INSERT INTO prediction_results (
                    job_id, user_id, prediction_data, status, error_message, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (job_id)
                DO UPDATE SET
                    prediction_data = EXCLUDED.prediction_data,
                    status = EXCLUDED.status,
                    error_message = EXCLUDED.error_message,
                    updated_at = NOW()
            """

            cursor.execute(
                query, (job_id, user_id, serialized_data, status, error_message)
            )

            conn.commit()
            cursor.close()
            conn.close()

            logger.info(
                f"Stored prediction result for job {job_id} with status {status}"
            )
            return True

        except Exception as e:
            logger.error(f"Database error storing prediction result: {e}")
            if conn:
                conn.rollback()
                conn.close()
            return False


prediction_controller = PredictionController()


async def create_fixed_insights_controller(
    user_id: int,
    file_id: Optional[int] = None,
    limit: int = 50,
    order: Optional[str] = None,
    order_direction: str = "asc",
    since: Optional[str] = None,
    until: Optional[str] = None,
) -> dict:
    """
    Controller function to create a fixed insights job.
    Fetches data from database, filters it, and queues it for LLM processing.
    """
    from services.insights_service import create_llm_job
    from db import SessionLocal, LLMJob, UploadedFileMeta, KitchenLogRow

    # Create job record
    job_id = create_llm_job(uploaded_file_id=file_id, user_id=user_id)

    try:
        # Fetch data from database
        db = SessionLocal()
        uploaded_file_id = file_id
        label = None

        # Get uploaded file metadata
        if file_id is not None:
            meta = (
                db.query(UploadedFileMeta)
                .filter(UploadedFileMeta.id == file_id)
                .first()
            )
            if not meta:
                raise HTTPException(status_code=404, detail="File not found")
            label = meta.label or f"file_{meta.id}"
            uploaded_file_id = meta.id
        else:
            # Find latest uploaded file for the user
            q = db.query(UploadedFileMeta)
            q = q.filter(UploadedFileMeta.user_id == user_id)
            meta = q.order_by(UploadedFileMeta.uploaded_at.desc()).first()
            if not meta:
                raise HTTPException(status_code=404, detail="No uploaded file for user")
            label = meta.label or f"file_{meta.id}"
            uploaded_file_id = meta.id

        # Fetch rows from database with filters
        qrows = db.query(KitchenLogRow).filter(
            KitchenLogRow.uploaded_file_id == uploaded_file_id
        )
        qrows = qrows.filter(KitchenLogRow.user_id == user_id)

        # Apply date filters
        if since:
            try:
                since_dt = datetime.fromisoformat(since)
                qrows = qrows.filter(KitchenLogRow.uploaded_at >= since_dt)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid 'since' datetime")

        if until:
            try:
                until_dt = datetime.fromisoformat(until)
                qrows = qrows.filter(KitchenLogRow.uploaded_at <= until_dt)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid 'until' datetime")

        # Handle ordering
        if order == "uploaded_at":
            if order_direction == "asc":
                qrows = qrows.order_by(KitchenLogRow.uploaded_at.asc())
            else:
                qrows = qrows.order_by(KitchenLogRow.uploaded_at.desc())
            rows = qrows.limit(limit).all()
        else:
            # Fetch more rows for in-memory sorting
            cap = max(limit, 100)
            rows = qrows.limit(cap).all()

            if order:
                reverse = order_direction == "desc"

                def sort_key(r):
                    try:
                        val = r.row_data.get(order)
                        return (0, val) if val is not None else (1, None)
                    except Exception:
                        return (1, None)

                rows_sorted = sorted(rows, key=sort_key, reverse=reverse)
            else:
                rows_sorted = rows

            rows = rows_sorted[:limit]

        # Extract row data
        rows_data = [r.row_data for r in rows]
        db.close()

        if not rows_data:
            raise HTTPException(status_code=404, detail="No data available")

        # Push to LLM queue on ML server with the actual data
        ml_server_url = os.getenv("ML_SERVER_URL", "http://ml-server:8001")

        async with httpx.AsyncClient(timeout=60.0) as client:
            url = f"{ml_server_url}/queue-llm"
            logger.info(f"Attempting to POST to ML server: {url}")
            logger.info(
                f"Payload size: {len(str(rows_data))} bytes, rows: {len(rows_data)}"
            )

            response = await client.post(
                url,
                json={
                    "job_id": job_id,
                    "user_id": user_id,
                    "label": label,
                    "rows_data": rows_data,
                },
            )

            logger.info(f"ML server response status: {response.status_code}")

            if response.status_code != 200:
                error_detail = response.text if response.text else "Unknown error"
                logger.error(f"ML server error response: {error_detail}")
                raise HTTPException(
                    status_code=503, detail=f"ML server queuing error: {error_detail}"
                )

            return {"job_id": job_id, "status": "queued"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error queuing LLM request: {e}")
        # Update job status to failed
        from db import SessionLocal, LLMJob

        db = SessionLocal()
        try:
            job = db.query(LLMJob).filter(LLMJob.id == job_id).first()
            if job:
                job.status = "failed"
                job.error = str(e)
                job.updated_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()
        raise HTTPException(status_code=500, detail=str(e))


class ReportController:
    """Controller for handling report generation"""

    def __init__(self):
        self.report_service = None
        self._initialize_report_service()

    def _initialize_report_service(self):
        """Lazy initialization of report service"""
        try:
            from services.report_service import report_service

            self.report_service = report_service
        except Exception as e:
            logger.error(f"Error initializing report service: {e}")
            self.report_service = None

    async def generate_report(self, user_id: int, email: str) -> dict:
        """
        Generate PDF report and send via email.

        This method triggers a background job that:
        1. Fetches all insights and sales data from DB
        2. Generates charts and analysis
        3. Creates a PDF report
        4. Sends email with report attachment
        """
        try:
            if not self.report_service:
                raise HTTPException(
                    status_code=500, detail="Report service not available"
                )

            # Run in background
            asyncio.create_task(self._generate_report_async(user_id, email))

            return {
                "status": "queued",
                "message": "Report generation started. You will receive an email when it's ready.",
                "user_id": user_id,
                "email": email,
            }

        except Exception as e:
            logger.error(f"Error queuing report generation: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    async def _generate_report_async(self, user_id: int, email: str):
        """Background task to generate and send report"""
        try:
            logger.info(f"Starting report generation for user {user_id}")

            # Generate report
            filepath, pdf_bytes = self.report_service.generate_report(user_id, email)

            # Send email with attachment
            await self._send_email_with_report(email, filepath)

            logger.info(f"Report generated and sent to {email}")

        except Exception as e:
            logger.error(f"Error in async report generation: {e}")

    async def _send_email_with_report(self, email: str, filepath: str):
        """Send email with PDF report attachment via Brevo SMTP (STARTTLS)"""
        try:
            # Brevo SMTP configuration (set via environment)
            smtp_server = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
            smtp_port = int(os.getenv("SMTP_PORT", "587"))
            smtp_user = os.getenv("BREVO_EMAIL_USER")
            smtp_password = os.getenv("BREVO_SMTP_KEY")
            sender_email = os.getenv("SENDER_EMAIL")

            if not smtp_user or not smtp_password:
                logger.warning("SMTP credentials not configured. Skipping email send.")
                return

            from_addr = sender_email or smtp_user

            subject = "Mise AI - Restaurant Analytics Report"
            body_text = (
                "Dear User,\n\n"
                "Please find your comprehensive restaurant analytics report attached.\n\n"
                "This report includes:\n"
                "- Executive summary\n"
                "- Key metrics\n"
                "- Monthly sales overview\n"
                "- Wastage analysis by weather condition\n"
                "- Recommended vs actual sales comparison\n"
                "- AI-generated recommendations\n\n"
                "Best regards,\n"
                "Mise AI Team\n"
            )

            # Compose message
            msg = EmailMessage()
            msg["From"] = from_addr
            msg["To"] = email
            msg["Subject"] = subject
            msg["Date"] = formatdate(localtime=True)
            try:
                domain = from_addr.split("@", 1)[1]
                msg["Message-Id"] = make_msgid(domain=domain)
            except Exception:
                msg["Message-Id"] = make_msgid()

            reply_to = os.getenv("REPLY_TO_EMAIL")
            if reply_to:
                msg["Reply-To"] = reply_to

            msg.set_content(body_text)

            filename = os.path.basename(filepath)
            with open(filepath, "rb") as f:
                data = f.read()
            msg.add_attachment(
                data,
                maintype="application",
                subtype="pdf",
                filename=filename,
            )

            await aiosmtplib.send(
                msg,
                hostname=smtp_server,
                port=smtp_port,
                username=smtp_user,
                password=smtp_password,
            )

            logger.info(f"Email sent to {email}")
        except Exception as e:
            logger.error(f"Error sending email: {e}")


report_controller = ReportController()


__all__ = [
    "df_parsing_and_loading",
    "save_uploaded",
    "query_csv_by_label",
    "generate_fixed_insights_job_for_file",
    "get_fixed_insights_result_for_file",
    "prediction_controller",
    "report_controller",
    "create_fixed_insights_controller",
]
