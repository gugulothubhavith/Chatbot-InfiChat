import re
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.security import AIFirewallPolicy
import logging

logger = logging.getLogger(__name__)

class AIFirewall:
    def __init__(self, db: Session, org_id: str):
        self.db = db
        self.org_id = org_id
        self.policy = self.db.query(AIFirewallPolicy).filter(AIFirewallPolicy.org_id == org_id).first()

    def scan_content(self, content: str) -> Tuple[bool, str, float]:
        """
        Scans content for prompt injection, sensitive data, and blacklisted keywords.
        Returns: (is_blocked, reason, risk_score)
        """
        if not self.policy:
            return False, "", 0.0

        risk_score = 0.0
        
        # 1. Keyword Scanning (Blacklist)
        for keyword in self.policy.block_topics_keywords:
            if re.search(rf"\b{re.escape(keyword)}\b", content, re.IGNORECASE):
                return True, f"Blocked keyword detected: {keyword}", 1.0

        # 2. Basic Prompt Injection Patterns
        injection_patterns = [
            r"ignore all previous instructions",
            r"system prompt:",
            r"you are now a",
            r"bypass safety",
            r"reveal your hidden"
        ]
        for pattern in injection_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                risk_score += 0.4
        
        # 3. PII Detection (Basic Emails/SSN patterns)
        if self.policy.pii_redaction_enabled:
            email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
            if re.search(email_pattern, content):
                risk_score += 0.3
        
        # Block if risk exceeds threshold
        if risk_score >= self.policy.risk_threshold:
            return True, "Security policy violation: High risk score", risk_score

        return False, "", risk_score

    def redact_pii(self, content: str) -> str:
        """Redacts sensitive information if PII enabled"""
        if not self.policy or not self.policy.pii_redaction_enabled:
            return content
            
        # Redact emails
        return re.sub(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "[REDACTED_PII]", content)
