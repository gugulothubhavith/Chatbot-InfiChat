"""Portable SQLAlchemy column types — work on both PostgreSQL and SQLite.

Usage in model files:
    from app.models.types import UUID, JSONB, ARRAY
    # Instead of:
    # from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
"""

from app.core.compat import UUID as PortableUUID, JSONType
from sqlalchemy import JSON as SA_JSON

# Export portable UUID
UUID = PortableUUID

# JSONB: JSONB on Postgres, JSON on SQLite
JSONB = JSONType

# ARRAY: use JSON on SQLite (stored as JSON array), native ARRAY on Postgres
class ArrayType(JSONType):
    """Portable array type — native ARRAY on Postgres, JSON array on SQLite."""
    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
            from sqlalchemy import String
            return dialect.type_descriptor(PG_ARRAY(String))
        return dialect.type_descriptor(SA_JSON())

ARRAY = ArrayType

# Re-export all commonly needed types
__all__ = ["UUID", "JSONB", "ARRAY"]
