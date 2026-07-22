"""Scoring utilities — TF-IDF, cosine similarity, weighted scoring."""

import logging
import re
import math
from collections import Counter
from typing import List, Dict

logger = logging.getLogger(__name__)


def tokenize(text: str) -> List[str]:
    """Simple whitespace + punctuation tokenizer."""
    return re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())


def compute_tfidf(documents: List[str]) -> List[Dict[str, float]]:
    """Compute TF-IDF vectors for a list of documents."""
    if not documents:
        return []

    # Term frequency per document
    doc_tokens = [tokenize(doc) for doc in documents]
    doc_tf = []
    for tokens in doc_tokens:
        total = len(tokens) or 1
        tf = Counter(tokens)
        doc_tf.append({word: count / total for word, count in tf.items()})

    # Document frequency
    df = Counter()
    for tf in doc_tf:
        for word in tf:
            df[word] += 1

    n_docs = len(documents)
    # TF-IDF
    tfidf_vectors = []
    for tf in doc_tf:
        tfidf = {}
        for word, freq in tf.items():
            idf = math.log((n_docs + 1) / (df[word] + 1)) + 1
            tfidf[word] = freq * idf
        tfidf_vectors.append(tfidf)

    return tfidf_vectors


def cosine_similarity(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
    """Compute cosine similarity between two sparse vectors."""
    if not vec_a or not vec_b:
        return 0.0

    common_keys = set(vec_a.keys()) & set(vec_b.keys())
    if not common_keys:
        return 0.0

    dot_product = sum(vec_a[k] * vec_b[k] for k in common_keys)
    mag_a = math.sqrt(sum(v ** 2 for v in vec_a.values()))
    mag_b = math.sqrt(sum(v ** 2 for v in vec_b.values()))

    if mag_a == 0 or mag_b == 0:
        return 0.0

    return dot_product / (mag_a * mag_b)


def semantic_similarity_texts(text_a: str, text_b: str) -> float:
    """Compute TF-IDF-based similarity between two texts."""
    vectors = compute_tfidf([text_a, text_b])
    if len(vectors) < 2:
        return 0.0
    return cosine_similarity(vectors[0], vectors[1])


def compute_weighted_score(
    authority: float = 0.5,
    recency: float = 1.0,
    stance_weight: float = 1.0,
    semantic_sim: float = 0.5,
    source_diversity: float = 1.0,
) -> float:
    """
    Compute a weighted composite score for a source/fact.

    Weights:
    - Authority: 30%
    - Recency: 20%
    - Stance relevance: 20%
    - Semantic similarity to query: 20%
    - Source diversity bonus: 10%
    """
    score = (
        authority * 0.30
        + recency * 0.20
        + stance_weight * 0.20
        + semantic_sim * 0.20
        + source_diversity * 0.10
    )
    return round(min(max(score, 0.0), 1.0), 3)


def deduplicate_sources(sources: list, similarity_threshold: float = 0.85) -> list:
    """Remove near-duplicate sources based on title/URL similarity."""
    if not sources:
        return []

    unique = [sources[0]]
    for src in sources[1:]:
        is_dup = False
        for u in unique:
            # URL dedup
            if src.get("url") and u.get("url") and src["url"] == u["url"]:
                is_dup = True
                break
            # Title similarity
            if src.get("title") and u.get("title"):
                sim = semantic_similarity_texts(src["title"], u["title"])
                if sim > similarity_threshold:
                    is_dup = True
                    break
        if not is_dup:
            unique.append(src)
    return unique
