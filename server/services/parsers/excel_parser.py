import pandas as pd
from loguru import logger
from fastapi import HTTPException


def excel_parser(path: str) -> pd.DataFrame:
    """
    Parse Excel files
    """
    try:
        # Use pandas to read Excel file
        return pd.read_excel(path)
    except Exception:
        logger.warning("Failed to read Excel file")
        raise HTTPException(
            status_code=500, detail="Failed to store file due to parsing error"
        )
