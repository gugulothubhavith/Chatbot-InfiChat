"""Redis client with lazy connection and graceful degradation.
Connections are created on first use, not at import time, so the app
starts cleanly even when Redis is unavailable.

Uses the Null Object pattern: when Redis is down, a NullRedisClient
is returned that silently accepts all calls — no None checks needed
anywhere in the codebase.

Hostname detection: if the REDIS_URL points to a Docker-only hostname
(e.g. "redis") and that host doesn't resolve, we skip the connection
attempt entirely — no timeout delay.
"""

import logging
import os
import socket
from urllib.parse import urlparse
from app.core.config import settings

logger = logging.getLogger(__name__)

_real_client = None
_connection_failed = False


def _redis_host_reachable() -> bool:
    """Check if the Redis host from REDIS_URL is reachable before attempting connection.
    Returns False immediately for Docker-only hostnames like 'redis' if they don't resolve."""
    url = settings.REDIS_URL or "redis://redis:6379/0"
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or "localhost"
        # Quick DNS check — if this Docker-only hostname doesn't resolve,
        # skip the connection attempt
        try:
            socket.getaddrinfo(hostname, parsed.port or 6379, socket.AF_INET, socket.SOCK_STREAM)
            return True
        except socket.gaierror:
            logger.info(f"Redis host '{hostname}' does not resolve — skipping connection")
            return False
    except Exception:
        return False


class _NullRedisClient:
    """A no-op Redis client for when Redis is unavailable.
    Every method silently succeeds without doing anything,
    so callers never need None checks."""

    def ping(self):
        return False

    def get(self, *args, **kwargs):
        return None

    def set(self, *args, **kwargs):
        return True

    def setex(self, *args, **kwargs):
        return True

    def delete(self, *args, **kwargs):
        return True

    def exists(self, *args, **kwargs):
        return False

    def expire(self, *args, **kwargs):
        return True

    def rpush(self, *args, **kwargs):
        return 1

    def lrange(self, *args, **kwargs):
        return []

    def keys(self, *args, **kwargs):
        return []

    def dbsize(self, *args, **kwargs):
        return 0

    def flushdb(self, *args, **kwargs):
        return True

    def type(self, *args, **kwargs):
        return "none"

    def ttl(self, *args, **kwargs):
        return -2

    def hgetall(self, *args, **kwargs):
        return {}

    def smembers(self, *args, **kwargs):
        return set()

    def zrange(self, *args, **kwargs):
        return []

    def __getattr__(self, name):
        """Catch any other Redis method call and return a no-op."""
        return lambda *a, **kw: None


_null_client = _NullRedisClient()


def get_redis_client():
    """Get or create Redis client. Returns NullRedisClient if unavailable.
    Fast: checks DNS resolution first — skips connection entirely if host unreachable."""
    global _real_client, _connection_failed

    if _connection_failed:
        return _null_client

    if _real_client is not None:
        try:
            _real_client.ping()
            return _real_client
        except Exception:
            logger.warning("Redis ping failed, reconnecting...")
            _real_client = None

    # Fast check: skip connection if host doesn't resolve
    if not _redis_host_reachable():
        _connection_failed = True
        return _null_client

    try:
        import redis as redis_module
        c = redis_module.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            socket_keepalive=True,
            health_check_interval=30,
        )
        c.ping()
        _real_client = c
        _connection_failed = False
        logger.info("Redis connected successfully")
        return _real_client
    except Exception as e:
        _connection_failed = True
        logger.warning(f"Redis unavailable (non-fatal): {e}")
        return _null_client


# Module-level singleton — resolved once on first access, not at import time
# This avoids startup delay when Redis is a Docker container that doesn't exist yet
class _LazyRedisClient:
    """Resolves the real or null client on first attribute access.
    Caches the result so subsequent calls are instant."""
    def __init__(self):
        self._resolved = None

    def _resolve(self):
        if self._resolved is None:
            self._resolved = get_redis_client()
        return self._resolved

    def __getattr__(self, name):
        if name == '_resolved':
            raise AttributeError(name)
        client = self._resolve()
        return getattr(client, name)

redis_client = _LazyRedisClient()
