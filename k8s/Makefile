# Mise AI Platform - Kubernetes Deployment Makefile

.PHONY: help build-images load-images deploy clean status logs scale-test logs-frontend logs-core-server logs-ml-server logs-ml-worker logs-postgres logs-redis logs-rabbitmq restart-frontend restart-core-server restart-ml-server restart-ml-worker restart-postgres restart-redis restart-rabbitmq describe-frontend describe-core-server describe-ml-server describe-ml-worker describe-postgres describe-redis describe-rabbitmq shell-frontend shell-core-server shell-ml-server shell-ml-worker shell-postgres shell-redis shell-rabbitmq

# Default target
help:
	@echo "Mise AI Platform - Kubernetes Deployment"
	@echo ""
	@echo "Available targets:"
	@echo "  build-images    Build all Docker images"
	@echo "  load-images     Load images to local Kubernetes cluster"
	@echo "  deploy          Deploy the complete platform (with image loading)"
	@echo "  deploy-no-load  Deploy without loading images (for cloud/registry)"
	@echo "  clean           Clean up all resources"
	@echo "  status          Show deployment status"
	@echo "  logs            Show logs from all services"
	@echo "  scale-test      Test KEDA auto-scaling"
	@echo "  port-forward    Set up port forwarding for local access"
	@echo ""
	@echo "Individual Service Logs:"
	@echo "  logs-frontend      View frontend logs"
	@echo "  logs-core-server   View core server logs"
	@echo "  logs-ml-server     View ML server logs"
	@echo "  logs-ml-llm-worker View ML LLM worker logs"
	@echo "  logs-ml-worker     View ML worker logs"
	@echo "  logs-postgres      View PostgreSQL logs"
	@echo "  logs-redis         View Redis logs"
	@echo "  logs-rabbitmq      View RabbitMQ logs"
	@echo ""
	@echo "Service Management:"
	@echo "  restart-*             Restart individual services"
	@echo "  restart-ml-llm-worker Restart LLM worker"
	@echo "  describe-*            Get detailed service information"
	@echo "  shell-*               Open shell in service pods"

# Build all Docker images
build-images:
	@echo "🔨 Building Docker images..."
	docker build -t mise-ai-frontend:latest ../app
	docker build -t mise-ai-core-server:latest ../server
	docker build -t mise-ai-ml-server:latest ../ml_server
	docker build -t mise-ai-ml-worker:latest ../ml_server
	@echo "✅ Images built successfully!"

# Load images to local Kubernetes cluster
load-images:
	@echo "📦 Loading images to Kubernetes cluster..."
	@if command -v minikube >/dev/null 2>&1 && minikube status >/dev/null 2>&1; then \
		echo "Loading to minikube..."; \
		minikube image load mise-ai-frontend:latest; \
		echo "✅ mise-ai-frontend:latest loaded successfully!"; \
		minikube image load mise-ai-core-server:latest; \
		echo "✅ mise-ai-core-server:latest loaded successfully!"; \
		minikube image load mise-ai-ml-server:latest; \
		echo "✅ mise-ai-ml-server:latest loaded successfully!"; \
		minikube image load mise-ai-ml-worker:latest; \
		echo "✅ mise-ai-ml-worker:latest loaded successfully!"; \
	elif command -v kind >/dev/null 2>&1 && kind get clusters >/dev/null 2>&1; then \
		echo "Loading to kind..."; \
		kind load docker-image mise-ai-frontend:latest; \
		kind load docker-image mise-ai-core-server:latest; \
		kind load docker-image mise-ai-ml-server:latest; \
		kind load docker-image mise-ai-ml-worker:latest; \
	else \
		echo "⚠️  No local Kubernetes cluster found."; \
		echo "   Please ensure you have minikube or kind running, or push images to a registry."; \
		echo "   For cloud deployment, push images to your container registry first."; \
		exit 1; \
	fi
	@echo "✅ Images loaded successfully!"

# Deploy the complete platform
deploy: build-images load-images
	@echo "🚀 Deploying Mise AI Platform..."
	./deploy.sh

# Deploy without loading images (for cloud/registry deployment)
deploy-no-load: build-images
	@echo "🚀 Deploying Mise AI Platform (assuming images are in registry)..."
	./deploy.sh
	@echo "✅ Deployment completed!"

# Clean up all resources
clean:
	@echo "🧹 Cleaning up resources..."
	./cleanup.sh
	@echo "✅ Cleanup completed!"

# Show deployment status
status:
	@echo "📊 Deployment Status:"
	@echo ""
	@echo "Pods:"
	kubectl get pods -n mise-ai
	@echo ""
	@echo "Services:"
	kubectl get svc -n mise-ai
	@echo ""
	@echo "ScaledObjects:"
	kubectl get scaledobjects -n mise-ai
	@echo ""
	@echo "Ingress:"
	kubectl get ingress -n mise-ai
	@echo ""
	@echo "🌐 Access Information:"
	@echo "  To access the application with minikube:"
	@echo "  1. Run: minikube tunnel"
	@echo "  2. Add to /etc/hosts: 127.0.0.1 mise-ai.local"
	@echo "  3. Visit: http://mise-ai.local"

