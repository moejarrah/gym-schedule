// Offline support: every app file is cached, and the app runs from that cache.
// `npm run check` rewrites VERSION and FILES below (tools/check.mjs). A new
// VERSION makes installed apps download the new files and reload once.

const VERSION = "f13d13918c"; // stamped
const FILES = [
  "./index.html",
  "./manifest.json",
  "./styles/base.css",
  "./styles/components.css",
  "./styles/views.css",
  "./js/app.js",
  "./js/context.js",
  "./js/dom.js",
  "./js/model.js",
  "./js/search.js",
  "./js/seed.js",
  "./js/store.js",
  "./js/views/entry-editor.js",
  "./js/views/exercise-editor.js",
  "./js/views/history.js",
  "./js/views/library.js",
  "./js/views/log.js",
  "./js/views/logger.js",
  "./js/views/program.js",
  "./js/views/reference.js",
  "./js/views/settings.js",
  "./js/views/shared.js",
  "./js/views/workout.js",
  "./js/vocab.js",
  "./fonts/barlow-500-latin.woff2",
  "./fonts/barlow-600-latin.woff2",
  "./fonts/barlow-700-latin.woff2",
  "./fonts/barlow-condensed-600-latin.woff2",
  "./fonts/ibm-plex-mono-500-latin.woff2",
  "./fonts/ibm-plex-mono-600-latin.woff2",
  "./fonts/ibm-plex-mono-700-latin.woff2",
  "./icons/app-icon-180.png",
  "./icons/app-icon-192.png",
  "./icons/app-icon-512.png",
  "./icons/app-icon.svg"
]; // stamped

const CACHE_PREFIX = "gym-schedule-";
const CACHE = `${CACHE_PREFIX}${VERSION}`;
const APP_PAGES = [new URL("./", self.location).href, new URL("./index.html", self.location).href];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: "reload" })))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      // Other apps can share this origin, so only this app's old caches are removed.
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    // Only the app's own address opens the cached app; other pages (the phone
    // preview in tools/) load normally.
    const { origin, pathname } = new URL(request.url);
    if (!APP_PAGES.includes(origin + pathname)) return;
    event.respondWith(caches.match("./index.html").then((cached) => cached || fetch(request)));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
