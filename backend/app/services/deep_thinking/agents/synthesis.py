"""Agent: Synthesis — Synthesizes verified reasoning steps into a final thinking report."""

from app.core.json_utils import extract_json_from_text
import json
import logging
from app.services.deep_thinking.models import (
    ThinkingState,
    ThinkingReport,
    ReasoningStep,
    VerificationStatus,
)

logger = logging.getLogger(__name__)

SYNTHESIS_PROMPT = """You are a synthesis expert. Given a chain of reasoning steps, produce a coherent final analysis.

Query: "{query}"

## Reasoning Chain

{reasoning_chain_text}

## Instructions

Synthesize the above reasoning steps into a clear, comprehensive report. Include:

1. **Executive Summary** (2-3 paragraphs) — Summarize the overall reasoning process and key conclusion
2. **Key Findings** — The most important conclusions from the reasoning (bullet points)
3. **Conclusion** — A clear final answer to the original query
4. **Caveats** — Limitations, assumptions, or areas where confidence is lower

Format your response as a JSON object:
{{
  "executive_summary": "full executive summary text",
  "key_findings": ["finding 1", "finding 2", ...],
  "conclusion": "final conclusion",
  "caveats": ["caveat 1", "caveat 2", ...],
  "confidence_score": 0.0-1.0
}}

Rules:
- Be thorough and accurate — base everything on the reasoning chain above
- The executive summary should rephrase and synthesize, not just repeat steps
- Confidence score should reflect the overall reliability of the reasoning
- Return ONLY valid JSON, no markdown or explanation."""


async def run(state: ThinkingState, llm_call) -> ThinkingState:
    """Synthesize all reasoning steps into a final thinking report."""
    # Build reasoning chain text
    reasoning_chain_text = ""
    for step in state.steps:
        status = step.verification_status.value
        reasoning_chain_text += (
            f"\n### Step {step.step_number}: {step.title}\n"
            f"Confidence: {step.confidence:.0%}\n"
            f"Status: {status}\n\n"
            f"{step.content}\n"
        )

    prompt = SYNTHESIS_PROMPT.format(
        query=state.query,
        reasoning_chain_text=reasoning_chain_text,
    )

    try:
        response = await llm_call([
            {"role": "system", "content": "You are a synthesis expert that produces clear, accurate reports from reasoning chains."},
            {"role": "user", "content": prompt},
        ])
        text = response.strip()

        

        data = extract_json_from_text(text)

        executive_summary = data.get("executive_summary", "")
        key_findings = data.get("key_findings", [])
        conclusion = data.get("conclusion", "")
        caveats = data.get("caveats", [])
        confidence_score = float(data.get("confidence_score", 0.5))
        confidence_score = max(0.0, min(1.0, confidence_score))

        state.report = ThinkingReport(
            query=state.query,
            executive_summary=executive_summary,
            reasoning_chain=state.steps.copy(),
            key_findings=key_findings,
            conclusion=conclusion,
            confidence_score=confidence_score,
            caveats=caveats,
        )

        logger.info(
            f"Synthesis complete: {len(key_findings)} findings, "
            f"confidence: {confidence_score:.0%}"
        )

    except Exception as e:
        logger.error(f"Synthesis LLM failed: {e}. Building fallback report.")
        state.report = _build_fallback_report(state)

    return state


def _build_fallback_report(state: ThinkingState) -> ThinkingReport:
    """Build a basic report from available reasoning steps when synthesis fails."""
    steps_text = ""
    for step in state.steps:
        steps_text += f"\nStep {step.step_number}: {step.content[:300]}...\n"

    conclusion = (
        f"Based on {len(state.steps)} reasoning steps analyzing '{state.query}', "
        f"the chain-of-thought process explored {len(state.decomposition.sub_problems) if state.decomposition else 1} "
        f"sub-problems. Review the individual reasoning steps for details."
    )

    key_findings = []
    for step in state.steps:
        if step.verification_status == VerificationStatus.VERIFIED and step.confidence > 0.5:
            first_line = step.content.split("\n")[0][:100]
            key_findings.append(f"Step {step.step_number}: {first_line}")

    return ThinkingReport(
        query=state.query,
        executive_summary=(
            f"A reasoning analysis of '{state.query}' was performed using "
            f"{len(state.steps)} reasoning steps."
        ),
        reasoning_chain=state.steps.copy(),
        key_findings=key_findings,
        conclusion=conclusion,
        confidence_score=0.4,
        caveats=["The synthesis process encountered a technical issue; this report is a best-effort fallback."],
    )
