# mise.ai

An AI-powered restaurant analytics platform that helps restaurants reduce food waste, optimize ordering, and make data-driven decisions through ML predictions, LLM-powered insights, and interactive dashboards.

[Demo](https://drive.google.com/file/d/12nXTgJ7vRmBXKUr8yWGCmMhB5bLMGjS_/view)

## Architecture

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Frontend   │       │   Core Server    │       │    ML Server     │
│  React/Vite  │──────▶│    FastAPI       │──────▶│    FastAPI       │
│  :3000 (dev) │  HTTP │    :8000         │  HTTP │    :8001         │
└──────────────┘       └────────┬─────────┘       └───────┬──────────┘
                                │                         │
                       ┌────────▼─────────┐      ┌────────▼──────────┐
                       │   PostgreSQL     │      │    RabbitMQ       │
                       │   Data store     │      │   Task queues     │
                       └──────────────────┘      └────────┬──────────┘
                                                          │
                                                 ┌────────▼──────────┐
                                                 │  Workers (KEDA)   │
                                                 │  ML + LLM tasks   │
                                                 │  Redis job state  │
                                                 └───────────────────┘
```

**Request flow:** The React frontend talks to the Core Server over REST. The Core Server handles data persistence in PostgreSQL and delegates ML/LLM work to the ML Server. Async tasks (predictions, insight generation) are enqueued via RabbitMQ, processed by auto-scaling workers, and results are written back through Redis and result queues.

## Features

- **Dashboard** — Sales metrics, monthly trends, wastage analysis, weather impact charts
- **Data upload** — Drag-and-drop CSV/Excel/image (OCR) ingestion with duplicate detection
- **ML predictions** — Random Forest models predict food wastage and recommended order quantities per menu item
- **LLM insights** — Natural-language Q&A over your restaurant data, plus auto-generated insight reports (busiest periods, waste drivers, profitability, ordering recommendations)
- **AI assistant** — Conversational interface in the app header for quick data questions
- **PDF reports** — Generated and emailed asynchronously via Brevo SMTP
- **Auto-scaling** — KEDA scales ML and LLM workers from 0–10 replicas based on RabbitMQ queue depth

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript, Vite, TanStack Router + Query, Zustand, Tailwind CSS, shadcn/ui, Recharts |
| **Core Server** | Python, FastAPI, SQLAlchemy, PostgreSQL, RabbitMQ (pika), OpenAI SDK |
| **ML Server** | Python, FastAPI, scikit-learn (Random Forest), OpenAI, Vertex AI (Gemini), Redis |
| **Infrastructure** | Kubernetes, KEDA, Nginx Ingress, Docker |

## Project Structure

```
mise.ai/
├── app/                    # React frontend
│   ├── src/
│   │   ├── components/     # UI components, charts, AI assistant
│   │   ├── routes/         # File-based routing (TanStack Router)
│   │   └── services/       # API clients, domain logic, stores
│   └── Dockerfile
├── server/                 # Core backend API
│   ├── services/           # Business logic (upload, query, insights, reports)
│   │   └── parsers/        # CSV, Excel, OCR parsers
│   ├── consumer.py         # RabbitMQ result consumers
│   └── Dockerfile
├── ml_server/              # ML inference + LLM server
│   ├── general_model/      # Wastage prediction (Random Forest)
│   ├── specific_model/     # Per-item quantity prediction (Random Forest)
│   ├── llm_service.py      # OpenAI primary, Vertex AI fallback (24+ regions)
│   ├── queue_worker.py     # Prediction queue consumer
│   ├── llm_worker.py       # LLM queue consumer
│   └── Dockerfile
├── k8s/                    # Kubernetes manifests + KEDA scaling
│   ├── deploy.sh           # One-command deployment
│   └── cleanup.sh          # Teardown
├── nginx/                  # Reverse proxy config
├── Makefile                # Build/deploy shortcuts
└── DEPLOYMENT.md           # Detailed deployment guide
```

## Getting Started

### Prerequisites

- **Docker** and **Kubernetes** (minikube, kind, or a cloud cluster)
- **kubectl** configured for your cluster
- **KEDA** installed ([docs](https://keda.sh/docs/deploy/))
- An **OpenAI API key**
- *(Optional)* Google Cloud service account for Vertex AI fallback

### Deploy to Kubernetes

```bash
# 1. Build all images
docker build -t mise-ai-frontend:latest ./app
docker build -t mise-ai-core-server:latest ./server
docker build -t mise-ai-ml-server:latest ./ml_server

# 2. Load images into your cluster (minikube example)
minikube image load mise-ai-frontend:latest
minikube image load mise-ai-core-server:latest
minikube image load mise-ai-ml-server:latest

# 3. Configure secrets
cp k8s/secrets.example.yaml k8s/secrets.yaml
# Edit k8s/secrets.yaml with your base64-encoded OpenAI key:
#   echo -n "sk-your-key" | base64

# 4. Deploy everything
cd k8s && ./deploy.sh

# 5. Add local DNS
echo "127.0.0.1 mise-ai.local" | sudo tee -a /etc/hosts

# 6. Open the app
open http://mise-ai.local
```

### Local Development (individual services)

Each service can run standalone for development. See the README in each directory:

- [`app/README.md`](app/README.md) — `pnpm install && pnpm dev` (port 3000)
- [`server/README.md`](server/README.md) — `pip install -r requirements.txt && python main.py` (port 8000)
- [`k8s/README.md`](k8s/README.md) — Kubernetes deployment details and KEDA tuning

## ML Models

### General Model — Food Wastage Prediction

Predicts **wastage amount** using contextual features: food type, guest count, event type, storage conditions, seasonality, preparation method, and pricing. Trained on labeled food wastage data with a Random Forest regressor (200 estimators).

### Specific Model — Per-Item Quantity Prediction

Predicts **quantity sold** and **recommended order quantity** for each menu item on a given date. Takes into account weather, special events, day-of-week patterns, and historical item-level data.

## LLM Pipeline

The platform uses a dual-provider LLM setup:

1. **Primary** — OpenAI (`gpt-5-nano`) for fast, cost-effective responses
2. **Fallback** — Google Vertex AI (`gemini-2.5-flash`) with automatic regional failover across 24+ GCP regions

LLM capabilities:
- **Natural-language Q&A** — Ask questions about your uploaded data
- **Fixed insights** — Auto-generated analysis covering busiest periods, weather/event impact, profitability, waste drivers, and ordering optimization
- **In-memory caching** — Recent answers cached (100 entries, 1h TTL) to reduce redundant API calls

## Environment Variables

Each service reads from its own `.env` file (see `env.example` in each directory). Key variables:

| Variable | Service | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | server | PostgreSQL connection string |
| `RABBITMQ_HOST/PORT/USER/PASSWORD` | server, ml_server | Message broker credentials |
| `ML_SERVER_URL` | server | ML server endpoint (default: `http://ml-server:8001`) |
| `OPENAI_API_KEY` | server, ml_server | LLM access |
| `VERTEXAI_PROJECT_ID` | ml_server | Google Cloud project for Gemini fallback |
| `VITE_API_URL` | app | Backend API endpoint |

## API Reference

The Core Server exposes a REST API at `/api`. Key endpoint groups:

| Group | Endpoints | Description |
|-------|-----------|-------------|
| **Data** | `POST /data/upload`, `GET /data/sales` | File upload (CSV/Excel/OCR) and paginated sales queries with metrics |
| **Predictions** | `POST /prediction/wastage`, `GET /prediction/results` | Create sync/async predictions, fetch results |
| **LLM** | `POST /llm/question`, `POST/GET /llm/fixed-insights/{user_id}` | Q&A and generated insight reports |
| **Reports** | `POST /report/generate` | PDF report generation and email delivery |
| **Health** | `GET /health` | Service health check (DB + RabbitMQ) |

Interactive API docs available at `/api/docs` when the server is running.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
