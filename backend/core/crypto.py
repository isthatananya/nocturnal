"""At-rest encryption for credit reports.

HKDF-SHA256 derives a per-user 32-byte key from the server SECRET_KEY.
AES-256-GCM encrypts the report payload with a fresh 12-byte nonce per write.
Stored format: "v1.<b64url(nonce)>.<b64url(ciphertext||tag)>".
"""

from __future__ import annotations

import base64
import hashlib
import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from core.config import settings

_VERSION = "v1"
_HKDF_SALT = b"Nocturned/report/v1"
_NONCE_LEN = 12


class CryptoError(Exception):
    """Raised when a stored ciphertext cannot be decrypted."""


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def derive_user_key(user_id: str) -> bytes:
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_HKDF_SALT,
        info=user_id.encode("utf-8"),
    )
    return hkdf.derive(settings.secret_key.encode("utf-8"))


def encrypt_payload(plaintext: bytes, user_id: str) -> str:
    key = derive_user_key(user_id)
    nonce = os.urandom(_NONCE_LEN)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, None)
    return f"{_VERSION}.{_b64encode(nonce)}.{_b64encode(ciphertext)}"


def decrypt_payload(blob: str, user_id: str) -> bytes:
    try:
        version, nonce_b64, ct_b64 = blob.split(".", 2)
    except ValueError as exc:
        raise CryptoError("malformed ciphertext blob") from exc
    if version != _VERSION:
        raise CryptoError(f"unsupported ciphertext version: {version!r}")
    key = derive_user_key(user_id)
    try:
        return AESGCM(key).decrypt(_b64decode(nonce_b64), _b64decode(ct_b64), None)
    except InvalidTag as exc:
        raise CryptoError("ciphertext authentication failed") from exc


def ciphertext_fingerprint(blob: str) -> str:
    """Stable 16-hex-char SHA-256 prefix of the ciphertext segment.

    Used as a public verification handle so the UI can show users that the
    server-stored ciphertext matches what the server claims to hold.
    """
    try:
        _, _, ct_b64 = blob.split(".", 2)
    except ValueError as exc:
        raise CryptoError("malformed ciphertext blob") from exc
    return hashlib.sha256(_b64decode(ct_b64)).hexdigest()[:16]
