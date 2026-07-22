"""Agent: ProblemAnalyzer — Decomposes user query into structured sub-problems."""

from app.core.json_utils import extract_json_from_text
import json
import logging
from app.services.deep_thinking.models import ThinkingState, ProblemDecomposition

logger = logging.getLogger(__name__)

ANALYZER_PROMPT = """You are a problem decomposition expert. Given a user query, break it down into smaller sub-problems that can be solved step by step through chain-of-thought reasoning.

User Query: "{query}"

Return a JSON object with exactly these keys:
{{
  "sub_problems": ["sub-problem 1", "sub-problem 2", ...],
  "dependencies": {{"sub-problem 1": [], "sub-problem 2": ["sub-problem 1"], ...}}
}}

Rules:
- Break the query into 1-3 logical sub-problems
- Each sub-problem should be self-contained and answerable through reasoning alone
- Dependencies indicate which sub-problems must be solved before others
- Order sub-problems logically (foundational first, complex later)
- Sub-problems should be specific and focused
- Return ONLY valid JSON, no markdown or explanation."""


async def run(state: ThinkingState, llm_call) -> ThinkingState:
    """Decompose user query into structured sub-problems."""
    prompt = ANALYZER_PROMPT.format(query=state.query)

    try:
        response = await llm_call([{"role": "user", "content": prompt}])
        text = response.strip()

        # Strip markdown code fences if present
        
        if text.startswith("```"):
            text = text.strip("`").strip()

        data = extract_json_from_text(text)
        sub_problems = data.get("sub_problems", [])
        dependencies = data.get("dependencies", {})

        # Ensure at least the original query is present
        if not sub_problems:
            sub_problems = [state.query]

        # Validate dependencies reference valid sub-problems
        valid_deps = {}
        for sp in sub_problems:
            deps = dependencies.get(sp, [])
            valid_deps[sp] = [d for d in deps if d in sub_problems]

        state.decomposition = ProblemDecomposition(
            sub_problems=sub_problems,
            dependencies=valid_deps,
        )

        logger.info(
            f"ProblemAnalyzer: decomposed query into {len(sub_problems)} sub-problems"
        )
    except Exception as e:
        logger.warning(
            f"ProblemAnalyzer LLM parse failed: {e}. Using query as single problem."
        )
        state.decomposition = ProblemDecomposition(
            sub_problems=[state.query],
            dependencies={state.query: []},
        )

    return state
