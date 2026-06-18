# baby.stephens.page — pregnancy + baby tracker

A small private tracker for one household: the pregnancy side (due-date countdown,
week-by-week size, kick counter, contraction timer, weight, symptoms, appointments)
and the baby side (feeds, diapers, sleep, pumping, growth, milestones). Installable
PWA, offline-friendly, with a Day and a Night (3am) theme.

## Stack
- **Backend:** FastAPI (`app.py`) + Postgres, uvicorn on `127.0.0.1:3490`.
- **Frontend:** vanilla-JS PWA in `../public/` (no build step), served static by Apache.
- **Auth:** one shared household passphrase → a signed, year-long bearer token.
- **DB:** Postgres `baby_tracker` (role `baby_tracker_app`). A singleton `settings`
  row plus a flexible `events` table (`type` + JSONB `data`).

## Operations
- Service: `sudo systemctl {status,restart} baby-tracker` (unit `baby-tracker.service`).
- Logs: `journalctl -u baby-tracker -f`.
- Apache vhosts: `/etc/apache2/sites-available/baby.stephens.page{,-le-ssl}.conf`
  (static docroot `../public` + `ProxyPass /api/ → 127.0.0.1:3490`).
- Secrets: `server/.env` (chmod 600) — `DATABASE_URL`, `APP_SECRET`, `PASSWORD_HASH`.
- venv: `/home/jacob/venvs/baby-tracker`.

## Change the passphrase
```
server/set-passphrase.sh 'a new passphrase'
```
Rewrites `PASSWORD_HASH` (PBKDF2-SHA256) in `.env` and restarts the service.
Changing `APP_SECRET` instead would invalidate everyone's existing token.

## API
`POST /api/login {password}` → `{token}`; all other routes need `Authorization: Bearer`.
`GET/PUT /api/settings`; `GET/POST/PATCH/DELETE /api/events`. `GET /api/health` is open
(used for monitoring).
