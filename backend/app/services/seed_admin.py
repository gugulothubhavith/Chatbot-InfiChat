"""Seed default admin user on every startup.

Always ensures gugulothubhavith2006@gmail.com / Gbhavith@2005 works
as an admin login, regardless of prior DB state.
"""

import logging
import secrets
from app.database.db import SessionLocal
from app.models.user import User, RoleEnum
from app.models.admin import AdminProfile, AdminRole, AdminPermission, AdminStatus
from app.core.auth import hash_password, verify_password

logger = logging.getLogger(__name__)

DEFAULT_ADMIN_EMAIL = "gugulothubhavith2006@gmail.com"
DEFAULT_ADMIN_PASSWORD = "Gbhavith@2005"


def seed_admin():
    """Ensure the default admin user exists and works."""
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == DEFAULT_ADMIN_EMAIL).first()

        if existing_user:
            # Update password + role if needed
            changed = False
            if not verify_password(DEFAULT_ADMIN_PASSWORD, existing_user.hashed_password):
                existing_user.hashed_password = hash_password(DEFAULT_ADMIN_PASSWORD)
                changed = True
            if existing_user.role != RoleEnum.admin:
                existing_user.role = RoleEnum.admin
                changed = True
            if not existing_user.is_active:
                existing_user.is_active = True
                changed = True
            if changed:
                db.commit()
                logger.info(f"Updated admin user: {DEFAULT_ADMIN_EMAIL}")
            else:
                logger.info(f"Admin credentials current: {DEFAULT_ADMIN_EMAIL}")

            # Ensure admin profile exists
            existing_profile = db.query(AdminProfile).filter(
                AdminProfile.user_id == existing_user.id
            ).first()
            if not existing_profile:
                role = db.query(AdminRole).filter(AdminRole.name == "SuperAdmin").first()
                if not role:
                    role = AdminRole(name="SuperAdmin", hierarchy_level=1)
                    db.add(role)
                    db.commit()
                    db.refresh(role)
                profile = AdminProfile(
                    user_id=existing_user.id,
                    role_id=role.id,
                    is_super_admin=True,
                    status=AdminStatus.ACTIVE,
                )
                db.add(profile)
                db.commit()
                logger.info(f"Created admin profile for: {DEFAULT_ADMIN_EMAIL}")
            return

        # Create user with unique username
        username_base = DEFAULT_ADMIN_EMAIL.split("@")[0][:20]
        if db.query(User).filter(User.username == username_base).first():
            username_base = f"admin_{secrets.token_hex(4)}"

        admin_user = User(
            email=DEFAULT_ADMIN_EMAIL,
            username=username_base,
            hashed_password=hash_password(DEFAULT_ADMIN_PASSWORD),
            role=RoleEnum.admin,
            is_verified=True,
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        # Ensure admin role
        role = db.query(AdminRole).filter(AdminRole.name == "SuperAdmin").first()
        if not role:
            role = AdminRole(name="SuperAdmin", hierarchy_level=1)
            db.add(role)
            db.commit()
            db.refresh(role)

        # Create admin profile
        profile = AdminProfile(
            user_id=admin_user.id,
            role_id=role.id,
            is_super_admin=True,
            status=AdminStatus.ACTIVE,
        )
        db.add(profile)
        db.commit()

        logger.info(f"Default admin created: {DEFAULT_ADMIN_EMAIL}")

    except Exception as e:
        db.rollback()
        logger.error(f"seed_admin failed: {e}")
    finally:
        db.close()
