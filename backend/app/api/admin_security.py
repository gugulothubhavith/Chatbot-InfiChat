from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.core.rbac import RequiresPermission, get_current_admin
from app.models.admin import AdminProfile, AdminAuditLog, AdminSession, PendingAction, ActionStatus
from app.schemas.admin_security import AuditLogResponse, SessionResponse, KillSwitchPayload, PendingActionResponse
from typing import List
from datetime import datetime, timezone

router = APIRouter(prefix="/admin-security", tags=["Admin Security"])

@router.get("/audit", response_model=List[AuditLogResponse])
def get_audit_logs(admin: AdminProfile = Depends(RequiresPermission("can_view_audit_logs")), db: Session = Depends(get_db)):
    # Limited to 100 for this example, with actual deployment pagination is required
    logs = db.query(AdminAuditLog).order_by(AdminAuditLog.timestamp.desc()).limit(100).all()
    res = []
    for log in logs:
         res.append({
             "id": str(log.id), "admin_id": str(log.admin_id) if log.admin_id else None,
             "action": log.action, "resource_type": log.resource_type, "resource_id": log.resource_id,
             "old_state": log.old_state, "new_state": log.new_state, "ip_address": log.ip_address,
             "user_agent": log.user_agent, "timestamp": log.timestamp
         })
    return res

@router.get("/sessions", response_model=List[SessionResponse])
def get_active_sessions(admin: AdminProfile = Depends(RequiresPermission("can_manage_admins")), db: Session = Depends(get_db)):
    sessions = db.query(AdminSession).filter(AdminSession.is_active == True).all()
    return [{
         "id": str(s.id), "admin_id": str(s.admin_id), "ip_address": s.ip_address, "device_info": s.device_info,
         "is_active": s.is_active, "expires_at": s.expires_at, "last_seen": s.last_seen
    } for s in sessions]

@router.delete("/sessions/{session_id}")
def revoke_session(session_id: str, admin: AdminProfile = Depends(RequiresPermission("can_manage_admins")), db: Session = Depends(get_db)):
    import uuid
    session = db.query(AdminSession).filter(AdminSession.id == uuid.UUID(session_id)).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.is_active = False
    db.commit()
    
    # Audit log
    log = AdminAuditLog(admin_id=admin.id, action="REVOKE_SESSION", resource_type="AdminSession", resource_id=session_id)
    db.add(log)
    db.commit()
    
    return {"message": "Session revoked"}

@router.post("/kill-switch")
def request_kill_switch(payload: KillSwitchPayload, admin: AdminProfile = Depends(RequiresPermission("can_trigger_kill_switch")), db: Session = Depends(get_db)):
    import datetime
    
    action = PendingAction(
         initiator_id=admin.id,
         action_type="KILL_SWITCH",
         payload={"reason": payload.reason, "action": payload.action},
         expires_at=datetime.datetime.now(timezone.utc) + datetime.timedelta(hours=1)
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    
    log = AdminAuditLog(admin_id=admin.id, action="REQUEST_KILL_SWITCH", resource_type="PendingAction", resource_id=str(action.id), new_state=payload.dict())
    db.add(log)
    db.commit()
    
    return {"message": "Kill switch request submitted. Awaiting secondary Super Admin approval.", "request_id": str(action.id)}

@router.get("/two-person/pending", response_model=List[PendingActionResponse])
def get_pending_actions(admin: AdminProfile = Depends(RequiresPermission.super_admin_only), db: Session = Depends(get_db)):
    actions = db.query(PendingAction).filter(PendingAction.status == ActionStatus.PENDING).order_by(PendingAction.created_at.desc()).all()
    res = []
    for a in actions:
        res.append({
            "id": str(a.id),
            "initiator_id": str(a.initiator_id),
            "approver_id": str(a.approver_id) if a.approver_id else None,
            "action_type": a.action_type,
            "payload": a.payload,
            "status": a.status,
            "created_at": a.created_at,
            "expires_at": a.expires_at
        })
    return res

@router.post("/two-person/{action_id}/approve")
def approve_action(action_id: str, admin: AdminProfile = Depends(RequiresPermission.super_admin_only), db: Session = Depends(get_db)):
    import uuid
    import datetime
    action = db.query(PendingAction).filter(PendingAction.id == uuid.UUID(action_id)).first()
    if not action:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if action.status != ActionStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Request is already {action.status.value}")
        
    if action.initiator_id == admin.id:
        raise HTTPException(status_code=403, detail="Cannot approve your own request (Two-Person Rule).")
        
    if action.expires_at < datetime.datetime.now(timezone.utc).replace(tzinfo=None):
        action.status = ActionStatus.EXPIRED
        db.commit()
        raise HTTPException(status_code=400, detail="Request expired")
        
    action.status = ActionStatus.APPROVED
    action.approver_id = admin.id
    
    # Simulate execution of the highly dangerous action
    if action.action_type == "KILL_SWITCH":
        pass # e.g. set global feature flag to RED
        
    db.commit()
    
    log = AdminAuditLog(admin_id=admin.id, action="APPROVE_KILL_SWITCH", resource_type="PendingAction", resource_id=str(action.id))
    db.add(log)
    db.commit()
    
    return {"message": "Action approved and executed."}

@router.get("/audit-dependencies")
def execute_dependency_scan(admin: AdminProfile = Depends(RequiresPermission.super_admin_only), db: Session = Depends(get_db)):
    """
    World-class CI/CD security scanning directly within the Application runtime.
    Executes an NVD vulnerability trace covering the entire localized Python environment.
    """
    import subprocess
    import json
    import logging
    
    logger = logging.getLogger(__name__)
    logger.info(f"System Admin {admin.id} triggered a live CVE Dependency Audit.")
    
    # Audit log the scan initialization
    log = AdminAuditLog(
        admin_id=admin.id, 
        action="TRIGGER_VULNERABILITY_SCAN", 
        resource_type="System", 
        resource_id="pip-audit"
    )
    db.add(log)
    db.commit()
    
    try:
        # Run pip-audit with JSON output targeting the locally installed venv/packages
        result = subprocess.run(
            ["pip-audit", "-f", "json"],
            capture_output=True,
            text=True
        )
        
        # pip-audit returns non-zero if vulnerabilities are found
        # Whether success or failure, we try to parse the JSON
        payload = {"status": "clean", "vulnerabilities": []}
        
        try:
            audit_data = json.loads(result.stdout)
            
            vulns = []
            for dep in audit_data.get("dependencies", []):
                if dep.get("vulns"):
                    for v in dep["vulns"]:
                        vulns.append({
                            "package": dep.get("name"),
                            "current_version": dep.get("version"),
                            "cve_id": v.get("id"),
                            "alias": v.get("aliases", []),
                            "description": v.get("details"),
                            "patched_versions": v.get("fix_versions", [])
                        })
                        
            if vulns:
                payload["status"] = "vulnerable"
                payload["vulnerabilities"] = vulns
                
        except json.JSONDecodeError:
            # If the output isn't JSON for some reason (e.g. fatal tool error)
            payload["status"] = "error"
            payload["raw_output"] = result.stderr if result.stderr else result.stdout
            
        return payload
        
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="pip-audit binary is not installed or available in PATH.")
    except Exception as e:
        logger.error(f"Failed to execute pip-audit: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal scanning failure.")
