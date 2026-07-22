from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.core.rbac import RequiresPermission, get_current_admin
from app.models.admin import AdminRole, AdminPermission, AdminProfile, AdminInvite, AdminStatus, InviteStatus, AdminAuditLog
from app.schemas.admin_governance import RoleCreate, RoleResponse, InviteCreate, InviteResponse, AdminProfileUpdate, AdminResponse
from typing import List
import uuid
import secrets
import hashlib
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/admin-governance", tags=["Admin Governance"])

def create_audit_log(db: Session, admin_id: uuid.UUID, action: str, resource_type: str = None, resource_id: str = None, old_state: dict = None, new_state: dict = None):
    log = AdminAuditLog(
        admin_id=admin_id, action=action, resource_type=resource_type, 
        resource_id=resource_id, old_state=old_state, new_state=new_state
    )
    db.add(log)

@router.get("/permissions", response_model=List[dict])
def get_permissions(admin: AdminProfile = Depends(RequiresPermission("can_manage_admins")), db: Session = Depends(get_db)):
    perms = db.query(AdminPermission).all()
    return [{"id": str(p.id), "name": p.name, "description": p.description, "category": p.category} for p in perms]

@router.post("/roles", response_model=RoleResponse)
def create_role(payload: RoleCreate, admin: AdminProfile = Depends(RequiresPermission("can_manage_admins")), db: Session = Depends(get_db)):
    role = AdminRole(name=payload.name, hierarchy_level=payload.hierarchy_level)
    for perm_name in payload.permissions:
        p = db.query(AdminPermission).filter(AdminPermission.name == perm_name).first()
        if p:
            role.permissions.append(p)
    db.add(role)
    db.commit()
    db.refresh(role)
    create_audit_log(db, admin.id, "CREATE_ROLE", "AdminRole", str(role.id), None, {"name": role.name})
    return {"id": str(role.id), "name": role.name, "hierarchy_level": role.hierarchy_level, "permissions": [{"id": str(p.id), "name": p.name} for p in role.permissions]}

@router.get("/roles", response_model=List[RoleResponse])
def get_roles(admin: AdminProfile = Depends(RequiresPermission("can_manage_admins")), db: Session = Depends(get_db)):
    roles = db.query(AdminRole).all()
    return [{"id": str(role.id), "name": role.name, "hierarchy_level": role.hierarchy_level, "permissions": [{"id": str(p.id), "name": p.name} for p in role.permissions]} for role in roles]

@router.get("/profiles", response_model=List[AdminResponse])
def get_admin_profiles(admin: AdminProfile = Depends(RequiresPermission("can_manage_admins")), db: Session = Depends(get_db)):
    profiles = db.query(AdminProfile).all()
    res = []
    for pro in profiles:
        role_data = None
        if pro.role:
             role_data = {"id": str(pro.role.id), "name": pro.role.name, "hierarchy_level": pro.role.hierarchy_level, "permissions": [{"id": str(p.id), "name": p.name} for p in pro.role.permissions]}
        res.append({
            "id": str(pro.id), "user_id": str(pro.user_id), "email": pro.user.email if pro.user else "Unknown",
            "role": role_data, "is_super_admin": pro.is_super_admin, "status": pro.status, "access_expires_at": pro.access_expires_at,
            "risk_score": pro.risk_score, "created_at": pro.created_at
        })
    return res

@router.post("/invites", response_model=InviteResponse)
def invite_admin(payload: InviteCreate, admin: AdminProfile = Depends(RequiresPermission("can_manage_admins")), db: Session = Depends(get_db)):
    if not payload.role_id and not admin.is_super_admin:
         raise HTTPException(status_code=403, detail="Super admin required to invite without a role.")
    
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    dt_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    invite = AdminInvite(
        email=payload.email,
        invited_by_id=admin.id,
        assigned_role_id=uuid.UUID(payload.role_id) if payload.role_id else None,
        token_hash=token_hash,
        expires_at=dt_expires
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    
    create_audit_log(db, admin.id, "INVITE_ADMIN", "AdminInvite", str(invite.id), None, {"email": invite.email, "role": str(invite.assigned_role_id)})
    
    # In production, this token would be emailed via email_service.
    # Here we return it once for the inviter to copy/paste if needed.
    return {"id": str(invite.id), "email": invite.email, "token": token, "expires_at": invite.expires_at, "status": invite.status}

@router.patch("/profiles/{profile_id}")
def update_profile(profile_id: str, payload: AdminProfileUpdate, admin: AdminProfile = Depends(RequiresPermission.super_admin_only), db: Session = Depends(get_db)):
    profile = db.query(AdminProfile).filter(AdminProfile.id == uuid.UUID(profile_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    old_state = {"status": profile.status, "role_id": str(profile.role_id) if profile.role_id else None}
    
    if payload.status:
        profile.status = AdminStatus(payload.status)
    if payload.role_id:
        profile.role_id = uuid.UUID(payload.role_id)
    if payload.access_expires_at is not None:
        profile.access_expires_at = payload.access_expires_at
    if payload.is_super_admin is not None:
         profile.is_super_admin = payload.is_super_admin
    
    if payload.custom_permissions is not None:
         profile.custom_permissions = []
         for p_name in payload.custom_permissions:
             p = db.query(AdminPermission).filter(AdminPermission.name == p_name).first()
             if p:
                 profile.custom_permissions.append(p)
                 
    db.commit()
    new_state = {"status": profile.status, "role_id": str(profile.role_id) if profile.role_id else None}
    create_audit_log(db, admin.id, "UPDATE_ADMIN_PROFILE", "AdminProfile", profile_id, old_state, new_state)
    
    return {"message": "Profile updated"}
