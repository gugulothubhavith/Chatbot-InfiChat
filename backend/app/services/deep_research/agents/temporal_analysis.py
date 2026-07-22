"""Agent 8: TemporalAnalysisAgent — Timeline building and recency weighting."""

import logging
import re
from datetime import datetime, timedelta
from app.services.deep_research.models import ResearchState, TemporalData, TimelineEvent
from app.services.deep_research.utils.nlp import extract_dates_from_text

logger = logging.getLogger(__name__)


def _compute_recency_weight(date_str: str) -> float:
    """Compute a recency weight: 1.0 for today, decaying to 0.2 for 5+ years old."""
    try:
        import dateparser
        parsed = dateparser.parse(date_str)
        if not parsed:
            return 0.5  # unknown date
        now = datetime.now(parsed.tzinfo) if parsed.tzinfo else datetime.now()
        days_old = (now - parsed).days
        if days_old < 0:
            days_old = 0
        if days_old <= 30:
            return 1.0
        elif days_old <= 180:
            return 0.9
        elif days_old <= 365:
            return 0.75
        elif days_old <= 730:
            return 0.5
        elif days_old <= 1825:
            return 0.3
        else:
            return 0.2
    except Exception:
        return 0.5


async def run(state: ResearchState, llm_call=None) -> ResearchState:
    """Analyze temporal aspects: build timeline, weight by recency, flag outdated claims."""
    events = []
    outdated_claims = []

    for source in state.sources:
        # 1. Use published_date if available
        if source.published_date:
            recency = _compute_recency_weight(source.published_date)
            source.authority_score = source.authority_score * (0.7 + 0.3 * recency)

            events.append(TimelineEvent(
                date=source.published_date,
                description=source.title or source.snippet[:100],
                source_id=source.id,
                recency_weight=recency,
            ))

            # Flag very old sources on time-sensitive topics
            if state.brief and state.brief.time_sensitive and recency < 0.3:
                outdated_claims.append(
                    f"[OLD] {source.title} (published: {source.published_date})"
                )

        # 2. Extract dates from content
        text = source.full_text or source.snippet
        if text and len(text) > 50:
            dates = extract_dates_from_text(text[:5000])
            for d in dates[:5]:
                recency = _compute_recency_weight(d["parsed"])
                events.append(TimelineEvent(
                    date=d["raw"],
                    description=f"Date reference in: {source.title}",
                    source_id=source.id,
                    recency_weight=recency,
                ))

    # Sort events chronologically (best effort)
    try:
        import dateparser
        def parse_date(e):
            try:
                parsed = dateparser.parse(e.date)
                return parsed if parsed else datetime.min
            except Exception:
                return datetime.min
        events.sort(key=parse_date)
    except ImportError:
        pass

    # Deduplicate events by description
    seen = set()
    unique_events = []
    for e in events:
        key = e.description[:50]
        if key not in seen:
            seen.add(key)
            unique_events.append(e)

    state.temporal = TemporalData(
        events=unique_events[:50],
        outdated_claims=outdated_claims,
    )

    logger.info(f"TemporalAnalysis: {len(unique_events)} events, {len(outdated_claims)} outdated flags")
    return state
