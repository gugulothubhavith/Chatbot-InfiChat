from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.admin import AdminProfile, AdminStatus
from app.core.deps import get_db, get_current_user
from typing import List

def get_current_admin(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> AdminProfile:
    """Gets the admin profile for the current user, ensuring they are an active admin."""
    
    admin_profile = db.query(AdminProfile).filter(AdminProfile.user_id == current_user.id).first()
    
    if not admin_profile:
        raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")
        
    if admin_profile.status != AdminStatus.ACTIVE:
        raise HTTPException(status_code=403, detail=f"Admin account is {admin_profile.status.value.lower()}.")
        
    import datetime
    if admin_profile.access_expires_at and admin_profile.access_expires_at < datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None):
        admin_profile.status = AdminStatus.EXPIRED
        db.commit()
        raise HTTPException(status_code=403, detail="Admin access has expired.")
        
    return admin_profile

class RequiresPermission:
    """Dependency class to check if current admin has specific permissions."""
    def __init__(self, required_permission: str):
        self.required_permission = required_permission
        
    def __call__(self, admin: AdminProfile = Depends(get_current_admin), db: Session = Depends(get_db)):
        if admin.is_super_admin:
            return admin
            
        # Compile all permissions from Role and Custom AdminPermissions
        permissions = set()
        
        # 1. From Role
        if admin.role:
            for p in admin.role.permissions:
                permissions.add(p.name)
                
        # 2. From Custom Overrides
        for p in admin.custom_permissions:
            permissions.add(p.name)
            
        if self.required_permission not in permissions:
            # Audit log the failure? Could be done here via injection or simple log
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Admin {admin.id} attempted action requiring '{self.required_permission}' but was denied.")
            raise HTTPException(status_code=403, detail=f"Missing required permission: {self.required_permission}")
            
        return admin
    
    @staticmethod
    def super_admin_only(admin: AdminProfile = Depends(get_current_admin)):
        if not admin.is_super_admin:
            raise HTTPException(status_code=403, detail="Super Admin privileges required.")
        return admin
