from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.deps import get_db, get_current_user
from app.models.system import SystemUpdate
from app.models.user import User
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/system", tags=["System"])


# ─── Public: Get latest active release ─────────────────────────────────────
@router.get("/latest-update")
def get_latest_update(db: Session = Depends(get_db)):
    """Public endpoint to get the latest active version."""
    update = db.query(SystemUpdate).filter(
        SystemUpdate.is_active == True
    ).order_by(SystemUpdate.created_at.desc()).first()
    
    if not update:
        # Fallback if no active release in DB
        return {
            "id": 0,
            "version": "0.1.0",
            "download_url": "https://your-website.com/downloads/InfiChat-Setup.exe",
            "release_notes": "Initial release",
            "platform": "all",
            "status": "active",
            "is_active": True,
            "checksum": None,
            "download_count": 0,
            "created_at": "2024-03-23T00:00:00Z"
        }
    return _serialize_release(update)


# ─── Admin: Push a new release ──────────────────────────────────────────────
@router.post("/latest-update", tags=["Admin"])
def set_latest_update(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Admin endpoint to push a new update."""
    version = payload.get("version", "").strip()
    url = payload.get("download_url", "").strip()
    notes = payload.get("release_notes", "")
    platform = payload.get("platform", "all")
    checksum = payload.get("checksum", None)

    if not version or not url:
        raise HTTPException(status_code=400, detail="Version and download URL are required")

    # Check for duplicate version
    existing = db.query(SystemUpdate).filter(SystemUpdate.version == version).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Version {version} already exists")

    # Deactivate all previous active releases
    db.query(SystemUpdate).filter(
        SystemUpdate.is_active == True
    ).update({"is_active": False, "status": "previous"})

    new_update = SystemUpdate(
        version=version,
        download_url=url,
        release_notes=notes,
        platform=platform,
        checksum=checksum,
        status="active",
        is_active=True,
        download_count=0
    )
    db.add(new_update)
    db.commit()
    db.refresh(new_update)
    return {"message": "Release deployed successfully", "release": _serialize_release(new_update)}


# ─── Admin: List all releases (paginated) ──────────────────────────────────
@router.get("/releases")
def list_releases(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns all releases ordered by newest first, with pagination."""
    total = db.query(func.count(SystemUpdate.id)).scalar() or 0
    releases = db.query(SystemUpdate).order_by(
        SystemUpdate.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "releases": [_serialize_release(r) for r in releases]
    }


# ─── Admin: Get a single release ───────────────────────────────────────────
@router.get("/releases/{release_id}")
def get_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    release = db.query(SystemUpdate).filter(SystemUpdate.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    return _serialize_release(release)


# ─── Admin: Rollback to a previous version ──────────────────────────────────
@router.post("/releases/{release_id}/rollback")
def rollback_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rollback: sets the selected release as the active one, deactivates current."""
    target = db.query(SystemUpdate).filter(SystemUpdate.id == release_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Release not found")
    
    if target.status == "deprecated":
        raise HTTPException(status_code=400, detail="Cannot rollback to a deprecated release")

    # Deactivate all current active releases
    db.query(SystemUpdate).filter(
        SystemUpdate.is_active == True
    ).update({"is_active": False, "status": "previous"})

    # Set target as active
    target.is_active = True
    target.status = "active"
    db.commit()
    db.refresh(target)
    
    return {"message": f"Rolled back to version {target.version}", "release": _serialize_release(target)}


# ─── Admin: Deprecate a release ────────────────────────────────────────────
@router.delete("/releases/{release_id}")
def deprecate_release(
    release_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft-delete: marks a release as deprecated."""
    release = db.query(SystemUpdate).filter(SystemUpdate.id == release_id).first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    if release.is_active:
        raise HTTPException(status_code=400, detail="Cannot deprecate the currently active release")
    
    release.status = "deprecated"
    release.is_active = False
    db.commit()
    return {"message": f"Release {release.version} deprecated"}


# ─── Admin: Aggregate stats ────────────────────────────────────────────────
@router.get("/releases/stats")
def release_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggregate release statistics."""
    total = db.query(func.count(SystemUpdate.id)).scalar() or 0
    
    active = db.query(SystemUpdate).filter(
        SystemUpdate.is_active == True
    ).first()
    
    latest = db.query(SystemUpdate).order_by(
        SystemUpdate.created_at.desc()
    ).first()

    total_downloads = db.query(func.sum(SystemUpdate.download_count)).scalar() or 0

    return {
        "total_releases": total,
        "active_version": active.version if active else "0.1.0",
        "last_deploy": latest.created_at.isoformat() if latest and latest.created_at else None,
        "total_downloads": total_downloads
    }


# ─── Serializer ─────────────────────────────────────────────────────────────
def _serialize_release(r: SystemUpdate) -> dict:
    return {
        "id": r.id,
        "version": r.version,
        "download_url": r.download_url,
        "release_notes": r.release_notes or "",
        "platform": r.platform or "all",
        "status": r.status or "active",
        "is_active": r.is_active if r.is_active is not None else False,
        "checksum": r.checksum,
        "download_count": r.download_count or 0,
        "created_at": r.created_at.isoformat() if r.created_at else None
    }
