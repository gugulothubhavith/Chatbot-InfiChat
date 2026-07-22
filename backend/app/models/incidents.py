import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Enum, DateTime, JSON, Boolean
from app.models.types import UUID, JSONB
from datetime import datetime, timezone
from app.database.db import Base
import enum

class IncidentStatus(str, enum.Enum):
    TRIAGE = "TRIAGE"
    INVESTIGATING = "INVESTIGATING"
    MITIGATED = "MITIGATED"
    RESOLVED = "RESOLVED"

class IncidentTicket(Base):
    __tablename__ = "incident_tickets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.TRIAGE, index=True)
    severity = Column(Integer, default=3) # 1 (Critical) to 5 (Low)
    title = Column(String, nullable=False)
    description = Column(String)
    assigned_admin_id = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="SET NULL"), nullable=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    
    audit_log_uuids = Column(JSONB, default=list) # Linked logs
    resolution_notes = Column(String)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

class AutoHealingEvent(Base):
    """Tracks automated system repairs triggered by AI Governance Monitors"""
    __tablename__ = "auto_healing_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_type = Column(String, nullable=False) # e.g. "RESTART_WORKER", "REINDEX_RAG"
    target_id = Column(String, nullable=False) # e.g. "chroma-node-1"
    reason = Column(String)
    is_successful = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
