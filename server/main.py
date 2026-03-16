from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import uvicorn

from routers import router as api_router


app = FastAPI(
    title="Mise Backend API",
    root_path="/api",
    docs_url="/docs",
    openapi_url="/openapi.json",
    servers=[{"url": "/api"}],
)

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def all_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: {}", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/health", response_model=dict)
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        from db import get_db_connection

        db_conn = get_db_connection()
        db_status = "healthy" if db_conn else "unhealthy"
        if db_conn:
            db_conn.close()

        # Check RabbitMQ connection
        from queue_helper import rabbitmq_helper

        rabbitmq_status = "healthy" if rabbitmq_helper.connect() else "unhealthy"
        rabbitmq_helper.disconnect()

        return {
            "status": "healthy",
            "timestamp": str(int(__import__("time").time())),
            "services": {"database": db_status, "rabbitmq": rabbitmq_status},
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": str(int(__import__("time").time())),
            "error": str(e),
        }


@app.get("/", response_model=dict)
async def init():
    return {
        "status": "ok",
        "message": "Mise Backend API is running",
        "hot_reload": "working",
        "timestamp": "2025-10-13",
        "test": "live_reload",
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
