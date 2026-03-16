# 🚀 Mise AI Platform - Makefile Commands

This Makefile provides comprehensive commands to manage the Mise AI Platform microservices architecture.

## 🎯 Quick Start

```bash
# First time setup
make setup

# Start all services
make up

# View logs
make logs

# Check status
make status
```

## Command Categories

### Infrastructure Services

- `make infra-up` - Start DB, Redis, RabbitMQ
- `make infra-down` - Stop infrastructure services
- `make infra-logs` - View infrastructure logs
- `make infra-status` - Check infrastructure status

### Backend Services

- `make backend-up` - Start API + Workers
- `make backend-down` - Stop backend services
- `make backend-logs` - View backend logs
- `make backend-restart` - Restart backend services
- `make backend-shell` - Open backend shell

### ML Services

- `make ml-up` - Start ML API + Workers
- `make ml-down` - Stop ML services
- `make ml-logs` - View ML logs
- `make ml-restart` - Restart ML services
- `make ml-shell` - Open ML shell

### Frontend Services

- `make frontend-up` - Start frontend
- `make frontend-down` - Stop frontend
- `make frontend-logs` - View frontend logs
- `make frontend-restart` - Restart frontend
- `make frontend-shell` - Open frontend shell

### Reverse Proxy

- `make proxy-up` - Start nginx
- `make proxy-down` - Stop nginx
- `make proxy-logs` - View nginx logs
- `make proxy-restart` - Restart nginx
- `make proxy-reload` - Reload nginx config

### Full Stack Operations

- `make up` - Start all services
- `make down` - Stop all services
- `make restart` - Restart all services
- `make logs` - View all logs
- `make status` - Check all services status

### Development & Testing

- `make build` - Build all Docker images
- `make build-no-cache` - Build without cache
- `make test` - Run tests
- `make test-backend` - Test backend API
- `make test-ml` - Test ML server
- `make test-frontend` - Test frontend

### Scaling & Performance

- `make scale-backend NUM=3` - Scale backend workers
- `make scale-ml NUM=2` - Scale ML workers
- `make scale-api NUM=2` - Scale API servers
- `make monitor` - Monitor resource usage

### Monitoring & Debugging

- `make debug-backend` - Debug backend service
- `make debug-ml` - Debug ML service
- `make debug-db` - Debug database
- `make debug-queue` - Debug RabbitMQ

### Cleanup & Maintenance

- `make clean` - Clean up containers and volumes
- `make clean-images` - Remove Docker images
- `make clean-volumes` - Remove volumes
- `make reset` - Complete reset (clean + rebuild)

### Backup & Restore

- `make backup-db` - Backup database
- `make restore-db FILE=backup.sql` - Restore database

### Quick Commands

- `make quick-start` - Setup and start all services
- `make quick-stop` - Stop all services
- `make quick-restart` - Restart all services

### Production Commands

- `make prod-up` - Start in production mode
- `make prod-down` - Stop production services

### Utility Commands

- `make shell-backend` - Open backend shell
- `make shell-ml` - Open ML shell
- `make shell-frontend` - Open frontend shell
- `make shell-db` - Open database shell
- `make shell-redis` - Open Redis shell

### Information Commands

- `make info` - Show project information
- `make ports` - Show all exposed ports
- `make version` - Show version information

## Access Points

After running `make up`:

- **Frontend**: http://localhost
- **API Docs**: http://localhost/api/docs
- **ML API Docs**: http://localhost/ml/docs
- **RabbitMQ Management**: http://localhost:15672 (admin/admin)

```bash
# Start only infrastructure
make infra-up

# Start backend services
make backend-up

# Scale ML workers to 3 instances
make scale-ml NUM=3

# Debug backend service
make debug-backend

# Backup database
make backup-db

# Complete reset
make reset
```

## Troubleshooting

```bash
# Check service status
make status

# View logs
make logs

# Debug specific service
make debug-backend
make debug-ml
make debug-db

# Restart specific service
make backend-restart
make ml-restart
```

## Tips

- Use `make help` to see all available commands
- Use `make logs` to monitor all services
- Use `make status` to check health of all services
- Use `make monitor` to check resource usage
- Use `make clean` to free up disk space
- Use `make reset` for a fresh start
