"""baby.stephens.page API — multi-tenant households, cookie-or-bearer auth,
cursor sync, SSE live updates, and Web Push. See the per-module docstrings.

Run: uvicorn app:app --host 127.0.0.1 --port 3490
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import db
import auth
import sync
import stream
import push


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_pool()
    stream.hub.bind_loop(asyncio.get_running_loop())
    yield
    if db.pool:
        db.pool.close()


app = FastAPI(title="baby.stephens.page", lifespan=lifespan)

# Native (Capacitor) wrappers load from a localhost origin, so their API calls are
# cross-origin and need CORS. The web app is same-origin and unaffected.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost", "http://localhost", "capacitor://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(auth.me_router)
app.include_router(sync.router)
app.include_router(stream.router)
app.include_router(push.router)


@app.get("/api/health")
def health():
    try:
        with db.pool.connection() as c:
            c.execute("SELECT 1")
        return {"ok": True}
    except Exception:
        return JSONResponse({"ok": False}, status_code=503)
