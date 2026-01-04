import unicodedata

NORMALIZATION_POLICIES = {
    "ga": {"strip_diacritics": False},
    "pt": {"strip_diacritics": False},
    "en": {"strip_diacritics": True},
    "default": {"strip_diacritics": False},
}


def normalize_token(surface: str, language: str) -> str:
    surface = surface.lower()

    policy = NORMALIZATION_POLICIES.get(language, NORMALIZATION_POLICIES["default"])

    if not policy["strip_diacritics"]:
        return unicodedata.normalize("NFC", surface)

    base = unicodedata.normalize("NFD", surface)
    base = "".join(c for c in base if not unicodedata.combining(c))
    return base
