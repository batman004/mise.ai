from .data_helpers import (
    effective_folds,
    load_data,
    data_cleaning,
    feature_engineering,
    feature_grouping,
    remove_leakage_columns,
    cols_leakage,
)
import logging
from .config import N_CV_FOLDS, RANDOM_STATE, RANDOM_FOREST_N_ESTIMATORS
from .model_package import save_model_package

import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import KFold


def train_model(X_proc, Y):
    """
    Fit a Random Forest Regressor on processed data
    """
    model = RandomForestRegressor(
        n_estimators=RANDOM_FOREST_N_ESTIMATORS, random_state=RANDOM_STATE
    )
    model.fit(X_proc, Y)
    return model


def mode_function(series_list):
    return series_list.mode(dropna=True).iloc[0]


def cross_validation(
    X_proc,
    Y,
    numerical_cols=None,
    categorical_cols=None,
    numeric_imputer=None,
    numeric_scaler=None,
    categorical_imputer=None,
    categorical_encoder=None,
    model=None,
):
    """
    Computation of cross validation RMSE on each test fold
    """

    k = effective_folds(len(Y), N_CV_FOLDS)
    rmses = []
    kf = KFold(n_splits=k, shuffle=True, random_state=RANDOM_STATE)

    for train_index, test_index in kf.split(X_proc):
        x_test = X_proc[test_index]
        y_test = Y.iloc[test_index]

        # Predict
        y_pred = model.predict(x_test)

        # RMSE computation per fold
        rmse = float(np.sqrt(((y_test - y_pred) ** 2).mean()))
        rmses.append(rmse)

    # Combine all calculated RMSES
    rmses = np.asarray(rmses, dtype=float)
    cv_rmse_mean = float(np.mean(rmses))
    cv_rmse_std = float(np.std(rmses))

    logging.info(
        f"Cross-validation completed with {k} folds. RMSE: {cv_rmse_mean:.4f} ± {cv_rmse_std:.4f}"
    )
    return cv_rmse_mean, cv_rmse_std


def target_column_get(call_argument, featured_data):
    """
    Determine which column should be used as the target variable

    """

    # Get target column name
    target_column = call_argument.target

    # use quantity sold as target if exists
    if "quantity_sold" in featured_data.columns:
        target_column = "quantity_sold"
    else:
        if target_column is None:
            raise ValueError("Target column not found.")
        else:
            # if quanity sold is not possible use specificed target
            target_column = call_argument.target
    return target_column


def train_main(call_argument):
    """
    Model Training Function

    - Load, clean, feature engineer
    - Split x/y
    - Group features in numeric and categories
    - Remove leakage
    - Fit imputers, scalers, encoders
    - Train model
    - Compute cross validation
    - save model and package

    """

    # Load data
    dataframe = load_data(call_argument.csv)

    if dataframe is None:
        logging.error("Failed to load data from %s", call_argument.csv)
        return None

    # Clean Data
    logging.info("Data loaded successfully from %s", call_argument.csv)
    cleaned_data = data_cleaning(dataframe)

    # Feature engineering
    logging.info("Data cleaned: %d rows after cleaning", len(cleaned_data))
    featured_data = feature_engineering(cleaned_data)

    logging.info(
        "Feature engineering completed. Columns now: %s", featured_data.columns.tolist()
    )

    # Target column
    target_column = target_column_get(call_argument, featured_data)

    # Split features/target safely
    Y = featured_data[target_column].copy()
    X = featured_data.drop(columns=[target_column], errors="ignore").reset_index(
        drop=True
    )
    Y = Y.reset_index(drop=True)

    mask = Y.notna()
    X = X.loc[mask]
    Y = Y.loc[mask]

    X = X.reset_index(drop=True)
    Y = Y.reset_index(drop=True)

    # Detect numirical and categorical columns
    numerical_cols, categorical_cols = feature_grouping(X)
    numerical_cols, categorical_cols = remove_leakage_columns(
        numerical_cols, categorical_cols
    )

    # Fill missing values with median
    numeric_imputer = SimpleImputer(strategy="median")

    # scale numerica values
    numeric_scaler = StandardScaler()

    # Replace missing values with "missing"
    categorical_imputer = SimpleImputer(strategy="constant", fill_value="missing")

    # One-hot encode categorical variables
    categorical_encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)

    # apply changes in the training data
    if numerical_cols:
        X_numerical = X[numerical_cols]

        X_numerical_imputer = numeric_imputer.fit_transform(X_numerical)

        Xn = numeric_scaler.fit_transform(X_numerical_imputer)
    else:
        Xn = np.empty((len(X), 0))

    if categorical_cols:
        X_categorical = X[categorical_cols]

        X_categorical_imputer = categorical_imputer.fit_transform(X_categorical)

        Xc = categorical_encoder.fit_transform(X_categorical_imputer)
    else:
        Xc = np.empty((len(X), 0))

    X_proc = np.hstack([Xn, Xc])

    # Train model
    model = train_model(X_proc, Y)

    logging.info("Model training completed.")
    cv_rmse_mean, cv_rmse_std = cross_validation(
        X_proc,
        Y,
        numerical_cols=numerical_cols,
        categorical_cols=categorical_cols,
        numeric_imputer=numeric_imputer,
        numeric_scaler=numeric_scaler,
        categorical_imputer=categorical_imputer,
        categorical_encoder=categorical_encoder,
        model=model,
    )

    item_defaults = {}
    groups = featured_data.groupby("menu_item", dropna=False)

    # Creation and computation of item defaults
    for item, g in groups:
        item_defaults[item] = {}

        if "time_of_day" in g.columns:
            item_defaults[item]["item_of_day"] = mode_function(g["time_of_day"])
        else:
            item_defaults[item]["item_of_day"] = np.nan

        if "ingredient_cost" in g.columns:
            item_defaults[item]["ingredient_cost"] = float(
                g["ingredient_cost"].median()
            )
        else:
            item_defaults[item]["selling_price"] = np.nan

        if "selling_price" in g.columns:
            item_defaults[item]["selling_price"] = float(g["selling_price"].median())
        else:
            item_defaults[item]["selling_price"] = np.nan

        if "customer_count" in g.columns:
            item_defaults[item]["customer_count"] = float(g["customer_count"].median())
        else:
            item_defaults[item]["customer_count"] = np.nan

    other_defaults = {}
    other_defaults["weather_condition"] = (
        featured_data["weather_condition"].mode(dropna=True).iloc[0]
    )
    other_defaults["speacial_event"] = "none"

    # Creation of the model package
    model_package = {
        "numerical_imputer": numeric_imputer,
        "numeric_scaler": numeric_scaler,
        "categorical_imputer": categorical_imputer,
        "categorical_encoder": categorical_encoder,
        "model": model,
        "numerical_cols": numerical_cols,
        "categorical_cols": categorical_cols,
    }

    # Creation of the meta data
    meta = {
        "target_column": target_column,
        "include_leakage_columns": cols_leakage,
        "cv_rmse_mean": cv_rmse_mean,
        "cv_rmse_std": cv_rmse_std,
        "n_samples": int(len(Y)),
        "item_defaults": item_defaults,
        "other_defaults": other_defaults,
    }

    # Save model, meta and model package
    save_model_package(model_package, meta, call_argument.model_path)
    logging.info("Training completed")
