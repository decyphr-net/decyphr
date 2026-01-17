# app/schemas.py
from typing import Any, Literal
from pydantic import BaseModel


class InteractionMetadata(BaseModel):
    type: str
    timestamp: int


class TokenMeta(BaseModel):
    surface: str
    normalised: str | None = None
    lemma: str | None = None
    pos: str | None = None
    morph: dict[str, Any] | None = None


class SentenceTokens(BaseModel):
    sentenceId: str | None
    text: str
    tokens: list[TokenMeta]


class ProcessRequest(BaseModel):
    requestId: str
    clientId: str
    sourceLanguage: str
    targetLanguage: str
    originalText: str
    translated: str | None = None
    interaction: InteractionMetadata


class ChatDeltaPayload(BaseModel):
    type: str
    chatId: int
    clientId: str
    botId: int
    language: str
    text: str
    interaction: InteractionMetadata


class ProcessResponse(BaseModel):
    requestId: str | None
    language: str
    sentences: list[SentenceTokens] | None = None
    clientId: str | None
    interaction: InteractionMetadata | None = None


class LexiconImportRequest(BaseModel):
    requestId: str
    clientId: str
    targetLanguage: str
    words: list[str]
    interaction: InteractionMetadata


class StatementChanges(BaseModel):
    text: str
    translation: str | None = None
    pronunciation: str | None = None
    notes: str | None = None


class StatementEvent(BaseModel):
    statementId: str | None
    requestId: str | None
    clientId: str
    changes: StatementChanges
    interaction: InteractionMetadata
    type: Literal["statement_created", "statement_updated"]
    autoTranslate: bool = False
    timestamp: int
    language: str
