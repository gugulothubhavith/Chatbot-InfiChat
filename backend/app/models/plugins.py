import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, DateTime
from app.models.types import UUID, JSONB
from datetime import datetime, timezone
from app.database.db import Base

class PluginRegistry(Base):
    __tablename__ = "plugin_registry"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    version = Column(String, nullable=False)
    description = Column(String)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="SET NULL"), nullable=True)
    required_permissions = Column(JSONB, default=list)
    execute_in_sandbox = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class OrgPluginConfiguration(Base):
    __tablename__ = "org_plugin_configurations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    plugin_id = Column(UUID(as_uuid=True), ForeignKey("plugin_registry.id", ondelete="CASCADE"), nullable=False)
    is_enabled = Column(Boolean, default=False)
    config_params = Column(JSONB, default=dict) # Settings defined per organization
