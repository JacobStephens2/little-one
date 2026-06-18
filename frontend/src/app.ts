/* baby.stephens.page — pregnancy + baby tracker frontend (TypeScript).
   Single-page app, offline-friendly: reads from a localStorage cache and queues
   new log entries when the network is down, flushing on reconnect. */
import { WEEK_DATA } from "./weekdata";
import type { Ev, Settings, EventType, AppState, AgeParts, ViewName } from "./types";

/* ---------------------------------------------------------------- icons --- */
const I: Record<string, string> = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/></svg>',
  tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 3.9 4.2.5-3.1 2.9.8 4.2L12 12.9 8.3 14.4l.8-4.2L6 7.4l4.2-.5z"/><path d="M5 19h14"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  feed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6l-1 3H10z"/><path d="M8 5h8v3a4 4 0 0 1-1 2.6V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-9.4A4 4 0 0 1 8 8z"/><path d="M9 13h6M9 16h6"/></svg>',
  diaper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18v4a9 9 0 0 1-18 0z"/><path d="M3 8c4 1.5 14 1.5 18 0"/></svg>',
  sleep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  pump: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8v-6H8z"/><path d="M9 15V9a3 3 0 0 1 6 0v6"/><path d="M12 6V3"/></svg>',
  kick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4c4 0 7 3 7 7 0 2 1 3 3 3h2"/><path d="M16 12l2 2-2 2"/><circle cx="6" cy="4" r="1"/></svg>',
  contraction: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h3l2-6 4 13 3-9 2 5 2-3h4"/></svg>',
  weight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14l2 13H3z"/><circle cx="12" cy="5" r="2"/></svg>',
  symptom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 6.6a5 5 0 0 0-8.8-2 5 5 0 0 0-8.8 2c-1 3 1.4 6 8.8 12 7.4-6 9.8-9 8.8-12z"/></svg>',
  appointment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>',
  milestone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.5 5.3 5.5.8-4 4 1 5.6L12 21l-5-2.3 1-5.6-4-4 5.5-.8z"/></svg>',
  measurement: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17 17 3l4 4L7 21z"/><path d="M7 13l2 2M11 9l2 2M15 5l2 2"/></svg>',
  ultrasound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M5 12h2l1.6-3.5 2 6.5 1.5-4 1 2H19"/><path d="M9 21h6M12 17v4"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M9 12h6M9 16h6"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21C5.5 15.5 3 12.5 3 9.2 3 6.4 5.2 4.2 8 4.2c1.6 0 3.1.8 4 2 .9-1.2 2.4-2 4-2 2.8 0 5 2.2 5 5 0 3.3-2.5 6.3-9 11.8z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
};

interface MetaEntry { label: string; tint: string; icon: string; }
const META: Record<EventType, MetaEntry> = {
  feed:        { label: "Feed",        tint: "t-clay", icon: I.feed },
  diaper:      { label: "Diaper",      tint: "t-gold", icon: I.diaper },
  sleep:       { label: "Sleep",       tint: "t-plum", icon: I.sleep },
  pump:        { label: "Pump",        tint: "t-sky",  icon: I.pump },
  kick:        { label: "Kicks",       tint: "t-sage", icon: I.kick },
  contraction: { label: "Contraction", tint: "t-rose", icon: I.contraction },
  weight:      { label: "Weight",      tint: "t-sage", icon: I.weight },
  symptom:     { label: "Symptom",     tint: "t-rose", icon: I.symptom },
  appointment: { label: "Appointment", tint: "t-sky",  icon: I.appointment },
  milestone:   { label: "Milestone",   tint: "t-gold", icon: I.milestone },
  measurement: { label: "Measurement", tint: "t-sage", icon: I.measurement },
  ultrasound:  { label: "Ultrasound",  tint: "t-sky",  icon: I.ultrasound },
  note:        { label: "Note",        tint: "t-clay", icon: I.note },
};

/* --------------------------------------------------------------- state ---- */
const LS = {
  token: "baby.token", me: "baby.me", theme: "baby.theme",
  events: "baby.events", settings: "baby.settings", queue: "baby.queue",
};

function readJSON<T>(k: string, fb: T): T {
  try { return (JSON.parse(localStorage.getItem(k) || "null") as T) ?? fb; } catch { return fb; }
}

const state: AppState = {
  token: localStorage.getItem(LS.token) || null,
  me: localStorage.getItem(LS.me) || "",
  view: "home",
  filter: "all",
  settings: readJSON<Settings>(LS.settings, {}),
  events: readJSON<Ev[]>(LS.events, []),
  queue: readJSON<AppState["queue"]>(LS.queue, []),
  online: navigator.onLine,
};

function save(): void {
  localStorage.setItem(LS.events, JSON.stringify(state.events));
  localStorage.setItem(LS.settings, JSON.stringify(state.settings));
  localStorage.setItem(LS.queue, JSON.stringify(state.queue));
}

