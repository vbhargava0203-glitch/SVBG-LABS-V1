/* ==========================================================================
   SVBG MIND ARENA — hub module, loaded after app.js, extensions.js and
   svbg-advanced.js, before svbg-sudoku.js and svbg-cyberlock.js. Reuses
   Store/Views/ViewMount/ViewUnmount/renderView/toast/escapeHtml from app.js.

   Renders the Mind Arena hub (SVBG Sudoku, SVBG Cyber Lock) and, on
   selecting one, plays a short (~4s) offline cinematic "neural corridor"
   flythrough — a Canvas 2D warp-tunnel effect, not a Three.js scene, since
   it only needs to run once per launch and a dependency-free version means
   it never skips or stutters waiting on a CDN fetch — before handing off to
   window.SVBGSudoku.launch() or window.SVBGCyberLock.launch(), each of
   which is defined in its own file and manages its own fullscreen stage
   from that point on.

   Chess was removed from this hub (and js/svbg-chess.js + css/svbg-chess.css
   removed from the project entirely) at the product owner's request.
   ========================================================================== */
'use strict';

(function () {
  Object.assign(ICONS, {
    brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.5A2.5 2.5 0 0 1 4 17.5v-1A2.5 2.5 0 0 1 2.5 14 2.5 2.5 0 0 1 4 9.5 2.5 2.5 0 0 1 3 7a2.5 2.5 0 0 1 2.5-2.5A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.5A2.5 2.5 0 0 0 20 17.5v-1a2.5 2.5 0 0 0 1.5-2.5A2.5 2.5 0 0 0 20 9.5 2.5 2.5 0 0 0 21 7a2.5 2.5 0 0 0-2.5-2.5A2.5 2.5 0 0 0 14.5 2z"/></svg>',
    'grid-3x3': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
    'cyber-lock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.8 5.8l1.7 1.7M16.5 16.5l1.7 1.7M5.8 18.2l1.7-1.7M16.5 7.5l1.7-1.7"/></svg>',
  });

  function mindArenaStats() {
    const sudoku = Store.get('sudoku_stats', {});
    const cyberlock = Store.get('cyberlock_stats', {});
    return {
      sudokuCompleted: sudoku.completed || 0, sudokuStreak: sudoku.bestStreak || 0,
      cyberlockUnlocks: cyberlock.totalVaultsOpened || 0, cyberlockBestLevel: cyberlock.bestLevel || 0,
    };
  }

  Views.mindarena = function () {
    const s = mindArenaStats();
    return `
      <div class="arena-hero">
        <div class="arena-hero-title">🧠 SVBG Mind Arena</div>
        <div class="arena-hero-sub">Two premium, fully offline strategy games — an infinite, always-unique Sudoku generator and a cyber-vault rotation puzzle. Pick one to step through the corridor.</div>
      </div>
      <div class="arena-grid">
        <div class="arena-card" id="arena-card-sudoku">
          <div class="arena-card-icon"><span class="nav-icon" data-icon="grid-3x3" style="width:34px;height:34px;"></span></div>
          <div class="arena-card-title">🔢 SVBG Sudoku</div>
          <div class="arena-card-desc">An infinite generator that verifies a unique solution for every puzzle, across 5 difficulties, with pencil marks, mistake detection, hints, undo/redo, and a daily challenge.</div>
          <div class="arena-card-stats">
            <span>${s.sudokuCompleted} completed</span><span>Best streak ${s.sudokuStreak}</span>
          </div>
          <button class="arena-enter-btn">Enter</button>
        </div>
        <div class="arena-card" id="arena-card-cyberlock">
          <div class="arena-card-icon"><span class="nav-icon" data-icon="cyber-lock" style="width:34px;height:34px;"></span></div>
          <div class="arena-card-title">🔐 SVBG Cyber Lock</div>
          <div class="arena-card-desc">Rotate concentric security rings to align every encrypted key segment and decrypt the quantum vault. Four difficulty tiers, Zen and Time Attack modes, and vaults that keep getting harder the deeper you go.</div>
          <div class="arena-card-stats">
            <span>${s.cyberlockUnlocks} vaults opened</span><span>Best depth L${s.cyberlockBestLevel}</span>
          </div>
          <button class="arena-enter-btn">Enter</button>
        </div>
      </div>
    `;
  };

  ViewMount.mindarena = function (root) {
    const sudokuCard = root.querySelector('#arena-card-sudoku');
    const cyberlockCard = root.querySelector('#arena-card-cyberlock');
    if (sudokuCard) sudokuCard.addEventListener('click', () => playCorridorIntro('sudoku'));
    if (cyberlockCard) cyberlockCard.addEventListener('click', () => playCorridorIntro('cyberlock'));
  };
  ViewUnmount.mindarena = function () {};

  /* ======================================================================== *
   * CINEMATIC CORRIDOR INTRO — Canvas 2D warp-tunnel, ~4 seconds
   * ======================================================================== */
  const GAME_META = {
    sudoku: { label: 'Entering SVBG Sudoku', launch: () => window.SVBGSudoku && window.SVBGSudoku.launch() },
    cyberlock: { label: 'Entering SVBG Cyber Lock', launch: () => window.SVBGCyberLock && window.SVBGCyberLock.launch() },
  };

  function playCorridorIntro(game) {
    const meta = GAME_META[game] || GAME_META.sudoku;
    const overlay = document.createElement('div');
    overlay.className = 'arena-intro-overlay';
    overlay.innerHTML = `
      <canvas id="arena-intro-canvas"></canvas>
      <div class="arena-intro-label">${meta.label}</div>
      <button class="arena-intro-skip" id="arena-intro-skip">Skip</button>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const canvas = overlay.querySelector('#arena-intro-canvas');
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    function resize() {
      canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const rings = [];
    const RING_COUNT = 26;
    for (let i = 0; i < RING_COUNT; i++) rings.push({ z: i / RING_COUNT, seed: Math.random() * Math.PI * 2 });
    const nodePairs = [];
    for (let i = 0; i < 40; i++) nodePairs.push({ z: Math.random(), angle: Math.random() * Math.PI * 2, radius: 0.6 + Math.random() * 0.4 });

    let done = false;
    const startTime = performance.now();
    const DURATION = 4000;

    function finish() {
      if (done) return;
      done = true;
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
      document.body.style.overflow = '';
      overlay.remove();
      meta.launch();
    }
    overlay.querySelector('#arena-intro-skip').addEventListener('click', finish);

    let raf = null;
    function draw(now) {
      const t = Math.min(1, (now - startTime) / DURATION);
      const speed = 0.08 + t * 0.5; // accelerate through the corridor
      const w = window.innerWidth, h = window.innerHeight;
      ctx.fillStyle = '#03050a';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const maxR = Math.hypot(w, h) / 2;

      rings.forEach(r => {
        r.z -= speed * 0.016;
        if (r.z < 0) r.z += 1;
        const depth = r.z;
        const radius = (1 - depth) * maxR;
        const alpha = Math.min(1, (1 - depth) * 1.4) * (0.15 + 0.5 * (1 - depth));
        const hue = t < 0.5 ? 'rgba(89,231,217,' : 'rgba(177,140,255,';
        ctx.beginPath();
        ctx.strokeStyle = hue + alpha.toFixed(3) + ')';
        ctx.lineWidth = 1.5 + (1 - depth) * 2;
        for (let a = 0; a <= 6; a++) {
          const ang = (a / 6) * Math.PI * 2 + r.seed;
          const x = cx + Math.cos(ang) * radius, y = cy + Math.sin(ang) * radius * 0.62;
          if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      });

      nodePairs.forEach(n => {
        n.z -= speed * 0.02;
        if (n.z < 0) n.z += 1;
        const depth = n.z;
        const radius = (1 - depth) * maxR * n.radius;
        const x = cx + Math.cos(n.angle) * radius, y = cy + Math.sin(n.angle) * radius * 0.62;
        const size = (1 - depth) * 3 + 0.5;
        const alpha = Math.min(1, (1 - depth) * 1.6);
        ctx.beginPath();
        ctx.fillStyle = `rgba(234,246,255,${alpha})`;
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // central glow that intensifies near the end (arrival flash)
      const glowAlpha = t > 0.8 ? (t - 0.8) / 0.2 : 0.15;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.5);
      grad.addColorStop(0, `rgba(255,255,255,${glowAlpha * 0.9})`);
      grad.addColorStop(0.3, `rgba(89,231,217,${glowAlpha * 0.4})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      if (t >= 1) { finish(); return; }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
  }

  window.SVBGMindArena = { playCorridorIntro };
})();
