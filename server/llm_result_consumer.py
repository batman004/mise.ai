import json
import signal
import sys
from typing import Dict, Any
from loguru import logger
from dotenv import load_dotenv
from datetime import datetime

from queue_helper import rabbitmq_helper
from db import SessionLocal, LLMJob

load_dotenv()


class LLMResultConsumer:
    """Consumer for LLM results from ML server"""

    def __init__(self):
        self.queue_name = "llm_result_queue"
        self.running = False

    def process_llm_result(self, ch, method, properties, body):
        """Process an LLM result message"""
        try:
            message = json.loads(body.decode("utf-8"))
            logger.info(f"Processing LLM result: {message.get('job_id', 'unknown')}")

            # Extract data
            job_id = message.get("job_id")
            result = message.get("result", {})
            status = message.get("status", "completed")
            error_message = message.get("error_message")

            if not job_id:
                logger.error("Missing job_id in LLM result")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                return

            # Store result in database
            success = self._store_llm_result(
                job_id=job_id,
                result=result,
                status=status,
                error_message=error_message,
            )

            if success:
                logger.info(f"Successfully stored LLM result for job {job_id}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
            else:
                logger.error(f"Failed to store LLM result for job {job_id}")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON message: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            logger.error(f"Error processing LLM result: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    def _store_llm_result(
        self,
        job_id: int,
        result: Dict[str, Any],
        status: str,
        error_message: str = None,
    ) -> bool:
        """Store LLM result in database"""
        try:
            db = SessionLocal()
            try:
                job = db.query(LLMJob).filter(LLMJob.id == job_id).first()

                if not job:
                    logger.error(f"Job {job_id} not found")
                    return False

                job.result_json = json.dumps(result)
                job.status = status
                if error_message:
                    job.error = error_message
                job.updated_at = datetime.utcnow()

                db.commit()
                logger.info(f"Updated job {job_id} with status {status}")
                return True

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Database error storing LLM result: {e}")
            if "db" in locals():
                try:
                    db.rollback()
                    db.close()
                except Exception:
                    pass
            return False

    def start_consuming(self):
        """Start consuming LLM results"""
        try:
            logger.info("Starting LLM result consumer...")

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
                callback=self.process_llm_result,
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
        logger.info("LLM result consumer stopped")

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

    consumer = LLMResultConsumer()

    try:
        consumer.start_consuming()
    except Exception as e:
        logger.error(f"Failed to start consumer: {e}")
        sys.exit(1)
