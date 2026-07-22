import re
import secrets
import string

# Simple in-memory store for demo purposes. 
# In production, this should be in DB or Redis.
_privacy_state = {
    "pii_scrubbing_enabled": False,
    "encryption_key": "xkmb-2910-" + secrets.token_hex(4)
}

def get_privacy_settings():
    return _privacy_state

def toggle_pii_scrubbing(enabled: bool):
    _privacy_state["pii_scrubbing_enabled"] = enabled
    return _privacy_state

def rotate_encryption_key():
    # Simulate key rotation
    new_key = "xkmb-" + "".join(secrets.choice(string.digits) for _ in range(4)) + "-" + secrets.token_hex(6)
    _privacy_state["encryption_key"] = new_key
    return new_key

def scrub_text(text: str) -> str:
    """
    Redact emails and phone numbers from text if scrubbing is enabled.
    """
    if not _privacy_state["pii_scrubbing_enabled"]:
        return text

    # Email Regex
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    text = re.sub(email_pattern, "[EMAIL REDACTED]", text)

    # Phone Regex (More robust for US formats like 555-0199, (555) 123-4567)
    # Matches:
    # 555-0199 (7 digit local)
    # 555-1234 (7 digit)
    # 123-456-7890 (10 digit)
    # (123) 456-7890
    phone_pattern = r'\b(?:\+?1[-.]?)?\(?([2-9][0-8][0-9])\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})\b|\b[2-9][0-9]{2}[-. ]?[0-9]{4}\b'
    text = re.sub(phone_pattern, "[PHONE REDACTED]", text)

    return text
