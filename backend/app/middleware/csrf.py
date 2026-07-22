"""CSRF Protection Middleware — validates Origin/Referer headers on state-changing requests.

Applied to all POST/PUT/PATCH/DELETE requests to prevent Cross-Site Request Forgery.
Skips WebSocket and auth endpoints.
"""

import logging
import re
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.core.config import settings

logger = logging.getLogger(__name__)

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
SKIP_PATHS = {"/auth/", "/docs", "/openapi", "/health", "/static", "/ws"}


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """Validates Origin and Referer headers on mutating requests."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        # Parse allowed origins from settings
        self._allowed_origins = set()
        for origin in settings.cors_origins:
            self._allowed_origins.add(origin.rstrip("/"))
            # Also accept bare host:port variants
            if "://" in origin:
                parts = origin.split("://")
                self._allowed_origins.add(parts[1].rstrip("/"))

    async def dispatch(self, request: Request, call_next):
        # Only check state-changing methods
        if request.method in SAFE_METHODS:
            return await call_next(request)

        # Skip auth/health/docs paths
        path = request.url.path
        if any(path.startswith(skip) for skip in SKIP_PATHS):
            return await call_next(request)

        # Validate Origin or Referer header
        origin = request.headers.get("Origin", "")
        referer = request.headers.get("Referer", "")

        # If both are empty, allow (likely a CLI tool or internal service)
        if not origin and not referer:
            return await call_next(request)

        # Extract the host from either header
        source = origin if origin else referer
        source = source.rstrip("/")

        # Check against allowed origins
        if source in self._allowed_origins:
            return await call_next(request)

        # For development, also check if it matches the request host
        try:
            request_host = str(request.url.hostname)
            if request_host and (request_host in source or f"localhost:{request.url.port}" in source):
                return await call_next(request)
        except Exception:
            pass

        # If in development mode, be more permissive
        if settings.is_production:
            logger.warning(f"CSRF blocked: method={request.method} path={path} origin={origin}")
            return Response(
                content='{"detail":"Cross-site request forbidden"}',
                status_code=403,
                media_type="application/json",
            )

        # Development mode — log but allow
        logger.info(f"CSRF check passed (dev mode): origin={origin} path={path}")
        return await call_next(request)
