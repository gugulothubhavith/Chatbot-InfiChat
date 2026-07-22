"""Agent 9: CrossValidationAgent — 3-source triangulation and stance detection."""

from app.core.json_utils import extract_json_from_text
import logging
from app.services.deep_research.models import ResearchState, FactClaim, Stance
from app.services.deep_research.utils.scoring import (
    semantic_similarity_texts, compute_weighted_score,
)

logger = logging.getLogger(__name__)


async def run(state: ResearchState, llm_call) -> ResearchState:
    """Cross-validate facts across sources using TF-IDF similarity and LLM stance detection."""
    sources_with_content = [
        s for s in state.sources
        if (s.full_text and len(s.full_text) > 50) or (s.snippet and len(s.snippet) > 30)
    ]

    if len(sources_with_content) < 2:
        logger.warning("CrossValidation: not enough sources with content")
        return state

    # 1. Extract key claims using LLM
    topic = state.brief.topic if state.brief else state.query
    top_sources = sorted(sources_with_content, key=lambda s: s.authority_score, reverse=True)[:10]

    source_summaries = ""
    for i, src in enumerate(top_sources):
        text = (src.full_text or src.snippet)[:600]
        source_summaries += f"\n[Source {i+1}: {src.title}]\n{text}\n"

    claim_prompt = f"""Analyze these sources about "{topic}" and extract 2-4 key factual claims. Ensure extraction is highly concise.

{source_summaries}

For each claim, note which sources support or contradict it.
Return JSON array:
[
  {{
    "claim": "factual statement",
    "supporting_sources": [1, 3, 5],
    "contradicting_sources": [2],
    "confidence": 0.85
  }}
]

Return ONLY valid JSON array."""

    facts = []
    try:
        response = await llm_call([{"role": "user", "content": claim_prompt}])
        text = response.strip()
        

        import json
        claims_data = extract_json_from_text(text)

        for claim_data in claims_data:
            supporting = claim_data.get("supporting_sources", [])
            contradicting = claim_data.get("contradicting_sources", [])

            # Determine stance
            if len(contradicting) > 0 and len(supporting) > len(contradicting):
                stance = Stance.PARTIAL
            elif len(contradicting) >= len(supporting) and len(contradicting) > 0:
                stance = Stance.CONTRADICTS
            elif len(supporting) >= 2:
                stance = Stance.CONFIRMS
            else:
                stance = Stance.NOISE

            # Map source indices to IDs
            sup_ids = [top_sources[i-1].id for i in supporting if 0 < i <= len(top_sources)]
            con_ids = [top_sources[i-1].id for i in contradicting if 0 < i <= len(top_sources)]

            facts.append(FactClaim(
                claim=claim_data.get("claim", ""),
                supporting_sources=sup_ids,
                contradicting_sources=con_ids,
                stance=stance,
                confidence=claim_data.get("confidence", 0.5),
                source_count=len(supporting) + len(contradicting),
            ))

    except Exception as e:
        logger.warning(f"CrossValidation LLM failed: {e}. Using TF-IDF fallback.")
        # Fallback: compute pairwise similarity between sources
        for i, src_a in enumerate(top_sources[:5]):
            text_a = (src_a.full_text or src_a.snippet)[:500]
            similar_sources = []
            for j, src_b in enumerate(top_sources):
                if i == j:
                    continue
                text_b = (src_b.full_text or src_b.snippet)[:500]
                sim = semantic_similarity_texts(text_a, text_b)
                if sim > 0.3:
                    similar_sources.append(src_b.id)

            if similar_sources:
                facts.append(FactClaim(
                    claim=src_a.title or src_a.snippet[:100],
                    supporting_sources=similar_sources[:3],
                    stance=Stance.CONFIRMS if len(similar_sources) >= 2 else Stance.PARTIAL,
                    confidence=min(len(similar_sources) / 3, 1.0),
                    source_count=len(similar_sources) + 1,
                ))

    state.facts = facts
    logger.info(f"CrossValidation: {len(facts)} fact claims validated")
    return state
