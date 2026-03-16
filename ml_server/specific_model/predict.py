from .model_package import load_model_package, transform_with_model_package
from .data_helpers import data_cleaning, feature_engineering
import pandas as pd
import numpy as np
from pathlib import Path


def predict(model_package, data):
    """
    - Preprocessing
    - Prediction

    """

    # Engineer features
    data_processed = feature_engineering(data_cleaning(data))

    # Apply transformation stored in the model_package
    data_transformed = transform_with_model_package(model_package, data_processed)

    # Predict
    predictions = model_package["model"].predict(data_transformed)
    return predictions


def order_time_categorisation(time):
    """
    Translation lunch and dinner into a time
    """

    if str(time).lower() == "lunch":
        return "12:30"

    if str(time).lower() == "dinner":
        return "19:30"

    return "12:30"


def prediction_data_builder(date, meta):
    """
    Build a prediction-ready dataframe with the use of the stored metadata
    """

    # Retrieve default values for each item
    item_defaults = meta.get("item_defaults", {})
    other_defaults = meta.get("other_defaults", {})

    prediction_rows = []

    dt = pd.to_datetime(date, errors="coerce")
    cleaned_date = dt.strftime("%Y-%m-%d") if pd.notnull(dt) else str(date)

    # Build prediction row for every menu item
    for item, values in item_defaults.items():
        prediction_row = {
            "date": cleaned_date,
            "menu_item": item,
            "quantity_ordered": np.nan,
            "quantity_sold": np.nan,
            "quantity_wasted": np.nan,
            "ingredient_cost": values.get("ingredient_cost", np.nan),
            "selling_price": values.get("selling_price", np.nan),
            "total_revenue": np.nan,
            "customer_count": values.get("customer_count", np.nan),
            "time_of_day": values.get("time_of_day", "lunch"),
            "weather_condition": other_defaults.get("weather_condition", "clear"),
            "special_event": other_defaults.get("special_event", "none"),
            "time_of_order": f"{cleaned_date}T{order_time_categorisation(values.get('time_of_day', 'lunch'))}",
        }

        prediction_rows.append(prediction_row)

    return pd.DataFrame(prediction_rows)


def prediction_helper(model_package, meta, date):
    """
    - Preprocessing
    - Prediction

    """

    # Engineer Features
    prediction_data = prediction_data_builder(date=date, meta=meta)

    # Apply transformation stored in the model_package
    prediction_data = feature_engineering(prediction_data)

    # Predict
    X_proc = transform_with_model_package(model_package, prediction_data)
    y = model_package["model"].predict(X_proc)

    output = prediction_data.copy()
    output["predicted_quantity_sold"] = np.asarray(y, dtype=float)

    predicted_values = output["predicted_quantity_sold"]
    predicted_values = np.ceil(predicted_values)
    predicted_values = predicted_values.astype(int)

    output["recommended_order_qty"] = predicted_values

    return output[
        [
            "date",
            "menu_item",
            "time_of_day",
            "weather_condition",
            "special_event",
            "predicted_quantity_sold",
            "recommended_order_qty",
        ]
    ]


def predict_main_specific_model(date):
    """
    High-level prediction function

    Accept:
    - arparse Namespace - CLI mode
    - pandas Datafram - API mode
    """

    # Hardcoded model path
    model_path = Path(__file__).resolve().parent / "model" / "model.joblib"
    model_package, meta = load_model_package(model_path)

    output_data = prediction_helper(model_package, meta, date)

    return output_data
