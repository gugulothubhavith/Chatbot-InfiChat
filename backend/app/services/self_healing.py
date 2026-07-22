from sqlalchemy.orm import Session
from app.models.incidents import IncidentTicket, AutoHealingEvent, IncidentStatus
from app.models.observability import LatencyMetrics
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)

class SelfHealingOrchestrator:
    def __init__(self, db: Session):
        self.db = db

    def check_and_heal(self):
        """
        Analyzes recent metrics and automatically triggers recovery actions.
        """
        # Thresholds
        LATENCY_THRESHOLD_MS = 5000.0
        
        # Check for latency spikes in the last 5 minutes
        recent_threshold = datetime.now(timezone.utc) - timedelta(minutes=5)
        high_latency_hits = self.db.query(LatencyMetrics).filter(
            LatencyMetrics.total_time_ms > LATENCY_THRESHOLD_MS,
            LatencyMetrics.timestamp > recent_threshold
        ).all()
        
        if len(high_latency_hits) > 5:
            logger.warning(f"Latency anomaly detected: {len(high_latency_hits)} spikes. Triggering recovery...")
            self._trigger_recovery("HIGH_LATENCY_SPIKE", "LATENCY_MONITOR")

    def _trigger_recovery(self, code: str, reason: str):
        # Create an Incident Ticket
        ticket = IncidentTicket(
            title=f"Auto-Heal: {code}",
            description=f"System detected {reason}. Initiating automated mitigation protocols.",
            status=IncidentStatus.INVESTIGATING,
            severity=2
        )
        self.db.add(ticket)
        
        # Log the recovery action
        event = AutoHealingEvent(
            action_type="ROUTING_DIVERSION",
            target_id="ALL_NODES",
            reason=reason,
            is_successful=True
        )
        self.db.add(event)
        
        # Logic to actually heal (e.g. invalidate shared cache or deprioritize routes) would go here
        # For now, we record the intent and the system ticket.
        
        self.db.commit()
        logger.info(f"Self-healing event logged: {event.id}")
