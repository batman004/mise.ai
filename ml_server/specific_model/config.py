import logging


RANDOM_STATE = 42  # Fixed seed
RANDOM_FOREST_N_ESTIMATORS = 200  # Number of tress Random Forest Model
RIDGE_ALPHA = [0.1, 1.0, 10.0]
N_CV_FOLDS = 5  # Number of folds for cross-validation


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Waste model pipeline")
