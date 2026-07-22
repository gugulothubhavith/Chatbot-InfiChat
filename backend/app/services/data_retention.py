from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.data_governance import DataRetentionPolicy, RetentionScope
from app.models.chat import ChatMessage, ChatSession
import logging

logger = logging.getLogger(__name__)

class DataRetentionSweeper:
    def __init__(self, db: Session):
        self.db = db

    def sweep(self):
        """
        Executes data scrubbing based on active policies.
        """
        policies = self.db.query(DataRetentionPolicy).all()
        
        for policy in policies:
            cutoff = datetime.now(timezone.utc) - timedelta(days=policy.retention_days)
            
            if policy.scope == RetentionScope.ORGANIZATION:
                self._scrub_org_data(policy.target_id, cutoff)
            elif policy.scope == RetentionScope.GLOBAL:
                self._scrub_global_data(cutoff)
        
        self.db.commit()

    def _scrub_org_data(self, org_id: str, cutoff: datetime):
        """Scrubs data for a specific organization older than the cutoff"""
        logger.info(f"Scrubbing data for Org {org_id} older than {cutoff}")
        
        # Implementation depends on how models are linked to org_id
        # For now, let's assume ChatSession has organization_id (we should add it if missing)
        # For this demonstration, we'll look for sessions linked to users of that org
        from app.models.user import User
        user_ids = [u.id for u in self.db.query(User).filter(User.organization_id == org_id).all()]
        
        if user_ids:
            sessions_to_delete = self.db.query(ChatSession).filter(
                ChatSession.user_id.in_(user_ids),
                ChatSession.created_at < cutoff
            ).all()
            
            for session in sessions_to_delete:
                logger.debug(f"Deleting session {session.id}")
                self.db.delete(session)

    def _scrub_global_data(self, cutoff: datetime):
        """Global system-wide scrub"""
        logger.info(f"Global scrubbing for data older than {cutoff}")
        self.db.query(ChatSession).filter(ChatSession.created_at < cutoff).delete(synchronize_session=False)
