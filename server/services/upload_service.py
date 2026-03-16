"""Business logic for handling file uploads."""

import os
import hashlib
import uuid
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from loguru import logger

from config import UPLOAD_DIR
from db import KitchenLogRow, SessionLocal, UploadedFileMeta, User
from .parsers.csv_parser import csv_parser
from .parsers.excel_parser import excel_parser
from .parsers.ocr_parser import ocr_parser
from exceptions import DuplicateUploadError

_SUPPORTED_UPLOAD_EXTENSIONS = {
    ".csv",
    ".tsv",
    ".txt",
    ".xlsx",
    ".xls",
    ".png",
    ".jpg",
    ".jpeg",
}


def save_uploaded(
    file, label: Optional[str] = "", notes: Optional[str] = None, user_id: int = 0
):
    """
    Persist an uploaded file to disk and create associated metadata entries.
    """
    logger.info(
        "Saving uploaded file: filename={}, user_id={}",
        getattr(file, "filename", "unknown"),
        user_id,
    )

    original_name = getattr(file, "filename", None) or "unknown"
    extension = os.path.splitext(original_name)[1].lower()

    if extension not in _SUPPORTED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Supported types: CSV, TSV, TXT, XLSX, XLS, PNG, JPG, JPEG",
        )

    unique_id = uuid.uuid4().hex
    saved_name = f"{unique_id}_{os.path.basename(file.filename)}"
    saved_path = os.path.join(UPLOAD_DIR, saved_name)

    try:
        contents = file.file.read() if hasattr(file, "file") else file.read()
        if isinstance(contents, str):
            contents = contents.encode("utf-8")
        # Compute content hash for duplicate detection
        content_hash = hashlib.sha256(contents).hexdigest()
        # Resolve user_id early (ensure non-null for duplicate check)
        database = SessionLocal()
        try:
            resolved_user_id = user_id
            # If user_id is None or 0, find or create the default user
            if resolved_user_id is None or resolved_user_id == 0:
                existing_user = database.query(User).filter(User.id == 1).first()
                if existing_user:
                    resolved_user_id = 1
                else:
                    # Create default user
                    user = User(name="default")
                    database.add(user)
                    database.commit()
                    database.refresh(user)
                    resolved_user_id = user.id
            else:
                # Check if the specified user_id exists, if not create it
                existing_user = database.query(User).filter(User.id == user_id).first()
                if not existing_user:
                    logger.info(f"User {user_id} does not exist, creating new user")
                    user = User(id=user_id, name=f"User {user_id}")
                    database.add(user)
                    database.commit()
                    database.refresh(user)
                    resolved_user_id = user.id

            # Check for existing duplicate for same user/label
            existing = (
                database.query(UploadedFileMeta)
                .filter(
                    UploadedFileMeta.user_id == resolved_user_id,
                    UploadedFileMeta.label == label,
                    UploadedFileMeta.content_hash == content_hash,
                )
                .first()
            )
            if existing:
                raise DuplicateUploadError(existing_id=existing.id)

            # Update user_id to the resolved value for later use
            user_id = resolved_user_id
        finally:
            database.close()
        with open(saved_path, "wb") as handle:
            handle.write(contents)
    except DuplicateUploadError:
        raise
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.exception("Failed to save uploaded file: {}", exc)
        raise HTTPException(status_code=500, detail="Failed to save file")

    dataframe = df_parsing_and_loading(saved_path, extension)

    database = SessionLocal()
    try:
        # User should already exist from the earlier check above, verify it
        user = database.query(User).filter(User.id == user_id).first()
        if user is None:
            # Fallback: this should not happen, but create user if somehow missing
            logger.warning(
                f"User {user_id} missing despite earlier check, creating now"
            )
            if user_id == 0 or user_id is None:
                user = database.query(User).filter(User.id == 1).first()
                if user is None:
                    user = User(name="default")
                    database.add(user)
                    database.commit()
                    database.refresh(user)
                user_id = user.id
            else:
                user = User(id=user_id, name=f"User {user_id}")
                database.add(user)
                database.commit()
                database.refresh(user)
                user_id = user.id

        metadata = UploadedFileMeta(
            user_id=user_id,
            label=label,
            filename=saved_path,
            original_name=file.filename,
            uploaded_at=datetime.utcnow(),
            notes=notes,
            content_hash=content_hash,
        )
        database.add(metadata)
        database.commit()
        database.refresh(metadata)
        logger.info(
            "File saved and metadata stored: id={}, label={}", metadata.id, label
        )

        try:
            for _, row in dataframe.iterrows():
                kitchen_log_row = KitchenLogRow(
                    user_id=user_id,
                    uploaded_file_id=metadata.id,
                    label=label,
                    uploaded_at=metadata.uploaded_at,
                    row_data=row.fillna("").to_dict(),
                )
                database.add(kitchen_log_row)
            database.commit()
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("Failed to append rows into KitchenLogRow: {}", exc)

        # Build metadata summary
        total_rows = len(dataframe)
        total_columns = len(dataframe.columns)
        columns = list(dataframe.columns)
        sample_rows = dataframe.head(5).fillna("").to_dict(orient="records")

        return {
            "id": metadata.id,
            "label": metadata.label,
            "filename": metadata.filename,
            "original_name": metadata.original_name,
            "uploaded_at": metadata.uploaded_at,
            "rows": total_rows,
            "columns_count": total_columns,
            "columns": columns,
            "sample": sample_rows,
        }
    except Exception as exc:
        logger.exception("Failed to store file metadata: {}", exc)
        raise HTTPException(status_code=500, detail="Failed to store file metadata")
    finally:
        database.close()


def df_parsing_and_loading(path: str, extension: str):
    """Delegate parsing to the specific parser based on file extension."""
    if extension in {".png", ".jpg", ".jpeg"}:
        return ocr_parser(path)

    if extension in {".csv", ".txt", ".tsv"}:
        return csv_parser(path, extension)

    if extension in {".xlsx", ".xls"}:
        return excel_parser(path)

    raise HTTPException(
        status_code=500, detail="Failed to store file due to unsupported format"
    )
