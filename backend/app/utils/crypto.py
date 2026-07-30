"""Encryption for settings stored in the database.

Secrets configured through the UI (currently the OpenRouter API key) are
encrypted at rest so that a database dump alone does not leak them.

The encryption key is resolved in this order:

1. ``SECRET_KEY`` — a urlsafe-base64 32-byte Fernet key, if you want to manage
   it yourself (e.g. injected by your orchestrator).
2. A key file, ``SECRET_KEY_FILE`` (default ``<data dir>/secret.key``),
   generated with 0600 permissions on first use.

The file fallback exists so that a fresh install needs nothing in `.env` at all.
It also means the key sits next to the database: keep the data volume as
private as you would keep the key itself.
"""

import os
import stat
import logging
from pathlib import Path
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

_PREFIX = "enc:v1:"


def _key_file() -> Path:
    configured = os.getenv("SECRET_KEY_FILE")
    if configured:
        return Path(configured)
    # Default next to the persisted data so it survives container restarts.
    chroma_dir = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_data")
    return Path(chroma_dir).parent / "secret.key"


def _load_or_create_key() -> bytes:
    env_key = os.getenv("SECRET_KEY")
    if env_key:
        return env_key.strip().encode()

    path = _key_file()
    if path.exists():
        return path.read_bytes().strip()

    path.parent.mkdir(parents=True, exist_ok=True)
    key = Fernet.generate_key()
    # Write then tighten permissions; 0600 so only the app user can read it.
    path.write_bytes(key)
    try:
        path.chmod(stat.S_IRUSR | stat.S_IWUSR)
    except OSError as e:  # e.g. a filesystem that ignores chmod
        logger.warning(f"Could not restrict permissions on {path}: {e}")
    logger.info(f"Generated a new settings encryption key at {path}")
    return key


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    return Fernet(_load_or_create_key())


def encrypt(plaintext: str) -> str:
    """Encrypt a secret for storage. Returns a prefixed, self-describing token."""
    if plaintext is None:
        return None
    return _PREFIX + _fernet().encrypt(plaintext.encode()).decode()


def decrypt(stored: str) -> str:
    """Decrypt a stored secret.

    Values without the prefix are returned as-is: that covers settings written
    before encryption existed, and makes the format upgradeable.
    """
    if not stored:
        return stored
    if not stored.startswith(_PREFIX):
        return stored
    try:
        return _fernet().decrypt(stored[len(_PREFIX):].encode()).decode()
    except InvalidToken:
        logger.error(
            "Could not decrypt a stored secret — the encryption key changed or "
            "was lost. Re-enter the value in Settings."
        )
        return None


def mask(secret: str) -> str:
    """Render a secret for display without revealing it."""
    if not secret:
        return ""
    if len(secret) <= 8:
        return "•" * len(secret)
    return f"{secret[:4]}{'•' * 8}{secret[-4:]}"
