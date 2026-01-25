import logging

from app.utils.kafka.dispatcher import consumes
from app.schemas import LexiconImportRequest, StatementChanges, StatementEvent
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
        lang=req.targetLanguage,
    )

    resp.requestId = req.requestId
    resp.clientId = req.clientId
    resp.interaction = req.interaction

    for sentence in resp.sentences or []:
        for token in sentence.tokens:
            token.normalised = normalize_token(token.surface, req.targetLanguage)

    await producer.send(
        topic="nlp.complete",
        key=req.requestId,
        message=resp.json(),
    )
    await producer.stop()


@consumes("statement.events", validation=StatementEvent)
async def handle_statement_event(req: StatementEvent):
    producer = KafkaProducerWrapper()
    await producer.start()

    # 1️⃣ NLP only cares about text
    resp = process_text(
        req.changes.text,
        lang=req.language,
    )

    # 2️⃣ Propagate identity + metadata
    if req.type == "statement_created":
        resp.requestId = req.requestId or req.timestamp
    elif req.type == "statement_updated":
        resp.requestId = req.statementId
    resp.clientId = req.clientId
    resp.interaction = req.interaction
    if resp.changes is None:
        resp.changes = StatementChanges(text=req.changes.text if req.changes else "")

    # Then safely set optional fields
    if req.changes:
        resp.changes.translation = req.changes.translation
        resp.changes.pronunciation = req.changes.pronunciation
        resp.changes.notes = req.changes.notes

    # 3️⃣ Normalize tokens
    for sentence in resp.sentences or []:
        for token in sentence.tokens:
            token.normalised = normalize_token(token.surface, req.language)

    # 4️⃣ Emit NLP result
    await producer.send(
        topic="nlp.complete",
        key=str(req.statementId),
        message=resp.json(),
    )

    await producer.stop()
