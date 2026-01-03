import asyncio
import json
import logging
from datetime import datetime
from typing import Callable, Type, Any
from aiokafka import AIOKafkaConsumer
from pydantic import BaseModel

logger = logging.getLogger("uvicorn")

_consumer_registry: list[dict[str, Any]] = []


def consumes(topic: str, validation: Type[BaseModel] | None = None):
    """
    Decorator to register a Kafka consumer handler
    """

    def decorator(fn: Callable):
        _consumer_registry.append(
            {"topic": topic, "handler": fn, "validation": validation}
        )
        return fn

    return decorator


class KafkaConsumerDispatcher:
    def __init__(self, bootstrap_servers: str, group_id: str) -> None:
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self.consumers: dict[str, AIOKafkaConsumer] = {}
        self._tasks: list[asyncio.Task] = []
        self._running = False

    async def start(self):
        self._running = True

        for entry in _consumer_registry:
            topic = entry["topic"]
            consumer = AIOKafkaConsumer(
                topic,
                bootstrap_servers=self.bootstrap_servers,
                group_id=f"{self.group_id}-{topic}",
                auto_offset_reset="earliest",
            )
            self.consumers[topic] = consumer
            await consumer.start()
            task = asyncio.create_task(self._consumes(consumer, entry))
            self._tasks.append(task)
            logger.info(f"Kafka consumer started for topic: {topic}")

    async def stop(self):
        self._running = False
        for task in self._tasks:
            task.cancel()

            try:
                await task
            except asyncio.CancelledError:
                pass
        for consumer in self.consumers.values():
            await consumer.stop()
        logger.info("All Kafka consumers stopped")

    async def _consumes(self, consumer: AIOKafkaConsumer, entry: dict) -> None:
        while self._running:
            async for msg in consumer:
                if not self._running:
                    break
                try:
                    # TODO: Some producers produces messages with different shapes
                    # This will need to be addressed in future
                    if not msg.value:
                        logger.warning(f"Skipping message with no value: {msg}")
                        continue

                    # decode safely
                    payload_str = msg.value.decode("utf-8")
                    payload_dict = json.loads(payload_str)

                    # handle nested JS envelope { key, value } if needed
                    if "value" in payload_dict:
                        payload_dict = payload_dict["value"]

                    if (
                        "interaction" in payload_dict
                        and "timestamp" in payload_dict["interaction"]
                    ):
                        ts = payload_dict["interaction"]["timestamp"]
                        if isinstance(ts, str):
                            # ISO string -> epoch millis
                            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                            payload_dict["interaction"]["timestamp"] = int(
                                dt.timestamp() * 1000
                            )
                        elif isinstance(ts, (float, int)):
                            # already numeric, ensure int
                            payload_dict["interaction"]["timestamp"] = int(ts)

                    # Pydantic validation
                    validation: Type[BaseModel] = entry.get("validation")
                    if validation:
                        payload = validation.parse_obj(payload_dict)
                    else:
                        payload = payload_dict

                    await entry["handler"](payload)

                except Exception as e:
                    logger.exception(
                        f"Failed to handle message from topic {entry['topic']}: {e}"
                    )
