from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from pydantic import Field, conint, confloat


# Used for general model predictions
class CategoryWasteEstimageRequest(BaseModel):
    type_of_food: Optional[str] = None
    number_of_guests: Optional[float] = None
    event_type: Optional[str] = None
    quantity_of_food: Optional[float] = None
    storage_condition: Optional[str] = None
    purchase_history: Optional[str] = None
    seasonality: Optional[str] = None
    preparation_method: Optional[str] = None
    geographical_locaiton: Optional[str] = None
    pricing: Optional[float] = None


# Format to upload new rows to the general model
class CSVGENERALROW(BaseModel):
    type_of_food: str = Field(...)
    number_of_guests: conint(ge=0) = Field(...)
    event_type: str = Field(...)
    quantity_of_food: confloat(ge=0) = Field(...)
    storage_conditions: str = Field(...)
    purchase_history: str = Field(...)
    seasonality: str = Field(...)
    preparation_method: str = Field(...)
    geographical_location: str = Field(...)
    pricing: str = Field(..., alias="Pricing")
    wastage_food_amount: confloat(ge=0) = Field(...)


# Format to upload new rows to the specific item model
class CSVITEMROW(BaseModel):
    date: str
    menu_item: str
    quantity_ordered: conint(ge=0)
    quantity_sold: conint(ge=0)
    quantity_wasted: conint(ge=0)
    ingredient_cost: confloat(ge=0)
    selling_price: confloat(ge=0)
    total_revenue: confloat(ge=0)
    customer_count: conint(ge=0)
    time_of_day: str
    weather_condition: str
    special_event: str
    time_of_order: str


# Format for LLM queue request
class LLMQueueRequest(BaseModel):
    job_id: int
    user_id: int
    label: str
    rows_data: List[Dict[str, Any]]
