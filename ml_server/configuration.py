import os
from dotenv import load_dotenv

from typing import Any, Dict, Optional
from pathlib import Path

# Load environment variables
load_dotenv()

# OpenAI configuration
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

VERTEXAI_PROJECT_ID: str = "mise-ai-476319"

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "vertexai_credentials.json"

VERTEXAI_LOCATIONS = [
    "us-central1",
    "europe-west4",
    "asia-southeast1",
    "us-west1",  # Oregon
    "us-west4",  # Las Vegas
    "us-east1",  # S. Carolina
    "us-east4",  # N. Virginia
    "us-east5",  # Columbus, Ohio
    "us-south1",  # Dallas, Texas
    "europe-west1",  # Belgium
    "europe-west2",  # London, UK
    "europe-west3",  # Frankfurt, Germany
    "europe-west6",  # Zürich, Switzerland
    "europe-west8",  # Milan, Italy
    "europe-west9",  # Paris, France
    "europe-southwest1",  # Madrid, Spain
    "europe-central2",  # Warsaw, Poland
    "europe-north1",  # Finland
    "asia-east1",  # Taiwan
    "asia-east2",  # Hong Kong
    "asia-northeast1",  # Tokyo, Japan
    "asia-northeast2",  # Osaka, Japan
    "asia-northeast3",  # Seoul, South Korea
    "asia-south1",  # Mumbai, India
    "asia-southeast2",  # Jakarta, Indonesia
    "australia-southeast1",  # Sydney, Australia
    "africa-south1",  # Johannesburg, South Africa
]

# Model path configuration
SPECIFIC_ITEM_MODEL_PATH = os.getenv(
    "SPECIFIC_ITEM_MODEL_PATH", r"poc\\ml_server\\specific_model\\model\\model.joblib"
)
CATEGORY_MODEL_PATH = os.getenv(
    "CATEGORY_MODEL_PATH",
    r"poc\\ml_server\\general_model\\input_data\\food_wastage_data.csv",
)


# Data file locations
SPECIFIC_ITEM_CSV_PATH = (
    Path(__file__).resolve().parent
    / "specific_model"
    / "input_data"
    / "sample_data.csv"
)
GENERAL_CSV_PATH = (
    Path(__file__).resolve().parent
    / "general_model"
    / "input_data"
    / "food_wastage_data.csv"
)

# Model state variables
model_package: Optional[Dict[str, Any]] = None
meta: Optional[Dict[str, Any]] = None
waste_model_package: Optional[Dict[str, Any]] = None
waste_meta: Optional[Dict[str, Any]] = None
