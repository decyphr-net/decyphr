# app/main.py
import logging
import os

import uvicorn
from fastapi import FastAPI

from app.database import create_all_tables
from app.utils.kafka.dispatcher import KafkaConsumerDispatcher
import app.consumers


logger = logging.getLogger("uvicorn")

app = FastAPI(title="NLP Service", version="0.1.0")

dispatcher = KafkaConsumerDispatcher("kafka:9092", "nlp-chat-group")


@app.on_event("startup")
async def startup_event():
    # create tables if DB present and desired
    if os.getenv("NLP_CREATE_TABLES", "true").lower() in ("1", "true", "yes"):
        try:
            await create_all_tables()
            logger.info("NLP DB tables ensured.")
        except Exception as e:
            logger.exception("Failed to create tables: %s", e)

    await dispatcher.start()


@app.on_event("shutdown")
async def shutdown_event():
    await dispatcher.stop()


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8300")),
        reload=False,
    )
