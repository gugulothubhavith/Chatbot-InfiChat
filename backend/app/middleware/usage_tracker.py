"""Usage tracking middleware — enforces subscription limits on API requests.

Intercepts API calls to:
1. Validate user's feature access based on subscription plan
2. Check usage limits before processing requests
3. Return 402/429 with upgrade info if limits exceeded
4. Record usage after successful responses

NOTE: This middleware decodes JWT independently since middleware runs
before route-level Depends() resolvers.
"""

import json
import logging
import time
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.auth import decode_token
from app.services.subscription_service import (
    get_feature_from_path,
    check_feature_access,
    check_usage_limit,
    record_usage,
)

logger = logging.getLogger(__name__)

# Paths to skip for usage tracking (including /api/v1/ variants)
SKIP_PATHS = {
    "/auth/", "/docs", "/openapi", "/health", "/static",
    "/subscription/", "/api/v1/subscription/",
    "/admin/", "/api/v1/admin/",
    "/metrics", "/login", "/register",
}

# Path prefixes to track
TRACK_PREFIXES = ("/api/v1/", "/chat/", "/research/", "/thinking/", "/code/", "/image/", "/rag/", "/voice/")


def _get_user_id_from_request(request: Request) -> Optional[str]:
    """Extract user ID from JWT token in Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]
    if not token:
        return None

    payload = decode_token(token)
    if not payload:
        return None

    return payload.get("sub")


class UsageTrackingMiddleware(BaseHTTPMiddleware):
    """Middleware that tracks API usage and enforces subscription limits."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        # Skip non-tracked paths
        path = request.url.path
        if not any(path.startswith(prefix) for prefix in TRACK_PREFIXES):
            return await call_next(request)

        if any(path.startswith(skip) for skip in SKIP_PATHS):
            return await call_next(request)

        # Skip WebSocket
        if path.startswith("/ws"):
            return await call_next(request)

        # Extract user from JWT
        user_id = _get_user_id_from_request(request)
        if not user_id:
            return await call_next(request)

        # Determine feature from path
        feature = get_feature_from_path(path)
        if not feature:
            return await call_next(request)

        # Graceful degradation — if DB/subscription tables aren't ready, allow request
        try:
            from app.database.db import SessionLocal
            db = SessionLocal()
        except Exception as e:
            logger.warning(f"UsageTracking: DB not available ({e}), allowing request through")
            return await call_next(request)

        try:
            # Check feature access
            has_access = check_feature_access(user_id, feature, db)
            if not has_access:
                return Response(
                    content=json.dumps({
                        "detail": (
                            f"The '{feature}' feature is not available on your current plan. "
                            f"Upgrade to access this feature."
                        ),
                        "code": "FEATURE_NOT_AVAILABLE",
                        "feature": feature,
                    }),
                    status_code=402,
                    media_type="application/json",
                    headers={"X-Upgrade-Required": "true"},
                )

            # Check usage limits
            allowed, remaining, limit = check_usage_limit(user_id, feature, db)
            if not allowed:
                return Response(
                    content=json.dumps({
                        "detail": (
                            f"You've reached your daily/monthly limit for '{feature}' "
                            f"({limit} uses). Please upgrade your plan or wait for the reset."
                        ),
                        "code": "LIMIT_EXCEEDED",
                        "feature": feature,
                        "limit": limit,
                        "remaining": 0,
                    }),
                    status_code=429,
                    media_type="application/json",
                    headers={
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-Upgrade-Required": "true",
                    },
                )

            # Process the request
            start_time = time.time()
            response = await call_next(request)
            elapsed = time.time() - start_time

            # Add usage headers
            response.headers["X-Usage-Feature"] = feature
            response.headers["X-Usage-Remaining"] = str(max(0, remaining - 1))
            response.headers["X-Usage-Limit"] = str(limit)

            # Record usage for successful responses
            if 200 <= response.status_code < 400:
                try:
                    record_usage(user_id, feature, db=db)
                except Exception as e:
                    logger.error(f"Usage recording failed: {e}")

            return response
        except Exception as e:
            # ANY failure in subscription checking = allow the request through
            logger.warning(f"UsageTracking error (allowing request): {e}")
            return await call_next(request)
        finally:
            try:
                db.close()
            except Exception:
                pass
