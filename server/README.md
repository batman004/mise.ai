# Mise - Core Backend Server

FastAPI backend server for the Mise AI-powered restaurant food logistics optimization platform. Handles data uploads, queries, predictions, and LLM-powered insights.

## Overview

The server is modularized into separate files for clarity:
- `main.py` → Application entrypoint (runs the FastAPI server).
- `routers.py` → Defines the API routes/endpoints.
- `controllers.py` → Contains business logic for handling uploads and queries.
- `config.py` → Configuration settings (e.g., server port, logging).
- `models.py` → Pydantic models for request/response validation.

Logging is handled using **Loguru**, and proper exception handling is included.

The core backend server provides:

- **REST API** for frontend communication
- **Data Management** - CSV uploads, sales data queries
- **Prediction Services** - Wastage prediction requests (sync/async)
- **LLM Services** - Fixed insights generation and natural language question answering
- **Message Queue Consumers** - Process prediction and LLM results from ML server

## 🚀 Getting Started

## Architecture

- **API Server** (`main.py`) - FastAPI application serving REST endpoints
- **Workers** (`consumer.py`, `llm_result_consumer.py`) - Background consumers for RabbitMQ messages
- **Database** - PostgreSQL for persistent data storage
- **Message Queue** - RabbitMQ for asynchronous task processing
- **Services** - Business logic layer (`services/`)

## Prerequisites

- **Python 3.11+**
- **PostgreSQL** (local or Docker or Kubernetes)
- **RabbitMQ** (local or Docker or Kubernetes)
- **Redis** (for ML server job tracking)

## Quick Start

To be noted however, the server is meant to be ran through kubernetes to access other services.
The following is only given as a reference.

### 1. Set up environment variables

Create a `.env` file from the template:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://mise_user:mise_password@localhost:5432/mise_db

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=admin

# ML Server
ML_SERVER_URL=http://localhost:8001

# OpenAI (for LLM features)
OPENAI_API_KEY=your_openai_api_key_here

# Upload directory
UPLOAD_DIR=./uploads
```

### 2. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate   # On Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Initialize database (optional if done already)

```bash
# Ensure PostgreSQL is running
psql -U mise_user -d mise_db -f init.sql
```

### 5. Run the API server

```bash
python main.py
```

The API will be available at:

- **API**: http://localhost:8000/api
- **Docs**: http://localhost:8000/api/docs
- **Health**: http://localhost:8000/api/health

### 6. Run workers (optional, for background processing)

In separate terminals:

```bash
# Prediction result consumer
python consumer.py

# LLM result consumer
python llm_result_consumer.py
```

## Docker

Build and run with Docker:

```bash
# Build image
docker build -t mise-ai-core-server:latest .

# Run container
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://mise_user:mise_password@postgres:5432/mise_db \
  -e RABBITMQ_HOST=rabbitmq \
  -e OPENAI_API_KEY=your_key \
  --network app_net \
  mise-ai-core-server:latest
