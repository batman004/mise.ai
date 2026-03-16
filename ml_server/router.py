from fastapi import APIRouter, Query, HTTPException, Body
from specific_model.predict import predict_main_specific_model
from general_model.predict import predict_main_general_model
import pandas as pd
from typing import Literal
from loguru import logger

from configuration import GENERAL_CSV_PATH, SPECIFIC_ITEM_CSV_PATH
from general_model.constants import (
    TYPE_OF_FOOD,
    EVENT_TYPE,
    STORAGE_CONDITIONS,
    GEOGRAPHICAL_LOCATION,
    SEASONALITY,
    PREPARATION_METHOD,
    ITEM_PURCHASE_HISTORY_TYPE,
)

from schemas import LLMQueueRequest, CSVGENERALROW, CSVITEMROW
import sys

# Router initialisation
router = APIRouter()

# Initialize LLM Service once at module level to avoid reinitializing on each request
try:
    from llm_service import LLMService

    llm_service = LLMService()
    logger.info("LLM Service initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize LLM Service: {e}")
    llm_service = None


# Queue prediction request for low priority processing
@router.post("/queue-prediction")
async def queue_prediction(request: dict = Body(...)):
    """
    Queue a prediction request for low priority processing.
    This endpoint receives requests from the main server and adds them to the queue.
    """
    try:
        from queue_helper import rabbitmq_helper

        # Extract request data
        job_id = request.get("job_id")
        user_id = request.get("user_id")
        prediction_type = request.get("prediction_type")
        input_data = request.get("input_data", {})
        priority = request.get("priority", "low")

        if not all([job_id, user_id, prediction_type]):
            raise HTTPException(status_code=400, detail="Missing required fields")

        # Create message for ML server worker
        message = {
            "job_id": job_id,
            "user_id": user_id,
            "prediction_type": prediction_type,
            "input_data": input_data,
            "priority": priority,
        }

        # Connect to RabbitMQ and publish message
        if not rabbitmq_helper.connect():
            raise HTTPException(status_code=503, detail="Message broker unavailable")

        # Declare prediction queue
        rabbitmq_helper.declare_queue("prediction_queue")

        # Publish message
        success = rabbitmq_helper.publish_message("prediction_queue", message)
        rabbitmq_helper.disconnect()

        if not success:
            raise HTTPException(
                status_code=503, detail="Failed to queue prediction request"
            )

        logger.info(f"Queued prediction request: {job_id}")

        return {
            "status": "queued",
            "job_id": job_id,
            "message": "Prediction request queued successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error queuing prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Answer a question with context from database
@router.post("/llm/question")
async def answer_question(request: dict = Body(...)):
    """
    Answer a question using LLM with context from the first 100 rows of the database.

    Request body:
    {
        "question": "Show me a wastage summary",
        "rows_data": [...],
        "user_id": 1
    }

    Returns:
    {
        "answer": "brief paragraph",
        "key_points": [...],
        "data_points_referenced": {...}
    }
    """
    try:
        question = request.get("question")
        rows_data = request.get("rows_data", [])
        user_id = request.get("user_id")

        if not question:
            raise HTTPException(status_code=400, detail="Question is required")

        if not rows_data:
            raise HTTPException(status_code=400, detail="No data provided")

        # Check if LLM service is initialized
        if llm_service is None:
            raise HTTPException(status_code=500, detail="LLM service not initialized")

        # Use the module-level LLM service instance
        result = llm_service.answer_question(question=question, rows_data=rows_data)

        logger.info(f"Answered question for user {user_id}: {question[:50]}...")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error answering question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Queue LLM request for processing
@router.post("/queue-llm")
async def queue_llm(request: LLMQueueRequest = Body(...)):
    """
    Queue an LLM request for processing.
    This endpoint receives requests from the main server with the actual data and adds them to the LLM queue.
    """
    try:
        from queue_helper import rabbitmq_helper

        logger.info(
            f"Received LLM queue request: job_id={request.job_id}, user_id={request.user_id}, label={request.label}, rows_count={len(request.rows_data)}"
        )

        # Create message for LLM worker
        message = {
            "job_id": request.job_id,
            "user_id": request.user_id,
            "label": request.label,
            "rows_data": request.rows_data,
        }

        # Connect to RabbitMQ and publish message
        if not rabbitmq_helper.connect():
            raise HTTPException(status_code=503, detail="Message broker unavailable")

        # Declare LLM queue
        rabbitmq_helper.declare_queue("llm_queue")

        # Publish message
        success = rabbitmq_helper.publish_message("llm_queue", message)
        rabbitmq_helper.disconnect()

        if not success:
            raise HTTPException(status_code=503, detail="Failed to queue LLM request")

        logger.info(f"Queued LLM request: {request.job_id}")

        return {
            "status": "queued",
            "job_id": request.job_id,
            "message": "LLM request queued successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error queuing LLM request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Predicts item quantity sold given a date
@router.get("/predict/quantity")
def ingredients_plan(date: str = Query(..., description="Date in YYYY-MM-DD")):
    try:
        prediction = predict_main_specific_model(date)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Run prediction
    return prediction.to_dict(orient="records")


# Predicts general food wastage given context inputs
@router.get("/predict/general_info")
def predict_general_info(
    type_of_food: Literal[tuple(TYPE_OF_FOOD)] = Query(
        ..., description="Type of food served"
    ),
    number_of_guests: int = Query(..., description="Number of guests at the event"),
    event_type: Literal[tuple(EVENT_TYPE)] = Query(..., description="Type of event"),
    quantity_of_food: float = Query(..., description="Quantity of food prepared"),
    storage_conditions: Literal[tuple(STORAGE_CONDITIONS)] = Query(
        ..., description="Storage condition of the food"
    ),
    item_purchase_history: Literal[tuple(ITEM_PURCHASE_HISTORY_TYPE)] = Query(
        ..., description="Historical purchase pattern"
    ),
    seasonality: Literal[tuple(SEASONALITY)] = Query(
        ..., description="Seasonal context"
    ),
    preparation_method: Literal[tuple(PREPARATION_METHOD)] = Query(
        ..., description="Preparation or serving method"
    ),
    geographical_location: Literal[tuple(GEOGRAPHICAL_LOCATION)] = Query(
        ..., description="Location type"
    ),
    pricing: str = Query(..., description="Pricing or cost-related context"),
):
    try:
        # Build input dataframe for prediction
        df_input = pd.DataFrame(
            [
                {
                    "Type of Food": type_of_food,
                    "Number of Guests": number_of_guests,
                    "Event Type": event_type,
                    "Quantity of Food": quantity_of_food,
                    "Storage Conditions": storage_conditions,
                    "Purchase History": item_purchase_history,
                    "Seasonality": seasonality,
                    "Preparation Method": preparation_method,
                    "Geographical Location": geographical_location,
                    "Pricing": pricing,
                }
            ]
        )

        # Run prediction
        prediction = predict_main_general_model(df_input)
        return prediction.to_dict(orient="records")

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# Add new row in the general model training CSV file
@router.post("/upload/general", status_code=201)
def upload_general(row: CSVGENERALROW):
    # Build input dataframe for append to CSV
    upload_dataframe = pd.DataFrame(
        [
            {
                "Type of Food": row.type_of_food,
                "Number of Guests": row.number_of_guests,
                "Event Type": row.event_type,
                "Quantity of Food": row.quantity_of_food,
                "Storage Conditions": row.storage_conditions,
                "Purchase History": row.purchase_history,
                "Seasonality": row.seasonality,
                "Preparation Method": row.preparation_method,
                "Geographical Location": row.geographical_location,
                "Pricing": row.pricing,
                "Wastage Food Amount": row.wastage_food_amount,
            }
        ]
    )

    # Append row to CSV
    upload_dataframe.to_csv(GENERAL_CSV_PATH, mode="a", index=False, header=False)

    return {"status": "ok", "appended_rows": 1, "path": str(GENERAL_CSV_PATH)}


# Appends a new row in the specific item model
@router.post("/upload/specific_item")
def upload_specific(row: CSVITEMROW):
    try:
        # Build input dataframe for append to CSV
        upload_dataframe = pd.DataFrame(
            [
                {
                    "date": row.date,
                    "menu_item": row.menu_item,
                    "quantity_ordered": row.quantity_ordered,
                    "quantity_sold": row.quantity_sold,
                    "quantity_wasted": row.quantity_wasted,
                    "ingredient_cost": row.ingredient_cost,
                    "selling_price": row.selling_price,
                    "total_revenue": row.total_revenue,
                    "customer_count": row.customer_count,
                    "time_of_day": row.time_of_day,
                    "weather_condition": row.weather_condition,
                    "special_event": row.special_event,
                    "time_of_order": row.time_of_order,
                }
            ]
        )

        # Append row to CSV
        upload_dataframe.to_csv(
            SPECIFIC_ITEM_CSV_PATH, mode="a", index=False, header=False
        )

        return {"status": "ok", "appended_rows": 1, "path": str(SPECIFIC_ITEM_CSV_PATH)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=e)


# Retrain the specific model
@router.post("/retrain/specifc_model", status_code=200)
def retrain_specific_model():
    call_argument = [
        "--mode",
        "train",
        "--csv",
        "specific_model/input_data/sample_data.csv",
        "--model_path",
        "specific_model/model/model.joblib",
        "--target",
        "Wastage Food Amount",
    ]

    from specific_model.training import train_main
    from specific_model.command_line import parse_arguments

    # Simulate CLI call
    sys.argv = ["main.py"] + call_argument
    args = parse_arguments()

    # Train model
    train_main(args)


# Retrain the general model
@router.post("/retrain/general_item", status_code=200)
def retrain_general_model():
    call_argument = [
        "--mode",
        "train",
        "--csv",
        "general_model/input_data/food_wastage_data.csv",
        "--model_path",
        "general_model/model/model.joblib",
        "--target",
        "Wastage Food Amount",
    ]

    from general_model.training import train_main
    from general_model.command_line import parse_arguments

    # Simulate CLI call
    sys.argv = ["main.py"] + call_argument
    args = parse_arguments()

    # Train model
    train_main(args)
