# Mise AI Platform - Prerequisites Installation Script (Windows)
# This script installs all prerequisites needed for deploying the Mise AI platform
# Run this script in PowerShell as Administrator

param(
    [switch]$SkipDocker
)

# Colors for output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Command {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Install-Docker {
    Write-Info "Checking Docker installation..."
    if (Test-Command docker) {
        $version = docker --version
        Write-Success "Docker is already installed: $version"
        return $true
    }

    Write-Info "Docker not found. Checking for Chocolatey..."
    
    if (-not (Test-Command choco)) {
        Write-Warning "Chocolatey not found. Docker Desktop must be installed manually."
        Write-Info "Please download and install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        Write-Warning "After installing Docker Desktop, restart your computer and run this script again."
        return $false
    }

    Write-Info "Installing Docker Desktop via Chocolatey..."
    choco install docker-desktop -y
    
    Write-Warning "Docker Desktop has been installed. Please start Docker Desktop and restart your computer, then run this script again."
    return $false
}

function Install-Kubectl {
    Write-Info "Checking kubectl installation..."
    if (Test-Command kubectl) {
        try {
            $version = kubectl version --client --short 2>$null
            Write-Success "kubectl is already installed: $version"
        } catch {
            Write-Success "kubectl is already installed"
        }
        return $true
    }

    Write-Info "Installing kubectl..."
    
    if (Test-Command choco) {
        choco install kubernetes-cli -y
    } else {
        Write-Info "Chocolatey not found. Downloading kubectl manually..."
        $kubectlUrl = "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe"
        $kubectlPath = "$env:USERPROFILE\kubectl.exe"
        
        Invoke-WebRequest -Uri $kubectlUrl -OutFile $kubectlPath
        Write-Warning "kubectl downloaded to $kubectlPath"
        Write-Warning "Please add this directory to your PATH, or move kubectl.exe to a directory in your PATH"
        return $false
    }

    if (Test-Command kubectl) {
        Write-Success "kubectl installed successfully"
        return $true
    } else {
        Write-Error "kubectl installation failed"
        return $false
    }
}

function Install-Minikube {
    Write-Info "Checking Minikube installation..."
    if (Test-Command minikube) {
        $version = minikube version --short
        Write-Success "Minikube is already installed: $version"
        return $true
    }

    Write-Info "Installing Minikube..."
    
    if (Test-Command choco) {
        choco install minikube -y
    } else {
        Write-Warning "Chocolatey not found. Please install Minikube manually from: https://minikube.sigs.k8s.io/docs/start/"
        return $false
    }

    if (Test-Command minikube) {
        Write-Success "Minikube installed successfully"
        return $true
    } else {
        Write-Error "Minikube installation failed"
        return $false
    }
}

function Install-Helm {
    Write-Info "Checking Helm installation..."
    if (Test-Command helm) {
        $version = helm version --short
        Write-Success "Helm is already installed: $version"
        return $true
    }

    Write-Info "Installing Helm..."
    
    if (Test-Command choco) {
        choco install kubernetes-helm -y
    } else {
        Write-Warning "Chocolatey not found. Please install Helm manually from: https://github.com/helm/helm/releases"
        return $false
    }

    if (Test-Command helm) {
        Write-Success "Helm installed successfully"
        return $true
    } else {
        Write-Error "Helm installation failed"
        return $false
    }
}

function Install-Make {
    Write-Info "Checking Make installation..."
    if (Test-Command make) {
        $version = (make --version | Select-Object -First 1)
        Write-Success "Make is already installed: $version"
        return $true
    }

    Write-Info "Installing Make (optional but recommended)..."
    
    if (Test-Command choco) {
        choco install make -y
    } else {
        Write-Warning "Chocolatey not found. Make is optional. You can install it manually or use WSL."
        return $false
    }

    if (Test-Command make) {
        Write-Success "Make installed successfully"
        return $true
    } else {
        Write-Warning "Make installation failed or skipped. You can still deploy manually."
        return $false
    }
}

function Start-MinikubeCluster {
    Write-Info "Checking Minikube cluster status..."
    
    try {
        $status = minikube status 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Minikube is already running"
            return $true
        }
    } catch {
        # Cluster not running
    }

    Write-Info "Starting Minikube cluster (this may take a few minutes)..."
    
    # Check if Docker is running
    try {
        docker info | Out-Null
        if ($LASTEXITCODE -eq 0) {
            minikube start --driver=docker
        } else {
            Write-Warning "Docker not running. Attempting to start with default driver..."
            minikube start
        }
    } catch {
        Write-Warning "Docker not accessible. Attempting to start Minikube with default driver..."
        minikube start
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Minikube started successfully"
        return $true
    } else {
        Write-Error "Failed to start Minikube"
        return $false
    }
}

