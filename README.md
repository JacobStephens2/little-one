# Little One — pregnancy + baby tracker

A small, private, single-household tracker for pregnancy and a new baby, live at
**baby.stephens.page**. Pregnancy side: due-date countdown, week-by-week size,
kick counter, contraction timer, weight, symptoms, appointments. Baby side: feeds,
diapers, sleep, pumping, growth, milestones. Installable PWA, offline-friendly,
with a Day and a Night (3am) theme.

## Layout
- `server/` — FastAPI + Postgres backend (`app.py`), uvicorn on `127.0.0.1:3490`.
  See [server/README.md](server/README.md) for ops, auth, and the API.
- `frontend/` — **TypeScript** sources (`src/app.ts`, `src/weekdata.ts`, `src/types.ts`),
  bundled by esbuild (with a `tsc --noEmit` typecheck) to `public/app.js`.
- `public/` — static PWA served by Apache: `index.html`, the built `app.js`,
  `styles.css`, `sw.js`, `img/`. `/api/` reverse-proxies to the backend.

## Build the frontend
```
cd frontend
npm install
npm run build      # tsc typecheck + esbuild bundle → ../public/app.js
npm run watch      # rebuild on change while developing
```
`public/app.js` is the served artifact and is committed; rebuild it after editing
any `frontend/src/*.ts`. Bump the `?v=` query in `index.html`/`sw.js` when shipping
so clients pick up the new bundle.

## Run the backend locally
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
