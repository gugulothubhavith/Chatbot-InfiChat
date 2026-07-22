"""Agent 3: AdversarialQueryAgent — Generates 20 multi-angle search queries."""

import logging
from app.services.deep_research.models import ResearchState, SearchQuery
from app.services.deep_research.utils.nlp import extract_keywords

logger = logging.getLogger(__name__)

# Query templates for different categories (GPT-free)
TEMPLATES = {
    "supporting": [
        "{topic} benefits advantages evidence",
        "{topic} research confirms supports",
        "why {topic} is important significant",
    ],
    "debunking": [
        "{topic} criticism problems risks",
        "{topic} debunked myth misconception",
        "arguments against {topic} limitations",
    ],
    "academic": [
        "{topic} peer reviewed study research paper",
        "{topic} systematic review meta-analysis",
        "{topic} journal publication findings",
    ],
    "news": [
        "{topic} latest news 2024 2025",
        "{topic} recent developments updates",
        "{topic} breaking news announcement",
    ],
    "data": [
        "{topic} statistics data numbers report",
        "{topic} survey results percentage",
        "{topic} market size growth trends",
    ],
    "temporal": [
        "{topic} history timeline evolution",
        "{topic} future predictions forecast",
        "{topic} before and after comparison",
    ],
    "regional": [
        "{topic} global international comparison",
        "{topic} country differences regional",
    ],
}


async def run(state: ResearchState, llm_call, critic_feedback: str = "") -> ResearchState:
    """Generate 20 adversarial queries across 7 categories."""
    topic = state.brief.topic if state.brief else state.query
    keywords = extract_keywords(state.query, top_n=5)

    queries = []
    query_id = 0

    # 1. Queries from research plan
    if state.plan:
        for subtopic in state.plan.subtopics:
            for q in subtopic.queries:
                query_id += 1
                queries.append(SearchQuery(
                    query=q,
                    category="plan",
                    priority=8 if subtopic.priority == "high" else 5,
                ))

    # 2. Template-based queries across categories
    for category, templates in TEMPLATES.items():
        for template in templates:
            q = template.format(topic=topic)
            query_id += 1
            queries.append(SearchQuery(
                query=q,
                category=category,
                priority=7 if category in ("supporting", "academic") else 5,
            ))

    # 3. Keyword-expanded queries
    for kw in keywords[:3]:
        queries.append(SearchQuery(
            query=f"{topic} {kw}",
            category="supporting",
            priority=6,
        ))

    # 4. Critic feedback queries (if looping)
    if critic_feedback:
        queries.append(SearchQuery(
            query=f"{topic} {critic_feedback}",
            category="supporting",
            priority=9,
        ))

    # Deduplicate and cap at 20
    seen = set()
    unique = []
    for q in sorted(queries, key=lambda x: x.priority, reverse=True):
        normalized = q.query.lower().strip()
        if normalized not in seen:
            seen.add(normalized)
            unique.append(q)
        if len(unique) >= 20:
            break

    state.queries = unique
    return state
