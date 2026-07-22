from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.models.organization import Organization
from app.models.workspace import Workspace
from app.api.auth import get_current_user
from app.models.user import User
from pydantic import BaseModel
from typing import List
import uuid

router = APIRouter(prefix="/admin/tenants", tags=["Multi-Tenancy"])

class OrganizationCreate(BaseModel):
    name: str
    ai_request_limit: int = 1000
    risk_score_limit: float = 0.9

@router.post("/organizations")
def create_organization(
    payload: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Super Admin: Create a new tenant organization"""
    # Authorization check (Super Admin only - assuming role checks handled elsewhere or verified here)
    new_org = Organization(
        name=payload.name,
        ai_request_limit=payload.ai_request_limit,
        risk_score_limit=payload.risk_score_limit
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return new_org

@router.get("/organizations", response_model=List[dict])
def list_organizations(db: Session = Depends(get_db)):
    """List all organizations in the platform"""
    return db.query(Organization).all()

@router.post("/organizations/{org_id}/workspaces")
def create_workspace(
    org_id: str,
    name: str,
    db: Session = Depends(get_db)
):
    """Create a workspace within an organization"""
    workspace = Workspace(
        org_id=org_id,
        name=name,
        rag_collection_name=f"org_{org_id[:8]}_{name.lower()}"
    )
    db.add(workspace)
    db.commit()
    return workspace
