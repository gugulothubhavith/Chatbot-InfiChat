import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from app.models.types import UUID, JSONB
from datetime import datetime, timezone
from app.database.db import Base

class RAGEvaluation(Base):
    __tablename__ = "rag_evaluations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_id = Column(UUID(as_uuid=True), index=True, nullable=True) # Connects to chat_messages if stored
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=True)
    
    # ML evaluated metrics
    groundedness_score = Column(Float, default=1.0) # 0.0 to 1.0 (How factual the AI was vs source context)
    context_overlap_pct = Column(Float, default=0.0) # Jaccard similarity across chunks
    retrieval_latency_ms = Column(Integer, default=0)
    top_k_used = Column(Integer, default=3)
    
    # Store the actual vector hit data anonymously
    chunk_metadata = Column(JSONB, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
