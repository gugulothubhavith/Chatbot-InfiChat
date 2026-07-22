"""Database Compatibility Layer — Zero-Docker portable types.

Auto-detects PostgreSQL vs SQLite and provides compatible column types
so the app works without Docker (SQLite) or with full PostgreSQL.

Usage:
    from app.core.compat import UUID, JSONType, StringList, sa_Column
    # Use these instead of sqlalchemy.dialects.postgresql.*
"""

import os
import re
from sqlalchemy import TypeDecorator, String, Text, JSON, types

# ── Detect database type (lazy callable, evaluates at call time) ─

class _LazyDBFlag:
    """Evaluates to True/False based on the resolved database URL at call time.
    Works both as a callable and in boolean context via __bool__."""

    def __init__(self, check_sqlite: bool):
        self._check_sqlite = check_sqlite  # True = check for SQLite, False = check for Postgres

    def __bool__(self) -> bool:
        return self._check()

    def __call__(self) -> bool:
        return self._check()

    def _check(self) -> bool:
        try:
            from app.core.config import settings
            url = settings.DATABASE_URL or ""
        except Exception:
            url = os.getenv("DATABASE_URL", "") or ""
        if self._check_sqlite:
            return "sqlite" in url.lower() or not url
        return "postgres" in url.lower()


IS_SQLITE = _LazyDBFlag(check_sqlite=True)
IS_POSTGRES = _LazyDBFlag(check_sqlite=False)

# ── Portable UUID (works on both Postgres and SQLite) ─────────

class PortableUUID(TypeDecorator):
    """UUID type that works on SQLite (stores as String(36)) and PostgreSQL (native UUID)."""
    impl = String
    cache_ok = True

    def __init__(self, as_uuid=True, *args, **kwargs):
        self._as_uuid = as_uuid
        # Always use String(36) for portability — SQLAlchemy will still
        # store/retrieve uuid.UUID objects on both backends
        super().__init__(36, *args, **kwargs)

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            return dialect.type_descriptor(PG_UUID(as_uuid=self._as_uuid))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        import uuid
        if isinstance(value, uuid.UUID):
            return str(value) if dialect.name != "postgresql" else value
        if isinstance(value, str):
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None or self._as_uuid is False:
            return value
        import uuid
        if isinstance(value, uuid.UUID):
            return value
        if isinstance(value, str):
            try:
                return uuid.UUID(value)
            except (ValueError, AttributeError):
                return value
        return value


# ── Portable JSON (JSONB on Postgres, JSON on SQLite) ─────────

class JSONType(TypeDecorator):
    """JSON type — JSONB on PostgreSQL, JSON on SQLite."""
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import JSONB
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        return value

    def process_result_value(self, value, dialect):
        return value


# ── Convenience exports ───────────────────────────────────────

UUID = PortableUUID
JSONColumn = JSONType

# ── Auto-configure DATABASE_URL ───────────────────────────────

def _resolve_data_dir() -> str:
    """Find the project's data/ directory. Works in both normal and venv contexts."""
    # Try CWD first (most common: running from backend/ directory)
    for base in [os.getcwd(), os.path.dirname(os.path.abspath(__file__))]:
        # Go up from compat.py: app/core/compat.py → app/core/ → app/ → backend/
        # Or use CWD if it has a 'data' subdir
        for candidate in [os.path.join(base, "data"),
                         os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(base))), "data")]:
            try:
                os.makedirs(candidate, exist_ok=True)
                test_file = os.path.join(candidate, ".write_test")
                with open(test_file, "w") as f:
                    f.write("ok")
                os.unlink(test_file)
                return candidate
            except (OSError, PermissionError, FileNotFoundError):
                continue
    # Ultimate fallback: temp directory
    import tempfile
    return tempfile.mkdtemp(prefix="infichat_data")


def get_database_url() -> str:
    """Return the best database URL for the current environment.

    Order of preference:
    1. DATABASE_URL env var if set and reachable
    2. SQLite in data/infichat.db (fallback)
    """
    url = os.getenv("DATABASE_URL", "").strip()

    # If DATABASE_URL is explicitly set, use it
    if url:
        return url

    # Default: SQLite in writable data/ directory
    data_dir = _resolve_data_dir()
    db_path = os.path.join(data_dir, "infichat.db")
    return f"sqlite:///{db_path}"


# ── Schema migration helpers (SQLite-safe) ────────────────────

SQLITE_SAFE_MIGRATIONS = {
    "users": {
        "totp_secret": "VARCHAR",
        "is_mfa_enabled": "BOOLEAN DEFAULT FALSE",
        "organization_id": "VARCHAR(36)",
    },
    "chat_messages": {
        "model": "VARCHAR",
    },
}


def migration_sqlite_safe(table: str, column: str, col_type: str) -> str:
    """Generate SQLite-compatible ALTER TABLE statement.
    SQLite doesn't support ADD COLUMN with constraints like REFERENCES.
    """
    # Strip REFERENCES and other constraints for SQLite
    safe_type = re.sub(r'\s+REFERENCES\s+\S+(?:\s*\([^)]*\))?(?:\s+ON\s+\S+(?:\s+\S+)?)*', '', col_type, flags=re.IGNORECASE)
    safe_type = re.sub(r'\s+DEFAULT\s+\S+', '', safe_type, flags=re.IGNORECASE)
    safe_type = safe_type.strip()
    return f"ALTER TABLE {table} ADD COLUMN {column} {safe_type}"
