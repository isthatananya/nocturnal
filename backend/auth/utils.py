import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from core.config import settings

_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str, email: str) -> tuple[str, str]:
    """Returns (signed_jwt, jti). The jti is stored server-side to enable logout."""
    jti = secrets.token_hex(16)
    exp = datetime.now(timezone.utc) + timedelta(seconds=settings.session_ttl)
    token = jwt.encode(
        {"sub": user_id, "email": email, "jti": jti, "exp": exp},
        settings.secret_key,
        algorithm=_ALGORITHM,
    )
    return token, jti


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
    except JWTError:
        return None


def generate_secure_token() -> str:
    """Cryptographically random URL-safe token for reset/verification links."""
    return secrets.token_urlsafe(32)
