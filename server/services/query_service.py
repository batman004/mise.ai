from typing import Optional, List, Dict, Any
from datetime import datetime
import pandas as pd
from loguru import logger
from fastapi import HTTPException
from db import SessionLocal, UploadedFileMeta, KitchenLogRow


def query_csv_by_label(
    label: str,
    user_id: Optional[int] = None,
    file_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    columns: Optional[List[str]] = None,
    filter_expr: Optional[str] = None,
):
    """
    Load the most recent CSV for the provided label and return the requested slice.
    columns: list of column names to select (or None)
    filter_expr: pandas query string
    """
    logger.info(
        "Querying data: label=%s user_id=%s file_id=%s start=%s end=%s limit=%s offset=%s columns=%s filter=%s",
        label,
        user_id,
        file_id,
        start_date,
        end_date,
        limit,
        offset,
        columns,
        filter_expr,
    )

    db = SessionLocal()
    try:
        # If file_id provided, filter by that uploaded file; otherwise use latest for user+label
        uploaded_file_id = file_id
        uploaded_at = None
        if uploaded_file_id is None:
            q = db.query(UploadedFileMeta).filter(UploadedFileMeta.label == label)
            if user_id is not None:
                q = q.filter(UploadedFileMeta.user_id == user_id)
            meta = q.order_by(UploadedFileMeta.uploaded_at.desc()).first()
            if not meta:
                logger.warning("No file found for label: {}", label)
                raise HTTPException(
                    status_code=404, detail=f"No file found for label '{label}'"
                )
            uploaded_file_id = meta.id
            uploaded_at = meta.uploaded_at

        qrows = db.query(KitchenLogRow).filter(KitchenLogRow.label == label)
        if user_id is not None:
            qrows = qrows.filter(KitchenLogRow.user_id == user_id)
        if uploaded_file_id is not None:
            qrows = qrows.filter(KitchenLogRow.uploaded_file_id == uploaded_file_id)
        if start_date is not None:
            qrows = qrows.filter(KitchenLogRow.uploaded_at >= start_date)
        if end_date is not None:
            qrows = qrows.filter(KitchenLogRow.uploaded_at <= end_date)

        # pagination
        total_rows = qrows.count()
        rows = qrows.offset(offset).limit(limit).all()
        df = pd.DataFrame([r.row_data for r in rows]) if rows else pd.DataFrame()
    finally:
        db.close()

    # select columns if provided
    if columns and not df.empty:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            logger.warning("Columns not found in CSV: {}", missing)
            raise HTTPException(status_code=400, detail=f"Columns not found: {missing}")
        df = df[columns]

    # apply filter if provided
    if filter_expr:
        try:
            df = df.query(filter_expr)
        except Exception as e:
            logger.exception("Invalid filter expression: {}", e)
            raise HTTPException(
                status_code=400, detail=f"Invalid filter expression: {e}"
            )

    df_page = df

    result = {
        "label": label,
        "uploaded_file_id": uploaded_file_id,
        "uploaded_at": uploaded_at,
        "total_rows": int(total_rows),
        "rows_returned": int(len(df_page)),
        "data": df_page.fillna("").to_dict(orient="records"),
    }
    logger.debug(
        "Returning {} rows (total {}) for label {}", len(df_page), total_rows, label
    )
    return result


def get_sales_data_for_user(
    user_id: int,
    page: int = 1,
    limit: int = 50,
    order: Optional[str] = None,
    order_direction: str = "asc",
    since: Optional[datetime] = None,
    until: Optional[datetime] = None,
    with_metrics: bool = False,
) -> Dict[str, Any]:
    """Return sales rows for a user across all labels/files with optional metrics.

    Sorting is applied in-memory on the requested column, which must exist in the row payload.
    Date filtering is applied based on KitchenLogRow.uploaded_at. If `time_of_order` exists,
    metrics will use that timestamp for monthly aggregations.
    """
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if limit < 1 or limit > 1000:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 1000")

    db = SessionLocal()
    try:
        q = db.query(KitchenLogRow).filter(KitchenLogRow.user_id == user_id)
        if since is not None:
            q = q.filter(KitchenLogRow.uploaded_at >= since)
        if until is not None:
            q = q.filter(KitchenLogRow.uploaded_at <= until)

        total_rows = q.count()

        # Pull a window; we will sort in-memory when needed. To ensure consistent pagination when sorting,
        # fetch all and then slice. For large datasets, consider server-side pagination with materialized views.
        rows = q.all()
        df = pd.DataFrame([r.row_data for r in rows]) if rows else pd.DataFrame()

        if df.empty:
            return {
                "user_id": user_id,
                "total_rows": 0,
                "rows_returned": 0,
                "data": [],
                "metrics": {},
            }

        # Normalize types if possible
        if "time_of_order" in df.columns:
            try:
                df["time_of_order"] = pd.to_datetime(
                    df["time_of_order"], errors="coerce"
                )
            except Exception:
                pass

        # Sorting
        if order:
            if order not in df.columns:
                raise HTTPException(
                    status_code=400, detail=f"order column not found: {order}"
                )
            ascending = order_direction != "desc"
            try:
                df = df.sort_values(by=order, ascending=ascending, kind="mergesort")
            except Exception:
                # Fallback: string sort to avoid dtype issues
                df = (
                    df.assign(__order=df[order].astype(str))
                    .sort_values(by="__order", ascending=ascending, kind="mergesort")
                    .drop(columns=["__order"])
                )

        # Pagination (1-based)
        start = (page - 1) * limit
        end = start + limit
        df_page = df.iloc[start:end]

        response: Dict[str, Any] = {
            "user_id": user_id,
            "total_rows": int(total_rows),
            "rows_returned": int(len(df_page)),
            "data": df_page.fillna("").to_dict(orient="records"),
        }

        if with_metrics:
            response["metrics"] = _compute_sales_metrics(df)
        else:
            response["metrics"] = {}

        return response
    finally:
        db.close()


