# Mise AI Platform - Complete Deployment Guide

This guide covers deploying the Mise AI platform with KEDA auto-scaling for ML workers.

## Overview

The platform includes:

- **Frontend**: React dashboard
- **Core API**: FastAPI backend
- **ML API**: Machine learning inference
- **ML Workers**: Auto-scaling workers with KEDA
- **Infrastructure**: PostgreSQL, Redis, RabbitMQ

## Quick Start

### Prerequisites

1. **Kubernetes cluster** (minikube, kind, or cloud)
2. **kubectl** configured to access your cluster
3. **Docker** for building images
4. **Helm** (version 3.x) - Required to install KEDA
5. **KEDA** - Kubernetes Event-Driven Autoscaler (install via Helm: `helm install keda kedacore/keda --namespace keda --create-namespace`)
6. **Nginx Ingress Controller** - Required for ingress routing
  - For minikube: `minikube addons enable ingress`
  - For kind or other clusters: Install nginx ingress controller separately
7. **API Keys** - we currently use 3 external APIs which require respective API keys (refer `poc/server/env.example`). Configure them in `secrets.yaml` (base64 encoded)

### Installing Prerequisites

#### Automated Installation (Recommended)

We provide automated installation scripts that install and configure all prerequisites:

**macOS/Linux:**

```bash
cd poc/k8s
./install-prerequisites.sh
```

**Windows (PowerShell as Administrator):**

```powershell
cd poc\k8s
.\install-prerequisites.ps1
```

The scripts will:

- Install Docker, kubectl, Minikube, Helm, and Make (if not already installed)
- Start Minikube cluster
- Enable Nginx Ingress Controller
- Install and configure KEDA

> **Note:** On Windows, if Docker Desktop installation requires a restart, you'll need to restart your computer and run the script again. The script will detect already-installed tools and skip them.

#### Manual Installation

If you prefer to install prerequisites manually or the automated script doesn't work for your environment, follow the detailed steps below:

#### 1. Install Docker

**macOS/Linux:**

```bash
# macOS: Install via Homebrew
brew install --cask docker

# Or download from: https://www.docker.com/products/docker-desktop

# Linux (Ubuntu/Debian):
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
```

**Windows:**

