// Bridge service worker — minimal & safe.
// Its only jobs right now are (a) to make the app installable as a PWA and
// (b) to take control quickly on update. It deliberately does NOT cache
// responses yet — caching auth/API responses naively risks serving stale or
// cross-user data. Real offline caching (Workbox/Serwist) is a later enhancement.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch handler must exist for the install criteria. Pass through to the
// network with no caching.
self.addEventListener("fetch", () => {
  // Intentionally empty: let the browser handle the request normally.
});
