import joblib
import logging
import numpy as np


def save_model_package(model_package, meta, path):
    """
    Save information about the model:
        - metadata
        - model_package
    """
    payload = {"model_package": model_package, "meta": meta}
    joblib.dump(payload, path)
    logging.info(f"Model package saved to {path}")


def load_model_package(path):
    """
    Load of a saved model based on a given path
    """
    payload = joblib.load(path)
    logging.info(f"Model package loaded from {path}")
    return payload["model_package"], payload.get("meta", {})


def transform_with_model_package(model_package, data):
    """
    Application of the preprocessing steps by applying the stored trained transformers in the model package.
    """
    numeric_columns = model_package["numerical_cols"]
    categorical_columns = model_package["categorical_cols"]

    # Numeric pipeline
    if len(numeric_columns) > 0:
        X_numerical = data[numeric_columns]
        X_numerical_imputed = model_package["numerical_imputer"].transform(X_numerical)
        Xn = model_package["numeric_scaler"].transform(X_numerical_imputed)
    else:
        Xn = np.empty((len(data), 0))

    # Categorical pipeline
    if categorical_columns:
        X_categorical = data[categorical_columns]
        X_categorical_imputed = model_package["categorical_imputer"].transform(
            X_categorical
        )
        Xc = model_package["categorical_encoder"].transform(X_categorical_imputed)
    else:
        Xc = np.empty((len(data), 0))

    # Combine numeric and categorical arrays
    if len(numeric_columns) > 0 or len(categorical_columns) > 0:
        X_proc = np.hstack([Xn, Xc])

    else:
        X_proc = np.empty((len(data), 0))

    return X_proc
