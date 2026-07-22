import uuid
from sqlalchemy import Column, String, ForeignKey
from app.models.types import UUID
from sqlalchemy.orm import relationship
from app.database.db import Base

class Workspace(Base):
    __tablename__ = "workspaces"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, index=True, nullable=False)
    rag_collection_name = Column(String, unique=True, nullable=False)
    
    organization = relationship("Organization", back_populates="workspaces")
