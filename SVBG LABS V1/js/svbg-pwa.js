/* ==========================================================================
   SVBG PWA — service worker registration + a small, honest offline
   indicator. Service workers require HTTPS or localhost; under file:// (the
   most common way to open a folder like this one directly) registration is
   skipped entirely and the app just runs as it always has, no PWA install
   prompt, no offline caching from the service worker layer. This is stated
   here rather than silently failing.
   ========================================================================== */
'use strict';

(function () {
  function mountOfflineBanner() {
    if (document.getElementById('svbg-offline-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'svbg-offline-banner';
    banner.className = 'svbg-offline-banner';
    banner.textContent = 'SVBG Offline Mode — all local systems operational';
    document.body.appendChild(banner);
    function update() { banner.classList.toggle('is-visible', !navigator.onLine); }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }
  mountOfflineBanner();

  const canUseServiceWorker = 'serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  if (!canUseServiceWorker) {
    console.info('SVBG PWA: service worker unavailable here (needs HTTPS or localhost) — app runs normally without install/offline-cache support.');
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.warn('SVBG PWA: service worker registration failed', err);
    });
  });
})();
