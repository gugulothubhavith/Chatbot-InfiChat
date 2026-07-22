from sqlalchemy import Column, String, DateTime, Enum, Boolean, Integer, Float, ForeignKey, Table
from app.models.types import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database.db import Base
from datetime import datetime, timezone
import uuid
import enum

role_permissions_table = Table(
    'admin_role_permissions',
    Base.metadata,
    Column('role_id', UUID(as_uuid=True), ForeignKey('admin_roles.id', ondelete="CASCADE"), primary_key=True),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('admin_permissions.id', ondelete="CASCADE"), primary_key=True)
)

admin_permissions_table = Table(
    'admin_profile_permissions',
    Base.metadata,
    Column('admin_id', UUID(as_uuid=True), ForeignKey('admin_profiles.id', ondelete="CASCADE"), primary_key=True),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('admin_permissions.id', ondelete="CASCADE"), primary_key=True)
)

class AdminStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    EXPIRED = "EXPIRED"

class InviteStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"

class ActionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"

class AdminPermission(Base):
    __tablename__ = "admin_permissions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False) 
    description = Column(String, nullable=True)
    category = Column(String, nullable=True) 

class AdminRole(Base):
    __tablename__ = "admin_roles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, index=True, nullable=False)
    hierarchy_level = Column(Integer, default=100) 
    
    permissions = relationship("AdminPermission", secondary=role_permissions_table)

class AdminProfile(Base):
    __tablename__ = "admin_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("admin_roles.id", ondelete="SET NULL"), nullable=True)
    
    is_super_admin = Column(Boolean, default=False)
    status = Column(Enum(AdminStatus), default=AdminStatus.ACTIVE)
    access_expires_at = Column(DateTime, nullable=True)
    risk_score = Column(Float, default=0.0)
    
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", backref="admin_profile")
    role = relationship("AdminRole")
    custom_permissions = relationship("AdminPermission", secondary=admin_permissions_table)
    created_by = relationship("AdminProfile", remote_side=[id])

class AdminInvite(Base):
    __tablename__ = "admin_invites"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, index=True, nullable=False)
    invited_by_id = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="CASCADE"))
    assigned_role_id = Column(UUID(as_uuid=True), ForeignKey("admin_roles.id", ondelete="CASCADE"))
    token_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    status = Column(Enum(InviteStatus), default=InviteStatus.PENDING)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, index=True, nullable=False)
    resource_type = Column(String, nullable=True)
    resource_id = Column(String, nullable=True)
    old_state = Column(JSONB, nullable=True)
    new_state = Column(JSONB, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class AdminSession(Base):
    __tablename__ = "admin_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="CASCADE"))
    refresh_token_hash = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    device_info = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=False)
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class PendingAction(Base):
    __tablename__ = "admin_pending_actions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    initiator_id = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="CASCADE"))
    action_type = Column(String, nullable=False) 
    payload = Column(JSONB, nullable=True)
    status = Column(Enum(ActionStatus), default=ActionStatus.PENDING)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("admin_profiles.id", ondelete="SET NULL"), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
