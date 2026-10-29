/* ==========================================================================
   SVBG SUDOKU — additive module, part of Mind Arena. Loaded after app.js,
   extensions.js, svbg-advanced.js, svbg-mindarena.js and svbg-chess.js.
   Reuses Store/toast/escapeHtml/uid/todayStr from app.js and XP/
   Achievements/Bus from extensions.js rather than redefining any of it.

   Two independent layers behind one renderer interface, same approach as
   SVBG Chess:
     1. A pure, dependency-free generator/solver — randomized backtracking
        fill, then hole-poking with a solution-count check (capped at 2)
        so every generated puzzle has exactly one solution, at 5 verified
        difficulty tiers (clue counts 46/36/30/26/~24). 100% offline.
     2. A visual layer that tries to load Three.js from its CDN for a real
        floating holographic glass board (transparent cells, neon edges,
        real lighting/shadows, a custom orbit camera). If the CDN is
        unreachable it falls back automatically to a polished 2D glass-
        styled grid — the puzzle itself is fully playable offline either
        way; only the 3D visual layer needs that one network fetch.

   Honesty note: completing puzzles here awards real XP and keeps its own
   local stats (completion count, average time, streaks) in
   `sudoku_stats` — it does not invent a new SVBG DNA metric, for the same
   reason given in the other Mind Arena modules' headers.
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};

  /* ======================================================================== *
   * PURE SUDOKU ENGINE
   * ======================================================================== */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function emptyGrid() { return new Array(81).fill(0); }
  function rc(r, c) { return r * 9 + c; }
  function isValidPlacement(grid, r, c, val) {
    for (let i = 0; i < 9; i++) { if (grid[rc(r, i)] === val) return false; if (grid[rc(i, c)] === val) return false; }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (grid[rc(br + i, bc + j)] === val) return false;
    return true;
  }
  function shuffle(arr, rng) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  function fillGrid(grid, rng) {
    for (let pos = 0; pos < 81; pos++) {
      if (grid[pos] !== 0) continue;
      const r = Math.floor(pos / 9), c = pos % 9;
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
      for (const n of nums) { if (isValidPlacement(grid, r, c, n)) { grid[pos] = n; if (fillGrid(grid, rng)) return true; grid[pos] = 0; } }
      return false;
    }
    return true;
  }
  function generateSolvedGrid(rng) { const grid = emptyGrid(); fillGrid(grid, rng); return grid; }
  function countSolutions(grid, cap) {
    cap = cap || 2; let count = 0; const g = grid.slice();
    function solve() {
      if (count >= cap) return;
      let pos = -1;
      for (let i = 0; i < 81; i++) if (g[i] === 0) { pos = i; break; }
      if (pos === -1) { count++; return; }
      const r = Math.floor(pos / 9), c = pos % 9;
      for (let n = 1; n <= 9; n++) { if (count >= cap) return; if (isValidPlacement(g, r, c, n)) { g[pos] = n; solve(); g[pos] = 0; } }
    }
    solve();
    return count;
  }
  const DIFFICULTY_CLUES = { easy: 46, medium: 36, hard: 30, expert: 26, extreme: 24 };
  function generatePuzzle(difficulty, rng) {
    const solved = generateSolvedGrid(rng);
    const puzzle = solved.slice();
    const targetClues = DIFFICULTY_CLUES[difficulty] || 36;
    const cellsToRemove = 81 - targetClues;
    const positions = shuffle([...Array(81).keys()], rng);
    let removed = 0;
    for (const pos of positions) {
      if (removed >= cellsToRemove) break;
      const backup = puzzle[pos];
      puzzle[pos] = 0;
      if (countSolutions(puzzle, 2) !== 1) puzzle[pos] = backup; else removed++;
    }
    return { puzzle, solution: solved, clues: 81 - removed };
  }
  function dailySeed() {
    const day = todayStr();
    let seed = 0; for (let i = 0; i < day.length; i++) seed = (seed * 31 + day.charCodeAt(i)) >>> 0;
    return seed;
  }

  /* ======================================================================== *
   * STORE / STATS / ACHIEVEMENTS
   * ======================================================================== */
  function defaultSudokuStats() {
    return { completed: 0, streak: 0, bestStreak: 0, bestTimeByDiff: {}, mistakesTotal: 0, hintsUsedTotal: 0, dailyCompletedDates: [], lastPlayed: null };
  }
  function sudokuStats() { return Object.assign(defaultSudokuStats(), Store.get('sudoku_stats', {})); }
  function saveSudokuStats(s) { Store.set('sudoku_stats', s); }
  function sudokuHistoryLog() { return Store.get('sudoku_history', []); }
  function pushSudokuHistory(e) { const h = sudokuHistoryLog(); h.unshift(e); Store.set('sudoku_history', h.slice(0, 60)); }
  function soundEnabled() { return Store.get('sudoku_sound_enabled', true); }
  function setSoundEnabled(v) { Store.set('sudoku_sound_enabled', v); }
  function cameraLocked() { return Store.get('sudoku_camera_locked', false); }
  function setCameraLockedPref(v) { Store.set('sudoku_camera_locked', v); }
  function savedGame() { return Store.get('sudoku_saved_game', null); }
  function saveGame(g) { Store.set('sudoku_saved_game', g); }
  function clearSavedGame() { Store.set('sudoku_saved_game', null); }

  const SUDOKU_ACHIEVEMENTS = [
    { id: 'sudoku_first_complete', title: 'First Grid', desc: 'Complete your first SVBG Sudoku puzzle', rarity: 'common', check: () => sudokuStats().completed >= 1 },
    { id: 'sudoku_streak_5', title: 'Sharp Mind', desc: 'Complete 5 puzzles in a row without giving up', rarity: 'rare', check: () => sudokuStats().bestStreak >= 5 },
    { id: 'sudoku_expert', title: 'Expert Solver', desc: 'Complete an Expert puzzle', rarity: 'epic', check: () => sudokuHistoryLog().some(h => h.difficulty === 'expert' && h.completed) },
    { id: 'sudoku_extreme', title: 'Extreme Solver', desc: 'Complete an Extreme puzzle', rarity: 'legendary', check: () => sudokuHistoryLog().some(h => h.difficulty === 'extreme' && h.completed) },
    { id: 'sudoku_no_mistakes', title: 'Flawless', desc: 'Complete a puzzle with zero mistakes', rarity: 'rare', check: () => sudokuHistoryLog().some(h => h.completed && h.mistakes === 0) },
    { id: 'sudoku_daily_7', title: 'Daily Devotion', desc: 'Complete 7 daily challenges', rarity: 'epic', check: () => (sudokuStats().dailyCompletedDates || []).length >= 7 },
    { id: 'sudoku_100', title: 'Grid Master', desc: 'Complete 100 SVBG Sudoku puzzles', rarity: 'legendary', check: () => sudokuStats().completed >= 100 },
  ];
  if (Ext.ACHIEVEMENT_DEFS) SUDOKU_ACHIEVEMENTS.forEach(def => { if (!Ext.ACHIEVEMENT_DEFS.some(d => d.id === def.id)) Ext.ACHIEVEMENT_DEFS.push(def); });

  /* ======================================================================== *
   * AUDIO — soft piano/synth tones + mechanical clicks, offline
   * ======================================================================== */
  function SudokuAudio() {
    let ctx = null, master = null, ambient = null, enabled = soundEnabled();
    function ensureCtx() {
      if (!enabled) return null;
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function startAmbient() {
      const c = ensureCtx(); if (!c) return;
      const g = c.createGain(); g.gain.value = 0; g.connect(master); g.gain.linearRampToValueAtTime(0.04, c.currentTime + 3);
      const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 800; filter.connect(g);
      const oscA = c.createOscillator(); oscA.type = 'sine'; oscA.frequency.value = 130.8;
      const oscB = c.createOscillator(); oscB.type = 'sine'; oscB.frequency.value = 196;
      [oscA, oscB].forEach(o => { o.connect(filter); o.start(); });
      const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.05;
      const lfoGain = c.createGain(); lfoGain.gain.value = 240; lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start();
      ambient = { g, oscA, oscB, lfo };
    }
    function stopAmbient() {
      if (!ambient || !ctx) return;
      const { g, oscA, oscB, lfo } = ambient, now = ctx.currentTime;
      g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.8);
      setTimeout(() => { try { oscA.stop(); oscB.stop(); lfo.stop(); } catch (e) {} }, 900);
      ambient = null;
    }
    function tone(freq, dur, type, vol) {
      const c = ensureCtx(); if (!c) return;
      const osc = c.createOscillator(); osc.type = type; osc.frequency.value = freq;
      const g = c.createGain(); g.gain.value = 0;
      osc.connect(g); g.connect(master);
      const t = c.currentTime;
      g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.03);
    }
    const NOTE_FREQ = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.7];
    function placeNumber(n) { tone(NOTE_FREQ[(n - 1) % NOTE_FREQ.length], 0.4, 'sine', 0.06); }
    function uiClick() { tone(1400, 0.05, 'square', 0.025); }
    function mistake() { tone(180, 0.35, 'sawtooth', 0.06); }
    function completeFanfare() { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.7, 'sine', 0.08), i * 130)); }
    function setEnabled(v) { enabled = v; if (!v) stopAmbient(); }
    function destroy() { stopAmbient(); if (ctx) { try { ctx.close(); } catch (e) {} ctx = null; master = null; } }
    return { startAmbient, stopAmbient, placeNumber, uiClick, mistake, completeFanfare, setEnabled, destroy };
  }

  /* ======================================================================== *
   * RENDERERS — shared interface, 3D (Three.js via CDN) with 2D fallback
   * ======================================================================== */
  function create2DRenderer(container, opts) {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.display = 'block';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let cells = new Array(81).fill(null);
    let selected = -1, popCells = [];
    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    function metrics() {
      const w = container.clientWidth, h = container.clientHeight;
      const size = Math.min(w, h) * 0.88;
      return { size, cell: size / 9, ox: (w - size) / 2, oy: (h - size) / 2 };
    }
    function xyToCell(x, y) {
      const { size, cell, ox, oy } = metrics();
      if (x < ox || y < oy || x > ox + size || y > oy + size) return -1;
      const c = Math.floor((x - ox) / cell), r = Math.floor((y - oy) / cell);
      return rc(r, c);
    }
    function draw() {
      const w = container.clientWidth, h = container.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, '#0d1524'); grad.addColorStop(1, '#03060c');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      const { size, cell, ox, oy } = metrics();
      ctx.save(); ctx.shadowColor = 'rgba(89,231,217,0.4)'; ctx.shadowBlur = 26;
      ctx.strokeStyle = 'rgba(89,231,217,0.6)'; ctx.lineWidth = 2.4;
      ctx.strokeRect(ox - 2, oy - 2, size + 4, size + 4);
      ctx.restore();
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const x = ox + c * cell, y = oy + r * cell;
        const idx = rc(r, c);
        const inSelectedLine = selected >= 0 && (Math.floor(selected / 9) === r || selected % 9 === c);
        ctx.fillStyle = idx === selected ? 'rgba(89,231,217,0.22)' : inSelectedLine ? 'rgba(89,231,217,0.07)' : ((Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)');
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cell, cell);
      }
      ctx.strokeStyle = 'rgba(89,231,217,0.45)'; ctx.lineWidth = 2;
      for (let i = 0; i <= 9; i += 3) {
        ctx.beginPath(); ctx.moveTo(ox + i * cell, oy); ctx.lineTo(ox + i * cell, oy + size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ox, oy + i * cell); ctx.lineTo(ox + size, oy + i * cell); ctx.stroke();
      }
      for (let i = 0; i < 81; i++) {
        const cdata = cells[i]; if (!cdata) continue;
        const r = Math.floor(i / 9), c = i % 9;
        const x = ox + c * cell, y = oy + r * cell;
        if (cdata.value) {
          ctx.font = (cdata.given ? '600 ' : '500 ') + (cell * 0.52) + 'px system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = cdata.wrong ? '#f43f5e' : cdata.given ? 'rgba(234,246,255,0.92)' : '#59E7D9';
          ctx.shadowColor = cdata.wrong ? 'rgba(244,63,94,0.6)' : 'rgba(89,231,217,0.5)'; ctx.shadowBlur = cdata.given ? 0 : 10;
          ctx.fillText(String(cdata.value), x + cell / 2, y + cell / 2 + 1);
          ctx.shadowBlur = 0;
        } else if (cdata.pencil && cdata.pencil.size) {
          ctx.font = (cell * 0.19) + 'px system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(234,246,255,0.4)';
          for (let n = 1; n <= 9; n++) {
            if (!cdata.pencil.has(n)) continue;
            const pr = Math.floor((n - 1) / 3), pc = (n - 1) % 3;
            ctx.fillText(String(n), x + cell * (0.2 + pc * 0.3), y + cell * (0.2 + pr * 0.3));
          }
        }
      }
      popCells.forEach(p => {
        const r = Math.floor(p.idx / 9), c = p.idx % 9;
        const x = ox + c * cell + cell / 2, y = oy + r * cell + cell / 2;
        ctx.beginPath();
        ctx.fillStyle = `rgba(89,231,217,${p.alpha})`;
        ctx.arc(x, y, cell * (0.15 + (1 - p.alpha) * 0.35), 0, Math.PI * 2);
        ctx.fill();
      });
    }
    canvas.addEventListener('pointerdown', e => {
      const rect = canvas.getBoundingClientRect();
      const idx = xyToCell(e.clientX - rect.left, e.clientY - rect.top);
      if (idx >= 0 && opts.onCellClick) opts.onCellClick(idx);
    });
    window.addEventListener('resize', resize);
    resize();
    let popRaf = null;
    function tickPop() { popCells.forEach(p => p.alpha -= 0.04); popCells = popCells.filter(p => p.alpha > 0); draw(); if (popCells.length) popRaf = requestAnimationFrame(tickPop); }
    return {
      is3D: false,
      setCells(c) { cells = c; draw(); },
      setSelected(idx) { selected = idx; draw(); },
      burst(idx) { popCells.push({ idx, alpha: 0.7 }); cancelAnimationFrame(popRaf); tickPop(); },
      celebrate() { draw(); },
      setCameraLocked() { /* no camera in the 2D fallback */ },
      destroy() { window.removeEventListener('resize', resize); cancelAnimationFrame(popRaf); canvas.remove(); },
    };
  }

  async function create3DRenderer(container, opts) {
    let THREE;
    try { THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js'); } catch (e) { return null; }
    try {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x03060c, 0.03);
      const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0x8899ff, 0.4));
      const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(3, 8, 4); key.castShadow = true; scene.add(key);
      const rim = new THREE.PointLight(0x59e7d9, 1.2, 20); rim.position.set(-4, 3, -3); scene.add(rim);
      const rim2 = new THREE.PointLight(0xb18cff, 0.9, 20); rim2.position.set(4, 3, -3); scene.add(rim2);

      const platform = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7, 0.35, 48), new THREE.MeshPhysicalMaterial({ color: 0x0b0e16, metalness: 0.8, roughness: 0.3 }));
      platform.position.y = -0.55; platform.receiveShadow = true; scene.add(platform);

      const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0e2a28, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, transmission: 0.6, thickness: 0.2 });
      const cellGroup = new THREE.Group();
      const cellMeshes = [];
      const geo = new THREE.BoxGeometry(0.92, 0.1, 0.92);
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const m = new THREE.Mesh(geo, glassMat.clone());
        m.position.set(c - 4, 0, r - 4);
        m.receiveShadow = true; m.userData.idx = rc(r, c);
        cellGroup.add(m); cellMeshes.push(m);
      }
      scene.add(cellGroup);

      const lineMat = new THREE.LineBasicMaterial({ color: 0x59e7d9, transparent: true, opacity: 0.55 });
      const boldMat = new THREE.LineBasicMaterial({ color: 0x59e7d9, transparent: true, opacity: 0.95 });
      for (let i = 0; i <= 9; i++) {
        const bold = i % 3 === 0;
        const pts1 = [new THREE.Vector3(i - 4.5, 0.08, -4.5), new THREE.Vector3(i - 4.5, 0.08, 4.5)];
        const pts2 = [new THREE.Vector3(-4.5, 0.08, i - 4.5), new THREE.Vector3(4.5, 0.08, i - 4.5)];
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts1), bold ? boldMat : lineMat));
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts2), bold ? boldMat : lineMat));
      }

      function numberTexture(n, color) {
        const c = document.createElement('canvas'); c.width = 128; c.height = 128;
        const cx = c.getContext('2d');
        cx.font = '700 92px system-ui, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.shadowColor = color; cx.shadowBlur = 18;
        cx.fillStyle = color;
        cx.fillText(String(n), 64, 70);
        return new THREE.CanvasTexture(c);
      }
      const numberTexCache = {};
      function getNumberTexture(n, color) { const key = n + color; if (!numberTexCache[key]) numberTexCache[key] = numberTexture(n, color); return numberTexCache[key]; }

      const numberMeshes = new Map();
      function clearNumbers() { numberMeshes.forEach(m => scene.remove(m)); numberMeshes.clear(); }
      function setCells(cells) {
        clearNumbers();
        for (let i = 0; i < 81; i++) {
          const cdata = cells[i]; if (!cdata || !cdata.value) continue;
          const r = Math.floor(i / 9), c = i % 9;
          const color = cdata.wrong ? '#f43f5e' : cdata.given ? '#eaf6ff' : '#59E7D9';
          const mat = new THREE.SpriteMaterial({ map: getNumberTexture(cdata.value, color), transparent: true });
          const spr = new THREE.Sprite(mat);
          spr.position.set(c - 4, 0.16, r - 4);
          spr.scale.set(0.55, 0.55, 1);
          scene.add(spr); numberMeshes.set(i, spr);
        }
      }

      function setSelected(idx) {
        cellMeshes.forEach(m => { m.material.opacity = m.userData.idx === idx ? 0.4 : 0.18; m.material.color.set(m.userData.idx === idx ? 0x59e7d9 : 0x0e2a28); });
      }

      const camTarget = new THREE.Vector3(0, 0, 0);
      let camTheta = Math.PI / 2, camPhi = 0.75, camRadius = 8;
      let lastInteraction = Date.now();
      // See the matching comment in svbg-chess.js: without this, the board's
      // edges clip off-screen on narrow/portrait viewports (e.g. 9:16 phones)
      // because a fixed camera distance doesn't compensate for the shrinking
      // horizontal field of view of a perspective camera at low aspect ratios.
      const CAMERA_REFERENCE_ASPECT = 1.05;
      function updateCamera() {
        const aspect = container.clientWidth / Math.max(1, container.clientHeight);
        const radius = aspect < CAMERA_REFERENCE_ASPECT ? camRadius * (CAMERA_REFERENCE_ASPECT / aspect) : camRadius;
        camera.position.set(camTarget.x + radius * Math.sin(camPhi) * Math.cos(camTheta), camTarget.y + radius * Math.cos(camPhi), camTarget.z + radius * Math.sin(camPhi) * Math.sin(camTheta));
        camera.lookAt(camTarget);
      }
      updateCamera();
      let dragging = false, lastX = 0, lastY = 0, cameraLocked = false;
      const dom = renderer.domElement; dom.style.touchAction = 'none';
      dom.addEventListener('pointerdown', e => { if (cameraLocked) return; dragging = true; lastX = e.clientX; lastY = e.clientY; lastInteraction = Date.now(); });
      window.addEventListener('pointerup', () => dragging = false);
      window.addEventListener('pointermove', e => {
        if (!dragging || cameraLocked) return;
        const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
        camTheta -= dx * 0.006; camPhi = Math.max(0.3, Math.min(1.3, camPhi - dy * 0.005));
        lastInteraction = Date.now();
      });
      dom.addEventListener('wheel', e => { if (cameraLocked) return; e.preventDefault(); camRadius = Math.max(4.5, Math.min(13, camRadius + e.deltaY * 0.01)); lastInteraction = Date.now(); }, { passive: false });

      const raycaster = new THREE.Raycaster(); const pointerNdc = new THREE.Vector2();
      dom.addEventListener('click', e => {
        const rect = dom.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(cellMeshes, false);
        if (hits.length && opts.onCellClick) opts.onCellClick(hits[0].object.userData.idx);
      });

      let bursts = [];
      function burst(idx) {
        const r = Math.floor(idx / 9), c = idx % 9;
        for (let i = 0; i < 14; i++) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0x59e7d9, transparent: true }));
          m.position.set(c - 4, 0.15, r - 4);
          const a = Math.random() * Math.PI * 2;
          m.userData.v = new THREE.Vector3(Math.cos(a) * 0.03, 0.02 + Math.random() * 0.02, Math.sin(a) * 0.03);
          m.userData.life = 1;
          scene.add(m); bursts.push(m);
        }
      }

      let raf = null;
      function resize() { camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); }
      window.addEventListener('resize', resize);
      function loop() {
        if (!cameraLocked && Date.now() - lastInteraction > 6000) camTheta += 0.001;
        updateCamera();
        bursts.forEach(p => { p.position.add(p.userData.v); p.userData.v.y -= 0.001; p.userData.life -= 0.02; p.material.opacity = Math.max(0, p.userData.life); });
        bursts = bursts.filter(p => { if (p.userData.life <= 0) { scene.remove(p); return false; } return true; });
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      }
      loop();

      return {
        is3D: true,
        setCells,
        setSelected,
        burst,
        celebrate() {
          cellMeshes.forEach((m, i) => setTimeout(() => { m.material.opacity = 0.55; m.material.color.set(0x59e7d9); setTimeout(() => { m.material.opacity = 0.18; m.material.color.set(0x0e2a28); }, 300); }, i * 8));
        },
        setCameraLocked(v) { cameraLocked = v; lastInteraction = Date.now(); },
        destroy() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); },
      };
    } catch (e) { return null; }
  }

  async function createSudokuRenderer(container, opts) {
    const r = await Promise.race([
      create3DRenderer(container, opts).catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(null), 4500)),
    ]);
    if (r) return r;
    return create2DRenderer(container, opts);
  }

  /* ======================================================================== *
   * SESSION CONTROLLER
   * ======================================================================== */
  function launchSudoku() {
    const stage = document.createElement('div');
    stage.className = 'sudoku-stage';
    document.body.appendChild(stage);
    document.body.style.overflow = 'hidden';
    renderSetupScreen();

    function renderSetupScreen() {
      const stats = sudokuStats();
      const saved = savedGame();
      stage.innerHTML = `
        <div class="sudoku-setup">
          <div class="sudoku-setup-card">
            <div class="sudoku-setup-title">SVBG Sudoku</div>
            <div class="sudoku-setup-sub">${stats.completed} completed · best streak ${stats.bestStreak}</div>
            ${saved ? `<button class="sudoku-resume-btn" id="sudoku-resume-btn">Resume saved puzzle (${saved.difficulty})</button>` : ''}
            <div class="sudoku-setup-label">Difficulty</div>
            <div class="sudoku-setup-row" id="sudoku-diff-row">
              ${Object.keys(DIFFICULTY_CLUES).map((d, i) => `<button class="chip-btn ${i===1?'is-selected':''}" data-diff="${d}">${d[0].toUpperCase()+d.slice(1)}</button>`).join('')}
            </div>
            <div class="sudoku-setup-label">Style</div>
            <div class="sudoku-setup-row" id="sudoku-mode-row">
              <button class="chip-btn is-selected" data-relax="0">Standard</button>
              <button class="chip-btn" data-relax="1">Relax Mode (no mistake alerts, no timer)</button>
            </div>
            <button class="sudoku-start-btn" id="sudoku-begin-btn">Enter the Grid</button>
            <button class="sudoku-daily-btn" id="sudoku-daily-btn">Today's Daily Challenge</button>
          </div>
        </div>`;
      let difficulty = 'medium', relax = false;
      stage.querySelectorAll('#sudoku-diff-row .chip-btn').forEach(b => b.addEventListener('click', () => { difficulty = b.dataset.diff; stage.querySelectorAll('#sudoku-diff-row .chip-btn').forEach(o => o.classList.remove('is-selected')); b.classList.add('is-selected'); }));
      stage.querySelectorAll('#sudoku-mode-row .chip-btn').forEach(b => b.addEventListener('click', () => { relax = b.dataset.relax === '1'; stage.querySelectorAll('#sudoku-mode-row .chip-btn').forEach(o => o.classList.remove('is-selected')); b.classList.add('is-selected'); }));
      stage.querySelector('#sudoku-begin-btn').addEventListener('click', () => startGame({ difficulty, relax, mode: 'standard' }));
      stage.querySelector('#sudoku-daily-btn').addEventListener('click', () => startGame({ difficulty: 'medium', relax: false, mode: 'daily' }));
      const resumeBtn = stage.querySelector('#sudoku-resume-btn');
      if (resumeBtn) resumeBtn.addEventListener('click', () => startGame(null, saved));
    }

    async function startGame(cfg, resumeState) {
      let state;
      if (resumeState) {
        state = resumeState;
      } else {
        const rng = cfg.mode === 'daily' ? mulberry32(dailySeed()) : mulberry32(Date.now() >>> 0);
        const { puzzle, solution } = generatePuzzle(cfg.difficulty, rng);
        state = {
          difficulty: cfg.difficulty, mode: cfg.mode, relax: cfg.relax,
          puzzle, solution,
          values: puzzle.slice(),
          pencil: new Array(81).fill(0).map(() => []),
          given: puzzle.map(v => v !== 0),
          mistakes: 0, hintsUsed: 0, startedAt: Date.now(), elapsedBefore: 0,
        };
      }
      const audio = SudokuAudio(); audio.setEnabled(soundEnabled());
      let selected = -1;
      let pencilMode = false;
      let gameOver = false;
      let undoStack = [], redoStack = [];

      stage.innerHTML = `
        <div class="sudoku-board-wrap" id="sudoku-board-wrap"></div>
        <div class="sudoku-hud-top">
          <div class="sudoku-hud-chip">
            <span id="sudoku-timer">00:00</span>
            ${state.relax ? '' : '<span class="sudoku-mistake-count" id="sudoku-mistakes">Mistakes: 0/3</span>'}
          </div>
          <div class="sudoku-hud-actions">
            <button class="sudoku-icon-btn" id="sudoku-pencil-btn" title="Pencil marks">✏️</button>
            <button class="sudoku-icon-btn" id="sudoku-hint-btn" title="Hint">💡</button>
            <button class="sudoku-icon-btn" id="sudoku-undo-btn" title="Undo">↩</button>
            <button class="sudoku-icon-btn" id="sudoku-redo-btn" title="Redo">↪</button>
            <button class="sudoku-icon-btn ${cameraLocked() ? 'is-active' : ''}" id="sudoku-camera-btn" title="Camera position" style="display:none;">📷</button>
            <button class="sudoku-icon-btn" id="sudoku-sound-btn" title="Sound">${soundEnabled() ? '🔊' : '🔇'}</button>
            <button class="sudoku-icon-btn" id="sudoku-exit-btn" title="Exit">✕</button>
          </div>
        </div>
        <div class="sudoku-numpad" id="sudoku-numpad">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="sudoku-num-btn" data-n="${n}">${n}</button>`).join('')}
          <button class="sudoku-num-btn sudoku-erase-btn" data-n="0">Erase</button>
        </div>
      `;
      const boardWrap = stage.querySelector('#sudoku-board-wrap');
      const renderer = await createSudokuRenderer(boardWrap, { onCellClick: onCellClick });
      renderer.setCells(buildCellData());
      audio.startAmbient();
      const cameraBtn = stage.querySelector('#sudoku-camera-btn');
      if (renderer.is3D && cameraBtn) {
        cameraBtn.style.display = '';
        renderer.setCameraLocked(cameraLocked());
        cameraBtn.addEventListener('click', () => {
          const v = !cameraLocked();
          setCameraLockedPref(v);
          renderer.setCameraLocked(v);
          cameraBtn.classList.toggle('is-active', v);
          cameraBtn.title = v ? 'Camera locked — click to unlock' : 'Camera free — click to lock in place';
        });
      }

      function buildCellData() {
        return state.values.map((v, i) => ({ value: v, given: state.given[i], wrong: v !== 0 && !state.given[i] && v !== state.solution[i], pencil: new Set(state.pencil[i]) }));
      }
      function refresh() { renderer.setCells(buildCellData()); }

      function onCellClick(idx) {
        if (gameOver) return;
        selected = idx; renderer.setSelected(idx); audio.uiClick();
      }

      function snapshot() { return { values: state.values.slice(), pencil: state.pencil.map(p => p.slice()), mistakes: state.mistakes }; }
      function pushUndo() { undoStack.push(snapshot()); redoStack = []; }

      function placeNumber(n) {
        if (selected < 0 || state.given[selected] || gameOver) return;
        pushUndo();
        if (pencilMode && n !== 0) {
          const set = state.pencil[selected];
          const i = set.indexOf(n);
          if (i >= 0) set.splice(i, 1); else set.push(n);
          audio.uiClick();
          refresh();
          return;
        }
        state.values[selected] = n;
        state.pencil[selected] = [];
        if (n !== 0) {
          if (n === state.solution[selected]) {
            renderer.burst(selected);
            audio.placeNumber(n);
          } else if (!state.relax) {
            state.mistakes++;
            audio.mistake();
            updateMistakeHud();
          } else {
            audio.placeNumber(n);
          }
        }
        refresh();
        checkCompletion();
      }

      function updateMistakeHud() {
        const el = stage.querySelector('#sudoku-mistakes');
        if (el) el.textContent = `Mistakes: ${state.mistakes}/3`;
        if (!state.relax && state.mistakes >= 3) { gameOver = true; setTimeout(() => finishGame(false), 400); }
      }

      function checkCompletion() {
        const done = state.values.every((v, i) => v === state.solution[i]);
        if (done) { gameOver = true; renderer.celebrate(); audio.completeFanfare(); setTimeout(() => finishGame(true), 500); }
      }

      function giveHint() {
        if (selected < 0 || gameOver) { toast('Select a cell first.'); return; }
        if (state.given[selected] || state.values[selected] === state.solution[selected]) { toast('That cell is already correct.'); return; }
        pushUndo();
        state.values[selected] = state.solution[selected];
        state.pencil[selected] = [];
        state.hintsUsed++;
        renderer.burst(selected);
        audio.placeNumber(state.solution[selected]);
        refresh();
        checkCompletion();
      }

      function undo() {
        if (!undoStack.length) return;
        redoStack.push(snapshot());
        const prev = undoStack.pop();
        state.values = prev.values; state.pencil = prev.pencil; state.mistakes = prev.mistakes;
        updateMistakeHud(); refresh();
      }
      function redo() {
        if (!redoStack.length) return;
        undoStack.push(snapshot());
        const next = redoStack.pop();
        state.values = next.values; state.pencil = next.pencil; state.mistakes = next.mistakes;
        updateMistakeHud(); refresh();
      }

      function finishGame(solved) {
        const elapsed = state.elapsedBefore + Math.round((Date.now() - state.startedAt) / 1000);
        clearSavedGame();
        const stats = sudokuStats();
        if (solved) {
          stats.completed++;
          stats.streak++;
          stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
          const bestKey = state.difficulty;
          if (!stats.bestTimeByDiff[bestKey] || elapsed < stats.bestTimeByDiff[bestKey]) stats.bestTimeByDiff[bestKey] = elapsed;
          if (state.mode === 'daily') { const dates = stats.dailyCompletedDates || []; const day = todayStr(); if (!dates.includes(day)) dates.push(day); stats.dailyCompletedDates = dates.slice(-120); }
        } else { stats.streak = 0; }
        stats.mistakesTotal += state.mistakes;
        stats.hintsUsedTotal += state.hintsUsed;
        stats.lastPlayed = new Date().toISOString();
        saveSudokuStats(stats);
        pushSudokuHistory({ date: todayStr(), difficulty: state.difficulty, mode: state.mode, completed: solved, mistakes: state.mistakes, hintsUsed: state.hintsUsed, elapsed });
        const xp = solved ? Math.round(14 + (81 - state.puzzle.filter(v => v !== 0).length) * 0.4 - state.hintsUsed * 1.5) : 3;
        if (Ext.award) Ext.award(Math.max(3, xp), solved ? 'Completed an SVBG Sudoku puzzle' : 'Played SVBG Sudoku');
        if (Ext.Bus) Ext.Bus.emit('activity');
        if (Ext.Achievements) Ext.Achievements.check();
        showSummary({ solved, elapsed, xp: Math.max(0, xp), difficulty: state.difficulty });
      }

      function showSummary({ solved, elapsed, xp, difficulty }) {
        const overlay = document.createElement('div');
        overlay.className = 'sudoku-summary-overlay';
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0'), ss = String(elapsed % 60).padStart(2, '0');
        overlay.innerHTML = `
          <div class="sudoku-summary-card">
            <div class="sudoku-summary-title">${solved ? 'Grid solved' : 'Three mistakes — grid reset'}</div>
            <div class="sudoku-summary-sub">${difficulty[0].toUpperCase()+difficulty.slice(1)} · ${mm}:${ss}${xp ? ' · +' + xp + ' XP' : ''}</div>
            <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;">
              <button class="btn" id="sudoku-summary-exit">Leave Arena</button>
              <button class="btn btn-primary" id="sudoku-summary-again">New Puzzle</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#sudoku-summary-exit').addEventListener('click', () => { overlay.remove(); renderer.destroy(); audio.destroy(); cleanupAndExit(); });
        overlay.querySelector('#sudoku-summary-again').addEventListener('click', () => { overlay.remove(); renderer.destroy(); audio.destroy(); renderSetupScreen(); });
      }

      stage.querySelectorAll('#sudoku-numpad .sudoku-num-btn').forEach(b => b.addEventListener('click', () => placeNumber(parseInt(b.dataset.n, 10))));
      stage.querySelector('#sudoku-pencil-btn').addEventListener('click', (e) => { pencilMode = !pencilMode; e.target.classList.toggle('is-active', pencilMode); });
      stage.querySelector('#sudoku-hint-btn').addEventListener('click', giveHint);
      stage.querySelector('#sudoku-undo-btn').addEventListener('click', undo);
      stage.querySelector('#sudoku-redo-btn').addEventListener('click', redo);
      stage.querySelector('#sudoku-sound-btn').addEventListener('click', (e) => { const v = !soundEnabled(); setSoundEnabled(v); audio.setEnabled(v); e.target.textContent = v ? '🔊' : '🔇'; });
      stage.querySelector('#sudoku-exit-btn').addEventListener('click', () => {
        if (!gameOver) { state.elapsedBefore += Math.round((Date.now() - state.startedAt) / 1000); saveGame(state); }
        renderer.destroy(); audio.destroy(); cleanupAndExit();
      });
      document.addEventListener('keydown', keyHandler);
      function keyHandler(e) {
        if (!stage.isConnected) { document.removeEventListener('keydown', keyHandler); return; }
        if (e.key >= '1' && e.key <= '9') placeNumber(parseInt(e.key, 10));
        else if (e.key === 'Backspace' || e.key === 'Delete') placeNumber(0);
        else if (e.key === 'Escape') stage.querySelector('#sudoku-exit-btn').click();
      }

      let timerIv = setInterval(() => {
        if (state.relax) { const el = stage.querySelector('#sudoku-timer'); if (el) el.textContent = '—'; else clearInterval(timerIv); return; }
        const elapsed = state.elapsedBefore + Math.round((Date.now() - state.startedAt) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0'), ss = String(elapsed % 60).padStart(2, '0');
        const el = stage.querySelector('#sudoku-timer');
        if (el) el.textContent = `${mm}:${ss}`; else clearInterval(timerIv);
      }, 1000);
    }

    function cleanupAndExit() {
      document.body.style.overflow = '';
      stage.remove();
    }
  }

  window.SVBGSudoku = { launch: launchSudoku };
})();
