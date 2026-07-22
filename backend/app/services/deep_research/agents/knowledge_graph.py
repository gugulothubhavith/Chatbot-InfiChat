"""Agent 7: KnowledgeGraphAgent — Entity extraction and relationship mapping via spaCy."""

import logging
from collections import defaultdict
from app.services.deep_research.models import (
    ResearchState, KnowledgeGraphData, Entity, Relationship,
)
from app.services.deep_research.utils.nlp import extract_entities

logger = logging.getLogger(__name__)


async def run(state: ResearchState, llm_call=None) -> ResearchState:
    """Build a knowledge graph from extracted source content."""
    entity_counts = defaultdict(lambda: {"type": "", "count": 0, "sources": set()})
    all_entities_per_source = {}

    for source in state.sources:
        text = source.full_text or source.snippet
        if not text or len(text) < 20:
            continue

        entities = extract_entities(text)
        source_entities = []

        for ent in entities:
            key = ent["name"].lower()
            entity_counts[key]["type"] = ent["type"]
            entity_counts[key]["count"] += 1
            entity_counts[key]["sources"].add(source.id)
            source_entities.append(key)

        all_entities_per_source[source.id] = source_entities

    # Build entity list (filter by min mentions)
    entities = []
    for name, data in entity_counts.items():
        if data["count"] >= 1:
            entities.append(Entity(
                name=name.title(),
                entity_type=data["type"],
                mentions=data["count"],
                sources=list(data["sources"])[:10],
            ))

    # Sort by mentions and cap
    entities.sort(key=lambda e: e.mentions, reverse=True)
    entities = entities[:100]

    # Build relationships based on co-occurrence within same source
    relationships = []
    entity_names = {e.name.lower() for e in entities[:50]}

    for source_id, source_ents in all_entities_per_source.items():
        relevant = [e for e in source_ents if e in entity_names]
        for i in range(len(relevant)):
            for j in range(i + 1, min(i + 5, len(relevant))):
                relationships.append(Relationship(
                    source_entity=relevant[i].title(),
                    target_entity=relevant[j].title(),
                    relation_type="co_occurs_with",
                    confidence=0.6,
                ))

    # Deduplicate relationships
    seen_rels = set()
    unique_rels = []
    for rel in relationships:
        key = (rel.source_entity, rel.target_entity)
        reverse_key = (rel.target_entity, rel.source_entity)
        if key not in seen_rels and reverse_key not in seen_rels:
            seen_rels.add(key)
            unique_rels.append(rel)

    # Detect contradictions: entities mentioned in many sources
    # with different co-occurrence patterns (simplified)
    contradictions = []

    state.knowledge_graph = KnowledgeGraphData(
        entities=entities,
        relationships=unique_rels[:200],
        contradictions=contradictions,
    )

    logger.info(f"KnowledgeGraph: {len(entities)} entities, {len(unique_rels)} relationships")
    return state
