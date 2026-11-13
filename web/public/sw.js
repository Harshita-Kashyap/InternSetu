/* InternSetu service worker (session 12). Caches ONLY static files so the app opens fast on a weak network.
   It never caches API calls, pages with personal data, or anything outside the lists below. Bump VERSION to reset. */
const VERSION = "v1";
const CACHE = "internsetu-static-" + VERSION;
const STATIC = [/^\/_next\/static\//, /^\/icon-(192|512)\.png$/, /^\/logo(-mark)?\.png$/, /^\/hero\.jpg$/];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("internsetu-static-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !STATIC.some((r) => r.test(url.pathname))) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  }));
});
