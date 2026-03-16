from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    Query,
    HTTPException,
    Path,
)
from typing import Optional
import uuid
from loguru import logger

from models import (
    UploadResponse,
    SalesResponse,
    PredictionRequest,
    PredictionResponse,
    PredictionResult,
    QuestionRequest,
    QuestionResponse,
)
from fastapi.responses import JSONResponse
from services.upload_service import save_uploaded
from services.query_service import get_sales_data_for_user
from services.insights_service import get_llm_job
from services.question_service import question_service
from exceptions import DuplicateUploadError
from controllers import (
    prediction_controller,
    create_fixed_insights_controller,
    report_controller,
)

router = APIRouter()


@router.post("/data/upload", response_model=UploadResponse, tags=["data"])
async def upload_endpoint(
    file: UploadFile = File(...),
    label: Optional[str] = Form(""),
    notes: Optional[str] = Form(None),
    user_id: int = Form(...),
):
    """
    Upload a CSV and assign it a label for tracking.
    Form fields:
      - file: CSV file
      - label: string label to identify this dataset
      - notes: optional notes
    """
    try:
        result = save_uploaded(file, label, notes, user_id=user_id)
        return UploadResponse(**result)
    except DuplicateUploadError as e:
        return JSONResponse(status_code=409, content={"detail": str(e)})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/llm/fixed-insights/{user_id}", tags=["llm"])
async def create_fixed_insights_job(
    user_id: int = Path(..., description="User ID"),
    file_id: Optional[int] = Query(
        None,
        description="Optional uploaded_file_id to analyze (if omitted, latest upload for user is used)",
    ),
    limit: int = Query(
        50,
        ge=1,
        le=100,
        description="Max number of rows to include when building the prompt",
    ),
    order: Optional[str] = Query(
        None,
        description="Column name to sort by (use 'uploaded_at' to sort by row timestamp)",
    ),
    order_direction: str = Query(
        "asc", pattern="^(asc|desc)$", description="Sort direction: 'asc' or 'desc'"
    ),
    since: Optional[str] = Query(
        None, description="ISO datetime start filter (inclusive)"
    ),
    until: Optional[str] = Query(
        None, description="ISO datetime end filter (inclusive)"
    ),
):
    """
    Create a job to generate fixed LLM insights for a user's uploaded file.
    You may optionally provide `file_id` (uploaded_file_id). If omitted, the worker will pick the latest upload for the user.
    Filtering query parameters (limit, order, order_direction, since, until) control which rows are used for inference.
    Returns a job_id immediately.
    """
    return await create_fixed_insights_controller(
        user_id=user_id,
        file_id=file_id,
        limit=limit,
        order=order,
        order_direction=order_direction,
        since=since,
        until=until,
    )


@router.get("/llm/fixed-insights/{user_id}", tags=["llm"])
def get_fixed_insights_job_status(
    user_id: int = Path(..., description="User ID"),
    job_id: Optional[int] = Query(
        None,
        description="Job ID returned from POST (optional; if omitted, returns most recent completed job)",
    ),
):
    """
    Get status/result for a previously created job. If job_id is omitted,
    returns the most recent completed job for the user. If the user has no
    completed LLM jobs, returns a 404 with a clear message.
    """
    result = get_llm_job(job_id, user_id)
    return result


@router.get("/data/sales", response_model=SalesResponse, tags=["data"])
def get_sales_data_endpoint(
    user_id: int = Query(..., description="User ID"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    order: str | None = Query(None, description="Column name to sort by"),
    order_direction: str = Query("asc", pattern="^(asc|desc)$"),
    since: str | None = Query(None, description="ISO datetime start filter"),
    until: str | None = Query(None, description="ISO datetime end filter"),
    with_metrics: bool = Query(False),
):
    from datetime import datetime

    sd = datetime.fromisoformat(since) if since else None
    ed = datetime.fromisoformat(until) if until else None
    payload = get_sales_data_for_user(
        user_id=user_id,
        page=page,
        limit=limit,
        order=order,
        order_direction=order_direction,
        since=sd,
        until=ed,
        with_metrics=with_metrics,
    )
    return payload


@router.post(
    "/prediction/wastage", response_model=PredictionResponse, tags=["predictions"]
)
async def create_prediction(
    date: str = Form(..., description="Date in YYYY-MM-DD format"),
    priority: str = Form("low", description="Priority: 'high' or 'low'"),
    user_id: str = Form("default_user", description="User ID"),
):
    """
    Create a new prediction request with priority support.
    - High priority: Direct synchronous call to ML server
    - Low priority: Asynchronous queue-based processing via ML server
    """
    request = PredictionRequest(
        user_id=user_id,
        prediction_type="specific",
        input_data={"date": date},
        priority=priority,
    )
    return await prediction_controller.create_prediction(request)


@router.get(
    "/prediction/results", response_model=list[PredictionResult], tags=["predictions"]
)
async def get_prediction_results(
    user_id: str = Query(..., description="User ID"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
):
    """
    Returns the paged prediction results for the user.
    """
    try:
        offset = (page - 1) * limit
        predictions = await prediction_controller.get_user_predictions(
            user_id, limit=limit, offset=offset
        )
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/prediction/wastage/immediate",
    response_model=PredictionResponse,
    tags=["predictions"],
)
async def create_prediction_immediate(
    date: str = Form(..., description="Date in YYYY-MM-DD format"),
    user_id: str = Form("default_user", description="User ID"),
):
    """
    Create a new HIGH priority prediction request and immediately return its result as received from ML server.
    """
    request = PredictionRequest(
        user_id=user_id,
        prediction_type="specific",
        input_data={"date": date},
        priority="high",
    )

    result = await prediction_controller._handle_high_priority_prediction(
        request, job_id=str(uuid.uuid4()), return_raw_data=True
    )
    return result


@router.post("/llm/question", response_model=QuestionResponse, tags=["llm"])
async def ask_question(request: QuestionRequest):
    """
    Ask a question and get an AI-powered answer based on the user's data.

    The question should be a natural language query about the user's data.
    Examples:
    - "Show me a wastage summary"
    - "Analyze sales trends"
    - "What are my most profitable items?"

    The response will include:
    - A brief paragraph answer
    - Key points extracted from the data
    - Data points referenced

    Results are cached to improve performance for repeated questions.
    """
    try:
        result = await question_service.ask_question(
            question=request.question, user_id=request.user_id
        )
        return QuestionResponse(**result)
    except Exception as e:
        logger.error(f"Error in question endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report/generate", tags=["reports"])
async def generate_report(
    user_id: int = Form(..., description="User ID"),
    email: str = Form(..., description="Email address to send report to"),
):
    """
    Trigger background job to generate a comprehensive PDF report.

    The report will include:
    - Executive summary
    - Key metrics
    - Monthly sales overview chart
    - Wastage by weather condition analysis
    - Recommended vs actual sales comparison
    - AI-generated recommendations

    The report will be generated asynchronously and sent to the provided email address.
    """
    try:
        result = await report_controller.generate_report(user_id, email)
        return result
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))
