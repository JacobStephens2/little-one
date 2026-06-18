/* Service worker: cache the app shell so the app opens offline.
   API calls are always network (never cached); static assets are cache-first. */
const CACHE = "littleone-v2";
const SHELL = [
  "/", "/index.html", "/styles.css?v=2", "/app.js?v=2",
  "/manifest.webmanifest", "/img/favicon.svg", "/img/icon-192.png", "/img/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return; // let the network handle it
  e.respondWith(
    caches.match(e.request, { ignoreSearch: false }).then((hit) =>
      hit || fetch(e.request).then((res) => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match("/index.html"))
    )
  );
});
