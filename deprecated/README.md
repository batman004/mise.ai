# Deprecated Docker Compose Files

This directory contains deprecated Docker Compose configuration files that have been replaced by Kubernetes deployments.

## Migration Notice

The Mise AI Platform has migrated from Docker Compose to Kubernetes as the primary deployment method. This provides:

- Better scalability with KEDA auto-scaling
- Improved resource management
- Production-ready deployment patterns
- Individual service logging and management

## What's Deprecated

- `docker-compose.yml` - Main Docker Compose configuration
- All Docker Compose-based Makefile commands in the parent directory

## How to Use Kubernetes Instead

1. **Navigate to Kubernetes directory:**
   ```bash
   cd k8s
   ```

2. **View available commands:**
   ```bash
   make help
   ```

3. **Deploy the platform:**
   ```bash
   make deploy
   ```

4. **View individual service logs:**
   ```bash
   make logs-frontend      # Frontend logs
   make logs-core-server   # Backend API logs
   make logs-ml-server     # ML API logs
   make logs-ml-worker     # ML worker logs
   make logs-postgres      # Database logs
   make logs-redis         # Cache logs
   make logs-rabbitmq      # Message broker logs
   ```

## Emergency Fallback

If you need to temporarily use Docker Compose for development:

1. Copy the file back:
   ```bash
   cp deprecated/docker-compose.yml .
   ```

2. Use Docker Compose commands directly:
   ```bash
   docker-compose up -d
   docker-compose logs -f
   ```

**Note:** This is not recommended for production use.
