# Little One — pregnancy + baby tracker

A small, private, single-household tracker for pregnancy and a new baby, live at
**baby.stephens.page**. Pregnancy side: due-date countdown, week-by-week size,
kick counter, contraction timer, weight, symptoms, appointments. Baby side: feeds,
diapers, sleep, pumping, growth, milestones. Installable PWA, offline-friendly,
with a Day and a Night (3am) theme.

## Layout
- `server/` — FastAPI + Postgres backend (`app.py`), uvicorn on `127.0.0.1:3490`.
  See [server/README.md](server/README.md) for ops, auth, and the API.
- `public/` — vanilla-JS PWA (no build step): `index.html`, `app.js`, `styles.css`,
  `weekdata.js`, `sw.js`, `img/`. Served static by Apache; `/api/` reverse-proxies
  to the backend.

## Run locally
```
cd server
cp .env.example .env        # then fill in DATABASE_URL, APP_SECRET, PASSWORD_HASH
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app:app --host 127.0.0.1 --port 3490
# serve ../public on :8080 with any static server and proxy /api → :3490
```
Set the household passphrase with `server/set-passphrase.sh 'a passphrase'`.

## Design
"Dawn Nursery" — warm oat paper with a sunrise glow, Fraunces + Hanken Grotesk,
clay / sage / gold accents. Data is canonical metric; the UI converts to imperial
(default) at the edges.
