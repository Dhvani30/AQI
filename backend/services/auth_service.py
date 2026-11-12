import base64
import binascii
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

PASSWORD_ITERATIONS = 120_000
PASSWORD_SALT_BYTES = 16
PASSWORD_KEY_BYTES = 32
TOKEN_LIFETIME = timedelta(hours=24)


def hash_password(password: str) -> str:
    salt = os.urandom(PASSWORD_SALT_BYTES)
    key = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS, dklen=PASSWORD_KEY_BYTES
    )
    return base64.b64encode(salt + key).decode("ascii")


def verify_password(password: str, stored: str) -> bool:
    try:
        decoded = base64.b64decode(stored, validate=True)
    except (binascii.Error, TypeError, ValueError):
        return False

    expected_size = PASSWORD_SALT_BYTES + PASSWORD_KEY_BYTES
    if len(decoded) != expected_size:
        return False

    salt, stored_key = decoded[:PASSWORD_SALT_BYTES], decoded[PASSWORD_SALT_BYTES:]
    candidate_key = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS, dklen=PASSWORD_KEY_BYTES
    )
    return secrets.compare_digest(candidate_key, stored_key)


def _jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if secret is None or len(secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET must contain at least 32 bytes")
    return secret


def create_token(username: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "exp": now + TOKEN_LIFETIME,
        "iat": now,
    }
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, _jwt_secret(), algorithms=["HS256"])
    except (jwt.PyJWTError, RuntimeError, TypeError, ValueError):
        return None

    username = payload.get("sub")
    return username if isinstance(username, str) and username else None
