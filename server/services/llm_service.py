import json
import re
import functools
from typing import Optional, List
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

import openai
import pandas as pd
from loguru import logger

from db import SessionLocal, UploadedFileMeta, LLMInsight, KitchenLogRow
from config import OPENAI_API_KEY


class LLMService:
    _MODEL_NAME = "gpt-5-nano-2025-08-07"
    _INFERENCE_QUESTIONS = [
        "When are my busiest periods, which items sell best during different times, and how can I optimize my preparation schedule?",
        "How do weather conditions, special events, and other external factors affect my sales, and how should I adjust my operations accordingly?",
        "What are my most and least profitable menu items, and should I adjust my menu based on ingredient costs versus revenue?",
        "Which menu items are generating the most food waste and what is the financial impact on my business?",
        "Based on my sales patterns and external factors, how much of each ingredient should I order for the next week?",
    ]

    def __init__(self):
        api_key = OPENAI_API_KEY
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        self.openai_client = openai.OpenAI(api_key=api_key)

    def generate_insights(
        self,
        label: str,
        query: str,
        limit: int = 500,
        user_id: int | None = None,
        file_id: int | None = None,
    ) -> dict:
        """
        Generate natural language insights using OpenAI's GPT model
        for the most recent dataset uploaded under the given label

        Args:
            label: Upload label to analyze
            query: User query for analysis
            limit: Max rows to include from dataset when building the prompt

        Returns:
            Dictionary with insights

        Raises:
            ValueError: If no dataset found for the label
        """
        # Retrieve data for the latest upload with this label (and user/file constraints if provided)
        rows = self._fetch_rows(user_id=user_id, file_id=file_id, limit=limit)
        if not rows:
            raise ValueError(f"No data available for label '{label}'")

        df = pd.DataFrame(rows)

        # Convert dataframe to string representation
        df_str = df.to_string(max_rows=100, max_cols=20)

        prompt = f"""
        Context: You are an AI assistant analyzing restaurant data.
        Label: {label}
        DataFrame (first {min(len(df), limit)} rows): {df_str}

        User Query: {query}

        Produce STRICT JSON ONLY, matching this exact schema and key set. Do not include comments, code fences, or extra keys. All strings must be plain strings, no markdown:
        {{
          "summary": "string",
          "insights": [
            {{
              "title": "string",
              "description": "string",
              "metrics": {{ "string": "string" }}
            }}
          ],
          "recommendations": [
            {{
              "title": "string",
              "description": "string",
              "expected_impact": "string"
            }}
          ],
          "data_limitations": ["string"]
        }}
        """

        logger.info(f"Sending query to LLM for label '{label}' with question: {query}")

        response = self.openai_client.chat.completions.create(
            model=LLMService._MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": "You are a meticulous data scientist. Output must be valid JSON only, no code fences, no extra commentary, matching the user-provided schema exactly.",
                },
                {"role": "user", "content": prompt},
            ],
        )

        content = response.choices[0].message.content
        if content is None:
            raise ValueError("No content received from LLM")
        llm_response = content
        return self.parse_llm_output(llm_response)

    def generate_fixed_insights(
        self,
        file_id: Optional[int] = None,
        user_id: Optional[int] = None,
        limit: int = 500,
        order: Optional[str] = None,
        order_direction: str = "asc",
        since: Optional[str] = None,
        until: Optional[str] = None,
    ) -> dict:
        """
        Generate and persist a set of fixed insights for the specified uploaded file (if file_id given),
        otherwise use the latest uploaded file for the user.

        Supports filtering of the rows passed to the LLM via:
        - limit: maximum number of rows to include
        - order: column name to sort by (use 'uploaded_at' to sort by row timestamp in DB)
        - order_direction: 'asc' or 'desc'
        - since / until: ISO datetime strings to filter KitchenLogRow.uploaded_at (inclusive)

        Returns the payload (and persists it to LLMInsight).
        """
        db = SessionLocal()
        try:
            if file_id is not None:
                meta = (
                    db.query(UploadedFileMeta)
                    .filter(UploadedFileMeta.id == file_id)
                    .first()
                )
                if not meta:
                    raise ValueError(f"No uploaded file found with id '{file_id}'")
                label = meta.label
                uploaded_file_id = meta.id
            else:
                # find latest uploaded file for the user
                q = db.query(UploadedFileMeta)
                if user_id is not None:
                    q = q.filter(UploadedFileMeta.user_id == user_id)
                meta = q.order_by(UploadedFileMeta.uploaded_at.desc()).first()
                if not meta:
                    raise ValueError("No uploaded file found for user")
                label = meta.label
                uploaded_file_id = meta.id

            # Use cache keyed by uploaded_file_id, label, and filter params so cached results respect filters.
            return self._get_or_create_fixed_insights_cached(
                uploaded_file_id,
                label,
                user_id,
                limit,
                order,
                order_direction,
                since,
                until,
            )
        finally:
            db.close()

    @functools.lru_cache(maxsize=128)
    def _get_or_create_fixed_insights_cached(
        self,
        uploaded_file_id: int,
        label: str,
        user_id: int | None,
        limit: int,
        order: Optional[str],
        order_direction: str,
        since: Optional[str],
        until: Optional[str],
    ) -> dict:
        """
        LRU-cached retrieval and creation of fixed insights. Cache key now includes
        filter parameters so different filters are cached separately.

        Fetches rows using the filters and asks the LLM the _INFERENCE_QUESTIONS_ in parallel.
        Persists a payload that includes filter metadata.

        NOTE: `answers` is returned as a list of dicts with keys:
            - "question": canonical question id (e.g. "q1")
            - "answer": the parsed LLM answer (dict)
        """
        db = SessionLocal()
        try:
            # Check DB cache first (we still check by uploaded_file_id but we don't assume cached content
            # is valid for different filters; since cache key includes filter args, repeated calls with same filters will hit)
            cached = (
                db.query(LLMInsight)
                .filter(LLMInsight.uploaded_file_id == uploaded_file_id)
                .order_by(LLMInsight.created_at.desc())
                .first()
            )
            # If DB cached record exists and its persisted filters match the requested filters, reuse it.
            if cached:
                try:
                    cached_payload = json.loads(cached.insights_json)
                    if (
                        cached_payload.get("uploaded_file_id") == uploaded_file_id
                        and cached_payload.get("label") == label
                        and cached_payload.get("filters", {})
                        == {
                            "limit": limit,
                            "order": order,
                            "order_direction": order_direction,
                            "since": since,
                            "until": until,
                        }
                    ):
                        logger.info(
                            f"[LRU/DB hit] Returning cached insights for file_id={uploaded_file_id} label={label}"
                        )
                        return cached_payload
                except Exception:
                    # fall through to recalc if parsing/check fails
                    pass

            questions = LLMService._INFERENCE_QUESTIONS

            # Fetch dataset slice once using the filtering params
            rows = self._fetch_rows(
                user_id=user_id,
                file_id=uploaded_file_id,
                limit=limit,
                order=order,
                order_direction=order_direction,
                since=since,
                until=until,
            )
            if not rows:
                raise ValueError(
                    f"No data available for uploaded_file_id '{uploaded_file_id}' with given filters"
                )

            df = pd.DataFrame(rows)
            df_str = df.to_string(max_rows=100, max_cols=20)

            # Ask questions in parallel to reduce total latency
            def ask_one(question_text: str) -> dict:
                prompt = f"""
                Context: You analyze restaurant operations data.
                Label: {label}
                DataFrame sample: {df_str}

                Question: {question_text}

                Return STRICT JSON ONLY with keys exactly:
                {{
                "summary": "string",
                "insights": [{{"title": "string", "description": "string", "metrics": {{"string": "string"}}}}],
                "recommendations": [{{"title": "string", "description": "string", "expected_impact": "string"}}],
                "data_limitations": ["string"]
                }}
                """
                # Create a lightweight client per thread for safety
                client = self.openai_client
                resp = client.chat.completions.create(
                    model=LLMService._MODEL_NAME,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a meticulous data scientist. Output must be valid JSON only, no code fences, no extra commentary, matching the user-provided schema exactly.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                )
                content = resp.choices[0].message.content if resp.choices else None
                if not content:
                    return {"error": "No content from LLM"}
                logger.info(f"Received response from LLM for question: {question_text}")
                return self.parse_llm_output(content)

            # collect answers keyed by q index then transform to list
            answers_map: dict = {}
            answers_list: list = {}
            answers_map = {}
            with ThreadPoolExecutor(max_workers=min(5, len(questions))) as executor:
                future_to_idx = {
                    executor.submit(ask_one, q): idx
                    for idx, q in enumerate(questions, start=1)
                }
                for future in as_completed(future_to_idx):
                    idx = future_to_idx[future]
                    try:
                        answers_map[f"q{idx}"] = future.result()
                    except Exception as ex:
                        logger.exception(f"LLM question q{idx} failed: {ex}")
                        answers_map[f"q{idx}"] = {"error": str(ex)}

            # Transform dict-of-answers to list-of-dicts: [{"question":"q1","answer":{...}}, ...]
            answers_list = [
                {
                    "question": f"q{idx}",
                    "answer": answers_map.get(f"q{idx}"),
                    "question_text": questions[idx - 1],
                }
                for idx in range(1, len(questions) + 1)
            ]

            payload = {
                "label": label,
                "uploaded_file_id": uploaded_file_id,
                "filters": {
                    "limit": limit,
                    "order": order,
                    "order_direction": order_direction,
                    "since": since,
                    "until": until,
                },
                "answers": answers_list,
            }

            # Persist to DB
            record = LLMInsight(
                uploaded_file_id=uploaded_file_id,
                user_id=user_id or 0,
                label=label,
                insights_json=json.dumps(payload),
            )
            db.add(record)
            db.commit()
            logger.info(
                f"Persisted LLM insights for label={label}, file_id={uploaded_file_id} with filters={payload['filters']}"
            )
            return payload
        finally:
            db.close()

    def _fetch_rows(
        self,
        user_id: Optional[int],
        file_id: Optional[int],
        limit: int,
        order: Optional[str],
        order_direction: str,
        since: Optional[str],
        until: Optional[str],
    ) -> List[dict]:
        """
        Fetch rows filtered by uploaded_file_id (or infer latest by user), date range, and optionally order.
        - If order == 'uploaded_at' we apply DB-level ordering on KitchenLogRow.uploaded_at.
        - If order is any other string, we fetch rows and sort in-Python by row.row_data.get(order).
        Returns up to `limit` row_data dicts.
        """
        db = SessionLocal()
        try:
            uploaded_file_id = file_id
            if uploaded_file_id is None:
                qmeta = db.query(UploadedFileMeta)
                if user_id is not None:
                    qmeta = qmeta.filter(UploadedFileMeta.user_id == user_id)
                meta = qmeta.order_by(UploadedFileMeta.uploaded_at.desc()).first()
                if not meta:
                    return []
                uploaded_file_id = meta.id

            qrows = db.query(KitchenLogRow).filter(
                KitchenLogRow.uploaded_file_id == uploaded_file_id
            )
            if user_id is not None:
                qrows = qrows.filter(KitchenLogRow.user_id == user_id)

            # Apply date filters on KitchenLogRow.uploaded_at if provided
            if since:
                try:
                    since_dt = datetime.fromisoformat(since)
                    qrows = qrows.filter(KitchenLogRow.uploaded_at >= since_dt)
                except Exception:
                    raise ValueError(
                        "Invalid 'since' datetime. Provide ISO8601 string."
                    )

            if until:
                try:
                    until_dt = datetime.fromisoformat(until)
                    qrows = qrows.filter(KitchenLogRow.uploaded_at <= until_dt)
                except Exception:
                    raise ValueError(
                        "Invalid 'until' datetime. Provide ISO8601 string."
                    )

            # If ordering by uploaded_at we can do DB ordering and limit directly
            if order == "uploaded_at":
                if order_direction == "asc":
                    qrows = qrows.order_by(KitchenLogRow.uploaded_at.asc())
                else:
                    qrows = qrows.order_by(KitchenLogRow.uploaded_at.desc())
                rows = qrows.limit(limit).all()
                return [r.row_data for r in rows]

            # Otherwise, we fetch a reasonable batch, sort in Python by the JSON key, and then slice to limit.
            # To avoid unbounded fetch, cap the rows we read to a reasonable maximum
            cap = max(limit, 100)
            rows = qrows.limit(cap).all()
            # sort in Python by the JSON key `order`; missing keys are treated as None and order last
            if order:
                reverse = order_direction == "desc"

                def sort_key(r):
                    try:
                        val = r.row_data.get(order)
                        return (0, val) if val is not None else (1, None)
                    except Exception:
                        return (1, None)

                rows_sorted = sorted(rows, key=sort_key, reverse=reverse)
            else:
                # No ordering requested; return rows in DB default order (most recent first)
                rows_sorted = rows

            selected = rows_sorted[:limit]
            return [r.row_data for r in selected]
        finally:
            db.close()

    def parse_llm_output(self, llm_response: str) -> dict:
        """
        Parse the JSON response from the LLM and return it as a Python dictionary.
        """
        try:
            # Extract JSON content from the LLM response
            json_match = re.search(r"```(?:json)?\s*(.+?)```", llm_response, re.DOTALL)

            if json_match:
                # Found JSON in code block
                json_str = json_match.group(1).strip()
            else:
                # Try to find JSON-like content directly
                json_str = llm_response.strip()

                # Remove any non-JSON text at the beginning or end
                start_idx = json_str.find("{")
                end_idx = json_str.rfind("}")

                if start_idx >= 0 and end_idx >= 0:
                    json_str = json_str[start_idx : end_idx + 1]

            # Parse the JSON string into a Python dictionary
            parsed_data = json.loads(json_str)
            return parsed_data

        except json.JSONDecodeError as e:
            # Handle JSON parsing errors
            logger.exception(f"Error parsing JSON: {e}")
            return {"error": "Failed to parse LLM response as JSON"}
        except Exception as e:
            # Handle any other unexpected errors
            logger.exception(f"Unexpected error: {e}")
            return {"error": f"Unexpected error: {str(e)}"}
