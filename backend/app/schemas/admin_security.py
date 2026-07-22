from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class AuditLogResponse(BaseModel):
    id: str
    admin_id: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    old_state: Optional[Any]
    new_state: Optional[Any]
    ip_address: Optional[str]
    user_agent: Optional[str]
    timestamp: datetime

class SessionResponse(BaseModel):
    id: str
    admin_id: str
    ip_address: Optional[str]
    device_info: Optional[str]
    is_active: bool
    expires_at: datetime
    last_seen: datetime

class KillSwitchPayload(BaseModel):
    reason: str
    action: str # "DISABLE_ALL_CHAT", "LOCKDOWN_SYSTEM"

class PendingActionResponse(BaseModel):
    id: str
    initiator_id: str
    approver_id: Optional[str]
    action_type: str
    payload: Any
    status: str
    created_at: datetime
    expires_at: datetime
