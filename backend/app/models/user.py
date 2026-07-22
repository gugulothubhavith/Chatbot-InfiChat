from sqlalchemy import Column, String, DateTime, Enum, Boolean, ForeignKey
from app.models.types import UUID, JSONB
from typing import Optional
from sqlalchemy.orm import relationship
from app.database.db import Base
from datetime import datetime, timezone
import uuid
import enum

class RoleEnum(str, enum.Enum):
    admin = "admin"
    user = "user"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    role = Column(Enum(RoleEnum), default=RoleEnum.user)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    avatar_url = Column(String, nullable=True)
    settings = Column(JSONB, nullable=True, default=dict)
    
    # TOTP / MFA
    totp_secret = Column(String, nullable=True) # Base32 generic secret
    is_mfa_enabled = Column(Boolean, default=False)
    
    organization = relationship("Organization", back_populates="users")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    memories = relationship("Memory", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    snippets = relationship("Snippet", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    refresh_token_hash = Column(String, index=True, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_activity = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="sessions")