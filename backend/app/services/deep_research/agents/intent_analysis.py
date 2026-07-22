"""Agent 1: IntentAnalysisAgent — Extracts topic, domain, depth, audience from user query."""

from app.core.json_utils import extract_json_from_text
import json
import logging
from app.services.deep_research.models import ResearchBrief, ResearchState, DepthLevel

logger = logging.getLogger(__name__)


INTENT_PROMPT = """You are a research intent analyzer. Given a user query, extract structured metadata.

User Query: "{query}"

Return a JSON object with exactly these keys:
{{
  "topic": "the core topic being researched",
  "domain": "field/industry (e.g. technology, medicine, politics, science, finance)",
  "depth_level": "quick|standard|deep|exhaustive",
  "time_sensitive": true/false (is recency critical?),
  "audience": "general|technical|academic|business",
  "key_aspects": ["aspect1", "aspect2", "aspect3", "aspect4", "aspect5"]
}}

Rules:
- depth_level: "quick" for simple factual queries, "deep" for complex analysis, "exhaustive" for comprehensive review
- key_aspects: 3-5 specific sub-topics or angles to investigate
- Return ONLY valid JSON, no markdown or explanation."""


async def run(state: ResearchState, llm_call) -> ResearchState:
    """Analyze user query intent and produce a research brief."""
    prompt = INTENT_PROMPT.format(query=state.query)

    try:
        response = await llm_call([{"role": "user", "content": prompt}])
        # Parse JSON from LLM response
        text = response.strip()
        # Strip markdown code fences if present
        

        data = extract_json_from_text(text)
        state.brief = ResearchBrief(
            topic=data.get("topic", state.query),
            domain=data.get("domain", "general"),
            depth_level=DepthLevel(data.get("depth_level", "standard")),
            time_sensitive=data.get("time_sensitive", False),
            audience=data.get("audience", "general"),
            key_aspects=data.get("key_aspects", []),
        )
    except Exception as e:
        logger.warning(f"IntentAnalysis LLM parse failed: {e}. Using defaults.")
        state.brief = ResearchBrief(
            topic=state.query,
            domain="general",
            key_aspects=[state.query],
        )

    return state
