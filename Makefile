# Mise AI Platform - Makefile
# DEPRECATED: This Makefile is deprecated. Please use Kubernetes deployment instead.
# See: cd k8s && make help

.PHONY: help k8s-migrate deprecated-warning
.DEFAULT_GOAL := deprecated-warning

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

deprecated-warning: ## Show deprecation warning and migration instructions
	@echo "$(RED)⚠️  DEPRECATION NOTICE$(NC)"
	@echo ""
	@echo "$(YELLOW)This Docker Compose-based Makefile is deprecated.$(NC)"
	@echo "$(YELLOW)The Mise AI Platform now uses Kubernetes as the primary deployment method.$(NC)"
	@echo ""
	@echo "$(GREEN)🚀 To use the new Kubernetes deployment:$(NC)"
	@echo "  cd k8s"
	@echo "  make help"
	@echo ""
	@echo "$(GREEN)📋 Quick Start with Kubernetes:$(NC)"
	@echo "  cd k8s"
	@echo "  make deploy"
	@echo ""
	@echo "$(GREEN)📋 Individual Service Logs (Kubernetes):$(NC)"
	@echo "  cd k8s"
	@echo "  make logs-frontend      # View frontend logs"
	@echo "  make logs-core-server   # View core server logs"
	@echo "  make logs-ml-server     # View ML server logs"
	@echo "  make logs-ml-worker     # View ML worker logs"
	@echo "  make logs-postgres      # View PostgreSQL logs"
	@echo "  make logs-redis         # View Redis logs"
	@echo "  make logs-rabbitmq      # View RabbitMQ logs"
	@echo ""
	@echo "$(RED)❌ Docker Compose files have been moved to deprecated/ directory$(NC)"
	@echo "$(YELLOW)If you need Docker Compose for development, restore from deprecated/docker-compose.yml$(NC)"

k8s-migrate: ## Show migration guide to Kubernetes
	@echo "$(BLUE)🔄 Migration Guide: Docker Compose → Kubernetes$(NC)"
	@echo ""
	@echo "$(GREEN)1. Install Prerequisites:$(NC)"
	@echo "   - kubectl"
	@echo "   - Kubernetes cluster (minikube, kind, or cloud)"
	@echo "   - KEDA (for auto-scaling)"
	@echo ""
	@echo "$(GREEN)2. Deploy with Kubernetes:$(NC)"
	@echo "   cd k8s"
	@echo "   make deploy"
	@echo ""
	@echo "$(GREEN)3. View Logs:$(NC)"
	@echo "   make logs-frontend      # Instead of: docker-compose logs app"
	@echo "   make logs-core-server   # Instead of: docker-compose logs server"
	@echo "   make logs-ml-server    # Instead of: docker-compose logs ml-server"
	@echo ""
	@echo "$(GREEN)4. Service Management:$(NC)"
	@echo "   make restart-frontend   # Instead of: docker-compose restart app"
	@echo "   make status             # Instead of: docker-compose ps"
	@echo ""
	@echo "$(GREEN)5. Access Services:$(NC)"
	@echo "   make port-forward       # Set up local access"
	@echo "   # Then visit: http://localhost:8080"

help: ## Show this help message (DEPRECATED)
	@echo "$(RED)⚠️  DEPRECATED$(NC)"
	@echo "$(YELLOW)This Makefile is deprecated. Use Kubernetes deployment instead.$(NC)"
	@echo ""
	@echo "$(GREEN)Run: make k8s-migrate$(NC)"