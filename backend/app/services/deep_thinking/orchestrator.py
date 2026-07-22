"""Deep Thinking Orchestrator — Coordinates the chain-of-thought reasoning pipeline with SSE streaming."""

import json
import asyncio
import logging
import time
from typing import AsyncGenerator, Callable

from app.services.deep_thinking.models import (
    ThinkingState, ThinkingStage, ReasoningStep, VerificationStatus,
)
from app.services.deep_thinking.agents import (
    problem_analyzer,
    reasoning_chain,
    verification,
    synthesis,
)
from app.services.llm_router import call_llm
from app.core.config import settings

logger = logging.getLogger(__name__)


def _sse_event(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"


async def _llm_call(messages: list, model: str = None) -> str:
    """
    Unified LLM call using the selected model.
    Returns raw text content from the LLM.
    """
    model_name = model or settings.DEFAULT_CHAT_MODEL
    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096,
    }
    try:
        result = await call_llm("chat", payload, stream=False)
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        return content
    except Exception as e:
        logger.error(f"LLM call failed in thinking pipeline: {e}")
        raise


async def run_thinking_pipeline(query: str, model: str = None) -> AsyncGenerator[str, None]:
    """
    Execute the chain-of-thought deep thinking pipeline.
    Yields SSE events for each stage of progress.

    Event types:
        - thinking_progress: Current stage + progress info
        - reasoning_step: Each reasoning step as it's generated
        - thinking_complete: Final report with full reasoning chain
        - error: Error message
        - done: Pipeline complete
    """
    async def llm_call_intermediate(messages: list) -> str:
        return await _llm_call(messages, model="llama-3.3-70b-versatile")
        
    async def llm_call_synthesis(messages: list) -> str:
        return await _llm_call(messages, model=model)

    state = ThinkingState(query=query)
    start_time = time.time()

    total_steps_estimate = 5  # Will be refined after problem analysis

    # ── Stage 1: Problem Analysis ──────────────────────────
    state.stage = ThinkingStage.ANALYZING
    yield _sse_event("thinking_progress", {
        "stage": "analyzing",
        "message": "Analyzing your question and breaking it down...",
        "progress": 0.05,
        "confidence": 0.0,
    })
    logger.info(f"Deep Thinking: Starting problem analysis for '{query[:80]}...'")

    try:
        state = await problem_analyzer.run(state, llm_call_intermediate)
        sub_count = len(state.decomposition.sub_problems) if state.decomposition else 1
        total_steps_estimate = sub_count
        yield _sse_event("thinking_progress", {
            "stage": "analyzing",
            "message": f"Identified {sub_count} sub-problems to reason through",
            "progress": 0.15,
            "confidence": 0.0,
            "sub_problems": state.decomposition.sub_problems if state.decomposition else [],
        })
        logger.info(f"Problem analysis complete: {sub_count} sub-problems")
    except Exception as e:
        logger.error(f"Problem analysis failed: {e}")
        yield _sse_event("thinking_progress", {
            "stage": "analyzing",
            "message": "Analyzing question...",
            "progress": 0.1,
            "confidence": 0.0,
        })
        # Default decomposition: the query itself
        from app.services.deep_thinking.models import ProblemDecomposition
        state.decomposition = ProblemDecomposition(
            sub_problems=[query],
            dependencies={query: []},
        )

    # ── Stage 2: Reasoning Chain ───────────────────────────
    state.stage = ThinkingStage.REASONING
    sub_problems = state.decomposition.sub_problems if state.decomposition else [query]
    total_sub = len(sub_problems)

    for i, sub_problem in enumerate(sub_problems):
        step_number = i + 1
        progress = 0.15 + (i / total_sub) * 0.50  # 0.15 -> 0.65

        yield _sse_event("thinking_progress", {
            "stage": "reasoning",
            "message": f"Reasoning through sub-problem {step_number} of {total_sub}...",
            "progress": progress,
            "confidence": 0.0,
            "step_number": step_number,
            "total_steps": total_sub,
        })

        try:
            step = await reasoning_chain.generate_reasoning_step(
                step_number, sub_problem, llm_call_intermediate
            )
            state.steps.append(step)

            yield _sse_event("reasoning_step", {
                "step_number": step.step_number,
                "title": step.title,
                "content": step.content,
                "confidence": step.confidence,
                "status": step.verification_status.value,
                "duration_ms": step.duration_ms,
            })
            await asyncio.sleep(0.05)  # Small yield for event loop
            logger.info(f"Reasoning step {step_number}/{total_sub} complete ({step.duration_ms}ms)")
        except Exception as e:
            logger.error(f"Reasoning step {step_number} failed: {e}")
            fallback_step = ReasoningStep(
                step_number=step_number,
                title=f"Analysis of: {sub_problem[:80]}",
                content=f"Examining: {sub_problem}\n\n(Analysis step encountered a temporary issue. The overall reasoning will still proceed.)",
                confidence=0.3,
                verification_status=VerificationStatus.PENDING,
            )
            state.steps.append(fallback_step)
            yield _sse_event("reasoning_step", {
                "step_number": fallback_step.step_number,
                "title": fallback_step.title,
                "content": fallback_step.content,
                "confidence": fallback_step.confidence,
                "status": fallback_step.verification_status.value,
                "duration_ms": 0,
            })

    # ── Stage 3: Verification ──────────────────────────────
    state.stage = ThinkingStage.VERIFYING
    yield _sse_event("thinking_progress", {
        "stage": "verifying",
        "message": f"Verifying {len(state.steps)} reasoning steps for accuracy...",
        "progress": 0.70,
        "confidence": 0.0,
    })
    logger.info(f"Starting verification of {len(state.steps)} steps")

    try:
        state = await verification.run(state, llm_call_intermediate)
        verified_count = sum(1 for r in state.verification_results if r.is_valid)
        yield _sse_event("thinking_progress", {
            "stage": "verifying",
            "message": f"Verified {verified_count}/{len(state.steps)} steps",
            "progress": 0.80,
            "confidence": verified_count / max(len(state.steps), 1),
        })

        # Update steps with verification results
        for result in state.verification_results:
            yield _sse_event("reasoning_step", {
                "step_number": result.step_number,
                "title": state.steps[result.step_number - 1].title if result.step_number <= len(state.steps) else f"Step {result.step_number}",
                "content": state.steps[result.step_number - 1].content if result.step_number <= len(state.steps) else "",
                "confidence": state.steps[result.step_number - 1].confidence if result.step_number <= len(state.steps) else 0.5,
                "status": "verified" if result.is_valid else "failed",
                "verification_issues": result.issues,
                "verification_suggestions": result.suggestions,
            })

        logger.info(f"Verification complete: {verified_count}/{len(state.steps)} passed")
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        yield _sse_event("thinking_progress", {
            "stage": "verifying",
            "message": "Verification completed with partial results",
            "progress": 0.78,
            "confidence": 0.5,
        })

    # ── (Optional) Re-reasoning for failed steps ──────────
    if state.iteration < state.max_iterations:
        failed_steps = [
            r for r in state.verification_results
            if not r.is_valid and r.suggestions
        ]
        if failed_steps and state.iteration < 1:  # Only one re-reasoning pass
            state.iteration += 1
            logger.info(f"Re-reasoning {len(failed_steps)} failed steps (iteration {state.iteration})")

            for result in failed_steps:
                idx = result.step_number - 1
                if 0 <= idx < len(state.steps):
                    feedback = "\n".join(result.suggestions)
                    revised = await reasoning_chain.revise_step(
                        state.steps[idx], feedback, llm_call_intermediate
                    )
                    state.steps[idx] = revised

                    yield _sse_event("reasoning_step", {
                        "step_number": revised.step_number,
                        "title": revised.title,
                        "content": revised.content,
                        "confidence": revised.confidence,
                        "status": "revised",
                        "duration_ms": revised.duration_ms,
                    })

    # ── Stage 4: Synthesis ────────────────────────────────
    state.stage = ThinkingStage.SYNTHESIZING
    yield _sse_event("thinking_progress", {
        "stage": "synthesizing",
        "message": "Synthesizing final answer from reasoning chain...",
        "progress": 0.85,
        "confidence": 0.0,
    })
    logger.info("Starting synthesis")

    try:
        state = await synthesis.run(state, llm_call_synthesis)
        elapsed = time.time() - start_time

        if state.report:
            yield _sse_event("thinking_complete", {
                "report": {
                    "executive_summary": state.report.executive_summary,
                    "reasoning_chain": [
                        {
                            "step_number": s.step_number,
                            "title": s.title,
                            "content": s.content,
                            "confidence": s.confidence,
                            "status": s.verification_status.value,
                        }
                        for s in state.report.reasoning_chain
                    ],
                    "key_findings": state.report.key_findings,
                    "conclusion": state.report.conclusion,
                    "confidence_score": state.report.confidence_score,
                    "caveats": state.report.caveats,
                },
                "elapsed_seconds": round(elapsed, 1),
            })

        yield _sse_event("thinking_progress", {
            "stage": "complete",
            "message": "Deep thinking complete",
            "progress": 1.0,
            "confidence": state.report.confidence_score if state.report else 0.5,
        })
        logger.info(f"Synthesis complete in {elapsed:.1f}s, confidence: {state.report.confidence_score:.0%}" if state.report else "Synthesis complete")
    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        yield _sse_event("error", {"message": f"Synthesis failed: {str(e)}"})

    # Final done event
    yield _sse_event("done", {
        "thinking_id": state.thinking_id,
        "total_steps": len(state.steps),
        "elapsed_seconds": round(time.time() - start_time, 1),
    })
