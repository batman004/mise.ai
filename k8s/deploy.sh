#!/bin/bash

# Mise AI Platform - Kubernetes Deployment Script
# This script deploys the complete Mise AI platform with KEDA auto-scaling

set -e

echo "🚀 Deploying Mise AI Platform with KEDA..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if KEDA is installed
if ! helm list -n keda | grep "keda" &> /dev/null; then
    echo "❌ KEDA is not installed via Helm. Please install KEDA first:"
    echo "   helm install keda kedacore/keda --namespace keda --create-namespace"
    exit 1
else
    echo "✅ KEDA is already installed via Helm"
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
kubectl wait --for=condition=available --timeout=100s deployment/postgres -n mise-ai
kubectl wait --for=condition=available --timeout=100s deployment/redis -n mise-ai
kubectl wait --for=condition=available --timeout=100s deployment/rabbitmq -n mise-ai

# Deploy application services
echo "🚀 Deploying application services..."
kubectl apply -f core-server-deployment.yaml
kubectl apply -f core-server-service.yaml
kubectl apply -f ml-server-deployment.yaml
kubectl apply -f ml-server-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml

# Deploy ML workers with KEDA scaling
echo "🤖 Deploying ML workers with KEDA auto-scaling..."
kubectl apply -f ml-worker-deployment.yaml
kubectl apply -f ml-worker-scaledobject.yaml
echo "🧠 Deploying LLM worker with KEDA auto-scaling..."
kubectl apply -f llm-worker-deployment.yaml
kubectl apply -f llm-worker-scaledobject.yaml

# Deploy ingress
echo "🌐 Deploying ingress..."
kubectl apply -f ingress.yaml

# Wait for all deployments to be ready
echo "⏳ Waiting for all deployments to be ready..."
kubectl wait --for=condition=available --timeout=100s deployment/core-server -n mise-ai || true
kubectl wait --for=condition=available --timeout=100s deployment/ml-server -n mise-ai || true
kubectl wait --for=condition=available --timeout=100s deployment/frontend -n mise-ai || echo "⚠️  Frontend deployment may be experiencing issues"

echo "✅ Deployment completed!"
echo ""
echo "📊 To check the status:"
echo "  kubectl get pods -n mise-ai"
echo "  kubectl get scaledobjects -n mise-ai"
echo ""
echo "🔍 To monitor KEDA scaling:"
echo "  kubectl get scaledobjects ml-worker-scaledobject -n mise-ai -w"
echo ""
echo "🌐 Access the application:"
echo ""
echo "  IMPORTANT: For local access with minikube, run:"
echo "    minikube tunnel"
echo ""
echo "  Then in a new terminal, add to /etc/hosts:"
echo "    echo '127.0.0.1 mise-ai.local' | sudo tee -a /etc/hosts"
echo ""
echo "  Or, for minikube IP access (without tunnel):"
echo "    MINIKUBE_IP=\$(minikube ip)"
echo "    echo '\$MINIKUBE_IP mise-ai.local' | sudo tee -a /etc/hosts"
echo ""
echo "  Then visit: http://mise-ai.local"
echo ""
echo "📈 RabbitMQ Management:"
echo "  http://mise-ai.local/rabbitmq (admin/admin)"
echo ""
echo "🔧 To view logs:"
echo "  kubectl logs -f deployment/ml-worker -n mise-ai"
echo "  kubectl logs -f deployment/ml-llm-worker -n mise-ai"
echo "  kubectl logs -f deployment/core-server -n mise-ai"
echo "  kubectl logs -f deployment/frontend -n mise-ai"