# Show logs from all services
logs:
	@echo "📋 Service Logs:"
	@echo ""
	@echo "ML Worker (KEDA scaled):"
	kubectl logs -f deployment/ml-worker -n mise-ai --tail=50
	@echo ""
	@echo "Core Server:"
	kubectl logs -f deployment/core-server -n mise-ai --tail=50
	@echo ""
	@echo "ML Server:"
	kubectl logs -f deployment/ml-server -n mise-ai --tail=50

# =============================================================================
# INDIVIDUAL SERVICE LOGS
# =============================================================================

logs-frontend: ## View frontend logs
	@echo "📋 Frontend Logs:"
	kubectl logs -f deployment/frontend -n mise-ai --tail=100

logs-core-server: ## View core server logs
	@echo "📋 Core Server Logs:"
	kubectl logs -f deployment/core-server -n mise-ai --tail=100

logs-ml-server: ## View ML server logs
	@echo "📋 ML Server Logs:"
	kubectl logs -f deployment/ml-server -n mise-ai --tail=100

logs-ml-worker: ## View ML worker logs
	@echo "📋 ML Worker Logs:"
	kubectl logs -f deployment/ml-worker -n mise-ai --tail=100

logs-ml-llm-worker: ## View ML LLM worker logs
	@echo "📋 ML LLM Worker Logs:"
	kubectl logs -f deployment/ml-llm-worker -n mise-ai --tail=100

logs-postgres: ## View PostgreSQL logs
	@echo "📋 PostgreSQL Logs:"
	kubectl logs -f deployment/postgres -n mise-ai --tail=100

logs-redis: ## View Redis logs
	@echo "📋 Redis Logs:"
	kubectl logs -f deployment/redis -n mise-ai --tail=100

logs-rabbitmq: ## View RabbitMQ logs
	@echo "📋 RabbitMQ Logs:"
	kubectl logs -f deployment/rabbitmq -n mise-ai --tail=100

# =============================================================================
# SERVICE-SPECIFIC OPERATIONS
# =============================================================================

restart-frontend: ## Restart frontend deployment
	@echo "🔄 Restarting frontend..."
	kubectl rollout restart deployment/frontend -n mise-ai
	kubectl rollout status deployment/frontend -n mise-ai

restart-core-server: ## Restart core server deployment
	@echo "🔄 Restarting core server..."
	kubectl rollout restart deployment/core-server -n mise-ai
	kubectl rollout status deployment/core-server -n mise-ai

restart-ml-server: ## Restart ML server deployment
	@echo "🔄 Restarting ML server..."
	kubectl rollout restart deployment/ml-server -n mise-ai
	kubectl rollout status deployment/ml-server -n mise-ai

restart-ml-worker: ## Restart ML worker deployment
	@echo "🔄 Restarting ML worker..."
	kubectl rollout restart deployment/ml-worker -n mise-ai
	kubectl rollout status deployment/ml-worker -n mise-ai

restart-ml-llm-worker: ## Restart ML LLM worker deployment
	@echo "🔄 Restarting ML LLM worker..."
	kubectl rollout restart deployment/ml-llm-worker -n mise-ai
	kubectl rollout status deployment/ml-llm-worker -n mise-ai

restart-postgres: ## Restart PostgreSQL deployment
	@echo "🔄 Restarting PostgreSQL..."
	kubectl rollout restart deployment/postgres -n mise-ai
	kubectl rollout status deployment/postgres -n mise-ai

restart-redis: ## Restart Redis deployment
	@echo "🔄 Restarting Redis..."
	kubectl rollout restart deployment/redis -n mise-ai
	kubectl rollout status deployment/redis -n mise-ai

restart-rabbitmq: ## Restart RabbitMQ deployment
	@echo "🔄 Restarting RabbitMQ..."
	kubectl rollout restart deployment/rabbitmq -n mise-ai
	kubectl rollout status deployment/rabbitmq -n mise-ai

# =============================================================================
# DEBUGGING & MONITORING
# =============================================================================

describe-frontend: ## Describe frontend deployment
	@echo "📋 Frontend Deployment Details:"
	kubectl describe deployment frontend -n mise-ai

describe-core-server: ## Describe core server deployment
	@echo "📋 Core Server Deployment Details:"
	kubectl describe deployment core-server -n mise-ai

describe-ml-server: ## Describe ML server deployment
	@echo "📋 ML Server Deployment Details:"
	kubectl describe deployment ml-server -n mise-ai

describe-ml-worker: ## Describe ML worker deployment
	@echo "📋 ML Worker Deployment Details:"
	kubectl describe deployment ml-worker -n mise-ai

