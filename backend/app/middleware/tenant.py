from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from app.database.db import SessionLocal
import jwt
from app.core.config import settings

class TenantIsolationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # By default, assume no specific org
        request.state.tenant_org_id = None
        
        # We only try to extract tenant from Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                org_id = payload.get("org_id")
                if org_id:
                    request.state.tenant_org_id = org_id
            except Exception:
                pass
                
        # To enforce logical isolation inside SQLAlchemy, endpoints can access `request.state.tenant_org_id`
        # and forcefully inject it into their queries: e.g. `.filter(model.org_id == request.state.tenant_org_id)`
        
        response = await call_next(request)
        return response
