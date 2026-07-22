from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from app.database.db import SessionLocal
from app.models.admin import AdminAuditLog, AdminProfile
from app.core.auth import decode_token
import json
import datetime

class AdminAuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only log requests to admin endpoints
        if not request.url.path.startswith("/api/admin"):
            return await call_next(request)

        # Clone request for body reading if needed (careful with large bodies)
        # For security, we log the action, but might skip logging the entire body if it's too large
        
        response = await call_next(request)
        
        # Post-response logging
        try:
            auth_header = request.headers.get("Authorization")
            admin_id = None
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                payload = decode_token(token)
                if payload:
                    user_id = payload.get("sub")
                    db = SessionLocal()
                    try:
                        admin = db.query(AdminProfile).filter(AdminProfile.user_id == user_id).first()
                        if admin:
                            admin_id = admin.id
                    finally:
                        db.close()

            # Record the audit log
            db = SessionLocal()
            try:
                # Basic info
                action = f"{request.method} {request.url.path}"
                log = AdminAuditLog(
                    admin_id=admin_id,
                    action=action,
                    resource_type="API_ENDPOINT",
                    resource_id=request.url.path,
                    ip_address=request.client.host if request.client else "unknown",
                    user_agent=request.headers.get("user-agent"),
                    new_state={
                        "status_code": response.status_code,
                        "query_params": dict(request.query_params)
                    }
                )
                db.add(log)
                db.commit()
            except Exception as e:
                print(f"Error in AdminAuditMiddleware: {e}")
            finally:
                db.close()
                
        except Exception as e:
            print(f"Failed to log admin action: {e}")
            
        return response
