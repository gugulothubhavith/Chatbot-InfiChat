from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

class PermissionValidate(PermissionBase):
    id: str

class RoleCreate(BaseModel):
    name: str
    hierarchy_level: int = 100
    permissions: List[str] = [] # List of permission names

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    hierarchy_level: Optional[int] = None
    permissions: Optional[List[str]] = None

class RoleResponse(BaseModel):
    id: str
    name: str
    hierarchy_level: int
    permissions: List[PermissionValidate]

class InviteCreate(BaseModel):
    email: EmailStr
    role_id: Optional[str] = None

class InviteResponse(BaseModel):
    id: str
    email: str
    token: str # Only returned on creation
    expires_at: datetime
    status: str

class AdminProfileUpdate(BaseModel):
    role_id: Optional[str] = None
    status: Optional[str] = None
    access_expires_at: Optional[datetime] = None
    is_super_admin: Optional[bool] = None
    custom_permissions: Optional[List[str]] = None

class AdminResponse(BaseModel):
    id: str
    user_id: str
    email: str
    role: Optional[RoleResponse]
    is_super_admin: bool
    status: str
    access_expires_at: Optional[datetime]
    risk_score: float
    created_at: datetime
