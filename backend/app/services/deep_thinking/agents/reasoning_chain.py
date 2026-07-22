"""Agent: ReasoningChain — Generates step-by-step reasoning for each sub-problem.

Each sub-problem gets its own reasoning step, generated progressively so the
orchestrator can stream results to the client as they become available.
"""

from app.core.json_utils import extract_json_from_text
import logging
from app.services.deep_thinking.models import ReasoningStep, VerificationStatus

logger = logging.getLogger(__name__)

REASONING_STEP_PROMPT = """You are a careful step-by-step reasoner. Given a problem, think through it methodically.

Problem: "{sub_problem}"

Instructions:
1. First, state what we know about this problem
2. Identify key assumptions or constraints
3. Work through the reasoning step by step
4. Consider alternative perspectives or edge cases
5. State your conclusion clearly

Be thorough, logical, and precise. Show 2 or 3 intermediate reasoning — do not skip steps."""

CONFIDENCE_PROMPT = """You are a confidence estimator. Given a reasoning step, estimate how confident we should be in its conclusion.

Reasoning Content:
{content}

Return a JSON object:
{{
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation for this confidence score"
}}

Rules:
- 0.0-0.3: Speculative, weak evidence, many assumptions
- 0.3-0.6: Some evidence, moderate certainty
- 0.6-0.9: Strong reasoning, few assumptions
- 0.9-1.0: Certain, demonstrably true
- Return ONLY valid JSON, no markdown."""


async def generate_reasoning_step(
    step_number: int, sub_problem: str, llm_call
) -> ReasoningStep:
    """Generate a single reasoning step for one sub-problem."""
    import time
    start_time = time.time()

    prompt = REASONING_STEP_PROMPT.format(sub_problem=sub_problem)

    try:
        response = await llm_call([
            {"role": "system", "content": "You are a precise, logical reasoner. Think carefully step by step."},
            {"role": "user", "content": prompt},
        ])
        content = response.strip()

        # Estimate confidence in the reasoning
        confidence = await _estimate_confidence(content, llm_call)

        title = f"Step {step_number}: {sub_problem[:80]}"
        if len(sub_problem) > 80:
            title += "..."

    except Exception as e:
        logger.warning(
            f"ReasoningChain step {step_number} LLM failed: {e}. Using fallback."
        )
        content = (
            f"Analysis for: {sub_problem}\n\n"
            f"(Note: The reasoning engine encountered a temporary issue. "
            f"Please review the original query for completeness.)"
        )
        confidence = 0.3
        title = f"Step {step_number}: {sub_problem[:80]}"

    duration_ms = int((time.time() - start_time) * 1000)

    return ReasoningStep(
        step_number=step_number,
        title=title,
        content=content,
        confidence=confidence,
        verification_status=VerificationStatus.PENDING,
        duration_ms=duration_ms,
    )


async def revise_step(
    step: ReasoningStep, feedback: str, llm_call
) -> ReasoningStep:
    """Revise a reasoning step based on verification feedback."""
    import time
    start_time = time.time()

    prompt = (
        f"The following reasoning step needs revision:\n\n"
        f"Title: {step.title}\n"
        f"Content: {step.content}\n\n"
        f"Feedback for improvement:\n{feedback}\n\n"
        f"Please provide a revised, improved reasoning that addresses the feedback."
    )

    try:
        response = await llm_call([
            {"role": "system", "content": "You are a precise, logical reasoner. Revise your reasoning based on feedback."},
            {"role": "user", "content": prompt},
        ])
        content = response.strip()
        confidence = await _estimate_confidence(content, llm_call)

        duration_ms = int((time.time() - start_time) * 1000)

        return ReasoningStep(
            step_number=step.step_number,
            title=step.title,
            content=content,
            confidence=confidence,
            verification_status=VerificationStatus.PENDING,
            duration_ms=duration_ms,
        )
    except Exception as e:
        logger.warning(f"ReasoningChain revise step {step.step_number} failed: {e}")
        return step


async def _estimate_confidence(content: str, llm_call) -> float:
    """Estimate confidence in a reasoning step."""
    import json

    prompt = CONFIDENCE_PROMPT.format(content=content[:2000])

    try:
        response = await llm_call([{"role": "user", "content": prompt}])
        text = response.strip()

        

        data = extract_json_from_text(text)
        confidence = float(data.get("confidence", 0.5))
        return max(0.0, min(1.0, confidence))
    except Exception as e:
        logger.debug(f"Confidence estimation failed: {e}")
        return 0.5
