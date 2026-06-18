"""Cursor-based sync for the household event log.

The client owns a local store (Dexie/IndexedDB) and is the source of truth the UI
reads. It PUSHes new/edited/deleted events (idempotent by client UUID) and PULLs
everything in its household with seq > its cursor. Events are immutable in spirit;
edits and tombstones simply bump `seq` (via trigger) so they propagate. Settings
is a last-write-wins doc guarded by a monotonically increasing version.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

import db
from auth import current_user
from stream import hub

router = APIRouter(prefix="/api/sync", tags=["sync"])

EVENT_TYPES = {
    "feed", "diaper", "sleep", "pump", "kick", "contraction",
    "weight", "symptom", "appointment", "milestone", "measurement",
    "ultrasound", "note",
}


class EventIn(BaseModel):
    id: str
    type: str
    ts: datetime
    data: dict[str, Any] = Field(default_factory=dict)
    note: Optional[str] = None
    logged_by: Optional[str] = None
    deleted_at: Optional[datetime] = None


class SettingsIn(BaseModel):
    data: dict[str, Any]
    version: int


class PushBody(BaseModel):
    events: list[EventIn] = Field(default_factory=list)
    settings: Optional[SettingsIn] = None


def _iso(v):
    return v.astimezone(timezone.utc).isoformat() if isinstance(v, datetime) else v


@router.post("/push")
def sync_push(body: PushBody, user: dict = Depends(current_user)):
    hid = user["household_id"]
    acked: list[str] = []
    with db.pool.connection() as c:
        for ev in body.events:
            if ev.type not in EVENT_TYPES:
                raise HTTPException(status_code=422, detail=f"unknown event type: {ev.type}")
            # Idempotent upsert, household-scoped so a UUID can't hijack another tenant's row.
            c.execute(
                """INSERT INTO events (id, household_id, type, ts, data, note, logged_by, created_by, deleted_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (id) DO UPDATE
                     SET data = EXCLUDED.data, note = EXCLUDED.note, deleted_at = EXCLUDED.deleted_at, ts = EXCLUDED.ts
                     WHERE events.household_id = %s""",
                (ev.id, hid, ev.type, ev.ts, Jsonb(ev.data), ev.note,
                 ev.logged_by or user["display_name"], user["id"], ev.deleted_at, hid))
            acked.append(ev.id)
        if body.settings is not None:
            c.execute(
                """INSERT INTO settings (household_id, data, version, updated_at)
                   VALUES (%s, %s, %s, now())
                   ON CONFLICT (household_id) DO UPDATE
                     SET data = EXCLUDED.data, version = EXCLUDED.version, updated_at = now()
                     WHERE EXCLUDED.version > settings.version""",
                (hid, Jsonb(body.settings.data), body.settings.version))
    hub.publish(str(hid), "changed")  # nudge other devices to pull
    return {"acked": acked}


@router.get("/pull")
def sync_pull(since: int = Query(0, ge=0), user: dict = Depends(current_user)):
    hid = user["household_id"]
    with db.pool.connection() as c:
        rows = c.execute(
            "SELECT id, seq, type, ts, data, note, logged_by, deleted_at FROM events"
            " WHERE household_id = %s AND seq > %s ORDER BY seq LIMIT 1000", (hid, since)).fetchall()
        st = c.execute("SELECT data, version FROM settings WHERE household_id = %s", (hid,)).fetchone()
    cursor = rows[-1]["seq"] if rows else since
    return {
        "events": [{
            "id": str(r["id"]), "seq": r["seq"], "type": r["type"], "ts": _iso(r["ts"]),
            "data": r["data"], "note": r["note"], "logged_by": r["logged_by"],
            "deleted_at": _iso(r["deleted_at"]),
        } for r in rows],
        "cursor": cursor,
        "settings": {"data": st["data"], "version": st["version"]} if st else {"data": {}, "version": 0},
    }
