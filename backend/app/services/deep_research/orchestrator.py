"""Deep Research Orchestrator — Coordinates the 11-agent pipeline with SSE streaming.

Enhanced with:
- Research stage tracking for UI progress
- Partial findings streaming for incremental results
- Graceful agent failure handling
- Checkpoint data for resume capability
"""

import json
import asyncio
import logging
from typing import AsyncGenerator
from datetime import datetime, timezone

from app.services.deep_research.models import ResearchState, CriticVerdict
from app.services.deep_research.agents import (
    intent_analysis,
    research_planner,
    adversarial_query,
    parallel_scraper,
    academic_fetch,
    deep_content,
    knowledge_graph,
    temporal_analysis,
    cross_validation,
    critic,
    synthesis,
)
from app.services.llm_router import call_llm
from app.core.config import settings

logger = logging.getLogger(__name__)


def _sse_event(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


async def _llm_call(messages: list, model: str = settings.DEFAULT_CHAT_MODEL) -> str:
    """
    Unified LLM call using the selected model.
    Returns raw text content from the LLM.
    """
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 4096,
        "frequency_penalty": 0.5,
        "presence_penalty": 0.5,
    }
    try:
        result = await call_llm("chat", payload, stream=False)
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        return content
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise


def _emit_stage(state: ResearchState, stage_name: str, stage_num: int, msg: str):
    """Emit a research_stage event and update state."""
    state.research_stage = stage_name
    state.stage_timestamps[stage_name] = datetime.now(timezone.utc).isoformat()
    return _sse_event("research_stage", {
        "stage": stage_name,
        "stage_number": stage_num,
        "total_stages": 11,
        "message": msg,
    })


async def _safe_run_agent(state: ResearchState, agent_name: str, agent_num: int,
                          agent_fn, llm_fn, success_msg: str,
                          success_data_fn=None) -> tuple:
    """Run an agent safely. Returns (state, [sse_events]) — never crashes."""
    events = []
    events.append(_sse_event("agent_status", {
        "agent": agent_name, "status": "running",
        "message": success_msg, "agent_number": agent_num,
    }))
    try:
        state = await agent_fn(state, llm_fn)
        data = success_data_fn(state) if success_data_fn else {}
        events.append(_sse_event("agent_status", {
            "agent": agent_name, "status": "complete",
            "agent_number": agent_num, "data": data,
        }))
    except Exception as e:
        logger.error(f"{agent_name} failed: {e}")
        events.append(_sse_event("agent_status", {
            "agent": agent_name, "status": "error",
            "agent_number": agent_num, "message": str(e),
        }))
    return state, events


