/* Project Hail Mary — minimal offline service worker.
   Runtime caching only (no precache manifest), so it survives Next's hashed
   asset names. Data lives in IndexedDB, so the app is fully usable offline
   once the shell + chunks have been visited once. */

/* ⚠️ Navigation responses are server-rendered now, not static files, and this
   cache is keyed by URL. That is safe only while the rendered HTML is identical
   for every visitor. Today it is, for two independent reasons:
     1. Every read goes through `useLiveQuery`, which no-ops during SSR
        (dexie-react-hooks: `typeof window !== 'undefined' // Don't do this in
        SSR`), so the server HTML is always the empty loading shell — it cannot
        contain user data even in principle.
     2. Auth is entirely client-side; the Supabase session lives in localStorage
        (lib/data/auth.ts), so no cookie ever reaches the server.
   Keep it that way: no route may call cookies()/headers()/draftMode(), and no
   proxy.ts (Next 16's renamed middleware) may exist. If server-side auth ever
   lands, the offline fallback below would serve one user's shell to another —
   rework this handler first. */
const VERSION = "phm-v33";
const RUNTIME = `phm-runtime-${VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== RUNTIME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the service worker script itself.
  if (url.pathname === "/sw.js") return;

  // App navigations: network-first so UI updates land when online.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request, { cache: "no-store" });
          if (fresh.ok) {
            const cache = await caches.open(RUNTIME);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await caches.match(request);
          return cached || (await caches.match("/")) || Response.error();
        }
      })()
    );
    return;
  }

  // Hashed Next bundles: network-first when online (avoid stale UI after deploy).
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(RUNTIME);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          return (await caches.match(request)) || Response.error();
        }
      })()
    );
    return;
  }

  // Everything else (icons/images/fonts): stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200) cache.put(request, resp.clone());
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })()
  );
});
