# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies for scientific libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    gfortran \
    libopenblas-dev \
    liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install FastAPI and Uvicorn (not in requirements.txt)
RUN pip install --no-cache-dir fastapi uvicorn[standard]

# Copy application files
COPY . .

# Expose the port the app runs on
EXPOSE 8001

# Run the application (production mode for Kubernetes)
CMD ["uvicorn", "api_main:app", "--host", "0.0.0.0", "--port", "8001"]
