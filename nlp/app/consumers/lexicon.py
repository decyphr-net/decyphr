import logging

from app.utils.kafka.dispatcher import consumes
from app.schemas import LexiconImportRequest
from app.nlp import process_text
from app.utils.kafka.producer import KafkaProducerWrapper
from app.utils.normalisers.normaliser import normalize_token

logger = logging.getLogger("uvicorn")


@consumes("lexicon.import", validation=LexiconImportRequest)
async def handle_lexicon_import(req: LexiconImportRequest):
    producer = KafkaProducerWrapper()
    await producer.start()
    text = " ".join(req.words)

    resp = process_text(
        text,
        lang=req.targetLanguage or "und",
    )

    resp.requestId = req.requestId
    resp.clientId = req.clientId
    resp.interaction = req.interaction

    for sentence in resp.sentences or []:
        for token in sentence.tokens:
            token.normalised = normalize_token(token.surface)

    await producer.send(
        topic="nlp.complete",
        key=req.requestId,
        message=resp.json(),
    )
    await producer.stop()
