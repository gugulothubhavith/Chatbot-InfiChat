import uuid
from sqlalchemy import Column, String, Float
from app.models.types import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database.db import Base

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="ACTIVE") # 'ACTIVE' or 'SUSPENDED'
    risk_score = Column(Float, default=0.0)
    ai_limits = Column(JSONB, default={"max_tokens": 1000000, "max_concurrent_reqs": 500})
    feature_flags = Column(JSONB, default={"enable_beta_models": False, "enable_sandbox": False})
    
    workspaces = relationship("Workspace", back_populates="organization", cascade="all, delete-orphan")
    users = relationship("User", back_populates="organization")