describe-ml-llm-worker: ## Describe ML LLM worker deployment
	@echo "📋 ML LLM Worker Deployment Details:"
	kubectl describe deployment ml-llm-worker -n mise-ai

describe-postgres: ## Describe PostgreSQL deployment
	@echo "📋 PostgreSQL Deployment Details:"
	kubectl describe deployment postgres -n mise-ai

describe-redis: ## Describe Redis deployment
	@echo "📋 Redis Deployment Details:"
	kubectl describe deployment redis -n mise-ai

describe-rabbitmq: ## Describe RabbitMQ deployment
	@echo "📋 RabbitMQ Deployment Details:"
	kubectl describe deployment rabbitmq -n mise-ai

# =============================================================================
# SHELL ACCESS
# =============================================================================

shell-frontend: ## Open shell in frontend pod
	@echo "🐚 Opening shell in frontend pod..."
	kubectl exec -it deployment/frontend -n mise-ai -- /bin/sh

shell-core-server: ## Open shell in core server pod
	@echo "🐚 Opening shell in core server pod..."
	kubectl exec -it deployment/core-server -n mise-ai -- /bin/bash

shell-ml-server: ## Open shell in ML server pod
	@echo "🐚 Opening shell in ML server pod..."
	kubectl exec -it deployment/ml-server -n mise-ai -- /bin/bash

shell-ml-worker: ## Open shell in ML worker pod
	@echo "🐚 Opening shell in ML worker pod..."
	kubectl exec -it deployment/ml-worker -n mise-ai -- /bin/bash

shell-ml-llm-worker: ## Open shell in ML LLM worker pod
	@echo "🐚 Opening shell in ML LLM worker pod..."
	kubectl exec -it deployment/ml-llm-worker -n mise-ai -- /bin/bash

shell-postgres: ## Open shell in PostgreSQL pod
	@echo "🐚 Opening shell in PostgreSQL pod..."
	kubectl exec -it deployment/postgres -n mise-ai -- /bin/bash

shell-redis: ## Open shell in Redis pod
	@echo "🐚 Opening shell in Redis pod..."
	kubectl exec -it deployment/redis -n mise-ai -- /bin/sh

shell-rabbitmq: ## Open shell in RabbitMQ pod
	@echo "🐚 Opening shell in RabbitMQ pod..."
	kubectl exec -it deployment/rabbitmq -n mise-ai -- /bin/bash

# Test KEDA auto-scaling
scale-test:
	@echo "🧪 Testing KEDA auto-scaling..."
	@echo "Sending test messages to RabbitMQ queue..."
	@echo "Watch the scaling with: kubectl get scaledobjects ml-worker-scaledobject -n mise-ai -w"
	@echo ""
	@echo "You can also monitor pods: kubectl get pods -n mise-ai -l app=ml-worker -w"
	@echo ""
	@echo "To send test messages, use the RabbitMQ management UI at http://mise-ai.local/rabbitmq"

# Set up port forwarding for local access
port-forward:
	@echo "🌐 Setting up port forwarding..."
	@echo "Frontend: http://localhost:8080"
	@echo "Core API: http://localhost:8081"
	@echo "ML API: http://localhost:8082"
	@echo "RabbitMQ: http://localhost:8083"
	@echo ""
	@echo "Press Ctrl+C to stop port forwarding"
	kubectl port-forward svc/frontend-service 8080:80 -n mise-ai &
	kubectl port-forward svc/core-server-service 8081:8000 -n mise-ai &
	kubectl port-forward svc/ml-server-service 8082:8001 -n mise-ai &
	kubectl port-forward svc/rabbitmq-service 8083:15672 -n mise-ai &
	wait

# Quick deployment for development
dev-deploy: build-images load-images
	@echo "🚀 Quick development deployment..."
	kubectl apply -f namespace.yaml
	kubectl apply -f secrets.yaml
	kubectl apply -f postgres-deployment.yaml
	kubectl apply -f postgres-service.yaml
	kubectl apply -f redis-deployment.yaml
	kubectl apply -f redis-service.yaml
	kubectl apply -f rabbitmq-deployment.yaml
	kubectl apply -f rabbitmq-service.yaml
	@echo "⏳ Waiting for infrastructure..."
	kubectl wait --for=condition=available --timeout=50s deployment/postgres -n mise-ai
	kubectl wait --for=condition=available --timeout=50s deployment/redis -n mise-ai
	kubectl wait --for=condition=available --timeout=50s deployment/rabbitmq -n mise-ai
	kubectl apply -f ml-worker-deployment.yaml
	kubectl apply -f ml-worker-scaledobject.yaml
	kubectl apply -f llm-worker-deployment.yaml
	kubectl apply -f llm-worker-scaledobject.yaml
	@echo "✅ Development deployment completed!"
