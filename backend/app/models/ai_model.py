import uuid
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey
from app.models.types import UUID
from app.database.db import Base

class ModelRegistry(Base):
    __tablename__ = "ai_models"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_name = Column(String, unique=True, index=True, nullable=False)
    endpoint_url = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    weight = Column(Integer, default=100) # For A/B traffic split (0-100)
    fallback_model_id = Column(UUID(as_uuid=True), ForeignKey("ai_models.id", ondelete="SET NULL"), nullable=True)