- Download Docker Desktop from: [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- Install and restart your computer
- Ensure Docker Desktop is running before proceeding

**Verify installation:**

```bash
docker --version
```

#### 2. Install kubectl

**macOS:**

```bash
# Using Homebrew
brew install kubectl

# Or using curl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

**Linux:**

```bash
# Download latest version
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

**Windows:**

```powershell
# Using Chocolatey
choco install kubernetes-cli

# Or using curl (PowerShell)
curl.exe -LO "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe"
# Add kubectl.exe to your PATH
```

**Verify installation:**

```bash
kubectl version --client
```

#### 3. Install Minikube

**macOS:**

```bash
# Using Homebrew
brew install minikube

# Or using curl
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
sudo install minikube-darwin-amd64 /usr/local/bin/minikube
```

**Linux:**

```bash
# Download and install
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

**Windows:**

```powershell
# Using Chocolatey
choco install minikube

# Or download installer from: https://minikube.sigs.k8s.io/docs/start/
```

**Verify installation:**

```bash
minikube version
```

#### 4. Install Helm

**macOS:**

```bash
# Using Homebrew
brew install helm
```

**Linux:**

```bash
# Download and install
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

**Windows:**

```powershell
# Using Chocolatey
choco install kubernetes-helm

# Or download from: https://github.com/helm/helm/releases
```

**Verify installation:**

```bash
helm version
```

#### 5. Start Minikube and Configure Cluster

**macOS/Linux:**

```bash
# Start minikube (this will create a Kubernetes cluster)
minikube start

# Enable ingress addon (installs nginx ingress controller)
minikube addons enable ingress

# Verify cluster is running
kubectl get nodes
```

**Windows:**

```powershell
# Start minikube
minikube start

# Enable ingress addon
minikube addons enable ingress

# Verify cluster is running
kubectl get nodes
```

**Note:** If you encounter issues with minikube, you may need to specify a driver:

```bash
# For Docker Desktop (recommended)
minikube start --driver=docker

# For VirtualBox (if Docker not available)
minikube start --driver=virtualbox
```

#### 6. Install KEDA

**All platforms (requires Helm):**

```bash
# Add KEDA Helm repository
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Install KEDA
helm install keda kedacore/keda --namespace keda --create-namespace

# Verify installation
kubectl get pods -n keda
```

**Verify KEDA is ready:**

```bash
# Wait for KEDA pods to be ready
kubectl wait --for=condition=ready pod --all -n keda --timeout=300s
```

#### 7. (Optional) Install Make

Make is optional but recommended for easier deployment commands.

**macOS:**

```bash
# Usually pre-installed, or install via Xcode Command Line Tools
xcode-select --install
```

**Linux:**

```bash
# Ubuntu/Debian
sudo apt-get install make

# CentOS/RHEL
sudo yum install make
```

**Windows:**

```powershell
# Using Chocolatey
choco install make

# Or use WSL (Windows Subsystem for Linux) and install make there
```

**Verify installation:**

```bash
make --version
```

> **Note:** If you don't have Make installed, you can still deploy manually using the commands in the "Manual Deployment Steps" section below.

---

### Configure Secrets

The platform requires API keys for external services. Currently, the following APIs are used:

1. **OpenAI API** - Required for LLM insights generation
2. **Google Vertex AI (Gemini)** - Required for LLM insights via Gemini models
3. **Brevo API** - Optional, for email reports

> **Note:** The POC will run even if API keys are not configured, but LLM-based insights and email functionality will be unavailable. Core features like file uploads, data queries, and ML predictions will continue to work without these keys.

For Kubernetes deployment, you have two options to configure API keys:

#### Option 1: Using Kubernetes Secrets (Recommended for Production)

Configure the OpenAI API key in `secrets.yaml`:

**macOS/Linux:**

```bash
# Generate base64 encoded OpenAI API key
echo -n "your-openai-api-key" | base64

# Update secrets.yaml with the encoded value
# Edit poc/k8s/secrets.yaml and replace the api-key value under openai-secret
```

**Windows (PowerShell):**

```powershell
# Generate base64 encoded OpenAI API key
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("your-openai-api-key"))

# Copy the output and update secrets.yaml
# Edit poc/k8s/secrets.yaml and replace the api-key value under openai-secret
```

**Windows (Command Prompt):**

```cmd
# Using certutil (built-in Windows tool)
echo your-openai-api-key | certutil -encode - | findstr /v /c:"-" | findstr /v /c:"certutil"

# Copy the output and update secrets.yaml
```

#### Option 2: Using .env Files (Simpler for Development/Testing)

Alternatively, you can create `.env` files in the server directories, which will be copied into the containers during the build process:

```bash
# Create .env file for core server
cp poc/server/env.example poc/server/.env
# Edit poc/server/.env and add your API keys

# Create .env file for ML server
cp poc/ml_server/env.example poc/ml_server/.env
# Edit poc/ml_server/.env and add your API keys
```

The `.env` files are automatically loaded by the application using `python-dotenv`. This approach is simpler for local development and testing, but note that `.env` files are included in the Docker image, so use Kubernetes secrets for production deployments.

**Note:** For Google Vertex AI:

- The service uses a service account JSON credentials file (`vertexai_credentials.json`)
- This file should be included in your Docker image or mounted as a volume
- Ensure `vertexai_credentials.json` is present in the `ml_server` directory before building the image
- The `VERTEXAI_PROJECT_ID` is configured in `ml_server/configuration.py` (default: `mise-ai-476319`)

**For local development**, set environment variables as shown in:

- `poc/server/env.example` - Core server configuration
- `poc/ml_server/env.example` - ML server configuration

### 1. Build and Deploy

```bash
# Navigate to the project
cd poc/k8s

# Deploy everything with one command
make deploy
```

### 2. Access the Application

There are two ways to access the application with minikube:

#### Option 1: Using Minikube Tunnel (Recommended)

This method uses `minikube tunnel` to expose LoadBalancer services on localhost.

**Step 1: Configure the ingress controller for LoadBalancer**

```bash
# Patch the ingress controller service to LoadBalancer type
kubectl patch svc ingress-nginx-controller -n ingress-nginx -p '{"spec":{"type":"LoadBalancer"}}'
```

**Step 2: Start minikube tunnel (in a separate terminal)**

```bash
minikube tunnel
```

**Step 3: Get the minikube IP and add to hosts file**

The `minikube tunnel` routes LoadBalancer services to the minikube VM's IP address. Use `minikube ip` to get this IP:

**Linux / macOS:**

```bash
# Get the minikube IP and add to hosts file
MINIKUBE_IP=$(minikube ip)
echo "$MINIKUBE_IP mise-ai.local" | sudo tee -a /etc/hosts
```

**Windows (PowerShell as Administrator):**

```powershell
# Get the minikube IP
$MINIKUBE_IP = minikube ip

# Add to hosts file
Add-Content -Path C:\Windows\System32\drivers\etc\hosts -Value "$MINIKUBE_IP mise-ai.local"
```

**Windows (Command Prompt as Administrator):**

```cmd
# Get the minikube IP and add to hosts file
for /f "tokens=*" %i in ('minikube ip') do echo %i mise-ai.local >> C:\Windows\System32\drivers\etc\hosts
```

**Step 4: Access the application**

```bash
# macOS
open http://mise-ai.local

# Linux
xdg-open http://mise-ai.local

# Windows
start http://mise-ai.local

# Or visit in your browser: http://mise-ai.local
```

#### Option 2: Using kubectl port-forward (No Tunnel Required)

This method uses `kubectl port-forward` to forward the ingress controller service to localhost.

**Step 1: Add to hosts file**

Add `127.0.0.1` (localhost) to your hosts file:

**Linux / macOS:**

```bash
echo "127.0.0.1 mise-ai.local" | sudo tee -a /etc/hosts
```

**Windows (PowerShell as Administrator):**

```powershell
Add-Content -Path C:\Windows\System32\drivers\etc\hosts -Value "127.0.0.1 mise-ai.local"
```

**Windows (Command Prompt as Administrator):**

```cmd
echo 127.0.0.1 mise-ai.local >> C:\Windows\System32\drivers\etc\hosts
```

**Step 2: Start port-forward (in a separate terminal)**

Forward the ingress controller service to localhost on port 8080:

```bash
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80
```

**Note:** You can use any available port (e.g., 8080, 8081, 3000). If port 8080 is already in use, choose a different port and update the URL in Step 3 accordingly.

**Step 3: Access the application**

Access the application using the forwarded port:

```bash
# macOS
open http://mise-ai.local:8080

# Linux
xdg-open http://mise-ai.local:8080
# Windows
start http://mise-ai.local:8080

# Or visit in your browser: http://mise-ai.local:8080
```

**Note:** The `kubectl port-forward` command must remain running in the terminal. If you close it, the port forwarding will stop and you'll need to restart it. The port (8080) must be included in the URL when accessing the application.

**RabbitMQ Management UI:**

- Access at: [http://mise-ai.local:8080/rabbitmq](http://mise-ai.local:8080/rabbitmq) (when using Option 2 with port-forward)
- Access at: [http://mise-ai.local/rabbitmq](http://mise-ai.local/rabbitmq) (when using Option 1 with tunnel)
- Default credentials: `admin` / `admin`

## Manual Deployment Steps

If you prefer manual deployment:

### 1. Build Images

```bash
docker build -t mise-ai-frontend:latest ./app
docker build -t mise-ai-core-server:latest ./server
docker build -t mise-ai-ml-server:latest ./ml_server
docker build -t mise-ai-ml-worker:latest ./ml_server
```

### 2. Load Images (for local clusters)

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

### 3. Deploy Infrastructure

```bash
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f postgres-deployment.yaml
kubectl apply -f postgres-service.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f redis-service.yaml
kubectl apply -f rabbitmq-deployment.yaml
kubectl apply -f rabbitmq-service.yaml
```

### 4. Wait for Infrastructure

```bash
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n mise-ai
kubectl wait --for=condition=available --timeout=300s deployment/redis -n mise-ai
kubectl wait --for=condition=available --timeout=300s deployment/rabbitmq -n mise-ai
```

### 5. Deploy Applications

```bash
kubectl apply -f core-server-deployment.yaml
kubectl apply -f core-server-service.yaml
kubectl apply -f ml-server-deployment.yaml
kubectl apply -f ml-server-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml
```

### 6. Deploy KEDA Auto-Scaling

```bash
kubectl apply -f ml-worker-deployment.yaml
kubectl apply -f ml-worker-scaledobject.yaml
```

### 7. Deploy Ingress

```bash
kubectl apply -f ingress.yaml
```

## KEDA Auto-Scaling Configuration

### Scaling Parameters

- **Queue Length**: 50 messages
- **Message Count**: 25 messages per consumer
- **Scaling Formula**: `ceil(queueLength / messageCount)`
- **Min Replicas**: 0 (scale to zero)
- **Max Replicas**: 10
- **Polling Interval**: 30 seconds
- **Cooldown Period**: 300 seconds

### Scaling Behavior


| Queue Length | Workers | Description                  |
| ------------ | ------- | ---------------------------- |
| 0-49         | 0       | No work, scale to zero       |
| 50-99        | 2       | 2 consumers for 50 requests  |
| 100-149      | 4       | 4 consumers for 100 requests |
| 150+         | 6+      | Additional workers as needed |


## Monitoring and Testing

### Check Status

```bash
# Overall status
make status

# KEDA scaling status
kubectl get scaledobjects -n mise-ai

# Worker pods
kubectl get pods -n mise-ai -l app=ml-worker

# Queue status
kubectl exec -it deployment/rabbitmq -n mise-ai -- rabbitmqctl list_queues
```

### Test Auto-Scaling

```bash
# Run the KEDA test
./test-keda.sh

# Or manually send messages via RabbitMQ UI
# Visit: http://mise-ai.local/rabbitmq (admin/admin)
```

### Monitor Logs

```bash
# ML Worker logs
kubectl logs -f deployment/ml-worker -n mise-ai

# All service logs
make logs
```

## Troubleshooting

### Common Issues

1. **KEDA not scaling**:
  ```bash
   kubectl describe scaledobject ml-worker-scaledobject -n mise-ai
   kubectl logs -f deployment/keda-operator -n keda-system
  ```
2. **Images not found**:
  ```bash
   # Check if images are loaded
   kubectl get pods -n mise-ai

   # Rebuild and reload images
   make build-images load-images
  ```
3. **Services not starting**:
  ```bash
   # Check pod status
   kubectl get pods -n mise-ai

   # Check logs
   kubectl logs -f deployment/[service-name] -n mise-ai
  ```

### Debug Commands

```bash
# Check all resources
kubectl get all -n mise-ai

# Check KEDA resources
kubectl get scaledobjects,scaledjobs -n mise-ai

# Check events
kubectl get events -n mise-ai --sort-by='.lastTimestamp'

# Describe problematic resources
kubectl describe pod [pod-name] -n mise-ai
```

## 🧹 Cleanup

```bash
# Remove all resources
make clean

# Or manually
kubectl delete namespace mise-ai
```

