"""Agent 11: SynthesisAgent — Final structured report with citations."""

import json
import logging
from app.services.deep_research.models import (
    ResearchState, ResearchReport, Citation,
)

logger = logging.getLogger(__name__)

SYNTHESIS_PROMPT = """You are a research synthesis expert. Create a comprehensive research report.

Topic: "{topic}"
Domain: {domain}
Audience: {audience}

## Source Material

### Key Facts (Cross-Validated):
{facts_text}

### Top Sources:
{sources_text}

### Timeline:
{timeline_text}

### Knowledge Graph Entities:
{entities_text}

## Instructions

Write a comprehensive, well-structured research report in Markdown. Include:

1. **Executive Summary** (2-3 paragraphs)
2. **Key Findings** (bullet points with evidence)
3. **Evidence For** (supporting arguments with citations)
4. **Evidence Against** (contradicting arguments with citations)
5. **Timeline of Key Events** (if relevant)
6. **Data Visualizations** (Create at least one Mermaid chart, e.g., graph LR, pie, or gantt, to visualize the Knowledge Graph, Timeline, or key statistics)
7. **Analysis & Discussion** (synthesize the evidence)
8. **Conclusion**
9. **Sources** (numbered list)

Citation format: You MUST use standard brackets like [1], [2] inline. NEVER use the 【1†L1-L3】 format. List full references at the end.

Be objective, balanced, and thorough. Highlight areas of consensus AND controversy.
Write the FULL report — do not abbreviate or use placeholders. If using Mermaid charts, format them inside standard ```mermaid code blocks."""


async def run(state: ResearchState, llm_call) -> ResearchState:
    """Synthesize all research data into a final structured report."""
    topic = state.brief.topic if state.brief else state.query

    # Build facts text
    facts_text = ""
    for i, fact in enumerate(state.facts):
        facts_text += f"- [{fact.stance.value.upper()}] {fact.claim} (confidence: {fact.confidence:.0%})\n"
    if not facts_text:
        facts_text = "No cross-validated facts available.\n"

    # Build sources text with authority scores
    top_sources = sorted(state.sources, key=lambda s: s.authority_score, reverse=True)
    sources_text = ""
    citations = []
    for i, src in enumerate(top_sources):
        idx = i + 1
        content = (src.full_text or src.snippet or "")[:400]
        sources_text += f"\n[{idx}] {src.title} ({src.domain}, authority: {src.authority_score:.2f})\n{content}\n"
        citations.append(Citation(
            index=idx,
            title=src.title or src.domain,
            url=src.url,
            authority=src.authority_score,
        ))

    # Build timeline text
    timeline_text = ""
    if state.temporal and state.temporal.events:
        for event in state.temporal.events:
            timeline_text += f"- {event.date}: {event.description}\n"
    else:
        timeline_text = "No timeline data available.\n"

    # Build entities text
    entities_text = ""
    if state.knowledge_graph and state.knowledge_graph.entities:
        top_entities = state.knowledge_graph.entities
        for ent in top_entities:
            entities_text += f"- {ent.name} ({ent.entity_type}, {ent.mentions} mentions)\n"
    else:
        entities_text = "No entities extracted.\n"

    prompt = SYNTHESIS_PROMPT.format(
        topic=topic,
        domain=state.brief.domain if state.brief else "general",
        audience=state.brief.audience if state.brief else "general",
        facts_text=facts_text,
        sources_text=sources_text,
        timeline_text=timeline_text,
        entities_text=entities_text,
    )

    try:
        response = await llm_call([{"role": "user", "content": prompt}])
        
        import re
        full_markdown = response.strip()
        # Clean up stray RAG citations (e.g. 【3†L1-L3】 -> [3])
        full_markdown = re.sub(r'【(\d+)(?:†[^】]+)?】', r'[\1]', full_markdown)

        # Extract structured sections (best effort)
        key_findings = []
        evidence_for = []
        evidence_against = []

        # Parse sections from the markdown
        sections = full_markdown.split("\n## ")
        for section in sections:
            lower = section.lower()
            if "key finding" in lower:
                lines = [l.strip("- •").strip() for l in section.split("\n") if l.strip().startswith(("-", "•", "*"))]
                key_findings = [{"finding": l} for l in lines]
            elif "evidence for" in lower or "supporting" in lower:
                lines = [l.strip("- •").strip() for l in section.split("\n") if l.strip().startswith(("-", "•", "*"))]
                evidence_for = lines
            elif "evidence against" in lower or "contradicting" in lower:
                lines = [l.strip("- •").strip() for l in section.split("\n") if l.strip().startswith(("-", "•", "*"))]
                evidence_against = lines

        # Build timeline data
        timeline_data = []
        if state.temporal and state.temporal.events:
            timeline_data = [
                {"date": e.date, "event": e.description}
                for e in state.temporal.events
            ]

        # Knowledge graph JSON
        kg_json = {}
        if state.knowledge_graph:
            kg_json = {
                "entities": [{"name": e.name, "type": e.entity_type, "mentions": e.mentions}
                             for e in state.knowledge_graph.entities],
                "relationships": [{"from": r.source_entity, "to": r.target_entity, "type": r.relation_type}
                                  for r in state.knowledge_graph.relationships],
            }

        # Compute overall confidence
        confidence = 0.5
        if state.quality_results:
            last_qr = state.quality_results[-1]
            confidence = last_qr.overall_confidence

        state.report = ResearchReport(
            executive_summary=_extract_section(full_markdown, "executive summary"),
            key_findings=key_findings,
            evidence_for=evidence_for,
            evidence_against=evidence_against,
            timeline=timeline_data,
            knowledge_graph_json=kg_json,
            citations=citations,
            full_markdown=full_markdown,
            confidence_score=confidence,
        )

    except Exception as e:
        logger.error(f"Synthesis failed: {e}")
        # Fallback: create a basic report from available data
        fallback_md = f"# Research Report: {topic}\n\n"
        fallback_md += "## Sources Found\n\n"
        for i, src in enumerate(top_sources):
            fallback_md += f"{i+1}. [{src.title}]({src.url}) — {src.snippet[:200]}\n\n"

        state.report = ResearchReport(
            executive_summary=f"Research on '{topic}' found {len(state.sources)} sources.",
            citations=citations,
            full_markdown=fallback_md,
            confidence_score=0.3,
        )

    logger.info(f"Synthesis complete: {len(citations)} citations, confidence: {state.report.confidence_score}")
    return state


def _extract_section(markdown: str, section_name: str) -> str:
    """Extract a section from markdown by heading name."""
    import re
    pattern = rf'##?\s*{re.escape(section_name)}.*?\n(.*?)(?=\n##|\Z)'
    match = re.search(pattern, markdown, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else ""
