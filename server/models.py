from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: int
    label: str
    filename: str
    original_name: Optional[str]
    uploaded_at: datetime
    rows: int
    columns_count: int
    columns: List[str]
    sample: List[dict]


class QueryResponse(BaseModel):
    label: str
    uploaded_at: datetime
    total_rows: int
    rows_returned: int
    data: List[dict]


class SalesResponse(BaseModel):
    user_id: int
    total_rows: int
    rows_returned: int
    data: List[dict]
    metrics: Dict[str, Any]


class PredictionResult(BaseModel):
    id: Optional[int] = None
    job_id: str
    user_id: str
    prediction_data: Any
    status: str
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PredictionRequest(BaseModel):
    user_id: str
    prediction_type: str
    input_data: Dict[str, Any]
    priority: str = "low"


class PredictionResponse(BaseModel):
    job_id: str
    status: str
    message: str
    prediction_data: Optional[Any] = None


class QuestionRequest(BaseModel):
    question: str
    user_id: int


class QuestionResponse(BaseModel):
    answer: str
    key_points: List[str]
    data_points_referenced: Dict[str, Any]
    cached: bool = False
