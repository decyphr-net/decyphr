# app/main.py
import logging
import os
import asyncio
import json
from datetime import datetime
from typing import Optional
import unicodedata
from app.nlp import process_text
from app.schemas import ChatDeltaPayload, ProcessRequest
import uvicorn
from fastapi import FastAPI
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from app.database import create_all_tables


logger = logging.getLogger("uvicorn")

app = FastAPI(title="NLP Service", version="0.1.0")


@app.on_event("startup")
async def startup_event():
    # create tables if DB present and desired
    if os.getenv("NLP_CREATE_TABLES", "true").lower() in ("1", "true", "yes"):
        try:
            await create_all_tables()
            logger.info("NLP DB tables ensured.")
        except Exception as e:
            logger.exception("Failed to create tables: %s", e)

    global producer_wrapper, consumer_worker
    # Initialize producer
    producer_wrapper = KafkaProducerWrapper()
    await producer_wrapper.start()

    # Initialize consumer worker with producer
    consumer_worker = KafkaConsumerWorker(producer=producer_wrapper)
    await consumer_worker.start()


@app.on_event("shutdown")
async def shutdown_event():
    global producer_wrapper, consumer_worker
    if consumer_worker:
        await consumer_worker.stop()
    if producer_wrapper:
        await producer_wrapper.stop()


@app.get("/health")
async def health():
    return {"status": "ok"}


def normalize_token(surface: str) -> str:
    """
    Returns a normalized version of a token for lexicon tracking.

    :param surface: the token as it appears in the text
    :param lemma: optional canonical form
    :return: normalized token string
    """
    surface.lower()
    # Remove accents/diacritics
    base = unicodedata.normalize("NFD", surface)
    base = "".join([c for c in base if not unicodedata.combining(c)])
    # Optional: remove non-alphanumeric chars
    # base = re.sub(r"[^\w\s]", "", base)
    return base


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


class KafkaConsumerWorker:
    def __init__(
        self,
        producer: KafkaProducerWrapper,
        translation_topic="translation.complete",
        chat_topic="chat.delta",
        bootstrap_servers="kafka:9092",
    ):
        self.producer = producer

        # Consumers
        self.translation_consumer = AIOKafkaConsumer(
            translation_topic,
            bootstrap_servers=bootstrap_servers,
            group_id="nlp-translation-group",
            auto_offset_reset="earliest",
        )
        self.chat_consumer = AIOKafkaConsumer(
            chat_topic,
            bootstrap_servers=bootstrap_servers,
            group_id="nlp-chat-group",
            auto_offset_reset="earliest",
        )

        self._tasks: list[asyncio.Task] = []
        self._running = False

    async def start(self):
        self._running = True
        await self.translation_consumer.start()
        await self.chat_consumer.start()
        self._tasks.append(asyncio.create_task(self._consume_translation()))
        self._tasks.append(asyncio.create_task(self._consume_chat()))
        logger.info("Kafka consumers started for translation and chat topics.")

    async def stop(self):
        self._running = False
        for task in self._tasks:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        await self.translation_consumer.stop()
        await self.chat_consumer.stop()
        logger.info("Kafka consumers stopped.")

    async def _consume_translation(self):
        async for msg in self.translation_consumer:
            if not self._running:
                break
            try:
                payload = msg.value.decode("utf-8")
                req = ProcessRequest.parse_raw(payload)
                logger.info("Received translation message: %s", req)

                # Process text
                resp = process_text(req.originalText, req.sourceLanguage)
                resp.requestId = req.requestId
                resp.clientId = req.clientId
                resp.interaction = req.interaction

                for sentence in resp.sentences:
                    for token in sentence.tokens:
                        token.normalised = normalize_token(token.surface)

                resp_json = resp.json()
                await self.producer.send(
                    topic="nlp.complete",
                    key=req.requestId,
                    message=resp_json,
                )
            except Exception as e:
                logger.exception("Failed to process translation message: %s", e)

    async def _consume_chat(self):
        async for msg in self.chat_consumer:
            if not self._running:
                break

            try:
                payload_bytes = msg.value  # msg is a ConsumerRecord
                if not payload_bytes:
                    continue

                payload_str = payload_bytes.decode("utf-8")
                logger.info("Received chat message: %s", payload_str)

                try:
                    payload_dict = json.loads(payload_str)

                    interaction = payload_dict.get("interaction")
                    if interaction and isinstance(interaction.get("timestamp"), str):
                        iso_ts = interaction["timestamp"]
                        dt = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
                        interaction["timestamp"] = int(dt.timestamp() * 1000)
                    # Parse and validate the payload using Pydantic
                    delta_payload = ChatDeltaPayload.parse_obj(payload_dict)
                except Exception as e:
                    logger.error("Failed to parse chat delta payload: %s", e)
                    continue

                # Construct a pseudo ProcessRequest if you still want to reuse process_text
                req_obj = ProcessRequest(
                    requestId=str(delta_payload.chatId),
                    clientId=delta_payload.clientId,
                    sourceLanguage=delta_payload.language or "und",
                    targetLanguage="und",
                    originalText=delta_payload.text,
                    translated=None,
                    interaction=delta_payload.interaction,
                )

                # Process text
                resp = process_text(req_obj.originalText, req_obj.sourceLanguage)
                resp.requestId = req_obj.requestId
                resp.clientId = req_obj.clientId
                resp.interaction = req_obj.interaction

                for sentence in resp.sentences:
                    for token in sentence.tokens:
                        token.normalised = normalize_token(token.surface)

                resp_json = resp.json()
                await self.producer.send(
                    topic="nlp.complete",
                    key=req_obj.requestId,
                    message=resp_json,
                )
            except Exception as e:
                logger.exception("Failed to process chat message: %s", e)


producer_wrapper: Optional[KafkaProducerWrapper] = None
consumer_worker: Optional[KafkaConsumerWorker] = None


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8300")),
        reload=False,
    )
