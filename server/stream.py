"""Server-Sent Events: a per-household "changed" nudge so a partner's open app
pulls fresh data within a second. SSE is a hint channel only - the actual data
still flows through the durable cursor sync. Cookie-authenticated (EventSource
can't set headers); native clients use push + foreground pull instead.

Subscribers live in-process; this assumes a single uvicorn worker (the systemd
unit runs one), which is plenty for a household-scale app.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from auth import current_user

router = APIRouter(prefix="/api", tags=["stream"])


class Hub:
    def __init__(self) -> None:
        self.subs: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self.loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self.loop = loop

    def subscribe(self, hid: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self.subs[hid].add(q)
        return q

    def unsubscribe(self, hid: str, q: asyncio.Queue) -> None:
        self.subs[hid].discard(q)

    def publish(self, hid: str, data: str) -> None:
        # Called from sync endpoints, which run in a threadpool — hop to the loop.
        if not self.loop:
            return
        for q in list(self.subs.get(hid, ())):
            self.loop.call_soon_threadsafe(q.put_nowait, data)


hub = Hub()


@router.get("/stream")
async def stream(request: Request, user: dict = Depends(current_user)):
    hid = str(user["household_id"])
    q = hub.subscribe(hid)

    async def gen():
        try:
            yield ": connected\n\n"
            while True:
                try:
                    data = await asyncio.wait_for(q.get(), timeout=25)
                    yield f"event: changed\ndata: {data}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"  # keep-alive through proxies
                if await request.is_disconnected():
                    break
        finally:
            hub.unsubscribe(hid, q)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    })
