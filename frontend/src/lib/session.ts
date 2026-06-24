import { writable } from "svelte/store";
import { api, setAuthToken } from "./api";
import type { Session } from "./types";
import { setLoggedBy, startStream, sync, wipeLocal } from "./db";

export const session = writable<Session | null>(null);
export const booting = writable(true);

let started = false;
function onSignedIn(s: Session) {
  session.set(s);
  setLoggedBy(s.user.display_name);
  if (!started) { started = true; sync(); startStream(); }
}

export async function loadSession(): Promise<boolean> {
  try {
    const s = await api.get("/me");
    onSignedIn(s);
    return true;
  } catch {
    session.set(null);
    return false;
  }
}

/* ---- auth actions ---- */
export const auth = {
  register: (b: { email: string; password: string; display_name: string; household_name?: string }) =>
    api.post("/auth/register", b),
  login: async (email: string, password: string) => {
    const r = await api.post("/auth/login", { email, password });
    setAuthToken(r?.token || null); // native only
    await loadSession();
  },
  forgot: (email: string) => api.post("/auth/forgot", { email }),
  reset: async (token: string, password: string) => {
    const r = await api.post("/auth/reset", { token, password });
    setAuthToken(r?.token || null);
    await loadSession();
  },
  magic: (email: string) => api.post("/auth/magic", { email }),
  resendVerification: (email: string) => api.post("/auth/resend-verification", { email }),
  inviteInfo: (token: string) => api.get(`/auth/invite/info?token=${encodeURIComponent(token)}`),
  acceptInvite: async (token: string, password: string, display_name: string) => {
    const r = await api.post("/auth/accept-invite", { token, password, display_name });
    setAuthToken(r?.token || null);
    await loadSession();
  },
  logout: async () => { try { await api.post("/auth/logout"); } catch {} setAuthToken(null); await wipeLocal(); },
  invite: (email: string) => api.post("/household/invite", { email }),
  updateProfile: (b: { display_name?: string; household_name?: string }) => api.patch("/me", b),
};

/* ---- web push opt-in ---- */
function urlB64ToUint8(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
export async function enablePush(): Promise<string> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = await navigator.serviceWorker.ready;
  const { key } = await api.get("/push/key");
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(key) });
  await api.post("/push/subscribe", sub.toJSON());
  return "granted";
}
export async function pushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
export async function pushSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try { const reg = await navigator.serviceWorker.ready; return !!(await reg.pushManager.getSubscription()); }
  catch { return false; }
}
export async function disablePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    try { await api.post("/push/unsubscribe", sub.toJSON()); } catch {}
    try { await sub.unsubscribe(); } catch {}
  }
}
export const pushTest = () => api.post("/push/test");

/* ---- theme ---- */
const THEME_KEY = "baby.theme";
export const themeStore = writable<"light" | "night">("light"); // effective theme, for reactive UI
export function applyTheme() {
  let t = localStorage.getItem(THEME_KEY) || "light";
  if (t === "auto") t = matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "light";
  document.documentElement.dataset.theme = t;
  themeStore.set(t as "light" | "night");
  const m = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (m) m.content = t === "night" ? "#181310" : "#fbf3e7";
}
export function setTheme(t: string) { localStorage.setItem(THEME_KEY, t); applyTheme(); }
export function currentTheme(): string { return localStorage.getItem(THEME_KEY) || "light"; }
export function toggleTheme() {
  setTheme(document.documentElement.dataset.theme === "night" ? "light" : "night");
}