function Enable-Ingress {
    Write-Info "Enabling Nginx Ingress Controller..."
    
    $addons = minikube addons list
    if ($addons -match "ingress.*enabled") {
        Write-Success "Ingress addon is already enabled"
    } else {
        minikube addons enable ingress
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Ingress addon enabled"
        } else {
            Write-Error "Failed to enable ingress addon"
            return $false
        }
    }
    return $true
}

function Install-KEDA {
    Write-Info "Checking KEDA installation..."
    
    try {
        $namespace = kubectl get namespace keda 2>$null
        $pods = kubectl get pods -n keda 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "KEDA appears to be already installed"
            return $true
        }
    } catch {
        # KEDA not installed
    }

    Write-Info "Installing KEDA via Helm..."
    
    helm repo add kedacore https://kedacore.github.io/charts 2>$null
    helm repo update
    helm install keda kedacore/keda --namespace keda --create-namespace
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install KEDA"
        return $false
    }
    
    Write-Info "Waiting for KEDA pods to be ready (this may take a minute)..."
    Start-Sleep -Seconds 10
    
    try {
        kubectl wait --for=condition=ready pod --all -n keda --timeout=300s 2>$null
        Write-Success "KEDA installed successfully"
    } catch {
        Write-Warning "KEDA pods may still be starting. You can check status with: kubectl get pods -n keda"
    }
    
    return $true
}

function Verify-Installations {
    Write-Info "Verifying all installations..."
    Write-Host ""
    
    $allOk = $true
    
    if (Test-Command docker) {
        $version = docker --version
        Write-Success "✓ Docker: $version"
    } else {
        Write-Error "✗ Docker: Not installed"
        $allOk = $false
    }
    
    if (Test-Command kubectl) {
        try {
            $version = kubectl version --client --short 2>$null
            Write-Success "✓ kubectl: installed"
        } catch {
            Write-Success "✓ kubectl: installed"
        }
    } else {
        Write-Error "✗ kubectl: Not installed"
        $allOk = $false
    }
    
    if (Test-Command minikube) {
        $version = minikube version --short
        Write-Success "✓ Minikube: $version"
    } else {
        Write-Error "✗ Minikube: Not installed"
        $allOk = $false
    }
    
    if (Test-Command helm) {
        $version = helm version --short
        Write-Success "✓ Helm: $version"
    } else {
        Write-Error "✗ Helm: Not installed"
        $allOk = $false
    }
    
    if (Test-Command make) {
        $version = make --version | Select-Object -First 1
        Write-Success "✓ Make: $version"
    } else {
        Write-Warning "⚠ Make: Not installed (optional)"
    }
    
    Write-Host ""
    
    if ($allOk) {
        Write-Success "All required prerequisites are installed!"
        Write-Info "You can now proceed with deployment by running: cd poc\k8s; make deploy"
    } else {
        Write-Error "Some prerequisites are missing. Please install them manually."
        exit 1
    }
}

# Main installation flow
function Main {
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "  Mise AI Platform - Prerequisites" -ForegroundColor Cyan
    Write-Host "  Installation Script (Windows)" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if running as Administrator
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Warning "This script should be run as Administrator for best results."
        Write-Warning "Some installations may require administrator privileges."
        Write-Host ""
    }
    
    # Install prerequisites
    if (-not $SkipDocker) {
        $dockerInstalled = Install-Docker
        if (-not $dockerInstalled) {
            Write-Warning "Docker installation requires manual steps. Please install Docker Desktop and restart this script."
            exit 1
        }
    }
    
    Install-Kubectl | Out-Null
    Install-Minikube | Out-Null
    Install-Helm | Out-Null
    Install-Make | Out-Null
    Write-Host ""
    
    # Configure cluster
    $clusterStarted = Start-MinikubeCluster
    if ($clusterStarted) {
        Enable-Ingress | Out-Null
    }
    Write-Host ""
    
    # Install KEDA
    if ($clusterStarted) {
        Install-KEDA | Out-Null
    }
    Write-Host ""
    
    # Verify everything
    Verify-Installations
}

# Run main function
Main

