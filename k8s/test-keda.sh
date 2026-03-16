#!/bin/bash

# KEDA Integration Test Script
# This script tests the KEDA auto-scaling functionality

set -e

echo "🧪 Testing KEDA Auto-Scaling Integration..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if KEDA is installed
if ! kubectl get crd scaledobjects.keda.sh &> /dev/null; then
    echo "❌ KEDA is not installed. Please install KEDA first."
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace mise-ai &> /dev/null; then
    echo "❌ mise-ai namespace not found. Please deploy the platform first."
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Function to check scaledobject status
check_scaledobject() {
    local scaledobject_name="ml-worker-scaledobject"
    local namespace="mise-ai"
    
    echo "📊 Checking ScaledObject status..."
    kubectl get scaledobject $scaledobject_name -n $namespace -o yaml | grep -A 20 "status:"
}

# Function to check current replicas
check_replicas() {
    local deployment_name="ml-worker"
    local namespace="mise-ai"
    
    echo "🔢 Current ML Worker replicas:"
    kubectl get deployment $deployment_name -n $namespace -o jsonpath='{.spec.replicas}'
    echo ""
}

# Function to check queue status
check_queue() {
    echo "📋 RabbitMQ Queue Status:"
    kubectl exec -it deployment/rabbitmq -n mise-ai -- rabbitmqctl list_queues name messages consumers 2>/dev/null || echo "Could not connect to RabbitMQ"
}

# Function to send test messages
send_test_messages() {
    echo "📤 Sending test messages to trigger scaling..."
    
    # Create a simple Python script to send messages
    cat << 'EOF' > /tmp/send_messages.py
import pika
import json
import time

# Connect to RabbitMQ
connection = pika.BlockingConnection(
    pika.ConnectionParameters('localhost', 5672, '/', pika.PlainCredentials('admin', 'admin'))
)
channel = connection.channel()

# Declare queue
channel.queue_declare(queue='prediction_queue', durable=True)

# Send test messages
for i in range(60):  # Send 60 messages to trigger scaling
    message = {
        'job_id': f'test-job-{i}',
        'user_id': 'test-user',
        'prediction_type': 'general',
        'input_data': {'test': f'data-{i}'}
    }
    
    channel.basic_publish(
        exchange='',
        routing_key='prediction_queue',
        body=json.dumps(message),
        properties=pika.BasicProperties(delivery_mode=2)
    )
    
    print(f"Sent message {i+1}/60")
    time.sleep(0.1)

connection.close()
print("All messages sent!")
EOF

    # Port forward RabbitMQ and run the script
    echo "Setting up port forwarding for RabbitMQ..."
    kubectl port-forward svc/rabbitmq-service 5672:5672 -n mise-ai &
    PORT_FORWARD_PID=$!
    
    # Wait for port forward to be ready
    sleep 5
    
    # Run the message sender
    python3 /tmp/send_messages.py
    
    # Clean up
    kill $PORT_FORWARD_PID 2>/dev/null || true
    rm -f /tmp/send_messages.py
}

# Main test sequence
echo ""
echo "🔍 Initial Status Check:"
check_scaledobject
check_replicas
check_queue

echo ""
echo "📤 Sending test messages to trigger scaling..."
send_test_messages

echo ""
echo "⏳ Waiting for scaling to occur (30 seconds)..."
sleep 30

echo ""
echo "🔍 Post-Scaling Status Check:"
check_scaledobject
check_replicas

echo ""
echo "📊 Monitoring scaling for 60 seconds..."
echo "Watch for replica changes:"
kubectl get pods -n mise-ai -l app=ml-worker -w &
WATCH_PID=$!

sleep 60

kill $WATCH_PID 2>/dev/null || true

echo ""
echo "✅ KEDA Integration Test Completed!"
echo ""
echo "📋 Summary:"
echo "- Check the ScaledObject status above"
echo "- Verify that ML worker replicas scaled up when messages were sent"
echo "- Monitor the queue length decrease as workers process messages"
echo ""
echo "🔧 Manual verification commands:"
echo "  kubectl get scaledobjects -n mise-ai"
echo "  kubectl get pods -n mise-ai -l app=ml-worker"
echo "  kubectl describe scaledobject ml-worker-scaledobject -n mise-ai"
