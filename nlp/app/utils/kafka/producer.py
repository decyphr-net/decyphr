import logging
from aiokafka import AIOKafkaProducer


logger = logging.getLogger("uvicorn")


class KafkaProducerWrapper:
    def __init__(self, bootstrap_servers: str = "kafka:9092"):
        self.producer = AIOKafkaProducer(bootstrap_servers=bootstrap_servers)

    async def start(self):
        await self.producer.start()
        logger.info("Kafka producer started.")

    async def stop(self):
        await self.producer.stop()
        logger.info("Kafka producer stopped.")

    async def send(self, topic: str, message: str, key: str):
        await self.producer.send_and_wait(
            topic, message.encode("utf-8"), key=key.encode("utf-8")
        )
        logger.info("Produced message to %s", topic)
