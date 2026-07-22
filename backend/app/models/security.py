import uuid
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Integer, DateTime
from app.models.types import UUID, JSONB, ARRAY
from datetime import datetime, timezone
from app.database.db import Base

class AIFirewallPolicy(Base):
    __tablename__ = "ai_firewall_policies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False)
    block_topics_keywords = Column(ARRAY(String), default=list) # e.g. ["politics", "internal_salaries"]
    risk_threshold = Column(Float, default=0.85)
    auto_quarantine_users = Column(Boolean, default=True)
    pii_redaction_enabled = Column(Boolean, default=True)
    custom_rules = Column(JSONB, default=dict) # E.g. {"regex_blocks": []}

class JITPrivilege(Base):
    """Just-In-Time Privilege Escalation Requests"""
    __tablename__ = "jit_privileges"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="CASCADE"), index=True)
    requested_role = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED, EXPIRED
    approved_by = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="SET NULL"), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AdminDeviceFingerprint(Base):
    __tablename__ = "admin_device_fingerprints"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="CASCADE"), index=True)
    fingerprint_hash = Column(String, unique=True, nullable=False)
    ip_address = Column(String, nullable=False)
    user_agent = Column(String, nullable=False)
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_trusted = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)
