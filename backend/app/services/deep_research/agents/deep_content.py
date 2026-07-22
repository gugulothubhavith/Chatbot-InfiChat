"""Agent 6: DeepContentAgent — Full text extraction with multi-tier fallback."""

import asyncio
import logging
from app.services.deep_research.models import ResearchState
from app.services.deep_research.utils.scraping import fetch_url

logger = logging.getLogger(__name__)

MAX_CONCURRENT_FETCHES = 6
MAX_SOURCES_TO_FETCH = 30


async def _fetch_single(source, semaphore):
    """Fetch full content for a single source."""
    async with semaphore:
        # Skip sources that already have full text (e.g., arXiv abstracts)
        if source.full_text and len(source.full_text) > 200:
            return source

        if not source.url:
            return source

        try:
            result = await fetch_url(source.url, timeout=12.0)
            if result["success"]:
                source.full_text = result["text"][:2500] if result["text"] else ""
                if result["title"] and not source.title:
                    source.title = result["title"]
        except Exception as e:
            logger.debug(f"Content fetch failed for {source.url}: {e}")

        return source


async def run(state: ResearchState, llm_call=None) -> ResearchState:
    """Extract full content from top sources."""
    # Sort by authority and pick top sources
    sources_to_fetch = sorted(
        state.sources,
        key=lambda s: s.authority_score,
        reverse=True
    )[:MAX_SOURCES_TO_FETCH]

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_FETCHES)
    tasks = [_fetch_single(src, semaphore) for src in sources_to_fetch]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Update sources with fetched content
    fetched_ids = set()
    for result in results:
        if isinstance(result, Exception):
            continue
        fetched_ids.add(result.id)

    # Count successful extractions
    success_count = sum(
        1 for s in state.sources
        if s.full_text and len(s.full_text) > 100
    )
    logger.info(f"DeepContent: extracted full text from {success_count}/{len(state.sources)} sources")
    return state
