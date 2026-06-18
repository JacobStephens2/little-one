import type { AgeParts, Ev, EventType, Settings } from "./types";
import { META } from "./icons";

export const DAY = 86400000;
type DateLike = string | number | Date;

export function units(s: Settings) {
  const imperial = (s.units || "imperial") === "imperial";
  return {
    imperial,
    vol: { u: imperial ? "oz" : "ml", toC: (v: number) => imperial ? v * 29.5735 : v, fromC: (ml: number) => imperial ? ml / 29.5735 : ml },
    mass: { u: imperial ? "lb" : "kg", toC: (v: number) => imperial ? v / 2.20462 : v, fromC: (kg: number) => imperial ? kg * 2.20462 : kg },
    len: { u: imperial ? "in" : "cm", toC: (v: number) => imperial ? v * 2.54 : v, fromC: (cm: number) => imperial ? cm / 2.54 : cm },
  };
}
export const r1 = (n: number) => (Math.round(n * 10) / 10).toString();
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const fmtClock = (d: DateLike) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export function fmtDur(sec: number) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s ? s + "s" : ""}`.trim();
  return `${s}s`;
}
export function timeAgo(d: DateLike) {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60000) return "just now";
  const m = Math.floor(ms / 60000);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return Math.floor(h / 24) + "d ago";
}
export function dayKey(d: DateLike) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
export function dayLabel(ts: DateLike) {
  const k = dayKey(ts), today = dayKey(Date.now());
  if (k === today) return "Today";
  if (k === today - DAY) return "Yesterday";
  return new Date(ts).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

const DIAPER: Record<string, string> = { wet: "Wet", dirty: "Dirty", both: "Wet + Dirty" };
export function summary(e: Ev, s: Settings): string {
  const U = units(s), d = e.data || {};
  switch (e.type) {
    case "feed":
      if (d.method === "bottle") return `Bottle · ${r1(U.vol.fromC(d.amount_ml || 0))} ${U.vol.u}${d.kind ? " · " + d.kind : ""}`;
      return `Breast · ${cap(d.side || "")}${d.minutes ? " · " + d.minutes + "m" : ""}`;
    case "diaper": return DIAPER[d.kind] || "Diaper";
    case "sleep": return !d.end ? "Sleeping now…" : "Slept " + fmtDur((+new Date(d.end) - +new Date(e.ts)) / 1000);
    case "pump": return `Pumped ${r1(U.vol.fromC(d.amount_ml || 0))} ${U.vol.u}${d.side ? " · " + cap(d.side) : ""}`;
    case "kick": return `${d.count} kicks in ${fmtDur(d.duration_sec || 0)}`;
    case "contraction": return `${fmtDur(d.duration_sec || 0)} long${d.since_last_sec ? " · " + fmtDur(d.since_last_sec) + " apart" : ""}`;
    case "weight": return `${r1(U.mass.fromC(d.kg || 0))} ${U.mass.u}`;
    case "symptom": return d.tag + (d.severity ? " · " + d.severity : "");
    case "appointment": return d.title + (d.when ? " · " + new Date(d.when).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
    case "milestone": return d.title || "Milestone";
    case "measurement": {
      const p: string[] = [];
      if (d.weight_kg) p.push(`${r1(U.mass.fromC(d.weight_kg))} ${U.mass.u}`);
      if (d.height_cm) p.push(`${r1(U.len.fromC(d.height_cm))} ${U.len.u}`);
      if (d.head_cm) p.push(`head ${r1(U.len.fromC(d.head_cm))} ${U.len.u}`);
      return p.join(" · ") || "Measurement";
    }
    case "ultrasound": {
      const p: string[] = [];
      if (d.crl_mm != null) p.push(`CRL ${r1(d.crl_mm)} mm`);
      if (d.fhr_bpm != null) p.push(`♥ ${d.fhr_bpm} bpm`);
      if (d.ga_weeks != null) p.push(`${d.ga_weeks}w${d.ga_days ? ` ${d.ga_days}d` : ""} by scan`);
      return p.join(" · ") || "Ultrasound";
    }
    case "note": return e.note || "Note";
    default: return (META as any)[e.type]?.label || String(e.type);
  }
}

/* --- phase + pregnancy math --- */
export type Phase = "baby" | "pregnancy" | "setup";
export function phase(s: Settings): Phase {
  if (s.birth_date && new Date(s.birth_date) <= new Date()) return "baby";
  if (s.lmp_date || s.conception_date || s.due_date) return "pregnancy";
  return "setup";
}
const dateMs = (x?: string | null) => (x ? new Date(x + "T00:00:00").getTime() : null);
export function pregAnchors(s: Settings) {
  let lmp = dateMs(s.lmp_date), conc = dateMs(s.conception_date);
  if (lmp == null && conc == null && s.due_date) lmp = (dateMs(s.due_date) as number) - 280 * DAY;
  if (lmp != null && conc == null) conc = lmp + 14 * DAY;
  if (conc != null && lmp == null) lmp = conc - 14 * DAY;
  const due = lmp != null ? lmp + 280 * DAY : null;
  return { lmp, conc, due };
}
function ageParts(anchor: number): AgeParts {
  const days = Math.floor((Date.now() - anchor) / DAY);
  return { days, weeks: Math.max(0, Math.floor(days / 7)), rem: ((days % 7) + 7) % 7 };
}
export function pregInfo(s: Settings) {
  const a = pregAnchors(s);
  const ga = a.lmp != null ? ageParts(a.lmp) : null;
  const emb = a.conc != null ? ageParts(a.conc) : null;
  const daysToDue = a.due != null ? Math.ceil((a.due - Date.now()) / DAY) : null;
  const pct = ga ? Math.min(1, Math.max(0, ga.days / 280)) : 0;
  const tri = ga && ga.weeks >= 28 ? "Third trimester" : ga && ga.weeks >= 14 ? "Second trimester" : "First trimester";
  const pref: "embryonic" | "gestational" = s.age_pref || "embryonic";
  return { ...a, ga, emb, daysToDue, pct, tri, pref };
}
export function babyAge(s: Settings) {
  const b = new Date((s.birth_date as string) + "T00:00:00");
  const days = Math.floor((Date.now() - b.getTime()) / DAY);
  return { days, weeks: Math.floor(days / 7), remDays: days % 7, months: Math.floor(days / 30.44) };
}
export function phaseTag(s: Settings): string {
  const p = phase(s);
  if (p === "pregnancy") {
    const g = pregInfo(s);
    const a = g.pref === "embryonic" ? (g.emb || g.ga) : (g.ga || g.emb);
    return a ? `${a.weeks}w ${a.rem}d` : "Expecting";
  }
  if (p === "baby") { const a = babyAge(s); return a.days < 14 ? `${a.days} days old` : a.months < 1 ? `${a.weeks} weeks old` : `${a.months} months old`; }
  return "Welcome";
}
