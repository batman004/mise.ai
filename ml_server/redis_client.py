import redis
import json
import os
from typing import Dict, Any, Optional
from loguru import logger
from dotenv import load_dotenv

load_dotenv()


class RedisClient:
    """Redis client for job tracking and caching"""

    def __init__(self):
        self.host = os.getenv("REDIS_HOST", "redis")
        self.port = int(os.getenv("REDIS_PORT", "6379"))
        self.password = os.getenv("REDIS_PASSWORD", "")
        self.db = int(os.getenv("REDIS_DB", "0"))
        self.job_ttl = int(os.getenv("JOB_TTL_SECONDS", "86400"))

        self.client: Optional[redis.Redis] = None

    def connect(self) -> bool:
        """Connect to Redis"""
        try:
            self.client = redis.Redis(
                host=self.host,
                port=self.port,
                password=self.password if self.password else None,
                db=self.db,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )

            # Test connection
            self.client.ping()
            logger.info(f"Connected to Redis at {self.host}:{self.port}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            return False

    def disconnect(self):
        """Disconnect from Redis"""
        try:
            if self.client:
                self.client.close()
                logger.info("Disconnected from Redis")
        except Exception as e:
            logger.error(f"Error disconnecting from Redis: {e}")

    def set_job_status(
        self, job_id: str, status: str, data: Dict[str, Any] = None
    ) -> bool:
        """Set job status in Redis"""
        try:
            if not self.client:
                if not self.connect():
                    return False

            job_data = {
                "status": status,
                "timestamp": str(int(os.time())),
                "data": data or {},
            }

            key = f"job:{job_id}"
            self.client.setex(key, self.job_ttl, json.dumps(job_data))

            logger.info(f"Set job {job_id} status to {status}")
            return True

        except Exception as e:
            logger.error(f"Failed to set job status for {job_id}: {e}")
            return False

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status from Redis"""
        try:
            if not self.client:
                if not self.connect():
                    return None

            key = f"job:{job_id}"
            data = self.client.get(key)

            if data:
                return json.loads(data)
            return None

        except Exception as e:
            logger.error(f"Failed to get job status for {job_id}: {e}")
            return None

    def delete_job(self, job_id: str) -> bool:
        """Delete job from Redis"""
        try:
            if not self.client:
                if not self.connect():
                    return False

            key = f"job:{job_id}"
            result = self.client.delete(key)

            if result:
                logger.info(f"Deleted job {job_id}")
            return bool(result)

        except Exception as e:
            logger.error(f"Failed to delete job {job_id}: {e}")
            return False

    def is_job_duplicate(self, job_id: str) -> bool:
        """Check if job already exists (duplicate prevention)"""
        try:
            if not self.client:
                if not self.connect():
                    return False

            key = f"job:{job_id}"
            exists = self.client.exists(key)

            if exists:
                logger.warning(f"Duplicate job detected: {job_id}")

            return bool(exists)

        except Exception as e:
            logger.error(f"Failed to check job duplicate for {job_id}: {e}")
            return False

    def set_cache(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set cache value"""
        try:
            if not self.client:
                if not self.connect():
                    return False

            self.client.setex(key, ttl, json.dumps(value))
            logger.debug(f"Cached value for key: {key}")
            return True

        except Exception as e:
            logger.error(f"Failed to set cache for {key}: {e}")
            return False

    def get_cache(self, key: str) -> Optional[Any]:
        """Get cache value"""
        try:
            if not self.client:
                if not self.connect():
                    return None

            data = self.client.get(key)
            if data:
                return json.loads(data)
            return None

        except Exception as e:
            logger.error(f"Failed to get cache for {key}: {e}")
            return None

    def delete_cache(self, key: str) -> bool:
        """Delete cache value"""
        try:
            if not self.client:
                if not self.connect():
                    return False

            result = self.client.delete(key)
            return bool(result)

        except Exception as e:
            logger.error(f"Failed to delete cache for {key}: {e}")
            return False

    def get_job_stats(self) -> Dict[str, Any]:
        """Get job statistics"""
        try:
            if not self.client:
                if not self.connect():
                    return {}

            # Get all job keys
            job_keys = self.client.keys("job:*")

            stats = {
                "total_jobs": len(job_keys),
                "status_counts": {},
                "oldest_job": None,
                "newest_job": None,
            }

            timestamps = []

            for key in job_keys:
                data = self.client.get(key)
                if data:
                    job_data = json.loads(data)
                    status = job_data.get("status", "unknown")
                    timestamp = int(job_data.get("timestamp", 0))

                    # Count statuses
                    stats["status_counts"][status] = (
                        stats["status_counts"].get(status, 0) + 1
                    )

                    # Track timestamps
                    timestamps.append(timestamp)

            if timestamps:
                stats["oldest_job"] = min(timestamps)
                stats["newest_job"] = max(timestamps)

            return stats

        except Exception as e:
            logger.error(f"Failed to get job stats: {e}")
            return {}

    def health_check(self) -> Dict[str, Any]:
        """Health check for Redis connection"""
        try:
            if not self.client:
                if not self.connect():
                    return {"status": "unhealthy", "error": "Failed to connect"}

            # Test basic operations
            self.client.ping()

            # Get info
            info = self.client.info()

            return {
                "status": "healthy",
                "version": info.get("redis_version"),
                "uptime": info.get("uptime_in_seconds"),
                "connected_clients": info.get("connected_clients"),
                "used_memory": info.get("used_memory_human"),
            }

        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}


# Global instance
redis_client = RedisClient()
