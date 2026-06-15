const CACHE_NAME = "church-master-v2026.1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/pwa-icon.png",
  "/pwa-icon.jpg"
];

// On Service Worker Installation: Cache critical shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching Core Offline Shell");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// On Service Worker Activation: Sweep older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Retiring Stale Cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept file requests and serve from cache using Stale-While-Revalidate
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass stateful queries, dev sockets, and chrome extensions
  if (
    request.method !== "GET" || 
    url.pathname.includes("/api/") ||
    url.hostname.includes("localhost") && url.port === "5173" || // dev hot reloads
    url.protocol === "chrome-extension:" ||
    url.href.includes("ws")
  ) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            // cache valid dynamic visual assets, scripts and styles
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // if offline, fail-silent
            return null;
          });

        // Serve instantly from cache, updating in the background, or fallback to network wait
        return cachedResponse || fetchPromise;
      });
    })
  );
});
