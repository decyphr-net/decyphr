from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON, Index
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class NLPDocument(Base):
    __tablename__ = "nlp_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # raw text submitted for processing
    text = Column(Text, nullable=False)

    # sha256(text+lang) so different languages can coexist
    text_hash = Column(String(64), nullable=False, index=True)

    language = Column(String(10), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # one-to-many relation
    tokens = relationship(
        "NLPToken", back_populates="document", cascade="all, delete-orphan"
    )


class NLPToken(Base):
    __tablename__ = "nlp_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("nlp_documents.id"), nullable=False)

    # surface form
    token = Column(String(128), nullable=False)

    # canonical form
    lemma = Column(String(128), nullable=True)

    # normalised POS (English human-readable, e.g., "verb")
    pos = Column(String(64), nullable=True)

    # full morphological data straight from pipeline
    morph = Column(JSON, nullable=True)

    index = Column(Integer, nullable=False)  # order in text

    document = relationship("NLPDocument", back_populates="tokens")


# Recommended index for fast lookups
Index("idx_document_hash", NLPDocument.text_hash)
Index("idx_token_lemma", NLPToken.lemma)
Index("idx_token_pos", NLPToken.pos)
