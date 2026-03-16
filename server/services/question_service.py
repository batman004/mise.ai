import json
import hashlib
from typing import Dict, List, Any
from loguru import logger
import httpx
import os

from db import SessionLocal, KitchenLogRow, UploadedFileMeta


class QuestionService:
    """Service for handling LLM-based questions with caching"""

    def __init__(self):
        self.ml_server_url = os.getenv("ML_SERVER_URL", "http://ml-server:8001")
        # In-memory cache for question results
        # Format: {cache_key: {result: {...}, timestamp: ...}}
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._max_cache_size = 100  # Keep last 100 responses
        self._cache_ttl = 3600  # 1 hour TTL

    def _get_cache_key(self, question: str, user_id: int, rows_data: List[Dict]) -> str:
        """Generate a cache key based on question, user_id, and data hash"""
        # Create a hash of the rows_data to uniquely identify the dataset
        data_hash = hashlib.md5(
            json.dumps(rows_data, sort_keys=True).encode()
        ).hexdigest()
        cache_input = f"{question}:{user_id}:{data_hash}"
        return hashlib.md5(cache_input.encode()).hexdigest()

    def _get_rows_for_user(self, user_id: int, limit: int = 100) -> List[Dict]:
        """Fetch the first N rows for a user from the database"""
        db = SessionLocal()
        try:
            # Get the latest uploaded file for the user
            meta = (
                db.query(UploadedFileMeta)
                .filter(UploadedFileMeta.user_id == user_id)
                .order_by(UploadedFileMeta.uploaded_at.desc())
                .first()
            )

            if not meta:
                logger.warning(f"No uploaded files found for user {user_id}")
                return []

            # Fetch rows from the latest file
            rows = (
                db.query(KitchenLogRow)
                .filter(
                    KitchenLogRow.user_id == user_id,
                    KitchenLogRow.uploaded_file_id == meta.id,
                )
                .order_by(KitchenLogRow.id.asc())
                .limit(limit)
                .all()
            )

            return [r.row_data for r in rows]
        except Exception as e:
            logger.error(f"Error fetching rows for user {user_id}: {e}")
            return []
        finally:
            db.close()

    async def ask_question(self, question: str, user_id: int) -> Dict[str, Any]:
        """
        Ask a question and get an answer from the LLM service.

        Args:
            question: The user's question
            user_id: The user's ID

        Returns:
            Dictionary with answer, key_points, and data_points_referenced
        """
        try:
            # Fetch the first 100 rows for the user
            rows_data = self._get_rows_for_user(user_id, limit=100)

            if not rows_data:
                return {
                    "answer": "No data available to answer this question.",
                    "key_points": [],
                    "data_points_referenced": {},
                    "cached": False,
                }

            # Check cache
            cache_key = self._get_cache_key(question, user_id, rows_data)
            if cache_key in self._cache:
                cached_result = self._cache[cache_key]
                logger.info(f"Cache hit for question: {question[:50]}...")
                result = cached_result["result"].copy()
                result["cached"] = True
                return result

            # Call LLM service
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.ml_server_url}/llm/question",
                    json={
                        "question": question,
                        "rows_data": rows_data,
                        "user_id": user_id,
                    },
                )

                if response.status_code != 200:
                    raise Exception(f"LLM service error: {response.text}")

                result = response.json()

                # Store in cache
                self._cache[cache_key] = {
                    "result": result,
                    "timestamp": __import__("time").time(),
                }

                # Enforce max cache size by removing oldest entries
                if len(self._cache) > self._max_cache_size:
                    oldest_key = min(
                        self._cache.keys(), key=lambda k: self._cache[k]["timestamp"]
                    )
                    del self._cache[oldest_key]

                result["cached"] = False
                logger.info(f"Answered question (cache miss): {question[:50]}...")

                return result

        except Exception as e:
            logger.error(f"Error asking question: {e}")
            return {
                "answer": f"An error occurred while processing your question: {str(e)}",
                "key_points": [],
                "data_points_referenced": {},
                "cached": False,
            }


# Singleton instance
question_service = QuestionService()
