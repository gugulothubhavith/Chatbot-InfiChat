import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Enum, DateTime
from app.models.types import UUID
from datetime import datetime, timezone
from app.database.db import Base
import enum

class RetentionScope(str, enum.Enum):
    ORGANIZATION = "ORGANIZATION"
    WORKSPACE = "WORKSPACE"
    GLOBAL = "GLOBAL"

class DataRetentionPolicy(Base):
    __tablename__ = "data_retention_policies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope = Column(Enum(RetentionScope), default=RetentionScope.ORGANIZATION)
    target_id = Column(UUID(as_uuid=True), index=True, nullable=True) # Could be Org ID, Workspace ID, or null
    retention_days = Column(Integer, default=30)
    created_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
