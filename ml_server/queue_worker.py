import json
import os
import signal
import sys
from typing import Dict, Any
from loguru import logger
from dotenv import load_dotenv
import pika

from redis_client import redis_client

load_dotenv()


class MLQueueWorker:
    """Worker for processing ML prediction tasks"""

    def __init__(self):
        self.host = os.getenv("RABBITMQ_HOST", "rabbitmq")
        self.port = int(os.getenv("RABBITMQ_PORT", "5672"))
        self.user = os.getenv("RABBITMQ_USER", "admin")
        self.password = os.getenv("RABBITMQ_PASSWORD", "admin")
        self.vhost = os.getenv("RABBITMQ_VHOST", "/")

        self.prediction_queue = os.getenv("PREDICTION_QUEUE", "prediction_queue")
        self.result_queue = os.getenv(
            "PREDICTION_RESULT_QUEUE", "prediction_result_queue"
        )
        self.max_concurrent_jobs = int(os.getenv("MAX_CONCURRENT_JOBS", "5"))

        self.connection: pika.BlockingConnection = None
        self.channel: pika.channel.Channel = None
        self.running = False

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
            self.channel.queue_declare(queue=self.prediction_queue, durable=True)
            self.channel.queue_declare(queue=self.result_queue, durable=True)

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

    def process_prediction_task(self, ch, method, properties, body):
        """Process a prediction task"""
        job_id = None
        try:
            # Parse message
            message = json.loads(body.decode("utf-8"))
            job_id = message.get("job_id")
            user_id = message.get("user_id")
            prediction_type = message.get("prediction_type", "general")
            input_data = message.get("input_data", {})

            logger.info(
                f"Processing prediction task: {job_id} (type: {prediction_type})"
            )

            if not job_id or not user_id:
                logger.error("Missing required fields in prediction task")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return

            # Check for duplicate job
            if redis_client.is_job_duplicate(job_id):
                logger.warning(f"Duplicate job {job_id}, skipping")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return

            # Set job status to processing
            redis_client.set_job_status(job_id, "processing")

            # Process prediction based on type
            prediction_result = self._run_prediction(prediction_type, input_data)

            if prediction_result:
                # Set job status to completed
                redis_client.set_job_status(job_id, "completed", prediction_result)

                # Send result to result queue
                result_message = {
                    "job_id": job_id,
                    "user_id": user_id,
                    "prediction_data": prediction_result,
                    "status": "completed",
                }

                self._send_result(result_message)
                logger.info(f"Successfully processed prediction task: {job_id}")
                ch.basic_ack(delivery_tag=method.delivery_tag)

            else:
                # Set job status to failed
                redis_client.set_job_status(job_id, "failed")

                # Send error result
                error_message = {
                    "job_id": job_id,
                    "user_id": user_id,
                    "prediction_data": {},
                    "status": "failed",
                    "error_message": "Prediction processing failed",
                }

                self._send_result(error_message)
                logger.error(f"Failed to process prediction task: {job_id}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON message: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            logger.error(f"Error processing prediction task {job_id}: {e}")

            # Set job status to failed
            if job_id:
                redis_client.set_job_status(job_id, "failed")

                # Send error result
                error_message = {
                    "job_id": job_id,
                    "user_id": message.get("user_id", "unknown"),
                    "prediction_data": {},
                    "status": "failed",
                    "error_message": str(e),
                }

                self._send_result(error_message)

            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def _run_prediction(
        self, prediction_type: str, input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Run prediction based on type"""
        try:
            if prediction_type == "specific":
                # Call the specific model prediction endpoint
                from specific_model.predict import predict_main_specific_model

                date = input_data.get("date")
                if not date:
                    raise ValueError("Date is required for specific predictions")
                prediction = predict_main_specific_model(date)
                return self._serialize_dataframe(prediction)

            elif prediction_type == "general":
                # Call the general model prediction endpoint
                from general_model.predict import predict_main_general_model
                import pandas as pd

                # Build input dataframe for prediction
                df_input = pd.DataFrame([input_data])
                prediction = predict_main_general_model(df_input)
                return self._serialize_dataframe(prediction)

            else:
                logger.error(f"Unknown prediction type: {prediction_type}")
                return None

        except Exception as e:
            logger.error(f"Error running {prediction_type} prediction: {e}")
            return None

    def _serialize_dataframe(self, df) -> Dict[str, Any]:
        """Convert pandas DataFrame to JSON-serializable format"""
        try:
            import pandas as pd
            import numpy as np

            # Convert DataFrame to dict with proper serialization
            df_dict = df.to_dict(orient="records")

            # Convert any non-serializable objects
            serializable_dict = []
            for record in df_dict:
                serializable_record = {}
                for key, value in record.items():
                    if pd.isna(value):
                        serializable_record[key] = None
                    elif isinstance(value, (pd.Timestamp, np.datetime64)):
                        serializable_record[key] = str(value)
                    elif isinstance(value, (np.integer, np.floating)):
                        serializable_record[key] = value.item()
                    elif isinstance(value, np.ndarray):
                        serializable_record[key] = value.tolist()
                    else:
                        serializable_record[key] = value
                serializable_dict.append(serializable_record)

            return serializable_dict

        except Exception as e:
            logger.error(f"Error serializing DataFrame: {e}")
            return []

    def _send_result(self, result_message: Dict[str, Any]):
        """Send result to result queue"""
        try:
            self.channel.basic_publish(
                exchange="",
                routing_key=self.result_queue,
                body=json.dumps(result_message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                    content_type="application/json",
                ),
            )
            logger.info(f"Sent result for job: {result_message.get('job_id')}")

        except Exception as e:
            logger.error(f"Failed to send result: {e}")

    def start_consuming(self):
        """Start consuming prediction tasks"""
        try:
            logger.info("Starting ML queue worker...")

            # Connect to Redis
            if not redis_client.connect():
                logger.error("Failed to connect to Redis")
                return False

            # Connect to RabbitMQ
            if not self.connect():
                logger.error("Failed to connect to RabbitMQ")
                return False

            self.running = True
            logger.info(f"Worker started, listening on queue: {self.prediction_queue}")

            # Start consuming
            self.channel.basic_consume(
                queue=self.prediction_queue,
                on_message_callback=self.process_prediction_task,
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
        redis_client.disconnect()
        logger.info("ML queue worker stopped")

    def health_check(self) -> Dict[str, Any]:
        """Health check for the worker"""
        try:
            redis_health = redis_client.health_check()

            return {
                "status": "healthy" if self.running else "stopped",
                "redis": redis_health,
                "rabbitmq_connected": self.connection is not None
                and not self.connection.is_closed,
                "max_concurrent_jobs": self.max_concurrent_jobs,
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "redis": {"status": "unknown"},
                "rabbitmq_connected": False,
            }


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
    worker = MLQueueWorker()

    try:
        worker.start_consuming()
    except Exception as e:
        logger.error(f"Failed to start worker: {e}")
        sys.exit(1)
