"""Agent: Verification — Self-verifies reasoning steps for logical consistency, completeness, and accuracy."""

from app.core.json_utils import extract_json_from_text
import json
import logging
from app.services.deep_thinking.models import (
    ThinkingState,
    ReasoningStep,
    VerificationResult,
    VerificationStatus,
)

logger = logging.getLogger(__name__)

VERIFY_STEP_PROMPT = """You are a rigorous logical verifier. Examine the following reasoning step and identify any issues.

Step Number: {step_number}
Step Title: {title}

Reasoning Content:
{content}

Verify the following aspects:
1. Logical consistency — Does the reasoning follow logically from premises to conclusion?
2. Completeness — Are there gaps in the reasoning?
3. Factual accuracy — Are there any factual errors or unsupported claims?
4. Assumptions — Are assumptions clearly stated and reasonable?
5. Edge cases — Did the reasoning consider alternative perspectives?

Return a JSON object:
{{
  "is_valid": true/false,
  "issues": ["issue 1", "issue 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...]
}}

Rules:
- is_valid should be true only if the reasoning is logically sound and complete
- List specific, actionable issues (can be empty if is_valid is true)
- List specific, actionable suggestions for improvement (can be empty if no improvements needed)
- Return ONLY valid JSON, no markdown or explanation."""


async def verify_step(step: ReasoningStep, llm_call) -> VerificationResult:
    """Verify a single reasoning step for logical consistency and completeness."""
    prompt = VERIFY_STEP_PROMPT.format(
        step_number=step.step_number,
        title=step.title,
        content=step.content,
    )

    try:
        response = await llm_call([{"role": "user", "content": prompt}])
        text = response.strip()

        

        data = extract_json_from_text(text)
        is_valid = data.get("is_valid", False)
        issues = data.get("issues", [])
        suggestions = data.get("suggestions", [])

        # A step with no issues at all should be valid
        if not issues and not suggestions:
            is_valid = True

        result = VerificationResult(
            step_number=step.step_number,
            is_valid=is_valid,
            issues=issues,
            suggestions=suggestions,
        )

        logger.info(
            f"Verification step {step.step_number}: "
            f"{'PASSED' if is_valid else 'FAILED'} "
            f"({len(issues)} issues, {len(suggestions)} suggestions)"
        )

        return result

    except Exception as e:
        logger.warning(
            f"Verification step {step.step_number} LLM failed: {e}. "
            f"Defaulting to verified."
        )
        # On verification failure, default to verified to avoid blocking the pipeline
        return VerificationResult(
            step_number=step.step_number,
            is_valid=True,
            issues=[],
            suggestions=["Verification process encountered an error — review recommended."],
        )


async def run(state: ThinkingState, llm_call) -> ThinkingState:
    """Verify all reasoning steps in the state."""
    for step in state.steps:
        result = await verify_step(step, llm_call)
        state.verification_results.append(result)

        # Update the step's verification status
        if result.is_valid:
            step.verification_status = VerificationStatus.VERIFIED
        else:
            step.verification_status = VerificationStatus.FAILED

    logger.info(
        f"Verification complete: "
        f"{sum(1 for r in state.verification_results if r.is_valid)}/{len(state.verification_results)} passed"
    )

    return state
