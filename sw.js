// Profiler's service worker (installed-app mode until the Google Play release).
// Each build lives in b/<sha>/ under sha-named files, so they never change: they are served from the cache first and
// the game runs offline once a build has loaded fully. Everything else (the root redirect that names the newest build,
// the shell pages, the banner script) is fetched from the network first, so an online player always gets the newest
// build, and falls back to the cache when offline. Builds other than the newest are dropped from the cache.
const CACHE = "profiler";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

function buildOf(url) {
  const m = new URL(url).pathname.match(/\/b\/([0-9a-f]+)\//);
  return m ? m[1] : null;
}

async function dropOtherBuilds(keep) {
  const cache = await caches.open(CACHE);
  for (const req of await cache.keys()) {
    const b = buildOf(req.url);
    if (b && b !== keep) await cache.delete(req);
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const build = buildOf(req.url);
  const immutable = build && !url.pathname.endsWith("/index.html");
  if (immutable) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) {
        cache.put(req, res.clone());
        if (build) e.waitUntil(dropOtherBuilds(build));   // a build's shell page loaded online: it is the newest
      }
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
