#!/bin/bash

# Mise AI Platform - Prerequisites Installation Script
# This script installs all prerequisites needed for deploying the Mise AI platform
# Supports macOS and Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    command -v "$1" >/dev/null 2>&1
}

install_docker() {
    print_info "Checking Docker installation..."
    if check_command docker; then
        print_success "Docker is already installed: $(docker --version)"
        return 0
    fi

    print_info "Docker not found. Installing Docker..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if check_command brew; then
            print_info "Installing Docker via Homebrew..."
            brew install --cask docker
            print_warning "Docker Desktop has been installed. Please start Docker Desktop and run this script again."
            exit 0
        else
            print_error "Homebrew not found. Please install Docker Desktop manually from https://www.docker.com/products/docker-desktop"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if [ -f /etc/debian_version ]; then
            print_info "Installing Docker on Debian/Ubuntu..."
            sudo apt-get update
            sudo apt-get install -y docker.io
            sudo systemctl start docker
            sudo systemctl enable docker
            print_info "Adding user to docker group (requires logout/login to take effect)..."
            sudo usermod -aG docker $USER
        elif [ -f /etc/redhat-release ]; then
            print_info "Installing Docker on RedHat/CentOS..."
            sudo yum install -y docker
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
        else
            print_error "Unsupported Linux distribution. Please install Docker manually."
            exit 1
        fi
    fi
    
    if check_command docker; then
        print_success "Docker installed successfully"
    else
        print_error "Docker installation failed. Please install manually."
        exit 1
    fi
}

install_kubectl() {
    print_info "Checking kubectl installation..."
    if check_command kubectl; then
        print_success "kubectl is already installed: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
        return 0
    fi

    print_info "Installing kubectl..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if check_command brew; then
            brew install kubectl
        else
            print_info "Installing kubectl via curl..."
            KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt)
            curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/darwin/amd64/kubectl"
            chmod +x kubectl
            sudo mv kubectl /usr/local/bin/
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt)
        curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
        chmod +x kubectl
        sudo mv kubectl /usr/local/bin/
    fi

    if check_command kubectl; then
        print_success "kubectl installed successfully"
    else
        print_error "kubectl installation failed"
        exit 1
    fi
}

install_minikube() {
    print_info "Checking Minikube installation..."
    if check_command minikube; then
        print_success "Minikube is already installed: $(minikube version --short)"
        return 0
    fi

    print_info "Installing Minikube..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if check_command brew; then
            brew install minikube
        else
            curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-amd64
            sudo install minikube-darwin-amd64 /usr/local/bin/minikube
            rm minikube-darwin-amd64
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
        sudo install minikube-linux-amd64 /usr/local/bin/minikube
        rm minikube-linux-amd64
    fi

    if check_command minikube; then
        print_success "Minikube installed successfully"
    else
        print_error "Minikube installation failed"
        exit 1
    fi
}

install_helm() {
    print_info "Checking Helm installation..."
    if check_command helm; then
        print_success "Helm is already installed: $(helm version --short)"
        return 0
    fi

    print_info "Installing Helm..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if check_command brew; then
            brew install helm
        else
            print_error "Please install Helm manually: https://helm.sh/docs/intro/install/"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi

    if check_command helm; then
        print_success "Helm installed successfully"
    else
        print_error "Helm installation failed"
        exit 1
    fi
}

install_make() {
    print_info "Checking Make installation..."
    if check_command make; then
        print_success "Make is already installed: $(make --version | head -n1)"
        return 0
    fi

    print_info "Installing Make (optional but recommended)..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_warning "Make should be installed via Xcode Command Line Tools. Running xcode-select --install..."
        xcode-select --install || print_warning "Xcode Command Line Tools installation may require manual intervention."
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            sudo apt-get install -y make
        elif [ -f /etc/redhat-release ]; then
            sudo yum install -y make
        fi
    fi

    if check_command make; then
        print_success "Make installed successfully"
    else
        print_warning "Make installation failed or skipped. You can still deploy manually."
    fi
}

