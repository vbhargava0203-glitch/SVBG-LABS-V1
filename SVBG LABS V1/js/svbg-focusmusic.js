/* ==========================================================================
   SVBG FOCUS MUSIC STUDIO — rebuilt at the product owner's request.

   Everything that used to be here (the 10-sound mixer, presets, the raw
   EQ bar visualizer) has been removed and replaced with a small, focused
   "stress reliever" player: three curated soundscapes, still 100% synthesized
   locally with the Web Audio API (no audio files, nothing downloaded,
   nothing licensed to worry about), a session-length timer so a session can
   run for longer without you having to babysit it, and a calm breathing
   visual instead of a busy equalizer.

   Honesty note: "Immersive Surround Beat" is our own Web-Audio-synthesized
   soundscape — multiple layered tones automated across the stereo field
   with StereoPannerNode, plus a slow resting-pace pulse — built to *evoke*
   an immersive, moving, multi-layer listening feel. It is not, and does not
   claim to be, licensed/certified Dolby Atmos — that's a real trademarked
   technology that needs certified hardware/software we can't reproduce
   inside a browser tab. Said plainly in the UI itself, not just here.

   Mobile: this view benefits from the app-wide Back button and left-edge
   swipe-back gesture added to the topbar/router in js/app.js, which now
   cover every view (not just this one) — nothing mobile-specific needs to
   live in this file anymore.
   ========================================================================== */
'use strict';

