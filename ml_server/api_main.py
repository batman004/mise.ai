from fastapi import FastAPI
from loguru import logger
import os
from router import router

# Set root_path if running behind a proxy with path prefix
root_path = os.getenv("ROOT_PATH", "")
app = FastAPI(title="Prediction Model API", root_path=root_path)

# Add route definition
app.include_router(router, prefix="", tags=["Data Handlers"])


@app.get("/health", response_model=dict)
async def health_check():
    """
    Lightweight health check endpoint.
    Only performs basic connectivity checks without establishing full connections.
    """
    try:
        import time

        # Simple health check - just return that the service is up
        # Avoid unnecessary connections to external services
        return {
            "status": "healthy",
            "service": "ml-server",
            "timestamp": str(int(time.time())),
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": str(int(__import__("time").time())),
            "error": str(e),
        }


@app.get("/health/detailed", response_model=dict)
async def detailed_health_check():
    """
    Detailed health check endpoint with Redis connectivity test.
    Use this for manual health checks, not for Kubernetes probes.
    """
    try:
        import time
        from redis_client import redis_client

        # Check Redis connection
        redis_health = redis_client.health_check()

        return {
            "status": "healthy",
            "service": "ml-server",
            "timestamp": str(int(time.time())),
            "services": {"redis": redis_health},
        }
    except Exception as e:
        logger.error(f"Detailed health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": str(int(__import__("time").time())),
            "error": str(e),
        }


@router.get("/", response_model=dict)
async def init():
    return {"status": "ok", "message": "Prediction Model API is running"}


if __name__ == "__main__":
    import uvicorn

    # Run API
    uvicorn.run("api_main:app", host="127.0.0.1", port=8001, reload=True)
