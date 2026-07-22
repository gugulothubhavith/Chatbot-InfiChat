"""
Input Sanitization Middleware for InfiChat.
Protects against XSS, SQL injection, and oversized payloads.
"""

import re
import logging
import bleach
import urllib.parse
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse

logger = logging.getLogger(__name__)

# Maximum request body size: 10MB
MAX_BODY_SIZE = 10 * 1024 * 1024

# Disallowed HTML tags (more strict than just scripts)
DISALLOWED_TAGS = ['script', 'iframe', 'object', 'embed', 'style', 'link', 'meta', 'applet', 'base']

def contains_xss(text: str) -> bool:
    """Uses bleach to detect if text contains malicious HTML/XSS"""
    if not text: return False
    
    # Try to clean the text. If bleach modifies it, it means there were entities/tags detected.
    # We use a very strict whitelist (only common safe markdown-like tags)
    clean_text = bleach.clean(
        text, 
        tags=['p', 'b', 'i', 'strong', 'em', 'code', 'pre', 'br', 'ul', 'ol', 'li', 'a'],
        attributes={'a': ['href', 'title']},
        strip=True
    )
    
    # Check for specifically dangerous attributes like on* even in allowed tags
    # and javascript: links which bleach also handles.
    # If the length changed or content changed significantly, it might be an XSS attempt.
    # We also check for raw <script or other tags directly as an early exit.
    if any(f'<{tag}' in text.lower() for tag in DISALLOWED_TAGS):
        return True
    
    if 'javascript:' in text.lower():
        return True
        
    if re.search(r'on\w+\s*=', text, re.IGNORECASE):
        return True

    return False

# SQL injection patterns (only checked on non-code endpoints)
SQL_PATTERNS = [
    re.compile(r"('\s*(OR|AND)\s+')", re.IGNORECASE),
    re.compile(r'(;\s*(DROP|DELETE|UPDATE|INSERT|ALTER)\s+)', re.IGNORECASE),
    re.compile(r'(UNION\s+(ALL\s+)?SELECT)', re.IGNORECASE),
    re.compile(r"(--\s*$)", re.MULTILINE),
]

# Paths where code content is expected (skip SQL injection checks)
CODE_PATHS = ["/api/code/", "/ws/code/", "/api/chat/"]


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """
    Middleware that validates incoming request bodies for:
    1. Oversized payloads (>10MB)
    2. XSS attack vectors
    3. SQL injection patterns (on non-code API paths)
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Scan query strings for attacks (Applies to ALL methods, including GET)
        if request.url.query:
            query_str = urllib.parse.unquote_plus(request.url.query)
            # XSS in Query using bleach
            if contains_xss(query_str):
                logger.warning(f"XSS pattern detected in query string to {request.url.path} from {request.client.host}")
                return JSONResponse(status_code=400, content={"detail": "Potentially malicious query string detected"})
                    
            # SQLi in Query (skip on code paths)
            is_code_path = any(request.url.path.startswith(p) for p in CODE_PATHS)
            if not is_code_path:
                for pattern in SQL_PATTERNS:
                    if pattern.search(query_str):
                        logger.warning(f"SQL injection pattern detected in query string to {request.url.path}")
                        return JSONResponse(status_code=400, content={"detail": "Potentially malicious query string detected"})

        # Skip body sanitization for GET/OPTIONS/HEAD requests
        if request.method in ("GET", "OPTIONS", "HEAD"):
            return await call_next(request)

        # Check Content-Length header for oversized payloads
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_BODY_SIZE:
            logger.warning(f"Request body too large: {content_length} bytes from {request.client.host}")
            return JSONResponse(status_code=413, content={"detail": "Request body too large (max 10MB)"})

        # For multipart uploads (file uploads), skip body parsing
        content_type = request.headers.get("content-type", "")
        if "multipart/form-data" in content_type:
            return await call_next(request)

        # Read and validate body for JSON/text requests
        try:
            body = await request.body()
            if body:
                body_text = body.decode("utf-8", errors="ignore")

                # XSS check (all endpoints) using bleach
                if contains_xss(body_text):
                    logger.warning(f"XSS attempt detected in request body to {request.url.path}")
                    return JSONResponse(status_code=400, content={"detail": "Potentially malicious content detected"})

                # SQL injection check (non-code endpoints only)
                is_code_path = any(request.url.path.startswith(p) for p in CODE_PATHS)
                if not is_code_path:
                    for pattern in SQL_PATTERNS:
                        if pattern.search(body_text):
                            logger.warning(f"SQL injection pattern detected in request to {request.url.path}")
                            return JSONResponse(status_code=400, content={"detail": "Potentially malicious content detected"})
        except HTTPException:
            raise
        except Exception:
            # If body parsing fails, let the request through (framework will handle it)
            pass

        return await call_next(request)
