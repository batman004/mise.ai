import csv
import pandas as pd
from loguru import logger
from fastapi import HTTPException


def csv_parser(path: str, extension: str) -> pd.DataFrame:
    """
    Parse csv/tsv/txt files.
    """

    # If tsv, directly read with sep
    if extension == ".tsv":
        return pd.read_csv(path, sep="\t")
    try:
        # Read a sample to detect delimiter
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            text_sample = fh.read(65536)
        try:
            # Use of Python csv.sniffer to detect delimiter
            dialect = csv.Sniffer().sniff(text_sample, delimiters=[",", ";", "\t", "|"])
            delimiter = dialect.delimiter

        except csv.Error:
            # Fallback: comma if delimter detection fails
            delimiter = ","
        return pd.read_csv(path, delimiter=delimiter)
    except Exception:
        logger.warning("Failed to read CSV with detected delimiter")
        raise HTTPException(
            status_code=500, detail="Failed to store file due to parsing error"
        )
