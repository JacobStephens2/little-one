"""
baby.stephens.page — pregnancy + baby tracker backend.

A small FastAPI service backing a single household. All data is shared within
the household; access is gated by one shared passphrase that mints a signed,
long-lived bearer token. Storage is Postgres: a singleton `settings` row plus a
flexible `events` table (typed rows with a JSONB payload) so the frontend can
add new event shapes without a schema migration.

Run: uvicorn app:app --host 127.0.0.1 --port 3490
"""
from __future__ import annotations

import hashlib
import hmac
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pydantic import BaseModel, Field

# --- config -----------------------------------------------------------------

DATABASE_URL = os.environ["DATABASE_URL"]
APP_SECRET = os.environ["APP_SECRET"]
# PBKDF2-SHA256 hash of the household passphrase, formatted "iterations$salthex$hashhex".
PASSWORD_HASH = os.environ["PASSWORD_HASH"]
TOKEN_MAX_AGE = 60 * 60 * 24 * 365  # one year

signer = URLSafeTimedSerializer(APP_SECRET, salt="baby-auth")

# Valid event types. The frontend owns the semantics of each `data` payload;
# the server only validates the type tag and timestamps.
EVENT_TYPES = {
    "feed", "diaper", "sleep", "pump", "kick", "contraction",
    "weight", "symptom", "appointment", "milestone", "measurement",
    "ultrasound", "note",
}

pool: ConnectionPool


def verify_password(candidate: str) -> bool:
    try:
        iterations_s, salt_hex, hash_hex = PASSWORD_HASH.split("$")
        iterations = int(iterations_s)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
    except ValueError:
        return False
    derived = hashlib.pbkdf2_hmac("sha256", candidate.encode(), salt, iterations)
    return hmac.compare_digest(derived, expected)


# --- schema -----------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (
    id          INT PRIMARY KEY DEFAULT 1,
    data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT settings_singleton CHECK (id = 1)
);
INSERT INTO settings (id, data) VALUES (1, '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS events (
    id          BIGSERIAL PRIMARY KEY,
    type        TEXT NOT NULL,
    ts          TIMESTAMPTZ NOT NULL,
    data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    note        TEXT,
    logged_by   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_type_ts_idx ON events (type, ts DESC);
CREATE INDEX IF NOT EXISTS events_ts_idx ON events (ts DESC);
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=8, kwargs={"row_factory": dict_row})
    with pool.connection() as conn:
        conn.execute(SCHEMA)
    yield
    pool.close()


app = FastAPI(title="baby.stephens.page", lifespan=lifespan)


# --- auth -------------------------------------------------------------------

class LoginBody(BaseModel):
    password: str
    name: Optional[str] = None


def require_auth(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing token")
    token = header[7:].strip()
    try:
        signer.loads(token, max_age=TOKEN_MAX_AGE)
    except SignatureExpired:
        raise HTTPException(status_code=401, detail="token expired")
    except BadSignature:
        raise HTTPException(status_code=401, detail="invalid token")
    return token


@app.post("/api/login")
def login(body: LoginBody):
    if not verify_password(body.password):
        raise HTTPException(status_code=401, detail="wrong passphrase")
    token = signer.dumps({"household": True})
    return {"token": token}


@app.get("/api/health")
def health():
    try:
        with pool.connection() as conn:
            conn.execute("SELECT 1")
        return {"ok": True}
    except Exception:
        return JSONResponse({"ok": False}, status_code=503)


# --- settings ---------------------------------------------------------------

@app.get("/api/settings")
def get_settings(_: str = Depends(require_auth)):
    with pool.connection() as conn:
        row = conn.execute("SELECT data FROM settings WHERE id = 1").fetchone()
    return row["data"] if row else {}


@app.put("/api/settings")
def put_settings(payload: dict[str, Any], _: str = Depends(require_auth)):
    with pool.connection() as conn:
        row = conn.execute(
            "UPDATE settings SET data = %s, updated_at = now() WHERE id = 1 RETURNING data",
            (psycopg.types.json.Jsonb(payload),),
        ).fetchone()
    return row["data"]


# --- events -----------------------------------------------------------------

class EventBody(BaseModel):
    type: str
    ts: Optional[datetime] = None
    data: dict[str, Any] = Field(default_factory=dict)
    note: Optional[str] = None
    logged_by: Optional[str] = None


class EventPatch(BaseModel):
    ts: Optional[datetime] = None
    data: Optional[dict[str, Any]] = None
    note: Optional[str] = None


def _serialize(row: dict) -> dict:
    out = dict(row)
    for k in ("ts", "created_at", "updated_at"):
        if isinstance(out.get(k), datetime):
            out[k] = out[k].astimezone(timezone.utc).isoformat()
    return out


@app.get("/api/events")
def list_events(
    _: str = Depends(require_auth),
    type: Optional[str] = None,
    since: Optional[datetime] = None,
    limit: int = Query(200, le=2000),
):
    clauses, params = [], []
    if type:
        clauses.append("type = %s")
        params.append(type)
    if since:
        clauses.append("ts >= %s")
        params.append(since)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    params.append(limit)
    with pool.connection() as conn:
        rows = conn.execute(
            f"SELECT * FROM events {where} ORDER BY ts DESC LIMIT %s", params
        ).fetchall()
    return [_serialize(r) for r in rows]


@app.post("/api/events")
def create_event(body: EventBody, _: str = Depends(require_auth)):
    if body.type not in EVENT_TYPES:
        raise HTTPException(status_code=422, detail=f"unknown event type: {body.type}")
    ts = body.ts or datetime.now(timezone.utc)
    with pool.connection() as conn:
        row = conn.execute(
            """INSERT INTO events (type, ts, data, note, logged_by)
               VALUES (%s, %s, %s, %s, %s) RETURNING *""",
            (body.type, ts, psycopg.types.json.Jsonb(body.data), body.note, body.logged_by),
        ).fetchone()
    return _serialize(row)


@app.patch("/api/events/{event_id}")
def update_event(event_id: int, patch: EventPatch, _: str = Depends(require_auth)):
    sets, params = [], []
    if patch.ts is not None:
        sets.append("ts = %s")
        params.append(patch.ts)
    if patch.data is not None:
        sets.append("data = %s")
        params.append(psycopg.types.json.Jsonb(patch.data))
    if patch.note is not None:
        sets.append("note = %s")
        params.append(patch.note)
    if not sets:
        raise HTTPException(status_code=422, detail="nothing to update")
    sets.append("updated_at = now()")
    params.append(event_id)
    with pool.connection() as conn:
        row = conn.execute(
            f"UPDATE events SET {', '.join(sets)} WHERE id = %s RETURNING *", params
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="not found")
    return _serialize(row)


@app.delete("/api/events/{event_id}")
def delete_event(event_id: int, _: str = Depends(require_auth)):
    with pool.connection() as conn:
        row = conn.execute(
            "DELETE FROM events WHERE id = %s RETURNING id", (event_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="not found")
    return {"deleted": event_id}
