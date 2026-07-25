const CACHE_PREFIX = "gym-schedule-";
const CACHE = "gym-schedule-v44";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=44",
  "./styles/base.css?v=44",
  "./styles/components.css?v=44",
  "./styles/views.css?v=44",
  "./fonts/barlow-500-latin.woff2",
  "./fonts/barlow-600-latin.woff2",
  "./fonts/barlow-700-latin.woff2",
  "./fonts/barlow-condensed-500-latin.woff2",
  "./fonts/barlow-condensed-600-latin.woff2",
  "./fonts/ibm-plex-mono-500-latin.woff2",
  "./fonts/ibm-plex-mono-600-latin.woff2",
  "./fonts/ibm-plex-mono-700-latin.woff2",
  "./data.js?v=44",
  "./storage.js?v=44",
  "./ui/shared.js?v=44",
  "./ui/workout.js?v=44",
  "./ui/exercise-reference.js?v=44",
  "./ui/program.js?v=44",
  "./ui/library.js?v=44",
  "./ui/log-settings.js?v=44",
  "./app.js?v=44",
  "./manifest.json?v=44",
  "./icons/app-icon.svg",
  "./icons/app-icon-180.png",
  "./icons/app-icon-192.png",
  "./icons/app-icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
      }
      return response;
    })),
  );
});