async def run_pipeline(query: str, model: str = settings.DEFAULT_CHAT_MODEL) -> AsyncGenerator[str, None]:
    """
    Execute the full 11-agent deep research pipeline.
    Yields SSE events for each stage of progress.

    Event types:
        - research_stage: Current overall stage (stage name, number, total)
        - agent_status: Individual agent started/completed/errored
        - plan: Research plan tree
        - source_found: New source discovered
        - partial_finding: Intermediate result/finding
        - quality_gate: Critic quality check results
        - report: Final research report
        - done: Pipeline complete
        - error: Error message
    """
    state = ResearchState(query=query)

    async def llm_call_intermediate(messages: list) -> str:
        return await _llm_call(messages, model="llama-3.3-70b-versatile")
        
    async def llm_call_synthesis(messages: list) -> str:
        return await _llm_call(messages, model=model)

    async def _run_agent_and_yield(*args):
        """Run an agent, yield all its events. state is nonlocal, no return value needed."""
        nonlocal state
        state, events = await _safe_run_agent(state, *args)
        for ev in events:
            yield ev
        return

    # ═══════════════════════════════════════════════════════════
    # Stage 1: Intent Analysis
    # ═══════════════════════════════════════════════════════════
    yield _emit_stage(state, "Analyzing Query Intent", 1,
                      "Understanding what you're looking for...")
    async for ev in _run_agent_and_yield(
        "IntentAnalysis", 1, intent_analysis.run, llm_call_intermediate,
        "Analyzing your query...",
        lambda s: s.brief.model_dump() if s.brief else {},
    ):
        yield ev

    yield _emit_stage(state, "Creating Research Plan", 2,
                      "Building a structured research roadmap...")

    # ═══════════════════════════════════════════════════════════
    # Stage 2: Research Planner
    # ═══════════════════════════════════════════════════════════
    async for ev in _run_agent_and_yield(
        "ResearchPlanner", 2, research_planner.run, llm_call_intermediate,
        "Creating research plan...",
        lambda s: {"subtopic_count": len(s.plan.subtopics) if s.plan else 0},
    ):
        yield ev
    if state.plan:
        yield _sse_event("plan", {"tree": state.plan.model_dump()})

    # ═══════════════════════════════════════════════════════════
    # CRITIC LOOP: Agents 3-10 iterate
    # ═══════════════════════════════════════════════════════════
    while state.iteration < state.max_iterations:
        critic_feedback = ""
        if state.quality_results:
            last_qr = state.quality_results[-1]
            if last_qr.verdict == CriticVerdict.COMPLETE:
                break
            critic_feedback = last_qr.feedback

        # ── Agent 3: Adversarial Queries ─────────────────
        yield _emit_stage(state, "Generating Search Queries", 3,
                          f"Formulating search strategies (iteration {state.iteration + 1})...")
        # Pass critic feedback to the agent via state for the iteration loop
        state.critic_feedback = critic_feedback
        async for ev in _run_agent_and_yield(
            "AdversarialQuery", 3, adversarial_query.run, llm_call_intermediate,
            f"Generating search queries...",
            lambda s: {"query_count": len(s.queries)},
        ):
            yield ev

        # ── Agent 4: Parallel Scraper ────────────────────
        yield _emit_stage(state, "Searching the Web", 4,
                          "Scanning multiple sources across the web...")
        async for ev in _run_agent_and_yield(
            "ParallelScraper", 4, parallel_scraper.run, llm_call_intermediate,
            "Executing parallel web searches...",
            lambda s: {"total_sources": len(s.sources), "new_sources": len(s.sources)},
        ):
            yield ev

        # ── Agent 5: Academic Fetch ──────────────────────
        yield _emit_stage(state, "Fetching Academic Sources", 5,
                          "Searching arXiv, Wikipedia, and other academic sources...")
        async for ev in _run_agent_and_yield(
            "AcademicFetch", 5, academic_fetch.run, llm_call_intermediate,
            "Searching academic sources...",
            lambda s: {"total_sources": len(s.sources)},
        ):
            yield ev

        # ── Agent 6: Deep Content Extraction ─────────────
        yield _emit_stage(state, "Extracting Content", 6,
                          "Reading and extracting full article contents...")
        async for ev in _run_agent_and_yield(
            "DeepContent", 6, deep_content.run, llm_call_intermediate,
            "Extracting full article content...",
            lambda s: {"full_text_extracted": sum(1 for src in s.sources if src.full_text and len(src.full_text) > 100)},
        ):
            yield ev

        # ── Agent 7: Knowledge Graph ─────────────────────
        yield _emit_stage(state, "Building Knowledge Graph", 7,
                          "Extracting entities, relationships, and contradictions...")
        async for ev in _run_agent_and_yield(
            "KnowledgeGraph", 7, knowledge_graph.run, llm_call_intermediate,
            "Extracting entities and relationships...",
            lambda s: {
                "entities": len(s.knowledge_graph.entities) if s.knowledge_graph else 0,
                "relationships": len(s.knowledge_graph.relationships) if s.knowledge_graph else 0,
            },
        ):
            yield ev

        # ── Agent 8: Temporal Analysis ───────────────────
        yield _emit_stage(state, "Analyzing Timeline", 8,
                          "Checking recency, chronology, and outdated claims...")
        async for ev in _run_agent_and_yield(
            "TemporalAnalysis", 8, temporal_analysis.run, llm_call_intermediate,
            "Analyzing timeline and recency...",
            lambda s: {
                "events": len(s.temporal.events) if s.temporal else 0,
                "outdated": len(s.temporal.outdated_claims) if s.temporal else 0,
            },
        ):
            yield ev

        # ── Agent 9: Cross Validation ────────────────────
        yield _emit_stage(state, "Cross-Validating Facts", 9,
                          "Verifying claims across multiple sources...")
        async for ev in _run_agent_and_yield(
            "CrossValidation", 9, cross_validation.run, llm_call_intermediate,
            "Cross-validating facts across sources...",
            lambda s: {"facts_validated": len(s.facts)},
        ):
            yield ev

        # ── Partial findings stream ──────────────────────
        if state.facts:
            for fact in state.facts[-3:]:
                if fact.confidence > 0.7 and fact.claim:
                    state.partial_findings.append({
                        "claim": fact.claim[:200],
                        "confidence": fact.confidence,
                        "sources": len(fact.supporting_sources),
                    })
                    yield _sse_event("partial_finding", {
                        "claim": fact.claim[:200],
                        "confidence": fact.confidence,
                        "source_count": len(fact.supporting_sources),
                    })

        # ── Agent 10: Critic / Quality Gate ──────────────
        yield _emit_stage(state, "Running Quality Checks", 10,
                          f"Evaluating research quality (iteration {state.iteration + 1})...")
        async for ev in _run_agent_and_yield(
            "Critic", 10, critic.run, llm_call_intermediate,
            f"Running quality checks...",
            lambda s: {"verdict": s.quality_results[-1].verdict.value if s.quality_results else "unknown"},
        ):
            yield ev

        # Quality gate results
        try:
            if state.quality_results:
                last_qr = state.quality_results[-1]
                yield _sse_event("quality_gate", {
                    "iteration": last_qr.iteration,
                    "checks": [c.model_dump() for c in last_qr.checks],
                    "verdict": last_qr.verdict.value,
                    "confidence": last_qr.overall_confidence,
                    "feedback": last_qr.feedback,
                })
                if last_qr.verdict == CriticVerdict.COMPLETE:
                    break
        except Exception:
            pass

        state.iteration += 1

    # ═══════════════════════════════════════════════════════════
    # Stage 11: Synthesis
    # ═══════════════════════════════════════════════════════════
    yield _emit_stage(state, "Writing Final Report", 11,
                      "Synthesizing all findings into a comprehensive report...")
    async for ev in _run_agent_and_yield(
        "Synthesis", 11, synthesis.run, llm_call_synthesis,
        "Writing final research report...",
        lambda s: {"citations": len(s.report.citations) if s.report else 0},
    ):
        yield ev

    # Send the final report
    if state.report:
        yield _sse_event("report", {
            "content": state.report.full_markdown,
            "executive_summary": state.report.executive_summary,
            "citations": [c.model_dump() for c in state.report.citations],
            "confidence": state.report.confidence_score,
            "source_count": len(state.sources),
            "fact_count": len(state.facts),
            "entity_count": len(state.knowledge_graph.entities) if state.knowledge_graph else 0,
        })

    # Final done event
    yield _sse_event("done", {
        "research_id": state.research_id,
        "total_sources": len(state.sources),
        "iterations": state.iteration,
        "stages_completed": len(state.stage_timestamps),
    })
