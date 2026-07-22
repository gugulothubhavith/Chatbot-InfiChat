"""
End-to-End Encryption Module for InfiChat
Uses Fernet symmetric encryption (AES-128-CBC with HMAC) for message security.
Keys are derived from the E2E_ENCRYPTION_KEY environment variable via PBKDF2.
"""

import base64
import hashlib
import logging
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import settings

logger = logging.getLogger(__name__)

# Salt for key derivation (fixed per deployment; change if re-encrypting)
_SALT = b"infichat-e2e-salt-v1"


def _derive_key(passphrase: str) -> bytes:
    """Derive a Fernet-compatible 32-byte key from a passphrase using PBKDF2."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_SALT,
        iterations=480_000,  # OWASP recommended minimum
    )
    key = base64.urlsafe_b64encode(kdf.derive(passphrase.encode()))
    return key


# Pre-derive the key at module load for performance
_fernet_key = _derive_key(settings.E2E_ENCRYPTION_KEY)
_fernet = Fernet(_fernet_key)


def encrypt_message(plaintext: str) -> str:
    """
    Encrypt a plaintext message string.
    Returns a base64-encoded ciphertext string safe for database storage.
    """
    if not plaintext:
        return plaintext
    try:
        encrypted = _fernet.encrypt(plaintext.encode("utf-8"))
        return encrypted.decode("utf-8")
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        raise ValueError("Message encryption failed") from e


def decrypt_message(ciphertext: str) -> str:
    """
    Decrypt a ciphertext string back to plaintext.
    Returns the original message.
    """
    if not ciphertext:
        return ciphertext
    try:
        decrypted = _fernet.decrypt(ciphertext.encode("utf-8"))
        return decrypted.decode("utf-8")
    except InvalidToken:
        # If the message wasn't encrypted (legacy data), return as-is
        logger.warning("Decryption failed (possibly unencrypted legacy data). Returning raw value.")
        return ciphertext
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise ValueError("Message decryption failed") from e


def is_encrypted(text: str) -> bool:
    """Check if a string appears to be Fernet-encrypted."""
    try:
        # Fernet tokens are base64-encoded and start with 'gAAAAA'
        return text.startswith("gAAAAA") and len(text) > 50
    except Exception:
        return False
