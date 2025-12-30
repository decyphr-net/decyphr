# app/nlp_service.py
import stanza
from typing import Dict, List, Optional
from app.schemas import ProcessResponse, SentenceTokens, TokenMeta
import logging
import threading

logger = logging.getLogger("nlp_service")

# Example POS human-readable map (extend per language)
POS_MAPS = {
    "ga": {
        "ADJ": "adjective",
        "ADP": "adposition",
        "ADV": "adverb",
        "AUX": "auxiliary verb",
        "CCONJ": "coordinating conjunction",
        "SCONJ": "subordinating conjunction",
        "DET": "determiner",
        "INTJ": "interjection",
        "NOUN": "noun",
        "PROPN": "proper noun",
        "NUM": "numeral",
        "PART": "particle",
        "PRON": "pronoun",
        "PUNCT": "punctuation",
        "SYM": "symbol",
        "VERB": "verb",
        "X": "unknown",
    },
    "en": {  # sample english map
        "VERB": "verb",
        "NOUN": "noun",
        "ADJ": "adjective",
        "ADV": "adverb",
        "PRON": "pronoun",
        "DET": "determiner",
        "ADP": "adposition",
        "AUX": "auxiliary verb",
        "PUNCT": "punctuation",
        "X": "unknown",
    },
}


def normalise_pos(lang: str, tag: Optional[str]) -> str:
    if not tag:
        return ""
    tag = tag.strip().upper()
    mapping = POS_MAPS.get(lang, {})
    return mapping.get(tag, tag.lower())


class StanzaManager:
    """
    Lazy-loading thread-safe stanza pipeline manager.
    """

    _lock = threading.Lock()
    _pipelines: Dict[str, stanza.Pipeline] = {}

    @classmethod
    def get_pipeline(cls, lang: str):
        lang = lang or "ga"
        with cls._lock:
            if lang in cls._pipelines:
                return cls._pipelines[lang]
            # Create pipeline (tokenize,pos,lemma)
            try:
                nlp = stanza.Pipeline(
                    lang=lang, processors="tokenize,pos,lemma", verbose=False
                )
            except Exception as e:
                logger.exception("Failed to load stanza pipeline for %s: %s", lang, e)
                # Optionally attempt to download models automatically — or rethrow
                raise
            cls._pipelines[lang] = nlp
            return nlp


def parse_feats(feats: str | None):
    if not feats:
        return {}
    result = {}
    for item in feats.split("|"):
        if "=" in item:
            k, v = item.split("=", 1)
            result[k] = v
    return result


def process_text(text: str, lang: str) -> ProcessResponse:
    pipeline = StanzaManager.get_pipeline(lang)
    doc = pipeline(text)

    def parse_feats(feats: str | None):
        if not feats:
            return {}
        result = {}
        for item in feats.split("|"):
            if "=" in item:
                k, v = item.split("=", 1)
                result[k] = v
        return result

    sentences: List[SentenceTokens] = []
    for sidx, sent in enumerate(doc.sentences):
        tokens = []
        for w in sent.words:
            tokens.append(
                TokenMeta(
                    surface=w.text,
                    lemma=getattr(w, "lemma", None),
                    pos=normalise_pos(lang, getattr(w, "upos", None)),
                    morph=parse_feats(getattr(w, "feats", None)),  # ← FIXED
                )
            )
        sentences.append(
            SentenceTokens(
                sentenceId=str(sidx),
                text=sent.text,
                tokens=tokens,
            )
        )

    return ProcessResponse(requestId=None, sentences=sentences, language=lang)
