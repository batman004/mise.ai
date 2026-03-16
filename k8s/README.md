# Mise AI Platform - Kubernetes Deployment with KEDA

This directory contains Kubernetes manifests for deploying the Mise AI platform with KEDA (Kubernetes Event-Driven Autoscaler) for auto-scaling the ML worker based on RabbitMQ queue metrics.

## Architecture Overview

The Kubernetes deployment includes:

- **Frontend**: React application served by nginx
- **Core Server**: FastAPI backend API
- **ML Server**: FastAPI ML inference API
- **ML Worker**: Auto-scaling worker with KEDA (scales based on queue length)
- **Infrastructure**: PostgreSQL, Redis, RabbitMQ
- **Ingress**: nginx ingress controller for external access

## KEDA Auto-Scaling Configuration

The ML worker uses KEDA to automatically scale based on RabbitMQ queue metrics:

- **Scaling Trigger**: RabbitMQ queue length
- **Scale Formula**: `ceil(queueLength / messageCount)`
- **Configuration**: 2 consumers for every 50 requests
- **Min Replicas**: 0 (scale to zero when no work)
- **Max Replicas**: 10
- **Polling Interval**: 30 seconds
- **Cooldown Period**: 300 seconds

### KEDA ScaledObject Details

```yaml
triggers:
  - type: rabbitmq
    metadata:
      queueName: prediction_queue
      queueLength: "50" # Scale up when queue has 50+ messages
      messageCount: "25" # Scale up when 25+ messages per consumer
```

This means:

- When queue has 50+ messages → Scale to 2 workers
- When queue has 100+ messages → Scale to 4 workers
- When queue has 0 messages → Scale to 0 workers

## Prerequisites

1. **Kubernetes Cluster** (minikube, kind, or cloud provider)
2. **kubectl** configured to access your cluster
3. **Docker** for building images
4. **nginx Ingress Controller** (if not using cloud load balancer)

## Quick Start

### 1. Build Docker Images

```bash
# Build all required images
docker build -t mise-ai-frontend:latest ./app
docker build -t mise-ai-core-server:latest ./server
docker build -t mise-ai-ml-server:latest ./ml_server
docker build -t mise-ai-ml-worker:latest ./ml_server
```

### 2. Load Images to Cluster (for local clusters)

```bash
# For minikube
minikube image load mise-ai-frontend:latest
minikube image load mise-ai-core-server:latest
minikube image load mise-ai-ml-server:latest
minikube image load mise-ai-ml-worker:latest

# For kind
kind load docker-image mise-ai-frontend:latest
kind load docker-image mise-ai-core-server:latest
kind load docker-image mise-ai-ml-server:latest
kind load docker-image mise-ai-ml-worker:latest
```

### 3. Configure Secrets

Update `secrets.yaml` with the OpenAI API key:

```bash
# Generate base64 encoded API key
echo -n "your-openai-api-key" | base64

# Update secrets.yaml with the encoded value
```

### 4. Deploy the Platform

```bash
# Run the deployment script
./deploy.sh
```

### 5. Access the Application

```bash
# Add to /etc/hosts (Linux/Mac) or C:\Windows\System32\drivers\etc\hosts (Windows)
echo "127.0.0.1 mise-ai.local" | sudo tee -a /etc/hosts

# Access the application
open http://mise-ai.local
```

## Monitoring KEDA Scaling

### Check ScaledObject Status

```bash
# View current scaling status
kubectl get scaledobjects -n mise-ai

# Watch scaling events
kubectl get scaledobjects ml-worker-scaledobject -n mise-ai -w
```

### Monitor Queue Metrics

```bash
# Check RabbitMQ queue status
kubectl port-forward svc/rabbitmq-service 15672:15672 -n mise-ai
# Visit http://localhost:15672 (admin/admin)
```

### View Worker Logs

```bash
# Watch ML worker logs
kubectl logs -f deployment/ml-worker -n mise-ai

# Check scaling events
kubectl describe scaledobject ml-worker-scaledobject -n mise-ai
```

## Configuration Files

| File                          | Purpose                       |
| ----------------------------- | ----------------------------- |
| `namespace.yaml`              | Creates the mise-ai namespace |
| `secrets.yaml`                | Contains OpenAI API key       |
| `*-deployment.yaml`           | Application deployments       |
| `*-service.yaml`              | Service definitions           |
| `ml-worker-scaledobject.yaml` | KEDA scaling configuration    |
| `ingress.yaml`                | External access configuration |
| `deploy.sh`                   | Automated deployment script   |
| `cleanup.sh`                  | Cleanup script                |

## KEDA Scaling Behavior

### Scale Up Conditions

- Queue length ≥ 50 messages
- Current replicas < max replicas (10)
- Cooldown period has passed (5 minutes)

### Scale Down Conditions

- Queue length < 50 messages
- Current replicas > min replicas (0)
- Cooldown period has passed (5 minutes)

### Scaling Formula

```
desiredReplicas = ceil(queueLength / messageCount)
```

With our configuration:

- 0-49 messages → 0 workers
- 50-99 messages → 2 workers
- 100-149 messages → 4 workers
- And so on...

## Troubleshooting

### Common Issues

1. **KEDA not scaling**:

   ```bash
   kubectl describe scaledobject ml-worker-scaledobject -n mise-ai
   kubectl logs -f deployment/keda-operator -n keda-system
   ```

2. **RabbitMQ connection issues**:

   ```bash
   kubectl logs -f deployment/rabbitmq -n mise-ai
   kubectl get svc rabbitmq-service -n mise-ai
   ```

3. **ML worker not processing**:
   ```bash
   kubectl logs -f deployment/ml-worker -n mise-ai
   kubectl get pods -n mise-ai -l app=ml-worker
   ```

### Debug Commands

```bash
# Check all resources
kubectl get all -n mise-ai

# Check KEDA resources
kubectl get scaledobjects,scaledjobs -n mise-ai

# Check queue status in RabbitMQ
kubectl exec -it deployment/rabbitmq -n mise-ai -- rabbitmqctl list_queues

# Test ML worker health
kubectl exec -it deployment/ml-worker -n mise-ai -- python -c "import sys; sys.exit(0)"
```

## Cleanup

```bash
# Remove all resources
./cleanup.sh

# Or manually
kubectl delete namespace mise-ai
```

## Performance Tuning

### Adjust KEDA Parameters

Edit `ml-worker-scaledobject.yaml`:

```yaml
spec:
  minReplicaCount: 1 # Keep at least 1 worker
  maxReplicaCount: 20 # Increase max workers
  pollingInterval: 15 # Check more frequently
  cooldownPeriod: 180 # Faster scale down
  triggers:
    - type: rabbitmq
      metadata:
        queueLength: "25" # Scale earlier
        messageCount: "10" # More workers per batch
```

### Resource Limits

Adjust in `ml-worker-deployment.yaml`:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```
