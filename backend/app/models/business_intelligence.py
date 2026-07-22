import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from app.models.types import UUID, JSONB
from datetime import datetime, timezone
from app.database.db import Base

class BusinessMetricTracker(Base):
    __tablename__ = "business_metrics_daily"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=True)
    active_users = Column(Integer, default=0)
    messages_sent = Column(Integer, default=0)
    voice_segments_generated = Column(Integer, default=0)
    rag_queries = Column(Integer, default=0)
    code_executions = Column(Integer, default=0)
    date_recorded = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
