"""Subscription API — Plan listing, user subscription, and admin plan management."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.services.subscription_service import (
    get_available_plans,
    get_plan_by_id,
    create_plan,
    update_plan,
    delete_plan,
    assign_plan_to_user,
    get_user_subscription,
    get_user_usage_summary,
    get_all_users_usage,
)

router = APIRouter(prefix="/subscription", tags=["Subscription"])


# ── Schemas ───────────────────────────────────────────────────

class PlanCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    price_monthly: int = 0
    limits: Dict[str, Any] = {}
    features: Dict[str, Any] = {}
    is_admin_plan: bool = False
    is_public: bool = True
    sort_order: int = 0


class PlanUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[int] = None
    limits: Optional[Dict[str, Any]] = None
    features: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None
    sort_order: Optional[int] = None


class SubscribeRequest(BaseModel):
    plan_id: str


# ── Public Endpoints ──────────────────────────────────────────

@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    """Get all available public subscription plans."""
    plans = get_available_plans(db)
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "price_monthly": p.price_monthly,
            "features": p.features,
            "limits": p.limits,
            "is_admin_plan": p.is_admin_plan,
            "sort_order": p.sort_order,
        }
        for p in plans
    ]


@router.get("/my-plan")
def my_plan(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's subscription plan and usage."""
    sub_info = get_user_subscription(str(user.id), db)
    plan = sub_info["plan"]
    usage = get_user_usage_summary(str(user.id), db)

    return {
        "plan": {
            "id": str(plan.id) if plan else None,
            "name": plan.name if plan else "Free",
            "price_monthly": plan.price_monthly if plan else 0,
            "features": plan.features if plan else {},
            "limits": plan.limits if plan else {},
        },
        "subscription": {
            "is_active": sub_info["is_active"],
            "is_admin_assigned": sub_info["is_admin_assigned"],
            "start_date": sub_info["start_date"].isoformat() if sub_info.get("start_date") else None,
            "end_date": sub_info["end_date"].isoformat() if sub_info.get("end_date") else None,
        },
        "usage": {
            feature: data
            for feature, data in usage.items()
        },
    }


@router.post("/subscribe")
def subscribe(
    req: SubscribeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Subscribe to a plan."""
    plan = get_plan_by_id(req.plan_id, db)
    if not plan or not plan.is_active:
        raise HTTPException(status_code=404, detail="Plan not found")
    if plan.is_admin_plan:
        raise HTTPException(
            status_code=400,
            detail="This plan cannot be self-subscribed. Contact an administrator.",
        )

    subscription = assign_plan_to_user(str(user.id), req.plan_id, db)
    return {
        "message": f"Subscribed to {plan.name}",
        "plan_name": plan.name,
        "end_date": subscription.end_date.isoformat() if subscription.end_date else None,
    }


# ── Admin Endpoints ───────────────────────────────────────────

@router.get("/admin/plans")
def admin_list_plans(db: Session = Depends(get_db)):
    """Get ALL plans including inactive (admin only)."""
    from app.models.subscription import SubscriptionPlan

    plans = db.query(SubscriptionPlan).order_by(SubscriptionPlan.sort_order).all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "price_monthly": p.price_monthly,
            "features": p.features,
            "limits": p.limits,
            "is_active": p.is_active,
            "is_admin_plan": p.is_admin_plan,
            "is_public": p.is_public,
            "sort_order": p.sort_order,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in plans
    ]


@router.post("/admin/plans")
def admin_create_plan(
    req: PlanCreateRequest,
    db: Session = Depends(get_db),
):
    """Create a new subscription plan (admin only)."""
    plan = create_plan(db, **req.model_dump())
    return {"id": str(plan.id), "name": plan.name, "message": "Plan created successfully"}


@router.put("/admin/plans/{plan_id}")
def admin_update_plan(
    plan_id: str,
    req: PlanUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update an existing plan (admin only)."""
    filtered = {k: v for k, v in req.model_dump().items() if v is not None}
    plan = update_plan(plan_id, db, **filtered)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan updated successfully", "id": plan_id}


@router.delete("/admin/plans/{plan_id}")
def admin_delete_plan(
    plan_id: str,
    db: Session = Depends(get_db),
):
    """Delete a plan (admin only)."""
    if not delete_plan(plan_id, db):
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan deleted successfully"}


@router.get("/admin/usage")
def admin_usage(db: Session = Depends(get_db)):
    """Platform-wide usage stats (admin only)."""
    usage = get_all_users_usage(db)
    return {"features": usage}


@router.get("/admin/user-usage/{user_id}")
def admin_user_usage(
    user_id: str,
    db: Session = Depends(get_db),
):
    """Get usage for a specific user (admin only)."""
    return get_user_usage_summary(user_id, db)


@router.post("/admin/users/{user_id}/assign-plan")
def admin_assign_plan(
    user_id: str,
    req: SubscribeRequest,
    db: Session = Depends(get_db),
):
    """Admin force-assign a plan to a user (bypasses limits)."""
    plan = get_plan_by_id(req.plan_id, db)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    assign_plan_to_user(user_id, req.plan_id, db, admin_assigned=True)
    return {
        "message": f"Plan '{plan.name}' assigned to user",
        "plan_name": plan.name,
    }
