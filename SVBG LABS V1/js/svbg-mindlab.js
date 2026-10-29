/* ==========================================================================
   SVBG MIND LAB — an experimental environment for self-observation, not a
   medical or psychological assessment tool (said plainly in the UI).

   Two experiments are fully real and working: MEMORY (an increasing
   sequence-recall game) and REACTION (a timed-response test with a
   real random delay and penalty for jumping early). PATTERN, FOCUS, and
   PERCEPTION are intentionally marked "Coming soon" rather than shipped
   as hollow placeholders — building three more full experiment engines
   well is a follow-up scope, not something to fake through.

   Every completed run emits MINDLAB_COMPLETED on the Activity Core (when
   available) and stores real history locally, which the extended Neural
   Profile (added to js/svbg-identity.js's Views.neuralprofile) reads back.
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};
  const Core = window.SVBGActivityCore;

  Object.assign(ICONS, {
    mindlab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="12" cy="12" r="2.4"/><path d="M7.6 7.1 10 10.7M16.4 7.1 14 10.7M7.6 16.9 10 13.3M16.4 16.9 14 13.3"/></svg>',
  });

  const EXPERIMENTS = [
    { id: 'memory', label: 'Memory', emoji: '\ud83e\udde9', desc: 'Watch a sequence grow, then repeat it back.', ready: true },
    { id: 'reaction', label: 'Reaction', emoji: '\u26a1', desc: 'Respond the instant the signal changes \u2014 not before.', ready: true },
    { id: 'pattern', label: 'Pattern', emoji: '\ud83d\udd37', desc: 'Decode the sequence and complete it.', ready: false },
    { id: 'focus', label: 'Focus', emoji: '\ud83c\udfaf', desc: 'Track the target through distractions.', ready: false },
    { id: 'perception', label: 'Perception', emoji: '\ud83d\udc41\ufe0f', desc: 'Read shape, motion, and contrast correctly.', ready: false },
  ];

  function history() { return Store.get('mindlab_history', {}); }
  function saveResult(expId, result) {
    const h = history();
    h[expId] = h[expId] || { attempts: 0, best: 0, lastAt: 0, log: [] };
    h[expId].attempts++;
    h[expId].best = Math.max(h[expId].best, result.score);
    h[expId].lastAt = Date.now();
    h[expId].log.push({ score: result.score, at: Date.now(), ...result.extra });
    if (h[expId].log.length > 50) h[expId].log.shift();
    Store.set('mindlab_history', h);
    if (Ext.award) Ext.award(Math.min(20, 5 + Math.round(result.score / 5)), `Mind Lab: ${expId}`);
    if (Core) Core.emit('MINDLAB_COMPLETED', { experiment: expId, score: result.score });
    checkDailyExperiment(expId, result.score);
  }

  /* ---------------------------------------------------------------------- *
   * DAILY NEURAL EXPERIMENT + STREAK
   * ---------------------------------------------------------------------- */
  function dailyState() { return Store.get('mindlab_daily', { date: null, expId: null, done: false, streak: 0, lastDoneDate: null }); }
  function pickDailyExperiment() {
    const ready = EXPERIMENTS.filter(e => e.ready);
    const seed = todayStr().split('-').reduce((a, b) => a + parseInt(b, 10), 0);
    return ready[seed % ready.length];
  }
  function ensureDaily() {
    const s = dailyState();
    if (s.date !== todayStr()) { s.date = todayStr(); s.expId = pickDailyExperiment().id; s.done = false; Store.set('mindlab_daily', s); }
    return s;
  }
  function checkDailyExperiment(expId, score) {
    const s = ensureDaily();
    if (s.expId !== expId || s.done) return;
    s.done = true;
    const yesterday = daysAgo(1);
    s.streak = s.lastDoneDate === yesterday ? s.streak + 1 : 1;
    s.lastDoneDate = todayStr();
    Store.set('mindlab_daily', s);
    toast(`Daily Neural Experiment complete \u2014 ${s.streak} day streak`, 'success');
  }

  /* ---------------------------------------------------------------------- *
   * ENTRY CINEMATIC — real canvas particle network, skippable, ~2.2s
   * ---------------------------------------------------------------------- */
  function playEntryCinematic(onDone) {
    if (sessionStorage.getItem('mindlab_intro_seen')) { onDone(); return; }
    const overlay = document.createElement('div');
    overlay.className = 'mindlab-intro-overlay';
    overlay.innerHTML = `
      <canvas class="mindlab-intro-canvas"></canvas>
      <div class="mindlab-intro-text">
        <div class="mindlab-intro-title">MIND LAB</div>
        <div class="mindlab-intro-sub">Explore the architecture of your mind.</div>
      </div>
      <button class="mindlab-intro-skip" id="mindlab-skip">Skip</button>
    `;
    document.body.appendChild(overlay);
    const canvas = overlay.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    function size() { canvas.width = overlay.clientWidth; canvas.height = overlay.clientHeight; }
    size();
    const N = 46;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    }));
    let raf, done = false;
    function tick() {
      if (done) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(89,231,217,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = 'rgba(177,140,255,0.8)';
      nodes.forEach(n => { ctx.beginPath(); ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2); ctx.fill(); });
      raf = requestAnimationFrame(tick);
    }
    tick();
    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      sessionStorage.setItem('mindlab_intro_seen', '1');
      overlay.remove();
      onDone();
    }
    overlay.querySelector('#mindlab-skip').addEventListener('click', finish);
    setTimeout(finish, 2200);
  }

  /* ---------------------------------------------------------------------- *
   * HUB
   * ---------------------------------------------------------------------- */
  Views.mindlab = function () {
    const h = history();
    const daily = ensureDaily();
    const dailyExp = EXPERIMENTS.find(e => e.id === daily.expId);
    return `
      <div class="view-header"><div><div class="view-title">SVBG Mind Lab</div><div class="view-sub">Experiments for entertainment and self-exploration \u2014 not a medical or psychological assessment</div></div></div>
      <div class="card mindlab-daily-card">
        <div class="mindlab-daily-label">DAILY NEURAL EXPERIMENT</div>
        <div class="mindlab-daily-row">
          <div><strong>${dailyExp.emoji} ${dailyExp.label}</strong>${daily.done ? ' \u2014 done for today' : ''}</div>
          ${daily.streak > 1 ? `<span class="chip chip-accent">${daily.streak} day streak</span>` : ''}
        </div>
      </div>
      <div class="mindlab-grid">
        ${EXPERIMENTS.map(e => {
          const rec = h[e.id];
          return `<button class="card mindlab-exp-card ${!e.ready ? 'is-disabled' : ''}" data-exp="${e.id}" ${e.ready ? '' : 'disabled'}>
            <span class="mindlab-exp-emoji">${e.emoji}</span>
            <span class="mindlab-exp-label">${e.label}</span>
            <span class="mindlab-exp-desc">${escapeHtml(e.desc)}</span>
            ${e.ready ? `<span class="mindlab-exp-best">${rec ? `Best: ${rec.best} \u00b7 ${rec.attempts} run${rec.attempts===1?'':'s'}` : 'Not tried yet'}</span>` : `<span class="mindlab-exp-soon">Coming soon</span>`}
          </button>`;
        }).join('')}
      </div>
    `;
  };
  ViewMount.mindlab = function (root) {
    root.querySelectorAll('.mindlab-exp-card[data-exp]:not(.is-disabled)').forEach(card => {
      card.addEventListener('click', () => launchExperiment(card.dataset.exp));
    });
  };

  function launchExperiment(id) {
    playEntryCinematic(() => {
      if (id === 'memory') runMemoryExperiment();
      else if (id === 'reaction') runReactionExperiment();
    });
  }

  /* ---------------------------------------------------------------------- *
   * MEMORY — sequence recall, grows by one each round until a mistake
   * ---------------------------------------------------------------------- */
  function runMemoryExperiment() {
    const overlay = document.createElement('div');
    overlay.className = 'mindlab-stage';
    const COLORS = ['#59E7D9', '#B18CFF', '#FFB86C', '#FF6B9D'];
    overlay.innerHTML = `
      <div class="mindlab-stage-top">
        <button class="mindlab-exit-btn" id="ml-exit">\u2715 Exit</button>
        <div class="mindlab-stage-title">Memory</div>
        <div class="mindlab-stage-status" id="ml-status">Round 1</div>
      </div>
      <div class="mindlab-memory-grid">
        ${COLORS.map((c, i) => `<button class="mindlab-memory-tile" data-i="${i}" style="--tile-color:${c}"></button>`).join('')}
      </div>
      <div class="mindlab-memory-hint" id="ml-hint">Watch the sequence...</div>
    `;
    document.body.appendChild(overlay);
    const tiles = [...overlay.querySelectorAll('.mindlab-memory-tile')];
    const statusEl = overlay.querySelector('#ml-status');
    const hintEl = overlay.querySelector('#ml-hint');
    let sequence = [], userIndex = 0, accepting = false, round = 0;

    function flash(i, ms) {
      return new Promise(res => {
        tiles[i].classList.add('is-lit');
        setTimeout(() => { tiles[i].classList.remove('is-lit'); setTimeout(res, 150); }, ms);
      });
    }
    async function playSequence() {
      accepting = false;
      hintEl.textContent = 'Watch the sequence...';
      await new Promise(r => setTimeout(r, 400));
      for (const i of sequence) await flash(i, Math.max(280, 550 - round * 15));
      hintEl.textContent = 'Your turn \u2014 repeat it';
      accepting = true; userIndex = 0;
    }
    function nextRound() {
      round++;
      statusEl.textContent = `Round ${round}`;
      sequence.push(Math.floor(Math.random() * 4));
      playSequence();
    }
    function endRun() {
      const score = round - 1;
      saveResult('memory', { score, extra: { round: score } });
      overlay.querySelector('.mindlab-memory-grid').innerHTML = '';
      hintEl.textContent = '';
      statusEl.textContent = 'Result';
      const stageTop = overlay.querySelector('.mindlab-stage-top');
      const resultDiv = document.createElement('div');
      resultDiv.className = 'mindlab-result';
      const best = history().memory ? history().memory.best : score;
      resultDiv.innerHTML = `
        <div class="mindlab-result-score">${score}</div>
        <div class="mindlab-result-label">sequence${score===1?'':'s'} remembered</div>
        <div class="mindlab-result-best">Best: ${best}</div>
        <button class="btn btn-primary" id="ml-retry">Try again</button>
        <button class="btn" id="ml-done">Back to Mind Lab</button>
      `;
      overlay.appendChild(resultDiv);
      overlay.querySelector('#ml-retry').addEventListener('click', () => { overlay.remove(); runMemoryExperiment(); });
      overlay.querySelector('#ml-done').addEventListener('click', () => { overlay.remove(); renderView('mindlab'); });
    }
    tiles.forEach(tile => tile.addEventListener('click', () => {
      if (!accepting) return;
      const i = parseInt(tile.dataset.i, 10);
      tile.classList.add('is-lit'); setTimeout(() => tile.classList.remove('is-lit'), 180);
      if (i !== sequence[userIndex]) { accepting = false; endRun(); return; }
      userIndex++;
      if (userIndex === sequence.length) { accepting = false; setTimeout(nextRound, 500); }
    }));
    overlay.querySelector('#ml-exit').addEventListener('click', () => { overlay.remove(); renderView('mindlab'); });
    nextRound();
  }

  /* ---------------------------------------------------------------------- *
   * REACTION — real random delay, penalizes early clicks, 5 rounds
   * ---------------------------------------------------------------------- */
  function runReactionExperiment() {
    const overlay = document.createElement('div');
    overlay.className = 'mindlab-stage';
    overlay.innerHTML = `
      <div class="mindlab-stage-top">
        <button class="mindlab-exit-btn" id="ml-exit">\u2715 Exit</button>
        <div class="mindlab-stage-title">Reaction</div>
        <div class="mindlab-stage-status" id="ml-status">Round 1 / 5</div>
      </div>
      <button class="mindlab-reaction-zone" id="ml-zone">
        <span id="ml-zone-text">Get ready...</span>
      </button>
    `;
    document.body.appendChild(overlay);
    const zone = overlay.querySelector('#ml-zone');
    const zoneText = overlay.querySelector('#ml-zone-text');
    const statusEl = overlay.querySelector('#ml-status');
    const ROUNDS = 5;
    let round = 0, waitingForSignal = false, signalAt = 0, timer = null, times = [];

    function startRound() {
      round++;
      statusEl.textContent = `Round ${round} / ${ROUNDS}`;
      zone.className = 'mindlab-reaction-zone is-waiting';
      zoneText.textContent = 'Wait for green...';
      waitingForSignal = false;
      const delay = 1000 + Math.random() * 2500;
      timer = setTimeout(() => {
        waitingForSignal = true;
        signalAt = performance.now();
        zone.className = 'mindlab-reaction-zone is-go';
        zoneText.textContent = 'Click now!';
      }, delay);
    }
    function endRun() {
      const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      const score = avg ? Math.max(0, 1000 - avg) : 0; // higher score = faster
      saveResult('reaction', { score, extra: { avgMs: avg, times: [...times] } });
      const best = history().reaction ? history().reaction.best : score;
      overlay.querySelector('.mindlab-reaction-zone').remove();
      const resultDiv = document.createElement('div');
      resultDiv.className = 'mindlab-result';
      resultDiv.innerHTML = `
        <div class="mindlab-result-score">${avg}ms</div>
        <div class="mindlab-result-label">average reaction time \u00b7 fastest ${Math.min(...times)}ms</div>
        <div class="mindlab-result-best">Best score: ${best}</div>
        <button class="btn btn-primary" id="ml-retry">Try again</button>
        <button class="btn" id="ml-done">Back to Mind Lab</button>
      `;
      overlay.appendChild(resultDiv);
      overlay.querySelector('#ml-retry').addEventListener('click', () => { overlay.remove(); runReactionExperiment(); });
      overlay.querySelector('#ml-done').addEventListener('click', () => { overlay.remove(); renderView('mindlab'); });
    }
    zone.addEventListener('click', () => {
      if (!waitingForSignal) {
        // clicked too early
        clearTimeout(timer);
        zone.className = 'mindlab-reaction-zone is-early';
        zoneText.textContent = 'Too early! Restarting round...';
        setTimeout(startRound, 900);
        return;
      }
      const rt = Math.round(performance.now() - signalAt);
      times.push(rt);
      waitingForSignal = false;
      zoneText.textContent = `${rt}ms`;
      if (round >= ROUNDS) setTimeout(endRun, 700);
      else setTimeout(startRound, 700);
    });
    overlay.querySelector('#ml-exit').addEventListener('click', () => { clearTimeout(timer); overlay.remove(); renderView('mindlab'); });
    startRound();
  }

  // exposed so js/svbg-identity.js's Neural Profile can read real Mind Lab data
  window.SVBGMindLab = { history, EXPERIMENTS };
})();