def _compute_sales_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    metrics: Dict[str, Any] = {}

    # 1) Total revenue by month
    revenue_by_month: Dict[str, float] = {}
    if "total_revenue" in df.columns:
        if "time_of_order" in df.columns and pd.api.types.is_datetime64_any_dtype(
            df["time_of_order"]
        ):
            month_series = df["time_of_order"].dt.to_period("M").astype(str)
        else:
            # No time_of_order; aggregate a single total
            month_series = pd.Series(["unknown"] * len(df))
        try:
            rev_series = pd.to_numeric(df["total_revenue"], errors="coerce").fillna(0)
            revenue_by_month = (
                pd.DataFrame({"month": month_series, "revenue": rev_series})
                .groupby("month", as_index=False)
                .sum()[["month", "revenue"]]
                .sort_values("month")
                .to_dict(orient="records")
            )
        except Exception:
            revenue_by_month = []
    metrics["revenue_by_month"] = revenue_by_month

    # 2) Wastage trends
    wastage_key = None
    for candidate in ["quantity_wasted", "wastage", "waste"]:
        if candidate in df.columns:
            wastage_key = candidate
            break

    wastage_trends: Dict[str, Any] = {"high_wastage_items": [], "low_wastage_items": []}
    if wastage_key:
        # Items, if a column exists for item name
        item_col = None
        for candidate in ["item", "menu_item", "product", "name"]:
            if candidate in df.columns:
                item_col = candidate
                break
        if item_col:
            by_item = (
                df[[item_col, wastage_key]]
                .assign(val=pd.to_numeric(df[wastage_key], errors="coerce").fillna(0))
                .groupby(item_col, as_index=False)["val"]
                .sum()
                .sort_values("val", ascending=False)
            )
            wastage_trends["high_wastage_items"] = by_item.head(5).to_dict(
                orient="records"
            )
            wastage_trends["low_wastage_items"] = by_item.tail(5).to_dict(
                orient="records"
            )

    # 1) Weather condition effect on wastage
    weather_metrics = {}
    if wastage_key and "weather_condition" in df.columns:
        weather_df = df[[wastage_key, "weather_condition"]].copy()
        weather_df["wastage"] = pd.to_numeric(
            weather_df[wastage_key], errors="coerce"
        ).fillna(0)
        weather_group = (
            weather_df.groupby("weather_condition")["wastage"]
            .sum()
            .sort_values(ascending=False)
            .to_dict()
        )
        weather_metrics["total_wastage_by_weather"] = weather_group

        # Also, average wastage per record by weather
        avg_weather_group = (
            weather_df.groupby("weather_condition")["wastage"]
            .mean()
            .sort_values(ascending=False)
            .to_dict()
        )
        weather_metrics["avg_wastage_by_weather"] = avg_weather_group
    metrics["weather_condition_wastage"] = weather_metrics

    # 2) Time of day (lunch/dinner) effect on wastage
    time_of_day_metrics = {}
    if wastage_key and "time_of_day" in df.columns:
        tod_df = df.copy()
        tod_df["wastage"] = pd.to_numeric(tod_df[wastage_key], errors="coerce").fillna(
            0
        )
        # Only consider rows where time_of_day is lunch or dinner
        valid_tod = tod_df["time_of_day"].isin(["lunch", "dinner"])
        filtered_tod_df = tod_df[valid_tod]
        tod_group = (
            filtered_tod_df.groupby("time_of_day")["wastage"]
            .sum()
            .sort_values(ascending=False)
            .to_dict()
        )
        time_of_day_metrics["total_wastage_by_time_of_day"] = tod_group

        avg_tod_group = (
            filtered_tod_df.groupby("time_of_day")["wastage"]
            .mean()
            .sort_values(ascending=False)
            .to_dict()
        )
        time_of_day_metrics["avg_wastage_by_time_of_day"] = avg_tod_group

    # 3) Special event effect on wastage
    special_event_metrics = {}
    if wastage_key and "special_event" in df.columns:
        se_df = df[[wastage_key, "special_event"]].copy()
        se_df["wastage"] = pd.to_numeric(se_df[wastage_key], errors="coerce").fillna(0)
        se_group = (
            se_df.groupby("special_event")["wastage"]
            .sum()
            .sort_values(ascending=False)
            .to_dict()
        )
        special_event_metrics["total_wastage_by_special_event"] = se_group

        avg_se_group = (
            se_df.groupby("special_event")["wastage"]
            .mean()
            .sort_values(ascending=False)
            .to_dict()
        )
        special_event_metrics["avg_wastage_by_special_event"] = avg_se_group
    metrics["special_event_wastage"] = special_event_metrics

    metrics["wastage_trends"] = wastage_trends

    return metrics
