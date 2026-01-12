import json
import uuid
import logging

from app.utils.kafka.dispatcher import consumes
from app.schemas import ProcessRequest, SentenceTokens, TokenMeta
from app.nlp import process_text
from app.utils.normalisers.normaliser import normalize_token

from app.utils.kafka.producer import KafkaProducerWrapper

logger = logging.getLogger("uvicorn")


@consumes("translation.complete", validation=ProcessRequest)
async def handle_translation(req: ProcessRequest):
    producer = KafkaProducerWrapper()
    try:
        # Process text
        processed_text = process_text(req.originalText, req.sourceLanguage)

        # Normalize tokens
        for sentence in processed_text.sentences:
            for token in sentence.tokens:
                token.normalised = normalize_token(token.surface, req.sourceLanguage)

        # Build enriched sentences payload
        enriched_sentences = [
            SentenceTokens(
                sentenceId=str(uuid.uuid4()),
                text=sentence.text,
                tokens=[TokenMeta(**t.dict()) for t in sentence.tokens],
            )
            for sentence in processed_text.sentences
        ]

        enriched_payload = {
            "requestId": req.requestId,
            "clientId": req.clientId,
            "language": req.sourceLanguage,
            "sentences": [s.dict() for s in enriched_sentences],
            "interaction": req.interaction.dict() if req.interaction else None,
        }

        await producer.start()
        # Produce
        await producer.send(
            topic="nlp.complete",
            key=req.requestId,
            message=json.dumps(enriched_payload),
        )
        await producer.stop()

        logger.info(
            f"Processed translation request: {req.requestId} for client {req.clientId}"
        )

    except Exception as e:
        logger.exception(
            f"Failed processing translation request: {req.requestId} - {e}"
        )
