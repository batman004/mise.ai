#!/bin/bash

# Mise AI Platform - Simplified Deployment Script (without KEDA for now)
# This script deploys the platform without KEDA auto-scaling

set -e

echo "🚀 Deploying Mise AI Platform (without KEDA for now)..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f namespace.yaml

# Create secrets
echo "🔐 Creating secrets..."
kubectl apply -f secrets.yaml

# Deploy infrastructure services
echo "🏗️ Deploying infrastructure services..."
kubectl apply -f postgres-deployment.yaml
kubectl apply -f postgres-service.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f redis-service.yaml
kubectl apply -f rabbitmq-deployment.yaml
kubectl apply -f rabbitmq-service.yaml

# Wait for infrastructure to be ready
echo "⏳ Waiting for infrastructure services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n mise-ai
kubectl wait --for=condition=available --timeout=300s deployment/redis -n mise-ai
kubectl wait --for=condition=available --timeout=300s deployment/rabbitmq -n mise-ai

# Deploy application services
echo "🚀 Deploying application services..."
kubectl apply -f core-server-deployment.yaml
kubectl apply -f core-server-service.yaml
kubectl apply -f ml-server-deployment.yaml
kubectl apply -f ml-server-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml

# Deploy ML worker (without KEDA scaling for now)
echo "🤖 Deploying ML worker (manual scaling)..."
kubectl apply -f ml-worker-deployment.yaml

# Deploy ingress
echo "🌐 Deploying ingress..."
kubectl apply -f ingress.yaml

# Wait for all deployments to be ready
echo "⏳ Waiting for all deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/core-server -n mise-ai
kubectl wait --for=condition=available --timeout=300s deployment/ml-server -n mise-ai
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n mise-ai
kubectl wait --for=condition=available --timeout=300s deployment/ml-worker -n mise-ai

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 To check the status:"
echo "  kubectl get pods -n mise-ai"
echo ""
echo "🌐 Access the application:"
echo "  Add '127.0.0.1 mise-ai.local' to your /etc/hosts file"
echo "  Then visit: http://mise-ai.local"
echo ""
echo "📈 RabbitMQ Management:"
echo "  http://mise-ai.local/rabbitmq (admin/admin)"
echo ""
echo "🔧 To view logs:"
echo "  kubectl logs -f deployment/ml-worker -n mise-ai"
echo "  kubectl logs -f deployment/core-server -n mise-ai"
echo ""
echo "ℹ️  Note: KEDA auto-scaling is not enabled yet. ML workers will run with manual scaling."
echo "   To enable KEDA later, install KEDA and apply ml-worker-scaledobject.yaml"