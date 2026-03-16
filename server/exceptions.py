class DuplicateUploadError(Exception):
    """Raised when an uploaded file already exists for the same user and label."""

    def __init__(self, existing_id: int | None = None, message: str | None = None):
        detail = message or "Duplicate file already uploaded for this user and label"
        if existing_id is not None:
            detail = f"{detail} (id={existing_id})"
        super().__init__(detail)
