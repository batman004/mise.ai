#!/bin/bash

# Mise AI Platform - Kubernetes Cleanup Script

set -e

echo "🧹 Cleaning up Mise AI Platform..."

# Delete all resources in the mise-ai namespace
kubectl delete namespace mise-ai --ignore-not-found=true

echo "✅ Cleanup completed successfully!"
echo ""
echo "ℹ️  Note: This script only removes Kubernetes resources."
echo "   If you want to remove KEDA completely, run:"
echo "   kubectl delete -f https://github.com/kedacore/keda/releases/download/v2.12.0/keda-2.12.0.yaml"