```

## API Endpoints

### Data Management

#### Upload CSV

**POST** `/api/data/upload`

Upload a CSV file for analysis.

**Request (multipart/form-data):**

- `file`: CSV file
- `label`: Optional label for the file
- `notes`: Optional notes
- `user_id`: User ID (required)

**Response:**

```json
{
  "id": 1,
  "label": "demo_db_1",
  "filename": "./uploads/abc123_sample_data.csv",
  "original_name": "sample_data.csv",
  "uploaded_at": "2025-01-15T10:30:00"
}
```

#### Get Sales Data

**GET** `/api/data/sales`

Query sales data with filtering and pagination.

**Query Parameters:**

- `user_id`: User ID (required)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 1000)
- `order`: Column name to sort by
- `order_direction`: "asc" or "desc" (default: "asc")
- `since`: ISO datetime start filter (inclusive)
- `until`: ISO datetime end filter (inclusive)
- `with_metrics`: Include calculated metrics (default: false)

### Predictions

#### Create Prediction Request

**POST** `/api/prediction/wastage`

Create a prediction request (async for low priority, sync for high priority).

**Request (form-data):**

- `date`: Date in YYYY-MM-DD format
- `priority`: "high" or "low" (default: "low")
- `user_id`: User ID (default: "default_user")

#### Get Prediction Results

**GET** `/api/prediction/results`

Get paginated prediction results for a user.

**Query Parameters:**

- `user_id`: User ID (required)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 1000)

#### Immediate Prediction

**POST** `/api/prediction/wastage/immediate`

Create a high-priority prediction and return result immediately.

**Request (form-data):**

- `date`: Date in YYYY-MM-DD format
- `user_id`: User ID (default: "default_user")

### LLM Services

#### Create Fixed Insights Job

**POST** `/api/llm/fixed-insights/{user_id}`

Create a job to generate fixed LLM insights.

**Query Parameters:**

- `file_id`: Optional uploaded file ID (defaults to latest)
- `limit`: Max rows to analyze (1-100, default: 50)
- `order`: Column to sort by
- `order_direction`: "asc" or "desc" (default: "asc")
- `since`: ISO datetime start filter
- `until`: ISO datetime end filter

**Response:**

```json
{
  "job_id": 123,
  "status": "pending"
}
```

#### Get Fixed Insights Status

**GET** `/api/llm/fixed-insights/{user_id}`

Get status/result for a fixed insights job.

**Query Parameters:**

- `job_id`: Optional job ID (defaults to most recent completed)

#### Ask Question

**POST** `/api/llm/question`

Ask a natural language question about user's data.

**Request Body:**

```json
{
  "question": "Show me a wastage summary",
  "user_id": 1
}
```

**Response:**

```json
{
  "answer": "Based on your data...",
  "key_points": ["Point 1", "Point 2"],
  "data_points": [...]
}
```

## Workers

### Prediction Result Consumer

Processes prediction results from the ML server:

```bash
python consumer.py
```

Listens to `prediction_result_queue` and stores results in PostgreSQL.

### LLM Result Consumer

Processes LLM results from the ML server:

```bash
python llm_result_consumer.py
```

Listens to `llm_result_queue` and stores results in PostgreSQL.

## Project Structure

```
server/
├── main.py                 # FastAPI application entry point
├── routers.py             # API route definitions
├── controllers.py         # Business logic controllers
├── models.py              # Pydantic request/response models
├── config.py              # Configuration settings
├── db.py                  # Database models and connection
├── consumer.py            # Prediction result consumer
├── llm_result_consumer.py # LLM result consumer
├── queue_helper.py        # RabbitMQ helper utilities
├── exceptions.py          # Custom exceptions
├── init.sql               # Database initialization script
├── services/              # Business logic services
│   ├── upload_service.py
│   ├── query_service.py
│   ├── insights_service.py
│   ├── question_service.py
│   ├── llm_service.py
│   └── parsers/           # File parsers (CSV, Excel, OCR)
├── uploads/               # Uploaded file storage
├── requirements.txt       # Python dependencies
├── Dockerfile             # Docker build configuration
└── env.example            # Environment variables template
```

## Environment Variables

See `env.example` for all available environment variables. Key variables:

- `DATABASE_URL` - PostgreSQL connection string
- `RABBITMQ_HOST` - RabbitMQ host
- `RABBITMQ_PORT` - RabbitMQ port
- `RABBITMQ_USER` - RabbitMQ username
- `RABBITMQ_PASSWORD` - RabbitMQ password
- `ML_SERVER_URL` - ML server API URL
- `OPENAI_API_KEY` - OpenAI API key (for LLM features)
- `UPLOAD_DIR` - Directory for uploaded files

## Database Schema

The database includes:

- `users` - User accounts
- `uploaded_file_meta` - Uploaded CSV metadata
- `sales_data` - Parsed sales data
- `prediction_results` - ML prediction results
- `llm_jobs` - LLM job tracking and results

See `init.sql` for the complete schema.

## Logging

The server uses **Loguru** for logging. Logs include:

- API requests and responses
- Database operations
- Queue operations
- Error handling

## Health Check

**GET** `/api/health`

Returns health status of the API and dependencies (database, RabbitMQ).

## Integration

The server integrates with:

- **Frontend** (`app/`) - React dashboard
- **ML Server** (`ml_server/`) - ML inference and LLM services
- **PostgreSQL** - Data persistence
- **RabbitMQ** - Message queue for async processing
- **Redis** - Used by ML server for job tracking

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Ensure database exists and user has permissions

### RabbitMQ Connection Issues

- Verify RabbitMQ is running
- Check RabbitMQ credentials in `.env`
- Test connection: `python -c "from queue_helper import rabbitmq_helper; rabbitmq_helper.connect()"`

### Workers Not Processing

- Ensure workers are running (`consumer.py`, `llm_result_consumer.py`)
- Check RabbitMQ queues exist
- Verify ML server is sending messages

### API Not Responding

- Check server logs for errors
- Verify port 8000 is available
- Check health endpoint: `curl http://localhost:8000/api/health`

## Development

For development with hot reload:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

For production:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```
