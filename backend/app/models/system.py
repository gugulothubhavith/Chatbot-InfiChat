from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from app.database.db import Base
from datetime import datetime, timezone

class SystemUpdate(Base):
    __tablename__ = "system_updates"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String, nullable=False)
    download_url = Column(String, nullable=False)
    release_notes = Column(Text, nullable=True)
    platform = Column(String, default="all")  # all, windows, macos, linux
    status = Column(String, default="active")  # active, previous, deprecated
    is_active = Column(Boolean, default=True)
    checksum = Column(String, nullable=True)  # SHA256 hash for binary verification
    download_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
