"""Web Push (VAPID) for reminders. Modelled as "notify a user's devices" with a
pluggable transport so native FCM/APNs can be added later without a redesign."""
from __future__ import annotations

import json
import os

from fastapi import APIRouter, Depends
from pydantic import BaseModel

import db
from auth import current_user

router = APIRouter(prefix="/api/push", tags=["push"])

VAPID_PRIVATE_PATH = os.environ.get("VAPID_PRIVATE_PATH", "vapid_private.pem")
VAPID_PUBLIC = os.environ.get("VAPID_PUBLIC", "")
VAPID_SUB = os.environ.get("VAPID_SUB", "mailto:jacob@stephens.page")


class Subscription(BaseModel):
    endpoint: str
    keys: dict[str, str]


def send_to_user(user_id, title: str, body: str, url: str = "/") -> int:
    """Best-effort web push to all of a user's registered browsers. Returns count sent."""
    from pywebpush import WebPushException, webpush  # imported lazily so the API boots without it
    with db.pool.connection() as c:
        devices = c.execute(
            "SELECT * FROM push_devices WHERE user_id = %s AND transport = 'webpush'", (user_id,)).fetchall()
    payload = json.dumps({"title": title, "body": body, "url": url})
    sent = 0
    for d in devices:
        try:
            webpush(
                subscription_info={"endpoint": d["endpoint"], "keys": {"p256dh": d["p256dh"], "auth": d["auth"]}},
                data=payload, vapid_private_key=VAPID_PRIVATE_PATH, vapid_claims={"sub": VAPID_SUB})
            sent += 1
        except WebPushException as e:
            code = getattr(e.response, "status_code", None)
            if code in (404, 410):  # subscription gone — prune it
                with db.pool.connection() as c:
                    c.execute("DELETE FROM push_devices WHERE id = %s", (d["id"],))
        except Exception as e:  # noqa: BLE001
            print("push error", repr(e))
    return sent


@router.get("/key")
def push_key():
    return {"key": VAPID_PUBLIC}


@router.post("/subscribe")
def subscribe(sub: Subscription, user: dict = Depends(current_user)):
    with db.pool.connection() as c:
        c.execute(
            """INSERT INTO push_devices (user_id, transport, endpoint, p256dh, auth)
               VALUES (%s, 'webpush', %s, %s, %s)
               ON CONFLICT (endpoint) DO UPDATE
                 SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh,
                     auth = EXCLUDED.auth, last_seen = now()""",
            (user["id"], sub.endpoint, sub.keys.get("p256dh"), sub.keys.get("auth")))
    return {"ok": True}


@router.post("/unsubscribe")
def unsubscribe(sub: Subscription, user: dict = Depends(current_user)):
    with db.pool.connection() as c:
        c.execute("DELETE FROM push_devices WHERE endpoint = %s AND user_id = %s", (sub.endpoint, user["id"]))
    return {"ok": True}


@router.post("/test")
def push_test(user: dict = Depends(current_user)):
    n = send_to_user(user["id"], "Little One", "Reminders are working \U0001f37c", "/")
    return {"sent": n}
