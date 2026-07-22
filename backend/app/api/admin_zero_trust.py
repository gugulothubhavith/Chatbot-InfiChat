from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.admin import AdminProfile
from app.models.security import JITPrivilege, AdminDeviceFingerprint
from app.api.auth import get_current_user
from app.models.user import User
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/admin-zero-trust", tags=["Zero-Trust"])

class JITRequest(BaseModel):
    requested_role: str
    reason: str
    duration_minutes: int = 60

@router.post("/jit/request")
def request_jit_escalation(
    payload: JITRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request Just-In-Time privilege escalation"""
    admin = db.query(AdminProfile).filter(AdminProfile.user_id == current_user.id).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Not an admin")

    new_jit = JITPrivilege(
        admin_id=admin.id,
        requested_role=payload.requested_role,
        reason=payload.reason,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=payload.duration_minutes)
    )
    db.add(new_jit)
    db.commit()
    return {"message": "JIT request submitted. Awaiting Super Admin approval.", "request_id": str(new_jit.id)}

@router.post("/jit/{request_id}/approve")
def approve_jit_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Super Admin approves a JIT request"""
    admin = db.query(AdminProfile).filter(AdminProfile.user_id == current_user.id).first()
    if not admin or not admin.is_super_admin:
        raise HTTPException(status_code=403, detail="Super Admin only")

    jit = db.query(JITPrivilege).filter(JITPrivilege.id == request_id).first()
    if not jit:
        raise HTTPException(status_code=404, detail="Request not found")

    jit.status = "APPROVED"
    jit.approved_by = admin.id
    db.commit()
    return {"message": "JIT request approved and activated."}

@router.post("/device/register")
def register_device(
    fingerprint_hash: str,
    user_agent: str,
    ip_address: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registers a device fingerprint for Zero-Trust session validation"""
    admin = db.query(AdminProfile).filter(AdminProfile.user_id == current_user.id).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    device = AdminDeviceFingerprint(
        admin_id=admin.id,
        fingerprint_hash=fingerprint_hash,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(device)
    db.commit()
    return {"message": "Device registered successfully."}
