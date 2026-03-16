import json
import signal
import sys
from typing import Dict, Any
from loguru import logger
from dotenv import load_dotenv

from queue_helper import rabbitmq_helper
from db import get_db_connection

load_dotenv()


class PredictionResultConsumer:
    """Consumer for prediction results from ML server"""

    def __init__(self):
        self.queue_name = "prediction_result_queue"
        self.running = False

    def process_prediction_result(self, ch, method, properties, body):
        """Process a prediction result message"""
        try:
            message = json.loads(body.decode("utf-8"))
            logger.info(
                f"Processing prediction result: {message.get('job_id', 'unknown')}"
            )

            # Extract data
            job_id = message.get("job_id")
            user_id = message.get("user_id")
            prediction_data = message.get("prediction_data", {})
            status = message.get("status", "completed")
            error_message = message.get("error_message")

            if not job_id or not user_id:
                logger.error("Missing required fields in prediction result")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return

            # Store result in database
            success = self._store_prediction_result(
                job_id=job_id,
                user_id=user_id,
                prediction_data=prediction_data,
                status=status,
                error_message=error_message,
            )

            if success:
                logger.info(f"Successfully stored prediction result for job {job_id}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
            else:
                logger.error(f"Failed to store prediction result for job {job_id}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON message: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            logger.error(f"Error processing prediction result: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def _store_prediction_result(
        self,
        job_id: str,
        user_id: str,
        prediction_data: Dict[str, Any],
        status: str,
        error_message: str = None,
    ) -> bool:
        """Store prediction result in database"""
        try:
            conn = get_db_connection()
            if not conn:
                return False

            cursor = conn.cursor()

            query = """
                INSERT INTO prediction_results (
                    job_id, user_id, prediction_data, status, error_message, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (job_id)
                DO UPDATE SET
                    prediction_data = EXCLUDED.prediction_data,
                    status = EXCLUDED.status,
                    error_message = EXCLUDED.error_message,
                    updated_at = NOW()
            """

            cursor.execute(
                query,
                (job_id, user_id, json.dumps(prediction_data), status, error_message),
            )

            conn.commit()
            cursor.close()
            conn.close()

            return True

        except Exception as e:
            logger.error(f"Database error storing prediction result: {e}")
            if conn:
                conn.rollback()
                conn.close()
            return False

    def start_consuming(self):
        """Start consuming prediction results"""
        try:
            logger.info("Starting prediction result consumer...")

            if not rabbitmq_helper.connect():
                logger.error("Failed to connect to RabbitMQ")
                return False

            if not rabbitmq_helper.declare_queue(self.queue_name):
                logger.error(f"Failed to declare queue {self.queue_name}")
                return False

            self.running = True
            logger.info(f"Consumer started, listening on queue: {self.queue_name}")

            rabbitmq_helper.consume_messages(
                queue_name=self.queue_name,
                callback=self.process_prediction_result,
                auto_ack=False,
            )

        except KeyboardInterrupt:
            logger.info("Received interrupt signal, stopping consumer...")
            self.stop_consuming()
        except Exception as e:
            logger.error(f"Error in consumer: {e}")
            self.stop_consuming()

    def stop_consuming(self):
        """Stop consuming messages"""
        self.running = False
        rabbitmq_helper.stop_consuming()
        rabbitmq_helper.disconnect()
        logger.info("Prediction result consumer stopped")

    def health_check(self) -> Dict[str, Any]:
        """Health check for the consumer"""
        try:
            queue_info = rabbitmq_helper.get_queue_info(self.queue_name)
            return {
                "status": "healthy" if self.running else "stopped",
                "queue_info": queue_info,
                "connected": rabbitmq_helper.connection is not None
                and not rabbitmq_helper.connection.is_closed,
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "connected": False}


def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    consumer.stop_consuming()
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    consumer = PredictionResultConsumer()

    try:
        consumer.start_consuming()
    except Exception as e:
        logger.error(f"Failed to start consumer: {e}")
        sys.exit(1)
