import unicodedata


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
