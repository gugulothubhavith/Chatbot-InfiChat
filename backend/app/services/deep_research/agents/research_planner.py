"""Agent 2: ResearchPlannerAgent — Creates a visible research tree."""

from app.core.json_utils import extract_json_from_text
import json
import logging
from app.services.deep_research.models import ResearchState, ResearchPlan, ResearchSubtopic

logger = logging.getLogger(__name__)


PLANNER_PROMPT = """You are a research planner. Create a structured research plan.

Topic: "{topic}"
Domain: {domain}
Key Aspects: {aspects}
Depth: {depth}

Create a research plan as JSON with this exact structure:
{{
  "main_topic": "the main research topic",
  "subtopics": [
    {{
      "title": "subtopic title",
      "priority": "high|medium|low",
      "source_types_needed": ["web", "academic", "news", "data", "government"],
      "queries": ["specific search query 1", "specific search query 2"]
    }}
  ]
}}

Rules:
- Create 4-8 subtopics covering all angles of the research
- Each subtopic should have 2-3 targeted search queries
- Include both supporting and challenging/debunking angles
- Prioritize based on relevance to the core question
- Return ONLY valid JSON."""


async def run(state: ResearchState, llm_call) -> ResearchState:
    """Create a research plan tree from the brief."""
    brief = state.brief
    prompt = PLANNER_PROMPT.format(
        topic=brief.topic if brief else state.query,
        domain=brief.domain if brief else "general",
        aspects=", ".join(brief.key_aspects) if brief else state.query,
        depth=brief.depth_level if brief else "standard",
    )

    try:
        response = await llm_call([{"role": "user", "content": prompt}])
        text = response.strip()
        

        data = extract_json_from_text(text)
        subtopics = []
        for st in data.get("subtopics", []):
            subtopics.append(ResearchSubtopic(
                title=st.get("title", ""),
                priority=st.get("priority", "medium"),
                source_types_needed=st.get("source_types_needed", ["web"]),
                queries=st.get("queries", []),
            ))

        state.plan = ResearchPlan(
            main_topic=data.get("main_topic", state.query),
            subtopics=subtopics,
        )
    except Exception as e:
        logger.warning(f"ResearchPlanner LLM parse failed: {e}. Using simple plan.")
        state.plan = ResearchPlan(
            main_topic=state.query,
            subtopics=[
                ResearchSubtopic(
                    title=state.query,
                    priority="high",
                    source_types_needed=["web", "academic"],
                    queries=[state.query],
                )
            ],
        )

    return state
