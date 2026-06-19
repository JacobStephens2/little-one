/* Service worker: runtime cache of the app shell (offline launch) + Web Push.
   Runtime caching avoids needing the hashed build manifest. Dexie holds the
   data; this just keeps the shell loadable offline. */
const CACHE = "littleone-v4";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (url.origin !== location.origin) return;

  // Network-first for the page shell (HTML) so new deploys land immediately;
  // fall back to cache only when offline. Hashed assets are cache-first (immutable).
  const isShell = e.request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html");
  if (isShell) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("/index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit ||
      fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match("/index.html"))
    )
  );
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(d.title || "Little One", {
    body: d.body || "",
    icon: "/img/icon-192.png",
    badge: "/img/icon-192.png",
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) { if ("focus" in c) return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