start_minikube() {
    print_info "Starting Minikube cluster..."
    
    if minikube status >/dev/null 2>&1; then
        # Verify the cluster is actually reachable (avoids stale state when Docker container was removed)
        if minikube addons list >/dev/null 2>&1; then
            print_success "Minikube is already running"
        else
            print_warning "Minikube state is stale (container missing). Deleting and restarting..."
            minikube delete --purge 2>/dev/null || minikube delete 2>/dev/null || true
            print_info "Starting Minikube (this may take a few minutes)..."
            if check_command docker && docker info >/dev/null 2>&1; then
                minikube start --driver=docker
            else
                minikube start
            fi
            print_success "Minikube started successfully"
        fi
    else
        print_info "Starting Minikube (this may take a few minutes)..."
        if check_command docker && docker info >/dev/null 2>&1; then
            minikube start --driver=docker
        else
            print_warning "Docker not running. Attempting to start with default driver..."
            minikube start
        fi
        print_success "Minikube started successfully"
    fi
}

enable_ingress() {
    print_info "Enabling Nginx Ingress Controller..."
    if minikube addons list | grep -q "ingress.*enabled"; then
        print_success "Ingress addon is already enabled"
    else
        minikube addons enable ingress
        print_success "Ingress addon enabled"
    fi
}

install_keda() {
    print_info "Checking KEDA installation..."
    if kubectl get namespace keda >/dev/null 2>&1 && kubectl get pods -n keda >/dev/null 2>&1; then
        print_success "KEDA appears to be already installed"
        return 0
    fi

    print_info "Installing KEDA via Helm..."
    helm repo add kedacore https://kedacore.github.io/charts 2>/dev/null || true
    helm repo update
    helm install keda kedacore/keda --namespace keda --create-namespace
    
    print_info "Waiting for KEDA pods to be ready (this may take a minute)..."
    kubectl wait --for=condition=ready pod --all -n keda --timeout=300s || {
        print_warning "KEDA pods may still be starting. You can check status with: kubectl get pods -n keda"
    }
    
    print_success "KEDA installed successfully"
}

verify_installations() {
    print_info "Verifying all installations..."
    echo ""
    
    local all_ok=true
    
    if check_command docker; then
        print_success "✓ Docker: $(docker --version)"
    else
        print_error "✗ Docker: Not installed"
        all_ok=false
    fi
    
    if check_command kubectl; then
        print_success "✓ kubectl: $(kubectl version --client --short 2>/dev/null || echo 'installed')"
    else
        print_error "✗ kubectl: Not installed"
        all_ok=false
    fi
    
    if check_command minikube; then
        print_success "✓ Minikube: $(minikube version --short)"
    else
        print_error "✗ Minikube: Not installed"
        all_ok=false
    fi
    
    if check_command helm; then
        print_success "✓ Helm: $(helm version --short)"
    else
        print_error "✗ Helm: Not installed"
        all_ok=false
    fi
    
    if check_command make; then
        print_success "✓ Make: $(make --version | head -n1)"
    else
        print_warning "⚠ Make: Not installed (optional)"
    fi
    
    echo ""
    
    if [ "$all_ok" = true ]; then
        print_success "All required prerequisites are installed!"
        print_info "You can now proceed with deployment by running: cd poc/k8s && make deploy"
    else
        print_error "Some prerequisites are missing. Please install them manually."
        exit 1
    fi
}

# Main installation flow
main() {
    echo "========================================="
    echo "  Mise AI Platform - Prerequisites"
    echo "  Installation Script"
    echo "========================================="
    echo ""
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_info "Detected macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_info "Detected Linux"
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    echo ""
    
    # Install prerequisites
    install_docker
    install_kubectl
    install_minikube
    install_helm
    install_make
    echo ""
    
    # Configure cluster
    start_minikube
    enable_ingress
    echo ""
    
    # Install KEDA
    install_keda
    echo ""
    
    # Verify everything
    verify_installations
}

# Run main function
main

