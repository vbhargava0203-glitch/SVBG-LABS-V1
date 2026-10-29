/* ==========================================================================
   SVBG NAV ICON REPAINT — additive, load-order fix only. Touches no other
   file's logic.

   Why this exists: js/app.js is loaded WITHOUT `defer`, so its boot() runs
   paintIcons() synchronously, immediately — before any of the deferred
   module scripts (extensions.js, svbg-mindarena.js, svbg-timeline.js,
   svbg-focusmusic.js, svbg-timecapsule.js, svbg-archives.js, svbg-about.js,
   etc.) have had a chance to run their own `Object.assign(ICONS, {...})`
   calls. Those modules' sidebar nav icons (brain, timeline, music-note,
   capsule, library, heart-message, dna, share, sparkles, radar,
   compass, history, id-badge...) were therefore always defined in code, but
   painted blank on load because ICONS didn't have them yet at the moment
   paintIcons() ran.

   Fix: this file is the LAST script tag in index.html (deferred, so it
   still runs before DOMContentLoaded but after every other deferred module
   has registered its icons). It just repaints every [data-icon] element in
   the document one more time, now that ICONS is fully populated. Idempotent
   and safe to call again later.
   ========================================================================== */
'use strict';
paintIcons();
