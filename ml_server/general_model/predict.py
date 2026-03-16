import logging
from .model_package import load_model_package, transform_with_model_package
from .data_helpers import load_data, data_cleaning, feature_engineering
from pathlib import Path
import pandas as pd


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


def predict_main_general_model(call_argument):
    """
    High-level prediction function

    Accept:
    - arparse Namespace - CLI mode
    - pandas Datafram - API mode
    """

    # Hardcoded model path
    model_path = Path(__file__).resolve().parent / "model" / "model.joblib"
    model_package, meta = load_model_package(model_path)

    # Determine if input is Dataframe or file path
    if isinstance(call_argument, pd.DataFrame):
        # Dataframe
        data_raw = call_argument

    else:
        # File path
        data_raw = load_data(call_argument.input)

    # Error handling
    if data_raw is None:
        logging.error("Failed to load data for prediction")
        return None

    # Predict
    predictions = predict(model_package, data_raw)
    output_data = data_raw.copy()
    output_data["predicted_wastage_amount"] = predictions

    if not isinstance(call_argument, pd.DataFrame):
        if call_argument.output:
            output_data.to_csv(call_argument.output, index=False)
            logging.info(f"Predictions saved to {call_argument.output}")
        else:
            logging.info("No output path provided, predictions not saved to file.")

    return output_data
