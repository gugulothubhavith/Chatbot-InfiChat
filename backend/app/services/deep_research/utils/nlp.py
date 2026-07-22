"""NLP utilities — spaCy NER, YAKE keyword extraction."""

import logging
import re

logger = logging.getLogger(__name__)

# Lazy-loaded globals
_nlp = None
_kw_extractor = None


def get_spacy_nlp():
    """Lazy-load spaCy model (auto-downloads if missing)."""
    global _nlp
    if _nlp is not None:
        return _nlp
    try:
        import spacy
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.info("Downloading spaCy en_core_web_sm model...")
            from spacy.cli import download
            download("en_core_web_sm")
            _nlp = spacy.load("en_core_web_sm")
        return _nlp
    except Exception as e:
        logger.warning(f"spaCy unavailable: {e}")
        return None


def get_yake_extractor():
    """Lazy-load YAKE keyword extractor."""
    global _kw_extractor
    if _kw_extractor is not None:
        return _kw_extractor
    try:
        import yake
        _kw_extractor = yake.KeywordExtractor(
            lan="en", n=3, dedupLim=0.7, top=20, features=None
        )
        return _kw_extractor
    except Exception as e:
        logger.warning(f"YAKE unavailable: {e}")
        return None


def extract_entities(text: str) -> list:
    """Extract named entities via spaCy NER."""
    nlp = get_spacy_nlp()
    if not nlp:
        return []
    # Truncate to avoid memory issues
    doc = nlp(text[:50000])
    entities = []
    seen = set()
    for ent in doc.ents:
        key = (ent.text.strip(), ent.label_)
        if key not in seen and len(ent.text.strip()) > 1:
            seen.add(key)
            entities.append({
                "name": ent.text.strip(),
                "type": ent.label_,
            })
    return entities


def extract_keywords(text: str, top_n: int = 15) -> list:
    """Extract keywords via YAKE (unsupervised, no API)."""
    kw = get_yake_extractor()
    if not kw:
        # Fallback: simple word frequency
        words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
        from collections import Counter
        return [w for w, _ in Counter(words).most_common(top_n)]
    keywords = kw.extract_keywords(text[:10000])
    return [kw_text for kw_text, _ in keywords[:top_n]]


def extract_dates_from_text(text: str) -> list:
    """Extract date strings from text using dateparser."""
    try:
        import dateparser
    except ImportError:
        return []

    # Find date-like patterns
    date_patterns = re.findall(
        r'\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\w+ \d{1,2},? \d{4}|'
        r'\d{4}[-/]\d{1,2}[-/]\d{1,2}|'
        r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b',
        text, re.IGNORECASE
    )
    parsed = []
    for d in date_patterns[:50]:  # cap at 50
        result = dateparser.parse(d)
        if result:
            parsed.append({
                "raw": d,
                "parsed": result.isoformat(),
            })
    return parsed
