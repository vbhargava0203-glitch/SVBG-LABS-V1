/* ==========================================================================
   SVBG LABS SERVICE WORKER
   Note: service workers only register over HTTPS or on localhost — never
   under file://. If you're opening index.html directly from disk, the app
   still works exactly the same, it just won't be installable/offline-cached
   this way (registration is skipped gracefully in js/svbg-pwa.js).
   ========================================================================== */
const CACHE_VERSION = 'svbg-labs-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  "css/extensions.css",
  "css/styles.css",
  "css/svbg-about.css",
  "css/svbg-advanced.css",
  "css/svbg-archives.css",
  "css/svbg-assistant.css",
  "css/svbg-cyberlock.css",
  "css/svbg-easter.css",
  "css/svbg-focusmusic.css",
  "css/svbg-identity.css",
  "css/svbg-identity2.css",
  "css/svbg-mindarena.css",
  "css/svbg-onboarding.css",
  "css/svbg-sudoku.css",
  "css/svbg-timecapsule.css",
  "css/svbg-timeline.css",
  "css/svbg-v2.css",
  "js/app.js",
  "js/extensions.js",
  "js/svbg-about.js",
  "js/svbg-activitycore.js",
  "js/svbg-activityfeed.js",
  "js/svbg-advanced.js",
  "js/svbg-archives.js",
  "js/svbg-assistant.js",
  "js/svbg-cyberlock.js",
  "js/svbg-dailymission.js",
  "js/svbg-easter.js",
  "js/svbg-focusforest.js",
  "js/svbg-focusmusic.js",
  "js/svbg-identity.js",
  "js/svbg-identity2.js",
  "js/svbg-mission2.js",
  "js/svbg-profile-core.js",
  "js/svbg-mindarena.js",
  "js/svbg-mindlab.js",
  "js/svbg-navicons.js",
  "js/svbg-onboarding.js",
  "js/svbg-pwa.js",
  "js/svbg-sudoku.js",
  "js/svbg-timecapsule.js",
  "js/svbg-timeline.js",
  "js/svbg-toolkit.js",
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CORE_ASSETS).catch(err => console.warn('SVBG SW: some assets failed to precache', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin (there shouldn't be any)

  if (req.mode === 'navigate') {
    // network-first for the page itself, so updates are picked up when online
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // cache-first with a background revalidation for everything else same-origin
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
