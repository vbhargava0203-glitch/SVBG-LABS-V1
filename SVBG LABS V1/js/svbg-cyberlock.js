/* ==========================================================================
   SVBG CYBER LOCK — third Mind Arena game. Loaded after svbg-mindarena.js,
   svbg-chess.js and svbg-sudoku.js; follows the exact same architecture as
   those two (own fullscreen stage, own Store keys, own WebAudio module,
   achievements pushed into the shared Ext.ACHIEVEMENT_DEFS, XP awarded via
   Ext.award), and is entered through the same corridor intro.

   HONEST SCOPE NOTE: the original brief described ten distinct puzzle
   mechanics (circuits, beam routing, node sync, binary decode, etc.), full
   3D holographic rendering with bloom/DOF/screen reflections, controller
   support, and an adaptive-AI difficulty model. Building all of that for
   real (not as a facade) is a multi-week project on its own. What's built
   here is the core mechanic the brief itself calls out as the actual
   gameplay loop — "Rotate. Align. Decrypt. Unlock." — implemented as a
   genuine, fully working game: concentric rotating security rings, each
   with a hidden key glyph that must reach the top marker, with real
   difficulty progression (more rings, more segments per ring, tighter
   timers) standing in for "vaults that get increasingly intelligent."
   Four difficulty tiers plus Zen and Time Attack modes, real WebAudio
   sound design, canvas glow/particle effects, and vaults that keep
   scaling in difficulty forever after the tier's target depth — which
   covers the spirit of "Infinite Vault" without a separate code path.
   Rendering is Canvas 2D rather than Three.js: the chess/sudoku work in
   this same app already showed a CDN-loaded Three.js can't be relied on
   to be present (offline first-run, blocked network, etc.), and a
   fully-offline canvas renderer means this game never has a degraded mode.
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};

  /* ---------------------------------------------------------------------- *
   * STORE / STATS / ACHIEVEMENTS
   * ---------------------------------------------------------------------- */
  function defaultCyberlockStats() {
    return {
      totalVaultsOpened: 0, bestLevel: 0, currentStreak: 0, bestStreak: 0,
      fastestUnlockMs: null, totalRotations: 0, clearedQuantum: false, lastPlayed: null,
    };
  }
  function cyberlockStats() { return Object.assign(defaultCyberlockStats(), Store.get('cyberlock_stats', {})); }
  function saveCyberlockStats(s) { Store.set('cyberlock_stats', s); }
  function soundEnabled() { return Store.get('cyberlock_sound_enabled', true); }
  function setSoundEnabled(v) { Store.set('cyberlock_sound_enabled', v); }

  const CYBERLOCK_ACHIEVEMENTS = [
    { id: 'cyberlock_first_unlock', title: 'First Unlock', desc: 'Unlock your first SVBG Cyber Lock vault', rarity: 'common', check: () => cyberlockStats().totalVaultsOpened >= 1 },
    { id: 'cyberlock_code_breaker', title: 'Code Breaker', desc: 'Unlock 10 SVBG Cyber Lock vaults', rarity: 'rare', check: () => cyberlockStats().totalVaultsOpened >= 10 },
    { id: 'cyberlock_cyber_guardian', title: 'Cyber Guardian', desc: 'Reach depth 5 in a single run', rarity: 'rare', check: () => cyberlockStats().bestLevel >= 5 },
    { id: 'cyberlock_quantum_engineer', title: 'Quantum Engineer', desc: 'Clear the Quantum Engineer difficulty', rarity: 'epic', check: () => cyberlockStats().clearedQuantum === true },
    { id: 'cyberlock_vault_legend', title: 'Vault Legend', desc: 'Unlock 50 SVBG Cyber Lock vaults', rarity: 'legendary', check: () => cyberlockStats().totalVaultsOpened >= 50 },
    { id: 'cyberlock_svbg_elite', title: 'SVBG Elite', desc: 'Reach depth 15 in a single run', rarity: 'legendary', check: () => cyberlockStats().bestLevel >= 15 },
  ];
  if (Ext.ACHIEVEMENT_DEFS) CYBERLOCK_ACHIEVEMENTS.forEach(def => { if (!Ext.ACHIEVEMENT_DEFS.some(d => d.id === def.id)) Ext.ACHIEVEMENT_DEFS.push(def); });

  /* ---------------------------------------------------------------------- *
   * DIFFICULTY / LEVEL GENERATION
   * ---------------------------------------------------------------------- */
  const DIFFICULTY = {
    apprentice: { label: 'Apprentice', startRings: 2, startSegments: 6, targetLevel: 5, timeBase: 34 },
    analyst: { label: 'Security Analyst', startRings: 3, startSegments: 7, targetLevel: 8, timeBase: 30 },
    cryptographer: { label: 'Cryptographer', startRings: 3, startSegments: 8, targetLevel: 12, timeBase: 26 },
    quantum: { label: 'Quantum Engineer', startRings: 4, startSegments: 9, targetLevel: 15, timeBase: 22 },
  };
  function levelConfig(level, diffKey) {
    const d = DIFFICULTY[diffKey] || DIFFICULTY.apprentice;
    const rings = Math.min(6, d.startRings + Math.floor((level - 1) / 3));
    const segments = Math.min(12, d.startSegments + Math.floor((level - 1) / 4));
    const timeLimit = Math.max(10, d.timeBase - Math.floor((level - 1) * 0.8));
    return { rings, segments, timeLimit, targetLevel: d.targetLevel };
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const GLYPH_TYPES = ['hex', 'tri', 'diamond', 'chevron', 'cross', 'dot', 'slash', 'zigzag'];
  function generateVault(level, diffKey, rng) {
    const cfg = levelConfig(level, diffKey);
    const rings = [];
    for (let r = 0; r < cfg.rings; r++) {
      const segCount = cfg.segments;
      const glyphs = Array.from({ length: segCount }, () => GLYPH_TYPES[Math.floor(rng() * GLYPH_TYPES.length)]);
      const keyIndex = Math.floor(rng() * segCount);
      glyphs[keyIndex] = 'key';
      let offset = Math.floor(rng() * segCount);
      if (offset === keyIndex) offset = (offset + 1) % segCount; // never start solved
      rings.push({
        segCount, glyphs, keyIndex, offset,
        visualOffset: offset, // animated float, eases toward `offset`
        dragAngle: 0, dragging: false, aligned: false,
        dir: r % 2 === 0 ? 1 : -1, // alternate spin direction per ring, purely cosmetic
      });
    }
    return { level, rings, timeLimit: cfg.timeLimit, targetLevel: cfg.targetLevel, startedAt: Date.now(), rotations: 0 };
  }

  /* ---------------------------------------------------------------------- *
   * AUDIO
   * ---------------------------------------------------------------------- */
  function CyberLockAudio() {
    let ctx = null, master = null, ambient = null, enabled = soundEnabled();
    function ensureCtx() {
      if (!enabled) return null;
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function startAmbient() {
      const c = ensureCtx(); if (!c) return;
      const g = c.createGain(); g.gain.value = 0; g.connect(master); g.gain.linearRampToValueAtTime(0.035, c.currentTime + 2.5);
      const filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 500; filter.connect(g);
      const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 55; osc.connect(filter); osc.start();
      const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.08;
      const lfoGain = c.createGain(); lfoGain.gain.value = 160; lfo.connect(lfoGain); lfoGain.connect(filter.frequency); lfo.start();
      ambient = { g, osc, lfo };
    }
    function stopAmbient() {
      if (!ambient || !ctx) return;
      const { g, osc, lfo } = ambient, now = ctx.currentTime;
      g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.6);
      setTimeout(() => { try { osc.stop(); lfo.stop(); } catch (e) {} }, 700);
      ambient = null;
    }
    function tone(freq, dur, type, vol) {
      const c = ensureCtx(); if (!c) return;
      const osc = c.createOscillator(); osc.type = type; osc.frequency.value = freq;
      const g = c.createGain(); g.gain.value = 0;
      osc.connect(g); g.connect(master);
      const t = c.currentTime;
      g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.03);
    }
    function ringClick() { tone(320, 0.07, 'square', 0.05); }
    function ringAlign() { tone(880, 0.18, 'sine', 0.07); }
    function ringMisalign() { tone(140, 0.12, 'sine', 0.03); }
    function vaultUnlock() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.55, 'sine', 0.075), i * 90)); }
    function timeWarning() { tone(220, 0.15, 'square', 0.05); }
    function setEnabled(v) { enabled = v; if (!v) stopAmbient(); }
    function destroy() { stopAmbient(); if (ctx) { try { ctx.close(); } catch (e) {} ctx = null; master = null; } }
    return { startAmbient, stopAmbient, ringClick, ringAlign, ringMisalign, vaultUnlock, timeWarning, setEnabled, destroy };
  }

  /* ---------------------------------------------------------------------- *
   * GLYPH DRAWING — small original cyber glyphs, drawn as vector paths
   * (not emoji/generic icons), each in a local -1..1 box.
   * ---------------------------------------------------------------------- */
  function drawGlyph(ctx, type, size) {
    ctx.save();
    ctx.scale(size, size);
    ctx.lineWidth = 0.16;
    ctx.beginPath();
    switch (type) {
      case 'hex':
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const x = Math.cos(a) * 0.6, y = Math.sin(a) * 0.6; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.closePath(); break;
      case 'tri':
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i / 3) * Math.PI * 2; const x = Math.cos(a) * 0.65, y = Math.sin(a) * 0.65; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.closePath(); break;
      case 'diamond':
        ctx.moveTo(0, -0.65); ctx.lineTo(0.5, 0); ctx.lineTo(0, 0.65); ctx.lineTo(-0.5, 0); ctx.closePath(); break;
      case 'chevron':
        ctx.moveTo(-0.5, -0.4); ctx.lineTo(0, 0.15); ctx.lineTo(0.5, -0.4);
        ctx.moveTo(-0.5, 0.05); ctx.lineTo(0, 0.6); ctx.lineTo(0.5, 0.05); break;
      case 'cross':
        ctx.moveTo(0, -0.6); ctx.lineTo(0, 0.6); ctx.moveTo(-0.6, 0); ctx.lineTo(0.6, 0); break;
      case 'dot':
        ctx.arc(0, 0, 0.22, 0, Math.PI * 2); ctx.moveTo(0.62, 0); ctx.arc(0, 0, 0.62, 0, Math.PI * 2); break;
      case 'slash':
        ctx.moveTo(-0.45, 0.45); ctx.lineTo(0.45, -0.45); ctx.moveTo(-0.2, 0.55); ctx.lineTo(0.55, -0.2); break;
      case 'zigzag':
        ctx.moveTo(-0.55, -0.4); ctx.lineTo(-0.1, 0); ctx.lineTo(-0.55, 0.4);
        ctx.moveTo(0.1, -0.4); ctx.lineTo(0.55, 0); ctx.lineTo(0.1, 0.4); break;
      case 'key':
        ctx.arc(0, -0.15, 0.32, 0, Math.PI * 2);
        ctx.moveTo(0, 0.15); ctx.lineTo(0, 0.68);
        ctx.moveTo(0, 0.4); ctx.lineTo(0.22, 0.4);
        ctx.moveTo(0, 0.56); ctx.lineTo(0.18, 0.56);
        break;
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------------------------------------------------------------- *
   * RENDERER — Canvas 2D, responsive to any container aspect ratio
   * ---------------------------------------------------------------------- */
  function createRenderer(container) {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.display = 'block'; canvas.style.touchAction = 'none';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let vault = null;
    let particles = [];
    let dust = [];
    let flashAlpha = 0;
    let raf = null;
    let onAlign = null, onUnlock = null, onRotate = null;

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < 34; i++) dust.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, vy: -(Math.random() * 0.00012 + 0.00004), a: Math.random() * 0.35 + 0.08 });

    function geometry() {
      const w = container.clientWidth, h = container.clientHeight;
      const cx = w / 2, cy = h / 2;
      const rings = vault ? vault.rings.length : 1;
      const baseR = 42, thick = 32, gap = 6;
      const designOuter = baseR + rings * (thick + gap);
      const scale = Math.max(0.5, Math.min(1.5, (Math.min(w, h) * 0.42) / designOuter));
      return { cx, cy, scale, baseR: baseR * scale, thick: thick * scale, gap: gap * scale };
    }

    function ringRadii(idx) {
      const g = geometry();
      const inner = g.baseR + idx * (g.thick + g.gap);
      return { inner, outer: inner + g.thick, cx: g.cx, cy: g.cy };
    }

    function setVault(v) { vault = v; if (v) v.rings.forEach(r => { r.visualOffset = r.offset; }); }

    function pointToRing(x, y) {
      if (!vault) return -1;
      const g = geometry();
      const dx = x - g.cx, dy = y - g.cy;
      const dist = Math.hypot(dx, dy);
      for (let i = 0; i < vault.rings.length; i++) {
        const { inner, outer } = ringRadii(i);
        if (dist >= inner && dist <= outer) return i;
      }
      return -1;
    }
    function pointAngle(x, y) {
      const g = geometry();
      return Math.atan2(y - g.cy, x - g.cx);
    }

    function rotateRing(idx, steps) {
      const ring = vault.rings[idx];
      if (!ring) return;
      ring.offset = ((ring.offset + steps) % ring.segCount + ring.segCount) % ring.segCount;
      vault.rotations++;
      if (onRotate) onRotate();
      checkAlignment();
    }

    function checkAlignment() {
      if (!vault) return;
      let allAligned = true;
      vault.rings.forEach(r => {
        const wasAligned = r.aligned;
        r.aligned = r.offset === r.keyIndex;
        if (r.aligned && !wasAligned && onAlign) onAlign(true);
        if (!r.aligned) allAligned = false;
      });
      if (allAligned) burstUnlock();
    }

    function burstUnlock() {
      const g = geometry();
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 2.6;
        particles.push({ x: g.cx, y: g.cy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1, hue: Math.random() < 0.5 ? '89,231,217' : '177,140,255' });
      }
      flashAlpha = 1;
      if (onUnlock) onUnlock();
    }

    // pointer interaction: click = one-step rotate, drag = free rotate + snap
    let dragRing = -1, dragStartAngle = 0, dragAccum = 0;
    canvas.addEventListener('pointerdown', e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const idx = pointToRing(x, y);
      if (idx === -1) return;
      dragRing = idx; dragStartAngle = pointAngle(x, y); dragAccum = 0;
      vault.rings[idx].dragging = true;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (dragRing === -1) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const a = pointAngle(x, y);
      let delta = a - dragStartAngle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      dragAccum = delta;
      const ring = vault.rings[dragRing];
      const step = (Math.PI * 2) / ring.segCount;
      ring.visualOffset = ring.offset + dragAccum / step;
    });
    function endDrag(e) {
      if (dragRing === -1) return;
      const ring = vault.rings[dragRing];
      const step = (Math.PI * 2) / ring.segCount;
      const rawSteps = dragAccum / step;
      const snapped = Math.round(rawSteps);
      if (snapped !== 0) rotateRing(dragRing, snapped);
      else if (Math.abs(dragAccum) < 0.05 && onRotate) { rotateRing(dragRing, 1); } // treat as a plain click
      ring.dragging = false;
      dragRing = -1;
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    function draw(dt) {
      const w = container.clientWidth, h = container.clientHeight;
      const g = geometry();
      ctx.clearRect(0, 0, w, h);
      const bgGrad = ctx.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, '#0c1420'); bgGrad.addColorStop(1, '#04060c');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, w, h);

      // digital dust
      dust.forEach(p => {
        p.y += p.vy * dt; if (p.y < -0.05) p.y = 1.05;
        ctx.beginPath(); ctx.fillStyle = `rgba(200,230,255,${p.a})`;
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2); ctx.fill();
      });

      if (vault) {
        // top marker + laser line to center
        ctx.save();
        ctx.strokeStyle = 'rgba(89,231,217,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(g.cx, g.cy - g.baseR); ctx.lineTo(g.cx, 14); ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = '#59E7D9';
        ctx.moveTo(g.cx - 8, 14); ctx.lineTo(g.cx + 8, 14); ctx.lineTo(g.cx, 28); ctx.closePath(); ctx.fill();
        ctx.restore();

        vault.rings.forEach((ring, idx) => {
          const ease = ring.dragging ? 1 : 0.22;
          ring.visualOffset += (ring.offset - ring.visualOffset) * ease;
          const { inner, outer } = ringRadii(idx);
          const midR = (inner + outer) / 2;
          const step = (Math.PI * 2) / ring.segCount;

          // ring track
          ctx.beginPath();
          ctx.strokeStyle = ring.aligned ? 'rgba(89,231,217,0.5)' : 'rgba(255,255,255,0.08)';
          ctx.lineWidth = outer - inner;
          ctx.arc(g.cx, g.cy, midR, 0, Math.PI * 2);
          ctx.stroke();
          if (ring.aligned) {
            ctx.save(); ctx.shadowColor = '#59E7D9'; ctx.shadowBlur = 18 * g.scale;
            ctx.strokeStyle = 'rgba(89,231,217,0.3)'; ctx.stroke(); ctx.restore();
          }

          // segment dividers + glyphs
          for (let s = 0; s < ring.segCount; s++) {
            const angle = -Math.PI / 2 + ((s - ring.visualOffset) * step);
            const isKey = s === ring.keyIndex;
            const gx = g.cx + Math.cos(angle) * midR, gy = g.cy + Math.sin(angle) * midR;
            ctx.save();
            ctx.translate(gx, gy);
            if (isKey) { ctx.shadowColor = ring.aligned ? '#59E7D9' : '#B18CFF'; ctx.shadowBlur = 14 * g.scale; }
            ctx.strokeStyle = isKey ? (ring.aligned ? '#59E7D9' : '#d9c8ff') : 'rgba(234,246,255,0.38)';
            drawGlyph(ctx, ring.glyphs[s], (outer - inner) * 0.34);
            ctx.restore();

            // divider tick
            const a0 = angle - step / 2;
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
            ctx.moveTo(g.cx + Math.cos(a0) * inner, g.cy + Math.sin(a0) * inner);
            ctx.lineTo(g.cx + Math.cos(a0) * outer, g.cy + Math.sin(a0) * outer);
            ctx.stroke();
          }
        });

        // quantum core
        const coreR = g.baseR * 0.56;
        const coreGrad = ctx.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, coreR);
        const allAligned = vault.rings.every(r => r.aligned);
        coreGrad.addColorStop(0, allAligned ? 'rgba(255,255,255,0.95)' : 'rgba(89,231,217,0.55)');
        coreGrad.addColorStop(1, 'rgba(89,231,217,0)');
        ctx.beginPath(); ctx.fillStyle = coreGrad; ctx.arc(g.cx, g.cy, coreR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.strokeStyle = allAligned ? '#ffffff' : 'rgba(177,140,255,0.7)'; ctx.lineWidth = 1.5 * g.scale;
        ctx.arc(g.cx, g.cy, coreR * 0.6, 0, Math.PI * 2); ctx.stroke();
      }

      // unlock particles
      particles.forEach(p => {
        p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06; p.life -= 0.014 * dt;
        ctx.beginPath(); ctx.fillStyle = `rgba(${p.hue},${Math.max(0, p.life)})`;
        ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fill();
      });
      particles = particles.filter(p => p.life > 0);

      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.5})`;
        ctx.fillRect(0, 0, w, h);
        flashAlpha = Math.max(0, flashAlpha - 0.03 * dt);
      }
    }

    let last = performance.now();
    function loop(now) {
      const dt = Math.min(4, (now - last) / 16.67); last = now;
      draw(dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return {
      setVault, rotateRing,
      set onAlign(fn) { onAlign = fn; }, set onUnlock(fn) { onUnlock = fn; }, set onRotate(fn) { onRotate = fn; },
      destroy() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); canvas.remove(); },
    };
  }

  /* ---------------------------------------------------------------------- *
   * GAME FLOW
   * ---------------------------------------------------------------------- */
  function launchCyberLock() {
    const stage = document.createElement('div');
    stage.className = 'cyberlock-stage';
    document.body.appendChild(stage);
    document.body.style.overflow = 'hidden';
    renderSetupScreen();

    function renderSetupScreen() {
      const stats = cyberlockStats();
      stage.innerHTML = `
        <div class="cyberlock-setup">
          <div class="cyberlock-setup-card">
            <div class="cyberlock-setup-title">SVBG Cyber Lock</div>
            <div class="cyberlock-setup-sub">${stats.totalVaultsOpened} vaults opened · best depth L${stats.bestLevel}</div>
            <div class="cyberlock-setup-label">Clearance Level</div>
            <div class="cyberlock-setup-row" id="cyberlock-diff-row">
              ${Object.keys(DIFFICULTY).map((d, i) => `<button class="chip-btn ${i === 0 ? 'is-selected' : ''}" data-diff="${d}">${DIFFICULTY[d].label}</button>`).join('')}
            </div>
            <div class="cyberlock-setup-label">Mode</div>
            <div class="cyberlock-setup-row" id="cyberlock-mode-row">
              <button class="chip-btn is-selected" data-mode="standard">Standard</button>
              <button class="chip-btn" data-mode="timeattack">Time Attack</button>
              <button class="chip-btn" data-mode="zen">Zen (no timer)</button>
            </div>
            <button class="cyberlock-start-btn" id="cyberlock-begin-btn">Decrypt the Vault</button>
          </div>
        </div>`;
      let diff = 'apprentice', mode = 'standard';
      stage.querySelectorAll('#cyberlock-diff-row .chip-btn').forEach(b => b.addEventListener('click', () => { diff = b.dataset.diff; stage.querySelectorAll('#cyberlock-diff-row .chip-btn').forEach(o => o.classList.remove('is-selected')); b.classList.add('is-selected'); }));
      stage.querySelectorAll('#cyberlock-mode-row .chip-btn').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; stage.querySelectorAll('#cyberlock-mode-row .chip-btn').forEach(o => o.classList.remove('is-selected')); b.classList.add('is-selected'); }));
      stage.querySelector('#cyberlock-begin-btn').addEventListener('click', () => startRun(diff, mode));
    }

    function startRun(diffKey, mode) {
      const audio = CyberLockAudio(); audio.setEnabled(soundEnabled());
      audio.startAmbient();
      let level = 1;
      let rng = mulberry32(Date.now() >>> 0);
      let vault = generateVault(level, diffKey, rng);
      let timeLeft = vault.timeLimit;
      let timerInterval = null;
      let runOver = false;
      let levelStartMs = Date.now();

      stage.innerHTML = `
        <div class="cyberlock-board-wrap" id="cyberlock-board-wrap"></div>
        <div class="cyberlock-hud-top">
          <div class="cyberlock-hud-chip">
            <span>DEPTH L${level}</span>
            ${mode === 'timeattack' ? `<span id="cyberlock-timer">${timeLeft}s</span>` : ''}
          </div>
          <div class="cyberlock-hud-actions">
            <button class="cyberlock-icon-btn" id="cyberlock-sound-btn" title="Sound">${soundEnabled() ? '🔊' : '🔇'}</button>
            <button class="cyberlock-icon-btn" id="cyberlock-exit-btn" title="Exit">✕</button>
          </div>
        </div>
        <div class="cyberlock-hint" id="cyberlock-hint">Find each ring's glowing key glyph and rotate it to the top marker — align every ring at once to decrypt the vault.</div>
      `;
      const renderer = createRenderer(stage.querySelector('#cyberlock-board-wrap'));
      renderer.setVault(vault);
      renderer.onRotate = () => audio.ringClick();
      renderer.onAlign = () => audio.ringAlign();
      renderer.onUnlock = () => handleUnlock();

      if (mode === 'timeattack') startTimer();
      function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          if (runOver) return;
          timeLeft -= 1;
          const el = stage.querySelector('#cyberlock-timer');
          if (el) el.textContent = timeLeft + 's';
          if (timeLeft <= 5 && timeLeft > 0) audio.timeWarning();
          if (timeLeft <= 0) { clearInterval(timerInterval); endRun('timeout'); }
        }, 1000);
      }

      function handleUnlock() {
        if (runOver) return;
        audio.vaultUnlock();
        const elapsed = Date.now() - levelStartMs;
        const stats = cyberlockStats();
        stats.totalVaultsOpened += 1;
        stats.bestLevel = Math.max(stats.bestLevel, level);
        stats.currentStreak += 1;
        stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
        stats.totalRotations = (stats.totalRotations || 0) + vault.rotations;
        if (stats.fastestUnlockMs == null || elapsed < stats.fastestUnlockMs) stats.fastestUnlockMs = elapsed;
        if (diffKey === 'quantum' && level >= DIFFICULTY.quantum.targetLevel) stats.clearedQuantum = true;
        stats.lastPlayed = Date.now();
        saveCyberlockStats(stats);
        const xp = 8 + vault.rings.length * 2 + Math.floor(vault.rings[0].segCount * 0.5);
        if (Ext.award) Ext.award(xp, 'Unlocked an SVBG Cyber Lock vault');
        if (Ext.Bus) Ext.Bus.emit('activity');
        if (Ext.Achievements) Ext.Achievements.check();
        toast(`Vault decrypted — +${xp} XP`, 'success');

        setTimeout(() => {
          level += 1;
          vault = generateVault(level, diffKey, rng);
          levelStartMs = Date.now();
          renderer.setVault(vault);
          const depthEl = stage.querySelector('.cyberlock-hud-chip span');
          if (depthEl) depthEl.textContent = `DEPTH L${level}`;
          if (mode === 'timeattack') { timeLeft = vault.timeLimit; const el = stage.querySelector('#cyberlock-timer'); if (el) el.textContent = timeLeft + 's'; startTimer(); }
        }, 900);
      }

      function endRun(reason) {
        runOver = true;
        clearInterval(timerInterval);
        const stats = cyberlockStats();
        stats.currentStreak = 0;
        saveCyberlockStats(stats);
        renderer.destroy(); audio.stopAmbient();
        stage.innerHTML = `
          <div class="cyberlock-summary-overlay">
            <div class="cyberlock-summary-card">
              <div class="cyberlock-summary-title">${reason === 'timeout' ? 'Time Expired' : 'Run Ended'}</div>
              <div class="cyberlock-summary-sub">You reached depth L${level} before the vault held.</div>
              <div class="cyberlock-summary-stats">
                <div><span>${level - 1}</span>Vaults this run</div>
                <div><span>${cyberlockStats().bestLevel}</span>Best depth ever</div>
              </div>
              <button class="cyberlock-start-btn" id="cyberlock-again-btn">Return to Setup</button>
            </div>
          </div>`;
        stage.querySelector('#cyberlock-again-btn').addEventListener('click', () => { audio.destroy(); renderSetupScreen(); });
      }

      stage.querySelector('#cyberlock-sound-btn').addEventListener('click', (e) => {
        const v = !soundEnabled(); setSoundEnabled(v); audio.setEnabled(v); e.target.textContent = v ? '🔊' : '🔇';
      });
      stage.querySelector('#cyberlock-exit-btn').addEventListener('click', () => {
        clearInterval(timerInterval);
        const stats = cyberlockStats(); stats.currentStreak = 0; saveCyberlockStats(stats);
        renderer.destroy(); audio.destroy(); cleanupAndExit();
      });
    }

    function cleanupAndExit() {
      document.body.style.overflow = '';
      stage.remove();
    }
  }

  window.SVBGCyberLock = { launch: launchCyberLock };
})();