/* ------------------------------------------------------------- network ---- */
async function api(method: string, path: string, body?: any): Promise<any> {
  const res = await fetch("/api" + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(state.token ? { authorization: "Bearer " + state.token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { logout(); throw new Error("unauthorized"); }
  if (!res.ok) throw new Error("http " + res.status);
  return res.status === 204 ? null : res.json();
}

let tmpSeq = -1;
function logEvent(type: EventType, data: Record<string, any>, opts: { ts?: Date; note?: string | null } = {}): Ev {
  const ev: Ev = {
    id: "tmp" + (tmpSeq--),
    type, data,
    ts: (opts.ts || new Date()).toISOString(),
    note: opts.note || null,
    logged_by: state.me || null,
    _pending: true,
  };
  state.events.unshift(ev);
  state.queue.push({ tmpId: ev.id as string, payload: { type, data, ts: ev.ts, note: ev.note, logged_by: ev.logged_by } });
  save();
  flush();
  return ev;
}

async function flush(): Promise<void> {
  if (!state.online || !state.token) return;
  while (state.queue.length) {
    const job = state.queue[0];
    try {
      const real: Ev = await api("POST", "/events", job.payload);
      const i = state.events.findIndex((e) => e.id === job.tmpId);
      if (i >= 0) state.events[i] = real;
      state.queue.shift();
      save();
    } catch (e: any) {
      if (String(e.message).includes("unauthorized")) return;
      break; // network problem — stop, retry later
    }
  }
  render();
}

async function patchEvent(id: number | string, patch: Partial<Ev>): Promise<void> {
  if (String(id).startsWith("tmp")) { toast("Still saving — try again in a moment"); return; }
  if (!state.online) { toast("Reconnect to edit"); return; }
  const real: Ev = await api("PATCH", "/events/" + id, patch);
  const i = state.events.findIndex((e) => e.id === id);
  if (i >= 0) state.events[i] = real;
  save(); render();
}

async function deleteEvent(id: number | string): Promise<void> {
  const i = state.events.findIndex((e) => e.id === id);
  if (String(id).startsWith("tmp")) {
    state.queue = state.queue.filter((j) => j.tmpId !== id);
    if (i >= 0) state.events.splice(i, 1);
    save(); render(); return;
  }
  if (!state.online) { toast("Reconnect to delete"); return; }
  await api("DELETE", "/events/" + id);
  if (i >= 0) state.events.splice(i, 1);
  save(); render();
}

async function saveSettings(patch: Partial<Settings>): Promise<void> {
  state.settings = { ...state.settings, ...patch };
  save();
  try { state.settings = await api("PUT", "/settings", state.settings); save(); }
  catch { /* will reconcile on next sync */ }
}

async function syncAll(): Promise<void> {
  if (!state.token) return;
  await flush();
  try {
    const [settings, events] = await Promise.all([api("GET", "/settings"), api("GET", "/events?limit=2000")]);
    state.settings = settings || {};
    const pending = state.events.filter((e) => e._pending);
    state.events = [...pending, ...events];
    save(); render();
  } catch { /* offline — keep cache */ }
}

/* --------------------------------------------------------------- utils ---- */
function $<T extends Element = HTMLElement>(sel: string, el: ParentNode = document): T {
  return el.querySelector(sel) as T;
}
const ENT: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: any): string => String(s ?? "").replace(/[&<>"']/g, (c) => ENT[c]);
const DAY = 86400000;
type DateLike = string | number | Date;

function units() {
  const imperial = (state.settings.units || "imperial") === "imperial";
  return {
    imperial,
    vol: { u: imperial ? "oz" : "ml", toC: (v: number) => imperial ? v * 29.5735 : v, fromC: (ml: number) => imperial ? ml / 29.5735 : ml },
    mass: { u: imperial ? "lb" : "kg", toC: (v: number) => imperial ? v / 2.20462 : v, fromC: (kg: number) => imperial ? kg * 2.20462 : kg },
    len: { u: imperial ? "in" : "cm", toC: (v: number) => imperial ? v * 2.54 : v, fromC: (cm: number) => imperial ? cm / 2.54 : cm },
  };
}
const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();

function fmtClock(d: DateLike): string {
  return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function fmtDur(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s ? s + "s" : ""}`.trim();
  return `${s}s`;
}
function timeAgo(d: DateLike): string {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60000) return "just now";
  const m = Math.floor(ms / 60000);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return Math.floor(h / 24) + "d ago";
}
function dayKey(d: DateLike): number { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
function dayLabel(ts: DateLike): string {
  const k = dayKey(ts), today = dayKey(Date.now());
  if (k === today) return "Today";
  if (k === today - DAY) return "Yesterday";
  return new Date(ts).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}
const cap = (s: string): string => s ? s[0].toUpperCase() + s.slice(1) : s;

/* phase + pregnancy math ----------------------------------------------------
   Two independent anchors: LMP drives gestational age, the conception date
   drives embryonic age. Either can be entered alone; the missing one is
   estimated with the usual ~14-day offset. The due date derives from the LMP. */
type Phase = "baby" | "pregnancy" | "setup";
function phase(): Phase {
  const s = state.settings;
  if (s.birth_date && new Date(s.birth_date) <= new Date()) return "baby";
  if (s.lmp_date || s.conception_date || s.due_date) return "pregnancy";
  return "setup";
}

function dateMs(x?: string | null): number | null { return x ? new Date(x + "T00:00:00").getTime() : null; }

function pregAnchors(): { lmp: number | null; conc: number | null; due: number | null } {
  const s = state.settings;
  let lmp = dateMs(s.lmp_date);
  let conc = dateMs(s.conception_date);
  if (lmp == null && conc == null && s.due_date) lmp = (dateMs(s.due_date) as number) - 280 * DAY;
  if (lmp != null && conc == null) conc = lmp + 14 * DAY;
  if (conc != null && lmp == null) lmp = conc - 14 * DAY;
  const due = lmp != null ? lmp + 280 * DAY : null;
  return { lmp, conc, due };
}
function ageParts(anchorMs: number): AgeParts {
  const days = Math.floor((Date.now() - anchorMs) / DAY);
  return { days, weeks: Math.max(0, Math.floor(days / 7)), rem: ((days % 7) + 7) % 7 };
}
function pregInfo() {
  const a = pregAnchors();
  const ga = a.lmp != null ? ageParts(a.lmp) : null;
  const emb = a.conc != null ? ageParts(a.conc) : null;
  const daysToDue = a.due != null ? Math.ceil((a.due - Date.now()) / DAY) : null;
  const pct = ga ? Math.min(1, Math.max(0, ga.days / 280)) : 0;
  const tri = ga && ga.weeks >= 28 ? "Third trimester" : ga && ga.weeks >= 14 ? "Second trimester" : "First trimester";
  const pref: "embryonic" | "gestational" = state.settings.age_pref || "embryonic";
  return { ...a, ga, emb, daysToDue, pct, tri, pref };
}
function babyAge() {
  const b = new Date((state.settings.birth_date as string) + "T00:00:00");
  const days = Math.floor((Date.now() - b.getTime()) / DAY);
  return { days, weeks: Math.floor(days / 7), remDays: days % 7, months: Math.floor(days / 30.44) };
}

/* event summary lines */
const DIAPER_LABEL: Record<string, string> = { wet: "Wet", dirty: "Dirty", both: "Wet + Dirty" };
function summary(e: Ev): string {
  const U = units(), d = e.data || {};
  switch (e.type) {
    case "feed":
      if (d.method === "bottle") return `Bottle · ${r1(U.vol.fromC(d.amount_ml || 0))} ${U.vol.u}${d.kind ? " · " + d.kind : ""}`;
      return `Breast · ${cap(d.side || "")}${d.minutes ? " · " + d.minutes + "m" : ""}`;
    case "diaper": return DIAPER_LABEL[d.kind] || "Diaper";
    case "sleep":
      if (!d.end) return "Sleeping now…";
      return "Slept " + fmtDur((+new Date(d.end) - +new Date(e.ts)) / 1000);
    case "pump": return `Pumped ${r1(U.vol.fromC(d.amount_ml || 0))} ${U.vol.u}${d.side ? " · " + cap(d.side) : ""}`;
    case "kick": return `${d.count} kicks in ${fmtDur(d.duration_sec || 0)}`;
    case "contraction": return `${fmtDur(d.duration_sec || 0)} long${d.since_last_sec ? " · " + fmtDur(d.since_last_sec) + " apart" : ""}`;
    case "weight": return `${r1(U.mass.fromC(d.kg || 0))} ${U.mass.u}`;
    case "symptom": return d.tag + (d.severity ? " · " + d.severity : "");
    case "appointment": return d.title + (d.when ? " · " + new Date(d.when).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
    case "milestone": return d.title || "Milestone";
    case "measurement": {
      const parts: string[] = [];
      if (d.weight_kg) parts.push(`${r1(U.mass.fromC(d.weight_kg))} ${U.mass.u}`);
      if (d.height_cm) parts.push(`${r1(U.len.fromC(d.height_cm))} ${U.len.u}`);
      if (d.head_cm) parts.push(`head ${r1(U.len.fromC(d.head_cm))} ${U.len.u}`);
      return parts.join(" · ") || "Measurement";
    }
    case "ultrasound": {
      const parts: string[] = [];
      if (d.crl_mm != null) parts.push(`CRL ${r1(d.crl_mm)} mm`);
      if (d.fhr_bpm != null) parts.push(`♥ ${d.fhr_bpm} bpm`);
      if (d.ga_weeks != null) parts.push(`${d.ga_weeks}w${d.ga_days ? ` ${d.ga_days}d` : ""} by scan`);
      return parts.join(" · ") || "Ultrasound";
    }
    case "note": return e.note || "Note";
    default: return (META as Record<string, MetaEntry>)[e.type]?.label || String(e.type);
  }
}

/* ---------------------------------------------------------------- views --- */
function render(): void {
  document.body.classList.toggle("is-offline", !state.online && !!state.token);
  if (!state.token) { renderLogin(); return; }
  $("#root").innerHTML = `
    ${topbar()}
    <main id="view">${viewBody()}</main>
    ${fab()}
    ${nav()}
  `;
  drawDeferred();
}

function topbar(): string {
  const dark = document.documentElement.dataset.theme === "night";
  return `<header class="topbar">
    <div class="brand">
      <div class="mark">${I.heart}</div>
      <div><h1>${esc(state.settings.baby_name || "Little One")}</h1><small>${phaseTag()}</small></div>
    </div>
    <button class="icon-btn" data-action="theme-toggle" aria-label="Toggle night mode">${dark ? I.sun : I.moon}</button>
  </header>`;
}
function phaseTag(): string {
  const p = phase();
  if (p === "pregnancy") {
    const g = pregInfo();
    const a = g.pref === "embryonic" ? (g.emb || g.ga) : (g.ga || g.emb);
    return a ? `${a.weeks}w ${a.rem}d` : "Expecting";
  }
  if (p === "baby") { const a = babyAge(); return a.days < 14 ? `${a.days} days old` : a.months < 1 ? `${a.weeks} weeks old` : `${a.months} months old`; }
  return "Welcome";
}

function viewBody(): string {
  switch (state.view) {
    case "home": return phase() === "baby" ? homeBaby() : phase() === "pregnancy" ? homePreg() : homeSetup();
    case "timeline": return timelineView();
    case "tools": return toolsView();
    case "settings": return settingsView();
    default: return "";
  }
}

/* ---- setup (no dates yet) ---- */
function homeSetup(): string {
  return `<div class="stack">
    <section class="card reveal hero">
      <div class="eyebrow">Welcome</div>
      <h2>Let's get started</h2>
      <p class="due">Add the dates of your pregnancy, or your baby's birthday, and we'll tailor everything from here.</p>
      <div class="btn-row"><button class="btn primary" data-action="open-settings">Set it up</button></div>
    </section>
    <p class="empty"><span class="e-emoji">🍼</span><br><span class="tiny">A private little home for every kick, feed, and milestone.</span></p>
  </div>`;
}

/* ---- pregnancy home ---- */
function homePreg(): string {
  const g = pregInfo();
  const primary = (g.pref === "embryonic" ? (g.emb || g.ga) : (g.ga || g.emb)) as AgeParts;
  const secondary = g.pref === "embryonic" ? g.ga : g.emb;
  const primaryLabel = g.pref === "embryonic" ? "embryonic age" : "gestational age";
  const secondaryLabel = g.pref === "embryonic" ? "Gestational" : "Embryonic";
  const wk = g.ga ? Math.min(40, Math.max(4, g.ga.weeks)) : 4;
  const w = WEEK_DATA[wk] || WEEK_DATA[40];
  const C = 2 * Math.PI * 92;
  const dueStr = g.due != null ? new Date(g.due).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : "—";
  const lastUS = state.events.find((e) => e.type === "ultrasound");
  const upcoming = state.events.filter((e) => e.type === "appointment" && e.data.when && new Date(e.data.when) > new Date())
    .sort((a, b) => +new Date(a.data.when) - +new Date(b.data.when)).slice(0, 2);
  return `<div class="stack">
    <section class="card reveal hero">
      <div class="eyebrow">${g.tri}</div>
      <div class="ring-wrap">
        <svg class="ring" viewBox="0 0 200 200">
          <circle class="ring-bg" cx="100" cy="100" r="92"/>
          <circle class="ring-fg" cx="100" cy="100" r="92" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - g.pct)}"/>
        </svg>
        <div class="ring-label"><span class="big">${primary.weeks}<span style="font-size:1.3rem">w</span></span><span class="sub">${primary.rem}d · ${primaryLabel}</span></div>
      </div>
      ${g.daysToDue != null ? `<span class="trimester">${g.daysToDue >= 0 ? g.daysToDue + " days to go" : Math.abs(g.daysToDue) + " days over"}</span>` : ""}
      <h2>Due ${dueStr}</h2>
      ${secondary ? `<div class="due">${secondaryLabel} age · ${secondary.weeks}w ${secondary.rem}d</div>` : ""}
    </section>

    <section class="card reveal size-card">
      <div class="fruit">${w.emoji}</div>
      <div class="meta">
        <div class="eyebrow">Week ${wk} gestational · size of a</div>
        <div class="name">${w.fruit}</div>
        <div class="dims">${w.size}</div>
        <div class="blurb">${w.note}</div>
      </div>
    </section>

    ${lastUS ? `<section class="card reveal" style="display:flex;gap:16px;align-items:center">
      <div class="ti t-sky" style="width:48px;height:48px;border-radius:14px;display:grid;place-items:center;flex:none">${I.ultrasound}</div>
      <div style="flex:1"><div class="eyebrow">Latest ultrasound</div><div class="display" style="font-size:1.25rem">${esc(summary(lastUS))}</div><div class="tiny">${new Date(lastUS.ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</div></div>
    </section>` : ""}

    <div class="sec-head"><h3>Quick log</h3></div>
    ${quickGrid([
      ["kick", "Kick counter", "Count movements"],
      ["contraction", "Contractions", "Time them"],
      ["ultrasound", "Ultrasound", "CRL & heartbeat"],
      ["weight", "My weight", "Track the curve"],
      ["symptom", "Symptom", "How you feel"],
      ["appointment", "Appointment", "Don't forget"],
    ])}

    ${upcoming.length ? `<div class="sec-head"><h3>Upcoming</h3></div>
      <div class="stack">${upcoming.map(apptRow).join("")}</div>` : ""}

    ${recentSection()}
  </div>`;
}

function apptRow(e: Ev): string {
  return `<div class="tl-item">
    <div class="ti t-sky" style="display:grid;place-items:center">${I.appointment}</div>
    <div class="tb"><div class="tt">${esc(e.data.title)}</div><div class="ts">${esc(e.data.location || "")}</div></div>
    <div class="tr"><div class="time">${new Date(e.data.when).toLocaleDateString([], { month: "short", day: "numeric" })}</div><div class="ago">${fmtClock(e.data.when)}</div></div>
  </div>`;
}

/* ---- baby home ---- */
function homeBaby(): string {
  const a = babyAge();
  const last = (t: EventType) => state.events.find((e) => e.type === t);
  const lf = last("feed"), ls = state.events.find((e) => e.type === "sleep"), ld = last("diaper");
  const ongoing = state.events.find((e) => e.type === "sleep" && !e.data.end);
  const today = state.events.filter((e) => dayKey(e.ts) === dayKey(Date.now()));
  const U = units();
  const feeds = today.filter((e) => e.type === "feed");
  const feedVol = feeds.reduce((s, e) => s + (e.data.amount_ml || 0), 0);
  const diapers = today.filter((e) => e.type === "diaper");
  const sleepSec = today.filter((e) => e.type === "sleep" && e.data.end).reduce((s, e) => s + (+new Date(e.data.end) - +new Date(e.ts)) / 1000, 0);

  return `<div class="stack">
    ${ongoing ? `<section class="card reveal" style="display:flex;align-items:center;gap:16px">
      <div class="ti t-plum" style="width:48px;height:48px;border-radius:14px;display:grid;place-items:center">${I.sleep}</div>
      <div style="flex:1"><div class="eyebrow pulse">Sleeping now</div><div class="display" style="font-size:1.8rem">${fmtDur((Date.now() - +new Date(ongoing.ts)) / 1000)}</div></div>
      <button class="btn primary" style="width:auto;padding:12px 18px" data-action="wake" data-id="${ongoing.id}">Wake</button>
    </section>` : ""}

    <section class="card reveal">
      <div class="eyebrow">Since last</div>
      <div class="glance" style="margin-top:12px">
        <div class="g"><div class="gl">Fed</div><div class="gv">${lf ? timeAgo(lf.ts).replace(" ago", "") : "—"}</div><div class="gu">${lf ? summary(lf) : "no feeds yet"}</div></div>
        <div class="g"><div class="gl">Slept</div><div class="gv">${ls ? timeAgo(ls.data.end || ls.ts).replace(" ago", "") : "—"}</div><div class="gu">${ongoing ? "sleeping" : ls ? summary(ls) : "—"}</div></div>
        <div class="g"><div class="gl">Changed</div><div class="gv">${ld ? timeAgo(ld.ts).replace(" ago", "") : "—"}</div><div class="gu">${ld ? summary(ld) : "—"}</div></div>
      </div>
    </section>

    <section class="card reveal">
      <div class="row-between"><div class="eyebrow">Today so far</div><div class="tiny">${a.months < 1 ? a.weeks + " weeks old" : a.months + " months old"}</div></div>
      <div class="glance" style="margin-top:12px">
        <div class="g"><div class="gl">Feeds</div><div class="gv">${feeds.length}</div><div class="gu">${feedVol ? r1(U.vol.fromC(feedVol)) + " " + U.vol.u : ""}</div></div>
        <div class="g"><div class="gl">Diapers</div><div class="gv">${diapers.length}</div><div class="gu">${diapers.filter((e) => e.data.kind !== "wet").length} dirty</div></div>
        <div class="g"><div class="gl">Sleep</div><div class="gv">${sleepSec ? fmtDur(sleepSec).split(" ")[0] : "0h"}</div><div class="gu">${sleepSec ? "logged" : "none yet"}</div></div>
      </div>
    </section>

    <div class="sec-head"><h3>Quick log</h3></div>
    ${quickGrid([
      ["feed", "Feed", "Breast or bottle"],
      ["diaper", "Diaper", "Wet or dirty"],
      ["sleep", "Sleep", ongoing ? "in progress" : "Start or log"],
      ["pump", "Pump", "Track output"],
      ["measurement", "Growth", "Weight & length"],
      ["milestone", "Milestone", "First smile!"],
    ])}

    ${recentSection()}
  </div>`;
}

function quickGrid(items: [EventType, string, string][]): string {
  return `<div class="quick-grid">${items.map(([type, t, s]) => {
    const m = META[type];
    return `<button class="quick ${m.tint}" data-action="log:${type}">
      <span class="qi">${m.icon}</span>
      <span><span class="qt">${t}</span><br><span class="qs">${s}</span></span>
    </button>`;
  }).join("")}</div>`;
}

function recentSection(): string {
  const recent = state.events.slice(0, 5);
  return `<div class="sec-head"><h3>Recent</h3>${state.events.length > 5 ? `<button class="link" data-action="nav:timeline">See all</button>` : ""}</div>
    ${recent.length ? recent.map(tlItem).join("") : emptyState("🌙", "Nothing logged yet")}`;
}

function tlItem(e: Ev): string {
  const m = META[e.type] || META.note;
  return `<div class="tl-item ${e._pending ? "pending" : ""}" data-action="event:${e.id}">
    <div class="ti ${m.tint}" style="display:grid;place-items:center">${m.icon}</div>
    <div class="tb"><div class="tt">${m.label}</div><div class="ts">${esc(summary(e))}${e.note && e.type !== "note" ? " · " + esc(e.note) : ""}${e.logged_by ? ` · ${esc(e.logged_by)}` : ""}</div></div>
    <div class="tr"><div class="time">${fmtClock(e.ts)}</div><div class="ago">${timeAgo(e.ts)}</div></div>
  </div>`;
}
function emptyState(emoji: string, text: string): string {
  return `<div class="empty"><span class="e-emoji">${emoji}</span><p>${text}</p></div>`;
}

/* ---- timeline ---- */
function timelineView(): string {
  const types: string[] = phase() === "baby"
    ? ["all", "feed", "diaper", "sleep", "pump", "measurement", "milestone", "appointment", "note"]
    : ["all", "kick", "contraction", "ultrasound", "weight", "symptom", "appointment", "note"];
  const list = state.filter === "all" ? state.events : state.events.filter((e) => e.type === state.filter);
  const groups: Record<number, Ev[]> = {};
  for (const e of list) { const k = dayKey(e.ts); (groups[k] ||= []).push(e); }
  const keys = Object.keys(groups).sort((a, b) => Number(b) - Number(a));
  return `<div class="chips">${types.map((t) => `<button class="chip ${state.filter === t ? "on" : ""}" data-action="filter:${t}">${t === "all" ? "Everything" : META[t as EventType]?.label || t}</button>`).join("")}</div>
    ${keys.length ? keys.map((k) => `<div class="tl-day-label">${dayLabel(Number(k))}</div>${groups[Number(k)].map(tlItem).join("")}`).join("") : emptyState("📖", "No entries here yet")}`;
}

/* ---- tools ---- */
function toolsView(): string {
  const p = phase();
  const cards: string[] = [];
  if (p !== "baby") {
    cards.push(toolCard("kick", "Kick counter", "Count 10 movements and time how long it takes.", "open-kick"));
    cards.push(toolCard("contraction", "Contraction timer", "Time contractions and watch for the 5-1-1 pattern.", "open-contraction"));
    cards.push(toolCard("ultrasound", "Ultrasound history", "Crown-rump length, heartbeat, and scan dates.", "open-ultrasounds"));
  }
  cards.push(toolCard("measurement", p === "baby" ? "Growth chart" : "Weight chart", p === "baby" ? "See your baby's weight over time." : "Track your weight through pregnancy.", "open-growth"));
  cards.push(toolCard("appointment", "All appointments", "Past and upcoming visits in one place.", "open-appts"));
  return `<div class="sec-head"><h3>Tools</h3></div><div class="stack">${cards.join("")}</div>`;
}
function toolCard(type: EventType, title: string, desc: string, action: string): string {
  const m = META[type];
  return `<button class="card ${m.tint}" style="display:flex;gap:16px;align-items:center;text-align:left;width:100%" data-action="${action}">
    <span class="qi" style="width:48px;height:48px;border-radius:15px;flex:none">${m.icon}</span>
    <span style="flex:1"><span class="display" style="font-size:1.2rem;display:block">${title}</span><span class="muted">${desc}</span></span>
  </button>`;
}

/* ---- settings ---- */
function settingsView(): string {
  const s = state.settings;
  const theme = localStorage.getItem(LS.theme) || "light";
  const due = pregAnchors().due;
  const dueHint = due != null ? new Date(due).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : null;
  return `<div class="sec-head"><h3>Settings</h3></div>
  <div class="stack">
    <section class="card">
      <form data-form="settings" class="stack" style="margin:0">
        <label class="fld"><span class="lt">Baby's name or nickname</span><input name="baby_name" value="${esc(s.baby_name || "")}" placeholder="Little One"></label>
        <label class="fld"><span class="lt">First day of last period <span class="tiny">· gestational age</span></span><input type="date" name="lmp_date" value="${esc(s.lmp_date || "")}"></label>
        <label class="fld"><span class="lt">Conception date <span class="tiny">· embryonic age</span></span><input type="date" name="conception_date" value="${esc(s.conception_date || "")}"></label>
        ${dueHint ? `<p class="tiny" style="margin:-6px 2px 0">Estimated due date: ${dueHint}</p>` : ""}
        <label class="fld"><span class="lt">Show age as</span>
          <div class="seg" data-seg="age_pref">
            <button type="button" data-val="embryonic" class="${(s.age_pref || 'embryonic') === 'embryonic' ? 'on' : ''}">Embryonic</button>
            <button type="button" data-val="gestational" class="${s.age_pref === 'gestational' ? 'on' : ''}">Gestational</button>
          </div><input type="hidden" name="age_pref" value="${s.age_pref || 'embryonic'}">
        </label>
        <label class="fld"><span class="lt">Birth date <span class="tiny">(switches to baby mode)</span></span><input type="date" name="birth_date" value="${esc(s.birth_date || "")}"></label>
        <label class="fld"><span class="lt">Units</span>
          <div class="seg" data-seg="units">
            <button type="button" data-val="imperial" class="${(s.units || 'imperial') === 'imperial' ? 'on' : ''}">Imperial (oz, lb, in)</button>
            <button type="button" data-val="metric" class="${s.units === 'metric' ? 'on' : ''}">Metric (ml, kg, cm)</button>
          </div><input type="hidden" name="units" value="${s.units || 'imperial'}">
        </label>
        <button class="btn primary" type="submit">Save</button>
      </form>
    </section>

    <section class="card">
      <label class="fld" style="margin:0"><span class="lt">I'm logging as</span><input id="me-input" value="${esc(state.me)}" placeholder="e.g. Mom, Dad, your name"></label>
      <p class="tiny" style="margin-top:8px">Stamped on entries you log, so you can tell who did what.</p>
    </section>

    <section class="card">
      <div class="row-between"><span class="lt" style="margin:0">Appearance</span></div>
      <div class="seg" data-seg="theme" style="margin-top:10px">
        <button type="button" data-val="light" class="${theme === 'light' ? 'on' : ''}">Day</button>
        <button type="button" data-val="night" class="${theme === 'night' ? 'on' : ''}">Night</button>
        <button type="button" data-val="auto" class="${theme === 'auto' ? 'on' : ''}">Auto</button>
      </div>
    </section>

    <section class="card">
      <div class="list-row"><span>Export all data</span><button class="btn ghost" style="width:auto;padding:10px 16px" data-action="export-data">Download</button></div>
      <div class="list-row"><span>Sign out</span><button class="btn danger" style="width:auto;padding:10px 16px" data-action="logout">Log out</button></div>
    </section>
    <p class="tiny" style="text-align:center;padding:0 20px">Your passphrase is set on the server. To change it, run <code>server/set-passphrase.sh</code>. Everything here is private to your household.</p>
  </div>`;
}

/* ---------------------------------------------------- deferred drawing ---- */
function drawDeferred(): void {
  const fg = $<SVGCircleElement>(".ring-fg");
  if (fg) {
    const v = fg.getAttribute("stroke-dashoffset")!;
    fg.setAttribute("stroke-dashoffset", fg.getAttribute("stroke-dasharray")!);
    requestAnimationFrame(() => requestAnimationFrame(() => fg.setAttribute("stroke-dashoffset", v)));
  }
}

/* ------------------------------------------------------------ chrome ------ */
function nav(): string {
  const items: [ViewName, string, string][] = [["home", "Home", I.home], ["timeline", "Timeline", I.list], ["tools", "Tools", I.tools], ["settings", "Settings", I.gear]];
  return `<div class="nav"><div class="bar">${items.map(([v, l, ic]) => `<button class="${state.view === v ? "on" : ""}" data-action="nav:${v}">${ic}<span>${l}</span></button>`).join("")}</div></div>`;
}
function fab(): string {
  if (state.view === "settings") return "";
  return `<button class="fab" data-action="open-log-chooser" aria-label="Log something">${I.plus}</button>`;
}

/* --------------------------------------------------------------- login ---- */
function renderLogin(): void {
  $("#root").innerHTML = `<div class="login-wrap">
    <div class="mark-lg">${I.heart}</div>
    <h1>Little One</h1>
    <p>A warm, private place for pregnancy<br>and your new baby.</p>
    <form class="login-card stack" data-form="login">
      <input type="password" name="password" placeholder="Household passphrase" autocomplete="current-password" autofocus>
      <button class="btn primary" type="submit">Open</button>
      <div class="login-err" id="login-err"></div>
    </form>
  </div>`;
}

/* --------------------------------------------------------------- sheets --- */
function openSheet(html: string): void {
  let scrim = $("#scrim");
  if (!scrim) { scrim = document.createElement("div"); scrim.id = "scrim"; scrim.className = "scrim"; document.body.appendChild(scrim); }
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  requestAnimationFrame(() => scrim.classList.add("open"));
}
function closeSheet(): void { const s = $("#scrim"); if (s) { s.classList.remove("open"); setTimeout(() => s.remove(), 300); } stopTickers(); }

function nowLocalInput(): string { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function tsField(label = "When"): string { return `<label class="fld"><span class="lt">${label}</span><input type="datetime-local" name="ts" value="${nowLocalInput()}"></label>`; }
function noteField(): string { return `<label class="fld"><span class="lt">Note <span class="tiny">(optional)</span></span><textarea name="note" placeholder="Anything to remember"></textarea></label>`; }

function logChooser(): void {
  const p = phase();
  const opts: EventType[] = p === "baby"
    ? ["feed", "diaper", "sleep", "pump", "measurement", "milestone", "appointment", "note"]
    : ["kick", "contraction", "ultrasound", "weight", "symptom", "appointment", "milestone", "note"];
  openSheet(`<h3>Log something</h3><p class="sub">What would you like to record?</p>
    <div class="quick-grid">${opts.map((t) => `<button class="quick ${META[t].tint}" data-action="log:${t}"><span class="qi">${META[t].icon}</span><span class="qt">${META[t].label}</span></button>`).join("")}</div>`);
}

function openForm(type: string): void {
  const U = units();
  let body = "";
  if (type === "feed") body = `<h3>Feed</h3>
    <div class="seg" data-seg="method" style="margin-bottom:14px"><button type="button" data-val="breast" class="on">Breast</button><button type="button" data-val="bottle">Bottle</button></div>
    <input type="hidden" name="method" value="breast">
    <div data-when="breast"><label class="fld"><span class="lt">Side</span><div class="seg" data-seg="side"><button type="button" data-val="left" class="on">Left</button><button type="button" data-val="right">Right</button><button type="button" data-val="both">Both</button></div><input type="hidden" name="side" value="left"></label>
      <label class="fld"><span class="lt">Minutes</span><input type="number" name="minutes" inputmode="numeric" placeholder="15"></label></div>
    <div data-when="bottle" style="display:none"><label class="fld"><span class="lt">Amount (${U.vol.u})</span><input type="number" step="0.1" name="amount" inputmode="decimal" placeholder="${U.imperial ? "3" : "90"}"></label>
      <label class="fld"><span class="lt">Kind</span><div class="seg" data-seg="kind"><button type="button" data-val="breast milk" class="on">Breast milk</button><button type="button" data-val="formula">Formula</button></div><input type="hidden" name="kind" value="breast milk"></label></div>
    ${tsField()}${submitRow()}`;
  else if (type === "diaper") body = `<h3>Diaper</h3>
    <label class="fld"><span class="lt">What's in there?</span><div class="seg" data-seg="kind"><button type="button" data-val="wet" class="on">Wet</button><button type="button" data-val="dirty">Dirty</button><button type="button" data-val="both">Both</button></div><input type="hidden" name="kind" value="wet"></label>
    ${tsField()}${noteField()}${submitRow()}`;
  else if (type === "sleep") body = `<h3>Sleep</h3><p class="sub">Start a nap now, or log one that already happened.</p>
    <button class="btn primary" type="button" data-action="sleep-start" style="margin-bottom:16px">Start sleep now</button>
    <div class="row-between" style="margin-bottom:12px"><span class="tiny">or log a finished sleep</span></div>
    <label class="fld"><span class="lt">Fell asleep</span><input type="datetime-local" name="start" value="${nowLocalInput()}"></label>
    <label class="fld"><span class="lt">Woke up</span><input type="datetime-local" name="end" value="${nowLocalInput()}"></label>
    ${submitRow("Save sleep")}`;
  else if (type === "pump") body = `<h3>Pump</h3>
    <label class="fld"><span class="lt">Amount (${U.vol.u})</span><input type="number" step="0.1" name="amount" inputmode="decimal" placeholder="${U.imperial ? "4" : "120"}"></label>
    <label class="fld"><span class="lt">Side</span><div class="seg" data-seg="side"><button type="button" data-val="left" class="on">Left</button><button type="button" data-val="right">Right</button><button type="button" data-val="both">Both</button></div><input type="hidden" name="side" value="left"></label>
    ${tsField()}${submitRow()}`;
  else if (type === "weight") body = `<h3>My weight</h3>
    <label class="fld"><span class="lt">Weight (${U.mass.u})</span><input type="number" step="0.1" name="value" inputmode="decimal" autofocus></label>
    ${tsField("Date")}${submitRow()}`;
  else if (type === "measurement") body = `<h3>Growth</h3><p class="sub">Fill in what you measured.</p>
    <label class="fld"><span class="lt">Weight (${U.mass.u})</span><input type="number" step="0.01" name="weight" inputmode="decimal"></label>
    <label class="fld"><span class="lt">Length (${U.len.u})</span><input type="number" step="0.1" name="height" inputmode="decimal"></label>
    <label class="fld"><span class="lt">Head circumference (${U.len.u})</span><input type="number" step="0.1" name="head" inputmode="decimal"></label>
    ${tsField("Date")}${submitRow()}`;
  else if (type === "ultrasound") body = `<h3>Ultrasound</h3><p class="sub">Log measurements from your scan.</p>
    <label class="fld"><span class="lt">Crown-rump length (mm)</span><input type="number" step="0.1" name="crl" inputmode="decimal" placeholder="e.g. 23"></label>
    <label class="fld"><span class="lt">Heartbeat (bpm)</span><input type="number" step="1" name="fhr" inputmode="numeric" placeholder="e.g. 150"></label>
    <label class="fld"><span class="lt">Gestational age by scan <span class="tiny">(optional)</span></span>
      <div style="display:flex;gap:10px"><input type="number" name="us_weeks" inputmode="numeric" placeholder="weeks"><input type="number" name="us_days" inputmode="numeric" placeholder="days"></div></label>
    ${tsField("Scan date")}${noteField()}${submitRow("Save scan")}`;
  else if (type === "symptom") body = `<h3>Symptom</h3>
    <label class="fld"><span class="lt">What are you feeling?</span><select name="tag">${["Nausea", "Fatigue", "Heartburn", "Back pain", "Cramping", "Swelling", "Headache", "Cravings", "Trouble sleeping", "Braxton Hicks", "Other"].map((o) => `<option>${o}</option>`).join("")}</select></label>
    <label class="fld"><span class="lt">Severity</span><div class="seg" data-seg="severity"><button type="button" data-val="mild" class="on">Mild</button><button type="button" data-val="moderate">Moderate</button><button type="button" data-val="strong">Strong</button></div><input type="hidden" name="severity" value="mild"></label>
    ${tsField()}${noteField()}${submitRow()}`;
  else if (type === "appointment") body = `<h3>Appointment</h3>
    <label class="fld"><span class="lt">Title</span><input name="title" placeholder="20-week ultrasound" autofocus></label>
    <label class="fld"><span class="lt">When</span><input type="datetime-local" name="when" value="${nowLocalInput()}"></label>
    <label class="fld"><span class="lt">Location</span><input name="location" placeholder="Dr. office"></label>
    ${noteField()}${submitRow("Save appointment")}`;
  else if (type === "milestone") body = `<h3>Milestone</h3>
    <label class="fld"><span class="lt">What happened?</span><input name="title" placeholder="First smile" autofocus></label>
    ${tsField("Date")}${noteField()}${submitRow("Save milestone")}`;
  else if (type === "note") body = `<h3>Note</h3>
    <label class="fld"><span class="lt">Your note</span><textarea name="note" autofocus placeholder="A little memory…"></textarea></label>
    ${tsField()}${submitRow()}`;
  openSheet(`<form data-form="log" data-type="${type}">${body}</form>`);
}
function submitRow(label = "Save"): string { return `<div class="btn-row"><button class="btn ghost" type="button" data-action="sheet-close">Cancel</button><button class="btn primary" type="submit">${label}</button></div>`; }

function formData(form: HTMLFormElement): Record<string, string> {
  const fd: Record<string, string> = {};
  form.querySelectorAll("input,select,textarea").forEach((el) => {
    const inp = el as HTMLInputElement;
    if (inp.name) fd[inp.name] = inp.value;
  });
  return fd;
}

function submitLog(form: HTMLFormElement): void {
  const type = form.dataset.type as EventType, f = formData(form), U = units();
  const ts = f.ts ? new Date(f.ts) : new Date();
  let data: Record<string, any> = {}, note: string | null = f.note || null, when = ts;
  if (type === "feed") {
    if (f.method === "bottle") data = { method: "bottle", amount_ml: U.vol.toC(parseFloat(f.amount) || 0), kind: f.kind };
    else data = { method: "breast", side: f.side, minutes: parseInt(f.minutes) || null };
  } else if (type === "diaper") data = { kind: f.kind };
  else if (type === "sleep") {
    const start = new Date(f.start), end = new Date(f.end);
    if (end < start) { toast("Wake time is before sleep time"); return; }
    when = start; data = { end: end.toISOString() };
  } else if (type === "pump") data = { amount_ml: U.vol.toC(parseFloat(f.amount) || 0), side: f.side };
  else if (type === "weight") data = { kg: U.mass.toC(parseFloat(f.value) || 0) };
  else if (type === "measurement") {
    if (f.weight) data.weight_kg = U.mass.toC(parseFloat(f.weight));
    if (f.height) data.height_cm = U.len.toC(parseFloat(f.height));
    if (f.head) data.head_cm = U.len.toC(parseFloat(f.head));
    if (!Object.keys(data).length) { toast("Enter at least one measurement"); return; }
  } else if (type === "ultrasound") {
    if (f.crl) data.crl_mm = parseFloat(f.crl);
    if (f.fhr) data.fhr_bpm = parseInt(f.fhr);
    if (f.us_weeks) { data.ga_weeks = parseInt(f.us_weeks); data.ga_days = parseInt(f.us_days) || 0; }
    if (!Object.keys(data).length) { toast("Enter at least one measurement"); return; }
  } else if (type === "symptom") data = { tag: f.tag, severity: f.severity };
  else if (type === "appointment") { data = { title: f.title || "Appointment", when: new Date(f.when).toISOString(), location: f.location || "" }; when = new Date(f.when); }
  else if (type === "milestone") data = { title: f.title || "Milestone" };
  else if (type === "note") { if (!note) { toast("Write something first"); return; } }
  logEvent(type, data, { ts: when, note });
  closeSheet(); render(); toast(META[type].label + " logged ✓");
}

/* ------------------------------------------------------- tools: kicks ---- */
let ticker: number | null = null;
let kickState: { count: number; start: number } | null = null;
let contrState: { running: boolean; start: number; list: { ts: number; dur: number; gap: number | null }[] } | null = null;
function stopTickers(): void { if (ticker) { clearInterval(ticker); ticker = null; } kickState = null; contrState = null; }

function openKick(): void {
  kickState = { count: 0, start: Date.now() };
  openSheet(`<h3>Kick counter</h3><p class="sub">Tap the circle each time you feel a movement. Many providers suggest timing how long 10 kicks take.</p>
    <button class="big-tap pulse" data-action="kick-tap"><span class="n" id="kick-n">0</span><span class="l">tap for a kick</span></button>
    <div class="timer-face"><div class="tlab">elapsed</div><div class="tval" id="kick-t" style="font-size:2.4rem">0s</div></div>
    <div class="btn-row"><button class="btn ghost" type="button" data-action="sheet-close">Cancel</button><button class="btn primary" type="button" data-action="kick-save">Save session</button></div>`);
  ticker = window.setInterval(() => { const el = $("#kick-t"); if (el && kickState) el.textContent = fmtDur((Date.now() - kickState.start) / 1000); }, 1000);
}
function kickTap(): void { if (!kickState) return; kickState.count++; const el = $("#kick-n"); if (el) el.textContent = String(kickState.count); if (navigator.vibrate) navigator.vibrate(15); }
function kickSave(): void {
  if (!kickState || !kickState.count) { toast("Tap at least one kick"); return; }
  logEvent("kick", { count: kickState.count, duration_sec: Math.round((Date.now() - kickState.start) / 1000) });
  closeSheet(); render(); toast("Kick session saved ✓");
}

/* ------------------------------------------------- tools: contractions --- */
function openContraction(): void {
  contrState = { running: false, start: 0, list: recentContractions() };
  renderContraction();
  ticker = window.setInterval(() => { if (contrState?.running) { const el = $("#contr-t"); if (el) el.textContent = fmtDur((Date.now() - contrState.start) / 1000); } }, 200);
}
function recentContractions() {
  return state.events.filter((e) => e.type === "contraction").slice(0, 8)
    .map((e) => ({ ts: +new Date(e.ts), dur: e.data.duration_sec as number, gap: (e.data.since_last_sec ?? null) as number | null }));
}
function renderContraction(): void {
  if (!contrState) return;
  const l = contrState.list;
  const avgDur = l.length ? l.reduce((s, x) => s + x.dur, 0) / l.length : 0;
  const gaps = l.map((x) => x.gap).filter((g): g is number => !!g);
  const avgGap = gaps.length ? gaps.reduce((s, x) => s + x, 0) / gaps.length : 0;
  openSheet(`<h3>Contraction timer</h3><p class="sub">Hold tight. Press start when one begins, stop when it ends.</p>
    <div class="timer-face"><div class="tlab">${contrState.running ? "contraction" : "ready"}</div><div class="tval ${contrState.running ? "pulse" : ""}" id="contr-t">0s</div></div>
    <button class="btn ${contrState.running ? "danger" : "primary"}" type="button" data-action="contraction-toggle" style="margin-bottom:8px">${contrState.running ? "Stop" : "Start contraction"}</button>
    ${l.length ? `<div class="card" style="margin-top:14px;padding:16px">
      <div class="glance"><div class="g"><div class="gl">Avg length</div><div class="gv">${fmtDur(avgDur).split(" ")[0]}</div></div>
      <div class="g"><div class="gl">Avg apart</div><div class="gv">${avgGap ? fmtDur(avgGap).split(" ")[0] : "—"}</div></div>
      <div class="g"><div class="gl">Logged</div><div class="gv">${l.length}</div></div></div>
      <p class="tiny" style="margin-top:12px;text-align:center">Call your provider about the 5-1-1 rule: contractions ~5 min apart, lasting ~1 min, for 1 hour.</p>
    </div>` : ""}
    <div class="btn-row" style="margin-top:14px"><button class="btn ghost" type="button" data-action="sheet-close">Done</button></div>`);
}
function contractionToggle(): void {
  if (!contrState) return;
  if (!contrState.running) { contrState.running = true; contrState.start = Date.now(); renderContraction(); }
  else {
    const dur = Math.round((Date.now() - contrState.start) / 1000);
    const prev = contrState.list[0];
    const gap = prev ? Math.round((contrState.start - prev.ts) / 1000) : null;
    logEvent("contraction", { duration_sec: dur, since_last_sec: gap });
    const start = contrState.start;
    contrState.running = false;
    contrState.list = recentContractions();
    contrState.list.unshift({ ts: start, dur, gap });
    renderContraction();
    toast("Contraction logged ✓");
  }
}

/* --------------------------------------------------------- tools: chart -- */
interface Pt { t: number; v: number; }
function openGrowth(): void {
  const U = units();
  const isBaby = phase() === "baby";
  const pts: Pt[] = state.events.filter((e) => isBaby ? (e.type === "measurement" && e.data.weight_kg) : e.type === "weight")
    .map((e) => ({ t: +new Date(e.ts), v: U.mass.fromC(isBaby ? e.data.weight_kg : e.data.kg) }))
    .sort((a, b) => a.t - b.t);
  openSheet(`<h3>${isBaby ? "Growth" : "Weight"} chart</h3><p class="sub">${isBaby ? "Your baby's weight over time." : "Your weight through pregnancy."}</p>
    ${pts.length >= 2 ? lineChart(pts, U.mass.u) : emptyState("📈", pts.length ? "Log one more to see a trend" : "No measurements logged yet")}
    <div class="btn-row" style="margin-top:8px"><button class="btn ghost" type="button" data-action="sheet-close">Close</button>${isBaby ? `<button class="btn primary" type="button" data-action="log:measurement">Add measurement</button>` : `<button class="btn primary" type="button" data-action="log:weight">Add weight</button>`}</div>`);
}
function lineChart(pts: Pt[], unit: string): string {
  const W = 480, H = 180, pad = 28;
  const xs = pts.map((p) => p.t), ys = pts.map((p) => p.v);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sx = (t: number) => pad + (W - 2 * pad) * (maxX === minX ? 0.5 : (t - minX) / (maxX - minX));
  const sy = (v: number) => H - pad - (H - 2 * pad) * (maxY === minY ? 0.5 : (v - minY) / (maxY - minY));
  const d = pts.map((p, i) => `${i ? "L" : "M"}${sx(p.t).toFixed(1)} ${sy(p.v).toFixed(1)}`).join(" ");
  const area = `${d} L${sx(maxX).toFixed(1)} ${H - pad} L${sx(minX).toFixed(1)} ${H - pad} Z`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <line class="axis" x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}"/>
    <path class="area" d="${area}"/><path class="line" d="${d}"/>
    ${pts.map((p) => `<circle class="dot" cx="${sx(p.t).toFixed(1)}" cy="${sy(p.v).toFixed(1)}" r="4"/>`).join("")}
  </svg>
  <div class="chart-legend"><span>${r1(minY)} ${unit}</span><span>→</span><span>${r1(maxY)} ${unit}</span></div>`;
}

function openUltrasounds(): void {
  const us = state.events.filter((e) => e.type === "ultrasound").sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  const crl: Pt[] = us.filter((e) => e.data.crl_mm != null).map((e) => ({ t: +new Date(e.ts), v: e.data.crl_mm })).sort((a, b) => a.t - b.t);
  openSheet(`<h3>Ultrasounds</h3>
    ${crl.length >= 2 ? `<p class="sub">Crown-rump length over time</p>${lineChart(crl, "mm")}` : ""}
    ${us.length ? us.map((e) => `<div class="tl-item"><div class="ti t-sky" style="display:grid;place-items:center">${I.ultrasound}</div>
      <div class="tb"><div class="tt">${esc(summary(e))}</div><div class="ts">${new Date(e.ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}${e.note ? " · " + esc(e.note) : ""}</div></div></div>`).join("") : emptyState("🩺", "No ultrasounds logged yet")}
    <div class="btn-row" style="margin-top:14px"><button class="btn ghost" type="button" data-action="sheet-close">Close</button><button class="btn primary" type="button" data-action="log:ultrasound">Add scan</button></div>`);
}

function openAppts(): void {
  const appts = state.events.filter((e) => e.type === "appointment").sort((a, b) => +new Date(b.data.when) - +new Date(a.data.when));
  const now = Date.now();
  const up = appts.filter((e) => +new Date(e.data.when) >= now).reverse();
  const past = appts.filter((e) => +new Date(e.data.when) < now);
  openSheet(`<h3>Appointments</h3>
    ${up.length ? `<div class="tl-day-label">Upcoming</div>${up.map(apptRow).join("")}` : ""}
    ${past.length ? `<div class="tl-day-label">Past</div>${past.map(apptRow).join("")}` : ""}
    ${!appts.length ? emptyState("🗓️", "No appointments yet") : ""}
    <div class="btn-row" style="margin-top:14px"><button class="btn ghost" type="button" data-action="sheet-close">Close</button><button class="btn primary" type="button" data-action="log:appointment">Add</button></div>`);
}

/* --------------------------------------------------- event detail sheet -- */
function openEvent(id: string): void {
  const e = state.events.find((x) => String(x.id) === id);
  if (!e) return;
  const m = META[e.type];
  openSheet(`<h3>${m.label}</h3>
    <div class="tl-item" style="margin-bottom:16px"><div class="ti ${m.tint}" style="display:grid;place-items:center">${m.icon}</div>
      <div class="tb"><div class="tt">${esc(summary(e))}</div><div class="ts">${new Date(e.ts).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${e.logged_by ? " · " + esc(e.logged_by) : ""}</div></div></div>
    ${e.note ? `<p class="muted" style="margin-top:0">${esc(e.note)}</p>` : ""}
    ${e._pending ? `<p class="tiny">⟳ Saving when you're back online…</p>` : ""}
    <div class="btn-row"><button class="btn ghost" type="button" data-action="sheet-close">Close</button><button class="btn danger" type="button" data-action="del-event" data-id="${e.id}">Delete</button></div>`);
}

/* ---------------------------------------------------------------- toast --- */
let toastT: number | null = null;
function toast(msg: string): void {
  let t = $("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; requestAnimationFrame(() => t.classList.add("show"));
  if (toastT) clearTimeout(toastT);
  toastT = window.setTimeout(() => t.classList.remove("show"), 2200);
}

/* --------------------------------------------------------------- theme ---- */
function applyTheme(): void {
  let t = localStorage.getItem(LS.theme) || "light";
  if (t === "auto") t = matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "light";
  document.documentElement.dataset.theme = t;
  const meta = $<HTMLMetaElement>('meta[name="theme-color"]'); if (meta) meta.content = t === "night" ? "#181310" : "#fbf3e7";
}
function toggleTheme(): void {
  const cur = document.documentElement.dataset.theme === "night" ? "light" : "night";
  localStorage.setItem(LS.theme, cur); applyTheme(); render();
}

/* --------------------------------------------------------------- auth ----- */
async function doLogin(form: HTMLFormElement): Promise<void> {
  const pw = formData(form).password;
  const err = $("#login-err");
  try {
    const r = await api("POST", "/login", { password: pw });
    state.token = r.token; localStorage.setItem(LS.token, r.token);
    render(); syncAll();
  } catch (e: any) { if (err) err.textContent = String(e.message).includes("401") ? "That passphrase didn't work." : "Couldn't reach the server."; }
}
function logout(): void {
  state.token = null; localStorage.removeItem(LS.token);
  render();
}

/* ------------------------------------------------------------- events ----- */
document.addEventListener("click", (ev: Event) => {
  const tgt = ev.target as HTMLElement;
  // Segmented controls (Breast/Bottle, Side, Theme, Units…) — these buttons have
  // no data-action, so handle them before the early return below.
  const segBtn = tgt.closest<HTMLElement>(".seg > button");
  if (segBtn) {
    const segEl = segBtn.parentElement as HTMLElement, seg = segEl.dataset.seg!;
    segEl.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === segBtn));
    const hidden = (segEl.parentElement!.querySelector(`input[name="${seg}"]`) || document.querySelector(`#scrim input[name="${seg}"]`)) as HTMLInputElement | null;
    if (hidden) hidden.value = segBtn.dataset.val!;
    if (seg === "method") { const sc = $("#scrim"); (sc.querySelector('[data-when="breast"]') as HTMLElement).style.display = segBtn.dataset.val === "breast" ? "" : "none"; (sc.querySelector('[data-when="bottle"]') as HTMLElement).style.display = segBtn.dataset.val === "bottle" ? "" : "none"; }
    if (seg === "theme") { localStorage.setItem(LS.theme, segBtn.dataset.val!); applyTheme(); }
    return;
  }

  const t = tgt.closest<HTMLElement>("[data-action]");
  if (!t) return;
  const a = t.dataset.action!, id = t.dataset.id!;
  if (a.startsWith("nav:")) { state.view = a.slice(4) as ViewName; state.filter = "all"; render(); window.scrollTo(0, 0); }
  else if (a.startsWith("filter:")) { state.filter = a.slice(7); render(); }
  else if (a.startsWith("log:")) { closeSheet(); openForm(a.slice(4)); }
  else if (a.startsWith("event:")) openEvent(a.slice(6));
  else if (a === "open-log-chooser") logChooser();
  else if (a === "theme-toggle") toggleTheme();
  else if (a === "open-settings") { state.view = "settings"; render(); }
  else if (a === "sheet-close") closeSheet();
  else if (a === "logout") logout();
  else if (a === "export-data") exportData();
  else if (a === "wake") wakeBaby(id);
  else if (a === "del-event") { deleteEvent(id); closeSheet(); }
  else if (a === "open-kick") openKick();
  else if (a === "kick-tap") kickTap();
  else if (a === "kick-save") kickSave();
  else if (a === "open-contraction") openContraction();
  else if (a === "contraction-toggle") contractionToggle();
  else if (a === "open-growth") openGrowth();
  else if (a === "open-ultrasounds") openUltrasounds();
  else if (a === "open-appts") openAppts();
  else if (a === "sleep-start") startSleep();
});

document.addEventListener("submit", (ev: Event) => {
  const f = ev.target as HTMLFormElement;
  ev.preventDefault();
  if (f.dataset.form === "login") doLogin(f);
  else if (f.dataset.form === "log") submitLog(f);
  else if (f.dataset.form === "settings") {
    const d = formData(f);
    const patch: Partial<Settings> = {
      baby_name: d.baby_name.trim(),
      lmp_date: d.lmp_date || null,
      conception_date: d.conception_date || null,
      age_pref: (d.age_pref as Settings["age_pref"]) || "embryonic",
      birth_date: d.birth_date || null,
      units: d.units as Settings["units"],
    };
    const meInput = $<HTMLInputElement>("#me-input");
    if (meInput) { state.me = meInput.value.trim(); localStorage.setItem(LS.me, state.me); }
    saveSettings(patch).then(() => { render(); toast("Saved ✓"); });
  }
});

// close sheet by tapping the scrim backdrop
document.addEventListener("click", (ev: Event) => { if ((ev.target as HTMLElement).id === "scrim") closeSheet(); });

function startSleep(): void { logEvent("sleep", {}, {}); closeSheet(); render(); toast("Sleep started 🌙"); }
function wakeBaby(id: string): void {
  const e = state.events.find((x) => String(x.id) === id); if (!e) return;
  patchEvent(e.id, { data: { ...e.data, end: new Date().toISOString() } }).then(() => toast("Good morning ☀️"));
}
function exportData(): void {
  const blob = new Blob([JSON.stringify({ settings: state.settings, events: state.events.filter((e) => !e._pending) }, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "baby-export.json"; a.click(); URL.revokeObjectURL(a.href);
}

/* ------------------------------------------------------------- lifecycle -- */
window.addEventListener("online", () => { state.online = true; document.body.classList.remove("is-offline"); flush(); syncAll(); });
window.addEventListener("offline", () => { state.online = false; document.body.classList.add("is-offline"); });
document.addEventListener("visibilitychange", () => { if (!document.hidden && state.token) syncAll(); });
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if ((localStorage.getItem(LS.theme) || "light") === "auto") { applyTheme(); render(); } });

applyTheme();
render();
if (state.token) syncAll();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
