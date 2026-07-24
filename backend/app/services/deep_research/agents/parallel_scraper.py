"""Agent 4: ParallelScraperAgent — Multi-engine web search with dynamic routing and recursive traversal.

Approach:
1. Try SearxNG with dynamically routed target_engines and time_range.
2. If that fails, use LLM to generate simulated but realistic search results.
3. Extract content from each found URL using Playwright/Trafilatura/BS4.
4. (New) Recursive Traversal: Extract outbound links from top sources and fetch them for a 2nd hop.
5. Score sources by relevance using LLM.
"""

from app.core.json_utils import extract_json_from_text
import asyncio
import json
import logging
import re
from typing import List, Dict, Any

from app.services.deep_research.models import ResearchState, SourceDocument, SourceType
from app.services.deep_research.utils.scraping import (
    search_searxng,
    search_fallback_llm,
    fetch_url,
    get_domain,
    compute_authority_score,
    extract_metadata,
)

logger = logging.getLogger(__name__)

MAX_CONCURRENT = 8
MAX_SOURCES_PER_QUERY = 6
MAX_TOTAL_SOURCES = 30
MAX_2ND_HOP_SOURCES = 10


async def run(state: ResearchState, llm_call=None) -> ResearchState:
    """Run parallel web searches across all queries using dynamic engine routing."""
    query_objects = state.queries
    if not query_objects:
        logger.warning("ParallelScraper: no queries to search")
        return state

    sorted_queries = sorted(query_objects, key=lambda q: q.priority, reverse=True)
    queries_to_search = sorted_queries[:12]

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def _search_single_query(query_obj) -> List[SourceDocument]:
        query = query_obj.query
        engines = getattr(query_obj, "target_engines", "google,bing,duckduckgo")
        time_range = getattr(query_obj, "time_range", "")
        results = []

        try:
            search_results = await search_searxng(query, max_results=MAX_SOURCES_PER_QUERY * 2, engines=engines, time_range=time_range)
        except Exception as e:
            logger.warning(f"SearxNG search failed for '{query[:60]}': {e}")
            search_results = []

        if not search_results:
            try:
                if llm_call:
                    search_results = await search_fallback_llm(query, llm_call, max_results=MAX_SOURCES_PER_QUERY)
                else:
                    logger.warning("No llm_call available for fallback search")
            except Exception as e:
                logger.error(f"LLM fallback search failed: {e}")
                search_results = []

        if not search_results:
            return []

        for r in search_results:
            url = r.get("url", "")
            if not url or url == "#" or url.startswith("javascript:"): continue

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

    # 1. Launch all searches concurrently
    tasks = [_search_single_query(q) for q in queries_to_search]
    all_results = await asyncio.gather(*tasks, return_exceptions=True)

    new_sources = []
    for result in all_results:
        if isinstance(result, list):
            new_sources.extend(result)

    # Sort by authority score, cap total
    new_sources_sorted = sorted(new_sources, key=lambda s: s.authority_score, reverse=True)
    sources_to_extract = new_sources_sorted[:MAX_TOTAL_SOURCES]

    if not sources_to_extract:
        return state

    # 2. Content extraction: fetch top sources in parallel
    logger.info(f"ParallelScraper: fetching content from {len(sources_to_extract)} primary sources")
    content_tasks = [_fetch_source_content(src, semaphore) for src in sources_to_extract]
    content_results = await asyncio.gather(*content_tasks, return_exceptions=True)

    updated_sources = [r for r in content_results if isinstance(r, SourceDocument)]

    # 3. Recursive 2nd Hop Traversal
    second_hop_urls = set()
    for src in updated_sources[:5]:  # Look at the top 5 most authoritative docs
        if src.full_text:
            # Simple regex to find outbound links in the text (often preserved by BS4/trafilatura if formatted)
            links = re.findall(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+', src.full_text)
            for link in links:
                if link not in second_hop_urls and get_domain(link) != src.domain:
                    second_hop_urls.add(link)

    # Fetch up to MAX_2ND_HOP_SOURCES
    if second_hop_urls:
        top_2nd_hop_urls = list(second_hop_urls)[:MAX_2ND_HOP_SOURCES]
        logger.info(f"ParallelScraper: fetching {len(top_2nd_hop_urls)} secondary sources (2nd hop)")
        
        hop2_sources = [SourceDocument(url=u, domain=get_domain(u), title=f"Linked from primary source") for u in top_2nd_hop_urls]
        hop2_tasks = [_fetch_source_content(src, semaphore) for src in hop2_sources]
        hop2_results = await asyncio.gather(*hop2_tasks, return_exceptions=True)
        
        for result in hop2_results:
            if isinstance(result, SourceDocument) and result.full_text:
                result.authority_score = compute_authority_score(result.url) * 0.9 # slight penalty for 2nd hop
                updated_sources.append(result)

    # 4. LLM relevance scoring for top sources
    if llm_call and updated_sources:
        try:
            updated_sources = await _score_sources_relevance(updated_sources[:20], state.query, llm_call)
        except Exception as e:
            logger.warning(f"Relevance scoring failed: {e}")

    state.sources.extend(updated_sources)

    # Deduplicate by URL
    seen_urls = {}
    unique_sources = []
    for src in state.sources:
        if src.url and src.url not in seen_urls:
            seen_urls[src.url] = src
            unique_sources.append(src)
        elif src.url and src.url in seen_urls:
            existing = seen_urls[src.url]
            if src.authority_score > existing.authority_score:
                unique_sources.remove(existing)
                seen_urls[src.url] = src
                unique_sources.append(src)

    state.sources = unique_sources
    logger.info(f"ParallelScraper complete: {len(state.sources)} unique sources")
    return state


async def _fetch_source_content(source: SourceDocument, semaphore: asyncio.Semaphore) -> SourceDocument:
    async with semaphore:
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


async def _score_sources_relevance(sources: List[SourceDocument], query: str, llm_call) -> List[SourceDocument]:
    if not sources: return sources

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
Return ONLY the JSON array, nothing else."""

    try:
        response = await llm_call([{"role": "user", "content": prompt}])
        text = response.strip()
        scores = extract_json_from_text(text)
        if isinstance(scores, list) and len(scores) == len(sources):
            for src, score in zip(sources, scores):
                if isinstance(score, (int, float)):
                    relevance = max(0.0, min(1.0, float(score)))
                    src.authority_score = (src.authority_score + relevance) / 2.0
    except Exception as e:
        logger.debug(f"Relevance scoring LLM failed: {e}")

    sources.sort(key=lambda s: s.authority_score, reverse=True)
    return sources
