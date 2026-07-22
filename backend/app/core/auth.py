"""Authentication utilities — JWT tokens, password hashing with graceful fallback.

Primary: bcrypt via passlib (fast, secure)
Fallback: hashlib.sha256 (always works, no C extensions needed)
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib
import secrets
import logging
from jose import jwt, JWTError
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Password Hashing (with fallback) ──────────────────────────

_USE_BCRYPT = False
try:
    from passlib.context import CryptContext
    _bcrypt_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    # Quick self-test
    _test_hash = _bcrypt_ctx.hash("test")
    _bcrypt_ctx.verify("test", _test_hash)
    _USE_BCRYPT = True
except Exception as e:
    logger.warning(f"bcrypt unavailable ({e}), using SHA-256 fallback for passwords")


def hash_password(password: str) -> str:
    """Hash a password — bcrypt preferred, SHA-256 fallback."""
    if _USE_BCRYPT:
        return _bcrypt_ctx.hash(password)
    # Portable SHA-256 with random salt
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"sha256${salt}${h}"


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against a hash — supports bcrypt and SHA-256."""
    if not hashed:
        return False
    if _USE_BCRYPT:
        try:
            return _bcrypt_ctx.verify(plain, hashed)
        except Exception:
            pass
    # Fallback: check SHA-256 format
    if hashed.startswith("sha256$"):
        parts = hashed.split("$")
        if len(parts) == 3:
            salt, expected = parts[1], parts[2]
            h = hashlib.sha256((salt + plain).encode()).hexdigest()
            return h == expected
    # Plain-text comparison (development only)
    if settings.is_production:
        return False
    return hashed == plain


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a short-lived JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a long-lived JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Returns None on failure."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_token_type(payload: dict, expected_type: str) -> bool:
    """Check if a decoded token has the expected type (access/refresh)."""
    if not payload:
        return False
    return payload.get("type") == expected_type
