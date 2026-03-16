import os
from dotenv import load_dotenv

# Load environment variables (only if not already set, to avoid conflicts with K8s secrets)
load_dotenv(override=False)

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

os.makedirs(UPLOAD_DIR, exist_ok=True)
