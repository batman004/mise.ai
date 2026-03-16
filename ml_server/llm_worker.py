import json
import os
import signal
import sys
from typing import Dict, Any
from loguru import logger
from dotenv import load_dotenv
import pika

from llm_service import LLMService

load_dotenv()


class LLMWorker:
    """Worker for processing LLM insight tasks"""

    def __init__(self):
        self.host = os.getenv("RABBITMQ_HOST", "rabbitmq")
        self.port = int(os.getenv("RABBITMQ_PORT", "5672"))
        self.user = os.getenv("RABBITMQ_USER", "admin")
        self.password = os.getenv("RABBITMQ_PASSWORD", "admin")
        self.vhost = os.getenv("RABBITMQ_VHOST", "/")

        self.llm_queue = "llm_queue"
        self.llm_result_queue = "llm_result_queue"
        self.max_concurrent_jobs = int(os.getenv("MAX_CONCURRENT_JOBS", "5"))

        self.connection: pika.BlockingConnection = None
        self.channel: pika.channel.Channel = None
        self.running = False
        self.llm_service = LLMService()

    def connect(self) -> bool:
        """Connect to RabbitMQ"""
        try:
            credentials = pika.PlainCredentials(self.user, self.password)
            parameters = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                virtual_host=self.vhost,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300,
            )

            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()

            # Declare queues
            self.channel.queue_declare(queue=self.llm_queue, durable=True)
            self.channel.queue_declare(queue=self.llm_result_queue, durable=True)

            # Set QoS to limit concurrent jobs
            self.channel.basic_qos(prefetch_count=self.max_concurrent_jobs)

            logger.info(f"Connected to RabbitMQ at {self.host}:{self.port}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False

    def disconnect(self):
        """Disconnect from RabbitMQ"""
        try:
            if self.channel and not self.channel.is_closed:
                self.channel.close()
            if self.connection and not self.connection.is_closed:
                self.connection.close()
            logger.info("Disconnected from RabbitMQ")
        except Exception as e:
            logger.error(f"Error disconnecting from RabbitMQ: {e}")

    def process_llm_task(self, ch, method, properties, body):
        """Process an LLM task"""
        job_id = None
        try:
            # Parse message
            message = json.loads(body.decode("utf-8"))
            logger.info(f"Received message: {json.dumps(message)[:200]}...")

            job_id = message.get("job_id")
            user_id = message.get("user_id")
            label = message.get("label")
            rows_data = message.get("rows_data", [])

            logger.info(
                f"Processing LLM task: job_id={job_id}, user_id={user_id}, label={label}, rows_data_length={len(rows_data) if rows_data else 0}"
            )

            # Use a default label if empty (label can be empty string, which is allowed)
            if not label:
                label = f"upload_{job_id}"

            # Check if required fields are present (rows_data can be empty list)
            if job_id is None or user_id is None or rows_data is None:
                logger.error(
                    f"Missing required fields in LLM task - job_id: {job_id}, user_id: {user_id}, label: {label}, rows_data is None: {rows_data is None}"
                )
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return

            # Process LLM request
            llm_result = self.llm_service.generate_fixed_insights(
                label=label,
                rows_data=rows_data,
            )

            # Send result to result queue
            result_message = {
                "job_id": job_id,
                "user_id": user_id,
                "result": llm_result,
                "status": "completed",
            }

            self._send_result(result_message)
            logger.info(f"Successfully processed LLM task: {job_id}")
            ch.basic_ack(delivery_tag=method.delivery_tag)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON message: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            logger.error(f"Error processing LLM task {job_id}: {e}")

            # Send error result
            if job_id:
                error_message = {
                    "job_id": job_id,
                    "user_id": message.get("user_id", "unknown"),
                    "result": {},
                    "status": "failed",
                    "error_message": str(e),
                }

                self._send_result(error_message)

            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def _send_result(self, result_message: Dict[str, Any]):
        """Send result to result queue"""
        try:
            self.channel.basic_publish(
                exchange="",
                routing_key=self.llm_result_queue,
                body=json.dumps(result_message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                    content_type="application/json",
                ),
            )
            logger.info(f"Sent LLM result for job: {result_message.get('job_id')}")

        except Exception as e:
            logger.error(f"Failed to send result: {e}")

    def start_consuming(self):
        """Start consuming LLM tasks"""
        try:
            logger.info("Starting LLM worker...")

            # Connect to RabbitMQ
            if not self.connect():
                logger.error("Failed to connect to RabbitMQ")
                return False

            self.running = True
            logger.info(f"Worker started, listening on queue: {self.llm_queue}")

            # Start consuming
            self.channel.basic_consume(
                queue=self.llm_queue,
                on_message_callback=self.process_llm_task,
                auto_ack=False,
            )

            self.channel.start_consuming()

        except KeyboardInterrupt:
            logger.info("Received interrupt signal, stopping worker...")
            self.stop_consuming()
        except Exception as e:
            logger.error(f"Error in worker: {e}")
            self.stop_consuming()

    def stop_consuming(self):
        """Stop consuming messages"""
        self.running = False
        if self.channel and not self.channel.is_closed:
            self.channel.stop_consuming()
        self.disconnect()
        logger.info("LLM worker stopped")

    def health_check(self) -> Dict[str, Any]:
        """Health check for the worker"""
        try:
            return {
                "status": "healthy" if self.running else "stopped",
                "rabbitmq_connected": self.connection is not None
                and not self.connection.is_closed,
                "max_concurrent_jobs": self.max_concurrent_jobs,
                "queue": self.llm_queue,
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "rabbitmq_connected": False}


def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    worker.stop_consuming()
    sys.exit(0)


if __name__ == "__main__":
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Create and start worker
    worker = LLMWorker()

    try:
        worker.start_consuming()
    except Exception as e:
        logger.error(f"Failed to start worker: {e}")
        sys.exit(1)
