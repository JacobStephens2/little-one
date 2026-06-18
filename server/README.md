# baby.stephens.page — backend

FastAPI + Postgres API for the Little One tracker. Multi-tenant: data is scoped to
a **household**; users belong to one household and share its baby/pregnancy data.

## Modules
- `db.py` — connection pool + schema (households, users, email_tokens, invites,
  push_devices, events, settings, reminders_sent). Events carry a client UUID and
  a monotonic `seq` (set by trigger on insert/update) that drives cursor sync;
  deletes are tombstones. Settings is one last-write-wins doc per household.
- `security.py` — PBKDF2 password hashing, signed session tokens, one-time link tokens.
- `mailer.py` — transactional email via the Resend HTTP API (`noreply@stephens.page`).
- `auth.py` — accounts + the household model. Endpoints under `/api/auth/*` plus
  `/api/me` and `/api/household/invite`.
- `sync.py` — `POST /api/sync/push` (idempotent, household-scoped) and
  `GET /api/sync/pull?since=<seq>`.
- `stream.py` — `GET /api/stream` Server-Sent Events: a per-household "changed"
  nudge so a partner's open app pulls within a second. Cookie-authenticated.
- `push.py` — Web Push (VAPID): `/api/push/{key,subscribe,unsubscribe,test}`.
- `reminders.py` — sweeper (systemd timer) for appointment + opt-in feed reminders.

## Auth
Sessions are a signed token delivered as an **httpOnly, Secure, SameSite=Lax cookie**
(web) and also returned in the login/verify body as a bearer token (for future
native apps via Keychain/Keystore). `current_user` accepts **either** the cookie or
an `Authorization: Bearer` header. Email links (verify / reset / magic / invite) are
random, hashed at rest, single-use, and expiring.

## Operations
- API service: `sudo systemctl {status,restart} baby-tracker` (uvicorn :3490).
- Reminders: `baby-reminders.timer` (every 15 min) → `baby-reminders.service`.
- Logs: `journalctl -u baby-tracker -f`.
- Apache: static docroot `../public` + `ProxyPass /api/`; `/api/stream` has
  `flushpackets=on` + `no-gzip` so SSE isn't buffered (in the `-le-ssl` vhost).
- Secrets: `server/.env` (chmod 600) and `server/vapid_private.pem` (chmod 600,
  gitignored). See `.env.example`.

## Generate VAPID keys (one-time)
```python
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64
priv = ec.generate_private_key(ec.SECP256R1())
open("vapid_private.pem","wb").write(priv.private_bytes(
    serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
pub = priv.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
print("VAPID_PUBLIC=" + base64.urlsafe_b64encode(pub).rstrip(b"=").decode())
```
Put `VAPID_PUBLIC` in `.env`; the browser fetches it from `/api/push/key`.
