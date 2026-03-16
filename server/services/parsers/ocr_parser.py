from PIL import Image
import pandas as pd
import pytesseract
from loguru import logger
from fastapi import HTTPException

# pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_CMD", "/usr/bin/tesseract")


def ocr_parser(path: str) -> pd.DataFrame:
    """
    Extract text from image files using OCR.
    """

    try:
        logger.info("Processing image file for OCR")
        image = Image.open(path).convert("RGB")
        text = pytesseract.image_to_string(image)
        return pd.DataFrame([{"extracted_text": text.strip()}])

    except Exception as e:
        logger.warning(f"Failed to extract text from image due to error: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to store file due to parsing error"
        )
