/* Local-first store + cursor sync.
   Dexie (IndexedDB) is the source of truth the UI reads. We PUSH dirty events +
   settings to the server and PULL everything in our household with seq > cursor.
   Events are immutable-ish: edits/deletes bump the server `seq` (tombstones), so
   they propagate conflict-free. Settings is last-write-wins by version. */
import Dexie, { liveQuery, type Table } from "dexie";
import { readable, writable } from "svelte/store";
import { api, isNative } from "./api";
import type { Ev, EventType, Settings } from "./types";

interface MetaRow { key: string; value: any; }

class BabyDB extends Dexie {
  events!: Table<Ev, string>;
  meta!: Table<MetaRow, string>;
  constructor() {
    super("littleone");
    this.version(1).stores({
      events: "id, ts, type, seq, _dirty, deleted_at",
      meta: "key",
    });
  }
}
export const db = new BabyDB();

/* ---- meta helpers ---- */
async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key);
  return row ? (row.value as T) : fallback;
}
const setMeta = (key: string, value: any) => db.meta.put({ key, value });

interface SettingsBox { data: Settings; version: number; dirty: 0 | 1; }
const SETTINGS_KEY = "settings";
const CURSOR_KEY = "cursor";

/* ---- reactive stores ---- */
function observe<T>(querier: () => Promise<T> | T, initial: T) {
  const o = liveQuery(querier);
  return readable<T>(initial, (set) => {
    const sub = o.subscribe({ next: (v) => set(v as T), error: (e) => console.error(e) });
    return () => sub.unsubscribe();
  });
}

export const events$ = observe<Ev[]>(
  () => db.events.orderBy("ts").reverse().filter((e) => !e.deleted_at).toArray(), []);

export const settings$ = observe<Settings>(
  async () => (await getMeta<SettingsBox>(SETTINGS_KEY, { data: {}, version: 0, dirty: 0 })).data, {});

export const syncStatus = writable<"idle" | "syncing" | "offline">("idle");

/* ---- local writes (optimistic) ---- */
let loggedBy = "";
export function setLoggedBy(name: string) { loggedBy = name; }

export async function createEvent(type: EventType, data: Record<string, any>, opts: { ts?: Date; note?: string | null } = {}) {
  const ev: Ev = {
    id: crypto.randomUUID(), type, data,
    ts: (opts.ts || new Date()).toISOString(),
    note: opts.note || null, logged_by: loggedBy || null,
    deleted_at: null, _dirty: 1,
  };
  await db.events.put(ev);
  sync();
  return ev;
}
export async function updateEvent(id: string, patch: Partial<Ev>) {
  await db.events.update(id, { ...patch, _dirty: 1 });
  sync();
}
export async function deleteEvent(id: string) {
  await db.events.update(id, { deleted_at: new Date().toISOString(), _dirty: 1 });
  sync();
}
export async function saveSettings(patch: Partial<Settings>) {
  const box = await getMeta<SettingsBox>(SETTINGS_KEY, { data: {}, version: 0, dirty: 0 });
  box.data = { ...box.data, ...patch };
  box.version += 1;
  box.dirty = 1;
  await setMeta(SETTINGS_KEY, box);
  sync();
}
export async function getSettings(): Promise<Settings> {
  return (await getMeta<SettingsBox>(SETTINGS_KEY, { data: {}, version: 0, dirty: 0 })).data;
}

/* ---- sync engine ---- */
let syncing = false, pendingAgain = false;

async function push() {
  const dirty = await db.events.where("_dirty").equals(1).toArray();
  const box = await getMeta<SettingsBox>(SETTINGS_KEY, { data: {}, version: 0, dirty: 0 });
  if (!dirty.length && !box.dirty) return;
  const payload: any = {
    events: dirty.map((e) => ({
      id: e.id, type: e.type, ts: e.ts, data: e.data, note: e.note,
      logged_by: e.logged_by, deleted_at: e.deleted_at || null,
    })),
  };
  if (box.dirty) payload.settings = { data: box.data, version: box.version };
  const res = await api.post("/sync/push", payload);
  const acked: string[] = res.acked || [];
  await db.transaction("rw", db.events, async () => {
    for (const id of acked) await db.events.update(id, { _dirty: 0 });
  });
  if (box.dirty) { box.dirty = 0; await setMeta(SETTINGS_KEY, box); }
}

async function pull() {
  const cursor = await getMeta<number>(CURSOR_KEY, 0);
  const res = await api.get(`/sync/pull?since=${cursor}`);
  const evs: Ev[] = res.events || [];
  if (evs.length) {
    await db.transaction("rw", db.events, async () => {
      for (const e of evs) {
        const local = await db.events.get(e.id);
        // don't clobber a local edit that hasn't been pushed yet
        if (local && local._dirty) continue;
        await db.events.put({ ...e, _dirty: 0 });
      }
    });
  }
  if (res.cursor != null) await setMeta(CURSOR_KEY, res.cursor);
  // settings: server wins if its version is newer
  const box = await getMeta<SettingsBox>(SETTINGS_KEY, { data: {}, version: 0, dirty: 0 });
  if (res.settings && res.settings.version > box.version) {
    await setMeta(SETTINGS_KEY, { data: res.settings.data || {}, version: res.settings.version, dirty: box.dirty });
  }
}

export async function sync() {
  if (syncing) { pendingAgain = true; return; }
  syncing = true;
  syncStatus.set("syncing");
  try {
    await push();
    await pull();
    syncStatus.set("idle");
  } catch (e: any) {
    syncStatus.set(navigator.onLine ? "idle" : "offline");
  } finally {
    syncing = false;
    if (pendingAgain) { pendingAgain = false; sync(); }
  }
}

/* ---- live updates over SSE ---- */
let es: EventSource | null = null;
export function startStream() {
  if (es) return;
  // SSE can't carry a bearer token and is cross-origin in native wrappers — skip it
  // there (foreground pull + visibilitychange sync cover refresh).
  if (isNative()) return;
  es = new EventSource("/api/stream", { withCredentials: true });
  es.addEventListener("changed", () => pull());
  es.onerror = () => { /* EventSource auto-reconnects */ };
}
export function stopStream() { if (es) { es.close(); es = null; } }

/* ---- reset on logout ---- */
export async function wipeLocal() {
  stopStream();
  await db.delete();
  location.reload();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => sync());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
}
