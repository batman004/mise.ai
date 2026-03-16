import pika
import json
import os
from typing import Dict, Any, Optional
from loguru import logger
from dotenv import load_dotenv

load_dotenv()


class RabbitMQHelper:
    """Helper class for RabbitMQ operations in ML server"""

    def __init__(self):
        self.host = os.getenv("RABBITMQ_HOST", "rabbitmq")
        self.port = int(os.getenv("RABBITMQ_PORT", "5672"))
        self.user = os.getenv("RABBITMQ_USER", "admin")
        self.password = os.getenv("RABBITMQ_PASSWORD", "admin")
        self.vhost = os.getenv("RABBITMQ_VHOST", "/")

        self.connection: Optional[pika.BlockingConnection] = None
        self.channel: Optional[pika.channel.Channel] = None

    def connect(self) -> bool:
        """Establish connection to RabbitMQ"""
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

            logger.info(f"Connected to RabbitMQ at {self.host}:{self.port}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False

    def disconnect(self):
        """Close RabbitMQ connection"""
        try:
            if self.channel and not self.channel.is_closed:
                self.channel.close()
            if self.connection and not self.connection.is_closed:
                self.connection.close()
            logger.info("Disconnected from RabbitMQ")
        except Exception as e:
            logger.error(f"Error disconnecting from RabbitMQ: {e}")

    def declare_queue(self, queue_name: str, durable: bool = True) -> bool:
        """Declare a queue"""
        try:
            if not self.channel:
                if not self.connect():
                    return False

            self.channel.queue_declare(queue=queue_name, durable=durable)
            logger.info(f"Declared queue: {queue_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to declare queue {queue_name}: {e}")
            return False

    def publish_message(
        self, queue_name: str, message: Dict[str, Any], persistent: bool = True
    ) -> bool:
        """Publish a message to a queue"""
        try:
            if not self.channel:
                if not self.connect():
                    return False

            # Declare queue if it doesn't exist
            self.declare_queue(queue_name)

            # Publish message
            self.channel.basic_publish(
                exchange="",
                routing_key=queue_name,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2 if persistent else 1,  # Make message persistent
                    content_type="application/json",
                ),
            )

            logger.info(
                f"Published message to queue {queue_name}: {message.get('job_id', 'unknown')}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to publish message to {queue_name}: {e}")
            return False

    def consume_messages(self, queue_name: str, callback, auto_ack: bool = False):
        """Start consuming messages from a queue"""
        try:
            if not self.channel:
                if not self.connect():
                    return False

            # Declare queue if it doesn't exist
            self.declare_queue(queue_name)

            # Set up consumer
            self.channel.basic_qos(prefetch_count=1)
            self.channel.basic_consume(
                queue=queue_name, on_message_callback=callback, auto_ack=auto_ack
            )

            logger.info(f"Started consuming from queue: {queue_name}")
            self.channel.start_consuming()

        except Exception as e:
            logger.error(f"Failed to consume from queue {queue_name}: {e}")

    def stop_consuming(self):
        """Stop consuming messages"""
        try:
            if self.channel and not self.channel.is_closed:
                self.channel.stop_consuming()
                logger.info("Stopped consuming messages")
        except Exception as e:
            logger.error(f"Error stopping consumption: {e}")

    def ack_message(self, delivery_tag):
        """Acknowledge a message"""
        try:
            if self.channel and not self.channel.is_closed:
                self.channel.basic_ack(delivery_tag=delivery_tag)
        except Exception as e:
            logger.error(f"Error acknowledging message: {e}")

    def nack_message(self, delivery_tag, requeue: bool = True):
        """Negative acknowledge a message"""
        try:
            if self.channel and not self.channel.is_closed:
                self.channel.basic_nack(delivery_tag=delivery_tag, requeue=requeue)
        except Exception as e:
            logger.error(f"Error nacking message: {e}")

    def get_queue_info(self, queue_name: str) -> Dict[str, Any]:
        """Get queue information"""
        try:
            if not self.channel:
                if not self.connect():
                    return {}

            method = self.channel.queue_declare(queue=queue_name, passive=True)
            return {
                "queue": queue_name,
                "message_count": method.method.message_count,
                "consumer_count": method.method.consumer_count,
            }

        except Exception as e:
            logger.error(f"Failed to get queue info for {queue_name}: {e}")
            return {}

    def purge_queue(self, queue_name: str) -> bool:
        """Purge all messages from a queue"""
        try:
            if not self.channel:
                if not self.connect():
                    return False

            method = self.channel.queue_purge(queue=queue_name)
            logger.info(
                f"Purged {method.method.message_count} messages from {queue_name}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to purge queue {queue_name}: {e}")
            return False


# Global instance
rabbitmq_helper = RabbitMQHelper()
