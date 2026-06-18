"""Password hashing, signed session tokens, and one-time email-link tokens."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

APP_SECRET = os.environ["APP_SECRET"]
SESSION_MAX_AGE = 60 * 60 * 24 * 365  # one year
_signer = URLSafeTimedSerializer(APP_SECRET, salt="baby-session")


def hash_password(pw: str) -> str:
    iterations, salt = 200_000, os.urandom(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, iterations)
    return f"{iterations}${salt.hex()}${h.hex()}"


def verify_password(pw: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        it_s, salt_hex, hash_hex = stored.split("$")
        derived = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt_hex), int(it_s))
        return hmac.compare_digest(derived, bytes.fromhex(hash_hex))
    except ValueError:
        return False


def make_session(uid: str, hid: str) -> str:
    return _signer.dumps({"uid": str(uid), "hid": str(hid)})


def read_session(token: str) -> dict | None:
    try:
        return _signer.loads(token, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
