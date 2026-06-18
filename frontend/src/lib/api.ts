// Thin fetch wrapper. credentials:"include" so the httpOnly session cookie flows.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function req(method: string, path: string, body?: any): Promise<any> {
  const res = await fetch("/api" + path, {
    method,
    credentials: "include",
    headers: { "content-type": "application/json" },
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