(function () {
  Object.assign(ICONS, {
    'music-note': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  });

  /* ---------------------------------------------------------------------- *
   * SOUND CATALOG — three curated, calm, stress-relief soundscapes
   * ---------------------------------------------------------------------- */
  const SOUNDS = [
    { id: 'rain', label: 'Calm Rain', icon: '🌧️', desc: 'Soft, steady rainfall with gentle natural variation — nothing sharp, nothing sudden.' },
    { id: 'ambient', label: 'Relaxing Ambient', icon: '🎐', desc: 'A slow, warm evolving pad — like a quiet chord that keeps breathing in and out.' },
    { id: 'surround', label: 'Immersive Surround Beat', icon: '🌌', desc: 'Layered tones drifting around the stereo field with a slow, resting-pace pulse. Our own spatial-audio-inspired track — not licensed Dolby Atmos.' },
  ];
  const DURATIONS = [15, 30, 60, 90, 0]; // minutes; 0 = no limit

  function defaultPrefs() { return { soundId: 'rain', volume: 55, durationMin: 30 }; }
  function prefs() { return Object.assign(defaultPrefs(), Store.get('focusmusic_v2', {})); }
  function savePrefs(p) { Store.set('focusmusic_v2', p); }

  /* ---------------------------------------------------------------------- *
   * ENGINE — Web Audio, synthesized locally, three sound builders
   * ---------------------------------------------------------------------- */
  let ctx = null, master = null, analyser = null, noiseBuffer = null;
  let current = null; // { id, gain, nodes[], pulseTimer }

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8;
    analyser = ctx.createAnalyser(); analyser.fftSize = 64;
    master.connect(analyser); analyser.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }
  function noiseSource() { const src = ctx.createBufferSource(); src.buffer = noiseBuffer; src.loop = true; return src; }
  function panner() { try { return ctx.createStereoPanner(); } catch (e) { return null; } }

  function buildRain(gain) {
    const c = ctx;
    const src = noiseSource();
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.5;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.06;
    const lfoGain = c.createGain(); lfoGain.gain.value = 320;
    lfo.connect(lfoGain); lfoGain.connect(bp.frequency); lfo.start();
    src.connect(hp); hp.connect(bp); bp.connect(lp); lp.connect(gain); src.start();
    return { nodes: [src, hp, bp, lp, lfo, lfoGain], pulseTimer: null };
  }

  function buildAmbient(gain) {
    const c = ctx;
    const notes = [130.81, 164.81, 196.0, 246.94]; // calm Cmaj7-ish chord, low register
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    const lpLfo = c.createOscillator(); lpLfo.type = 'sine'; lpLfo.frequency.value = 0.03;
    const lpLfoGain = c.createGain(); lpLfoGain.gain.value = 420;
    lpLfo.connect(lpLfoGain); lpLfoGain.connect(lp.frequency); lpLfo.start();
    lp.connect(gain);
    const nodes = [lp, lpLfo, lpLfoGain];
    notes.forEach((f, i) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const og = c.createGain(); og.gain.value = 0.16;
      const breathe = c.createOscillator(); breathe.type = 'sine'; breathe.frequency.value = 0.05 + i * 0.012;
      const breatheGain = c.createGain(); breatheGain.gain.value = 0.06;
      breathe.connect(breatheGain); breatheGain.connect(og.gain);
      o.connect(og); og.connect(lp); o.start(); breathe.start();
      nodes.push(o, og, breathe, breatheGain);
    });
    return { nodes, pulseTimer: null };
  }

  function buildSurround(gain) {
    const c = ctx;
    const layers = [55, 55.6, 82.4, 110.3, 138.6]; // low harmonically-related drone layers
    const nodes = [];
    layers.forEach((f, i) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const og = c.createGain(); og.gain.value = 0.14;
      const pan = panner();
      const panLfo = c.createOscillator(); panLfo.type = 'sine'; panLfo.frequency.value = 0.015 + i * 0.006;
      const panDepth = c.createGain(); panDepth.gain.value = 0.85;
      if (pan) { panLfo.connect(panDepth); panDepth.connect(pan.pan); o.connect(og); og.connect(pan); pan.connect(gain); }
      else { o.connect(og); og.connect(gain); }
      o.start(); panLfo.start();
      nodes.push(o, og, panLfo, panDepth); if (pan) nodes.push(pan);
    });
    // slow, resting-pace pulse (~55 BPM) — gentle "heartbeat", not a dance beat
    const pulseTimer = setInterval(() => {
      if (!ctx) return;
      const t = ctx.currentTime;
      const p = ctx.createOscillator(); p.type = 'sine'; p.frequency.value = 60;
      const pg = ctx.createGain(); pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(0.5, t + 0.05);
      pg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      p.connect(pg); pg.connect(gain); p.start(t); p.stop(t + 0.65);
    }, 1090);
    return { nodes, pulseTimer };
  }

  const BUILDERS = { rain: buildRain, ambient: buildAmbient, surround: buildSurround };

  function startSound(id, vol) {
    const c = ensureCtx(); if (!c) return;
    stopSound();
    const gain = c.createGain(); gain.gain.value = 0;
    gain.connect(master);
    gain.gain.linearRampToValueAtTime(vol / 100 * 0.9, c.currentTime + 1.5);
    const built = (BUILDERS[id] || buildRain)(gain);
    current = { id, gain, nodes: built.nodes, pulseTimer: built.pulseTimer };
  }
  function setVolume(vol) { if (current) current.gain.gain.linearRampToValueAtTime(vol / 100 * 0.9, ctx.currentTime + 0.2); }
  function stopSound(fadeSeconds) {
    if (!current) return;
    const dur = fadeSeconds || 0.6;
    const c = ctx, t = c.currentTime;
    const { gain, nodes, pulseTimer } = current;
    gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    if (pulseTimer) clearInterval(pulseTimer);
    setTimeout(() => nodes.forEach(n => { try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch (e) {} }), (dur + 0.4) * 1000);
    current = null;
  }

  /* ---------------------------------------------------------------------- *
   * SESSION TIMER — lets a sound run "for more time" unattended, with a
   * gentle fade-out at the end instead of an abrupt stop
   * ---------------------------------------------------------------------- */
  let sessionEndsAt = null, sessionTick = null;
  function startSessionTimer(durationMin, onDone) {
    clearSessionTimer();
    if (!durationMin) { sessionEndsAt = null; return; } // 0 = no limit
    sessionEndsAt = Date.now() + durationMin * 60000;
    sessionTick = setInterval(() => {
      if (!sessionEndsAt) return;
      if (Date.now() >= sessionEndsAt) {
        clearSessionTimer();
        stopSound(8); // long, gentle fade-out
        toast('Session complete — hope that helped you relax.', 'success');
        onDone && onDone();
      }
    }, 1000);
  }
  function clearSessionTimer() { if (sessionTick) clearInterval(sessionTick); sessionTick = null; }
  function remainingLabel() {
    if (!sessionEndsAt) return 'No limit';
    const s = Math.max(0, Math.round((sessionEndsAt - Date.now()) / 1000));
    const m = Math.floor(s / 60), ss = s % 60;
    return `${m}:${ss.toString().padStart(2, '0')} left`;
  }

  /* ---------------------------------------------------------------------- *
   * VIEW
   * ---------------------------------------------------------------------- */
  Views.focusmusic = function () {
    const p = prefs();
    return `
      <div class="fm-view">
        <div class="view-header">
          <div>
            <div class="view-title">Focus Music Studio</div>
            <div class="view-sub">Calm sound, synthesized locally, for however long you need it</div>
          </div>
        </div>

        <div class="fm-sound-grid">
          ${SOUNDS.map(s => `
            <button class="fm-sound-card ${p.soundId === s.id ? 'is-selected' : ''}" data-sound="${s.id}">
              <span class="fm-sound-icon">${s.icon}</span>
              <span class="fm-sound-label">${s.label}</span>
              <span class="fm-sound-desc">${s.desc}</span>
            </button>`).join('')}
        </div>

        <div class="card fm-control-card">
          <div class="fm-breathe-wrap">
            <div class="fm-breathe-ring" id="fm-breathe-ring"></div>
            <button class="fm-play-btn" id="fm-play-btn" aria-label="Play or pause">
              <span class="nav-icon" data-icon="play" id="fm-play-icon"></span>
            </button>
          </div>

          <div class="fm-setting-label">Session length</div>
          <div class="fm-duration-row" id="fm-duration-row">
            ${DURATIONS.map(d => `<button class="chip-btn ${p.durationMin === d ? 'is-selected' : ''}" data-duration="${d}">${d === 0 ? 'No limit' : d + ' min'}</button>`).join('')}
          </div>

          <div class="fm-setting-label">Volume</div>
          <input type="range" id="fm-volume" min="0" max="100" value="${p.volume}" />

          <div class="fm-status" id="fm-status">Not playing</div>
        </div>

        <p class="fm-honesty-note">Immersive Surround Beat is our own Web-Audio soundscape built for a spatial, moving feel — it isn't licensed or certified Dolby Atmos.</p>
      </div>
    `;
  };

  let breatheRaf = null, statusTick = null;
  ViewMount.focusmusic = function (root) {
    let p = prefs();
    let playing = false;

    const playBtn = root.querySelector('#fm-play-btn');
    const playIcon = root.querySelector('#fm-play-icon');
    const statusEl = root.querySelector('#fm-status');
    const ring = root.querySelector('#fm-breathe-ring');

    function setPlayingUI(v) {
      playing = v;
      playIcon.dataset.icon = v ? 'pause' : 'play';
      paintIcons(playBtn);
      ring.classList.toggle('is-breathing', v);
      root.querySelectorAll('.fm-sound-card').forEach(c => c.classList.toggle('is-playing', v && c.dataset.sound === p.soundId));
    }
    function updateStatus() {
      statusEl.textContent = playing ? `Playing ${SOUNDS.find(s => s.id === p.soundId)?.label || ''} · ${remainingLabel()}` : 'Not playing';
    }

    root.querySelectorAll('.fm-sound-card').forEach(card => card.addEventListener('click', () => {
      p.soundId = card.dataset.sound; savePrefs(p);
      root.querySelectorAll('.fm-sound-card').forEach(c => c.classList.toggle('is-selected', c === card));
      if (playing) { startSound(p.soundId, p.volume); startSessionTimer(p.durationMin, () => setPlayingUI(false)); updateStatus(); }
    }));

    root.querySelectorAll('#fm-duration-row .chip-btn').forEach(btn => btn.addEventListener('click', () => {
      p.durationMin = parseInt(btn.dataset.duration, 10); savePrefs(p);
      root.querySelectorAll('#fm-duration-row .chip-btn').forEach(b => b.classList.toggle('is-selected', b === btn));
      if (playing) { startSessionTimer(p.durationMin, () => setPlayingUI(false)); updateStatus(); }
    }));

    const volSlider = root.querySelector('#fm-volume');
    volSlider.addEventListener('input', () => {
      p.volume = parseInt(volSlider.value, 10); savePrefs(p);
      setVolume(p.volume);
    });

    playBtn.addEventListener('click', () => {
      if (playing) {
        clearSessionTimer();
        stopSound();
        setPlayingUI(false);
      } else {
        startSound(p.soundId, p.volume);
        startSessionTimer(p.durationMin, () => setPlayingUI(false));
        setPlayingUI(true);
      }
      updateStatus();
    });

    statusTick = setInterval(updateStatus, 1000);

    // gentle breathing-ring animation, loosely driven by the analyser so it
    // isn't a static CSS loop — but kept smooth/slow, never jumpy
    function tick() {
      breatheRaf = requestAnimationFrame(tick);
      if (!analyser || !playing) return;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      ring.style.setProperty('--fm-level', (0.15 + Math.min(1, avg / 90) * 0.1).toFixed(3));
    }
    tick();
  };

  ViewUnmount.focusmusic = function () {
    if (breatheRaf) cancelAnimationFrame(breatheRaf);
    if (statusTick) clearInterval(statusTick);
    clearSessionTimer();
    stopSound();
  };
})();
