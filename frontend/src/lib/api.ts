// Thin fetch wrapper.
//  - Web: same-origin "/api", httpOnly session cookie (credentials:"include").
//  - Native (Capacitor wrapper): the WebView origin is localhost, so the API is
//    cross-origin — use the absolute URL + a Bearer token kept in localStorage.
//    The backend accepts cookie OR bearer. Token storage is gated to native so the
//    web app keeps its httpOnly-cookie security (no token in web localStorage).
export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, message: string) { super(message); this.status = status; this.detail = message; }
}

const API_ORIGIN = "https://baby.stephens.page";
const TOKEN_KEY = "baby.token";

export function isNative(): boolean {
  const c: any = (globalThis as any).Capacitor;
  return !!(c && (typeof c.isNativePlatform === "function" ? c.isNativePlatform() : c.platform && c.platform !== "web"));
}
export function setAuthToken(t: string | null): void {
  if (!isNative()) return; // web stays cookie-only — never store a token in web localStorage
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch {}
}

async function req(method: string, path: string, body?: any): Promise<any> {
  const native = isNative();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (native) {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) headers["authorization"] = "Bearer " + t;
  }
  const res = await fetch((native ? API_ORIGIN : "") + "/api" + path, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (p: string) => req("GET", p),
  post: (p: string, b?: any) => req("POST", p, b),
  patch: (p: string, b?: any) => req("PATCH", p, b),
  del: (p: string) => req("DELETE", p),
};
