import uuid
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from app.models.types import UUID, JSONB
from datetime import datetime, timezone
from app.database.db import Base

class TokenActivity(Base):
    __tablename__ = "token_activity_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    model_name = Column(String, index=True)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class LatencyMetrics(Base):
    __tablename__ = "latency_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    endpoint = Column(String) # e.g. /chat, /rag/query
    ttft_ms = Column(Float) # Time To First Token in ms
    total_time_ms = Column(Float)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
