"""Agent 4: ParallelScraperAgent — Multi-engine web search with graceful degradation.

Approach:
1. Try DuckDuckGo search first (free, no API key)
2. If that fails, use LLM to generate simulated but realistic search results
3. Extract content from each found URL using trafilatura + BeautifulSoup
4. Score sources by relevance using LLM
5. Handle ALL errors gracefully — never crash
"""

from app.core.json_utils import extract_json_from_text
import asyncio
import json
import logging
from typing import List, Dict, Any

from app.services.deep_research.models import ResearchState, SourceDocument, SourceType
from app.services.deep_research.utils.scraping import (
    search_duckduckgo,
    search_fallback_llm,
    fetch_url,
    get_domain,
    compute_authority_score,
    extract_metadata,
)

logger = logging.getLogger(__name__)

MAX_CONCURRENT = 8
MAX_SOURCES_PER_QUERY = 6
MAX_TOTAL_SOURCES = 40


async def run(state: ResearchState, llm_call=None) -> ResearchState:
    """Run parallel web searches across all queries using multi-engine approach."""
    query_objects = state.queries
    if not query_objects:
        logger.warning("ParallelScraper: no queries to search")
        return state

    # Limit to top-priority queries (avoid too many)
    sorted_queries = sorted(query_objects, key=lambda q: q.priority, reverse=True)
    queries_to_search = sorted_queries[:10]

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def _search_single_query(query_obj) -> List[SourceDocument]:
        """Search for a single query using multi-engine fallback."""
        query = query_obj.query
        results = []

        try:
            # Engine 1: DuckDuckGo
            search_results = await search_duckduckgo(query, max_results=MAX_SOURCES_PER_QUERY)
            engine_used = "duckduckgo"
        except Exception as e:
            logger.warning(f"DDG search failed for '{query[:60]}': {e}")
            search_results = []
            engine_used = "failed"

        # Engine 2: LLM fallback if DuckDuckGo returned nothing
        if not search_results:
            try:
                if llm_call:
                    search_results = await search_fallback_llm(query, llm_call,
                                                               max_results=MAX_SOURCES_PER_QUERY)
                    engine_used = "llm_fallback"
                else:
                    logger.warning("No llm_call available for fallback search")
            except Exception as e:
                logger.error(f"LLM fallback search failed: {e}")
                search_results = []

        if not search_results:
            logger.warning(f"No results found for query '{query[:60]}' after all engines")
            return []

        # Convert search results to SourceDocuments
        for r in search_results:
            url = r.get("url", "")
            if not url or url == "#" or url.startswith("javascript:"):
                continue

            source_type_str = r.get("source_type", "web")
            try:
                st = SourceType(source_type_str)
            except ValueError:
                st = SourceType.WEB

            doc = SourceDocument(
                url=url,
                title=r.get("title", ""),
                snippet=r.get("snippet", "")[:500],
                source_type=st,
                authority_score=compute_authority_score(url),
                domain=get_domain(url),
                published_date=r.get("date"),
            )
            results.append(doc)

        return results

    # Launch all searches concurrently
    tasks = [_search_single_query(q) for q in queries_to_search]
    all_results = await asyncio.gather(*tasks, return_exceptions=True)

    # Collect successful results
    new_sources = []
    for result in all_results:
        if isinstance(result, list):
            new_sources.extend(result)
        elif isinstance(result, Exception):
            logger.warning(f"Search task exception: {result}")

    # Content extraction: fetch top sources in parallel
    # Sort by authority score, cap total
    new_sources_sorted = sorted(new_sources, key=lambda s: s.authority_score, reverse=True)
    sources_to_extract = new_sources_sorted[:MAX_TOTAL_SOURCES]

    if sources_to_extract:
        logger.info(f"ParallelScraper: fetching content from {len(sources_to_extract)} sources")
        content_tasks = [_fetch_source_content(src, semaphore) for src in sources_to_extract]
        content_results = await asyncio.gather(*content_tasks, return_exceptions=True)

        # Update sources with fetched content
        updated_sources = []
        for result in content_results:
            if isinstance(result, SourceDocument):
                updated_sources.append(result)
            elif isinstance(result, Exception):
                logger.debug(f"Content fetch exception: {result}")

        # LLM relevance scoring for top sources (if llm_call available)
        if llm_call and updated_sources:
            try:
                updated_sources = await _score_sources_relevance(
                    updated_sources[:15], state.query, llm_call
                )
            except Exception as e:
                logger.warning(f"Relevance scoring failed: {e}")

        # Merge into state
        state.sources.extend(updated_sources)

    # Deduplicate by URL (keep highest authority)
    seen_urls = {}
    unique_sources = []
    for src in state.sources:
        if src.url and src.url not in seen_urls:
            seen_urls[src.url] = src
            unique_sources.append(src)
        elif src.url and src.url in seen_urls:
            # Keep the one with higher authority
            existing = seen_urls[src.url]
            if src.authority_score > existing.authority_score:
                unique_sources.remove(existing)
                seen_urls[src.url] = src
                unique_sources.append(src)

    state.sources = unique_sources
    logger.info(f"ParallelScraper complete: {len(state.sources)} unique sources")
    return state


async def _fetch_source_content(source: SourceDocument, semaphore: asyncio.Semaphore) -> SourceDocument:
    """Fetch and extract full content for a single source."""
    async with semaphore:
        # Skip sources that already have substantial full text
        if source.full_text and len(source.full_text) > 200:
            return source

        if not source.url:
            return source

        try:
            result = await fetch_url(source.url, timeout=15.0)
            if result["success"]:
                source.full_text = result["text"]
                if result["title"] and not source.title:
                    source.title = result["title"]
                if result.get("published_date") and not source.published_date:
                    source.published_date = result["published_date"]
        except Exception as e:
            logger.debug(f"Content fetch failed for {source.url}: {e}")

        return source


async def _score_sources_relevance(
    sources: List[SourceDocument], query: str, llm_call
) -> List[SourceDocument]:
    """Use LLM to score sources by relevance to the query."""
    if not sources:
        return sources

    # Prepare source summaries for the LLM
    source_list = ""
    for i, src in enumerate(sources):
        snippet = (src.snippet or src.full_text or "")[:200]
        source_list += f"{i+1}. [{src.title}]({src.url})\n   Relevance hint: {snippet}\n\n"

    prompt = f"""You are a research relevance scorer. Rate each source on relevance to the research query.

Research Query: "{query}"

Sources:
{source_list}

For each source, assign a relevance score from 0.0 (completely irrelevant) to 1.0 (highly relevant).
Return ONLY a JSON array of scores, one per source in the same order:
[0.95, 0.3, 0.8, ...]

Consider: Does the source directly address the query? Is it from a credible domain?
Return ONLY the JSON array, nothing else."""

    try:
        response = await llm_call([{"role": "user", "content": prompt}])
        text = response.strip()
        

        scores = extract_json_from_text(text)
        if isinstance(scores, list) and len(scores) == len(sources):
            for src, score in zip(sources, scores):
                if isinstance(score, (int, float)):
                    # Blend authority with relevance (50/50)
                    relevance = max(0.0, min(1.0, float(score)))
                    src.authority_score = (src.authority_score + relevance) / 2.0
    except Exception as e:
        logger.debug(f"Relevance scoring LLM failed: {e}")

    # Re-sort by updated authority score
    sources.sort(key=lambda s: s.authority_score, reverse=True)
    return sources
