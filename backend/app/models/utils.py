from sqlalchemy import Text, TypeDecorator
import json
from cryptography.fernet import Fernet
from app.core.config import settings

class EncryptedText(TypeDecorator):
    """
    Transparently encrypts/decrypts a string column.
    Uses Fernet (AES-128 in CBC mode with HMAC-SHA256).
    """
    impl = Text
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Use E2E_ENCRYPTION_KEY if available, else fallback
        key = getattr(settings, "E2E_ENCRYPTION_KEY", None)
        if not key or len(key) < 16:
            # Fallback for safety during setup, but in prod E2E_ENCRYPTION_KEY must be set
            self.fernet = Fernet(Fernet.generate_key())
        else:
            self.fernet = Fernet(key.encode() if isinstance(key, str) else key)

    def process_bind_param(self, value, dialect):
        if value is None: return None
        return self.fernet.encrypt(value.encode()).decode()

    def process_result_value(self, value, dialect):
        if value is None: return None
        try:
            return self.fernet.decrypt(value.encode()).decode()
        except Exception:
            # Fallback for old plaintext or corrupted data
            return value

class EncryptedJSON(TypeDecorator):
    """Encrypted JSON storage."""
    impl = Text
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        key = getattr(settings, "E2E_ENCRYPTION_KEY", None)
        if not key or len(key) < 16:
            self.fernet = Fernet(Fernet.generate_key())
        else:
            self.fernet = Fernet(key.encode() if isinstance(key, str) else key)

    def process_bind_param(self, value, dialect):
        if value is None: return None
        return self.fernet.encrypt(json.dumps(value).encode()).decode()

    def process_result_value(self, value, dialect):
        if value is None: return None
        try:
            return json.loads(self.fernet.decrypt(value.encode()).decode())
        except Exception:
            return value
