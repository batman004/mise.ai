import pandas as pd
import logging
import numpy as np


def load_data(file_path):
    """
    Loads a CSV file to a pandas dataframe

    file_path: path to CSV file

    """
    try:
        data = pd.read_csv(file_path)
        return data

    except Exception as e:
        logging.error(f"Error loading data: {e}")
        return None


def data_cleaning(data):
    return data


def get_hour(timestamp):
    """
    Conversion of the hour a day based on a string time

    """
    try:
        return pd.to_datetime(timestamp, errors="coerce").hour
    except Exception as e:
        logging.warning(f"Failed to parse hour from {timestamp}: {e}")
        return np.nan


def feature_engineering(data):
    """
    Addition to training dataframe with created features
        - day-of-week
        - weekend flag
        - hour of the day
        - wastage rate
    """
    data = data.copy()

    # Creation of all the date based features
    if "date" in data.columns:
        data["date"] = pd.to_datetime(data["date"])
        data["day_of_week"] = data["date"].dt.dayofweek
        data["is_weekend"] = data["date"].dt.weekday >= 5
    else:
        logging.warning("No 'date' column found")
        data["day_of_week"] = "missing"
        data["is_weekend"] = False

    # Creation of all the time based features
    if "time_of_order" in data.columns:
        data["hour_of_order"] = data["time_of_order"].apply(get_hour)
    else:
        logging.warning("No 'time_of_order' column found")
        data["hour_of_order"] = np.nan

    # Creation of the wastage rate quantity
    if "wasted_quantity" in data.columns and "quantity_ordered" in data.columns:
        data["wastage_rate"] = data["wasted_quantity"] / data[
            "quantity_ordered"
        ].replace({0: np.nan})
        logging.info("Wastage rate feature created")
    else:
        logging.warning("No wastage quantity column found")
        data["wastage_rate"] = np.nan

    return data


def effective_folds(n, desired_folds=5):
    """
    Ensures a valid number of cross-validation fold, based on the size of the dataset
    """
    if n < 2:
        logging.warning("Not enough samples available, reducing folds to 2")
        return 2
    folds = max(2, min(desired_folds, n))
    return folds


def feature_grouping(data):
    """
    Split the columns into two groups:
        - Numerical groups
        - Categorical groups
    """
    numerical_col = data.select_dtypes(
        include=["number", "int64", "float64", "bool"]
    ).columns.tolist()
    categorical_cols = data.select_dtypes(
        include=["object", "category"]
    ).columns.tolist()
    return numerical_col, categorical_cols


cols_leakage = [
    "Wastage Food Amount",
    "wastage_food_amount",
    "quantity_wasted",
    "quantity_ordered",
    "quantity_sold",
    "total_revenue",
    "total_cost",
    "time_of_disposal",
    "wastage_rate",
]


def remove_leakage_columns(numerical_col, categorical_cols):
    """
    Removal of the columns that contain direct information about the target value.

    """
    clean_numerical_col = []
    for column in numerical_col:
        if column not in cols_leakage:
            clean_numerical_col.append(column)
        else:
            logging.info(f"Removed leakage column: {column}")

    clean_categorical_cols = []
    for column in categorical_cols:
        if column not in cols_leakage:
            clean_categorical_cols.append(column)
        else:
            logging.info(f"Removed leakage column: {column}")
    return clean_numerical_col, clean_categorical_cols
