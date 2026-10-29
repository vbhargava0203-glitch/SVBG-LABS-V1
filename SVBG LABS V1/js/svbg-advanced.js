/* ==========================================================================
   SVBG ADVANCED — additive module, loaded after app.js and extensions.js.
   Nothing in app.js or extensions.js is modified by this file beyond the
   small, explicit export block added at the end of extensions.js. Every
   number shown below is computed from real local data (Store + the XP
   activity log), same as the rest of the app. No network calls, no AI
   APIs, no placeholders.

   New surfaces added here:
     - Evolution System   (named XP stages instead of bare "Level N")
     - SVBG Passport      (exportable local identity card, PNG)
     - Time Machine        (revisit / replay any past day)
     - SVBG Life Coach     (rule-based weekly/monthly/yearly insights)
     - Neural Search        (adds commands/achievements/DNA/new views to search)
     - Focus Environment   (ambient background mode while a focus session runs)
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};

  /* ---------------------------------------------------------------------- *
   * Extra icons (added to the existing registry, not duplicated)
   * ---------------------------------------------------------------------- */
  Object.assign(ICONS, {
    'id-badge': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M6 16c.5-2 2-3 3-3s2.5 1 3 3"/><line x1="14" y1="8" x2="18" y2="8"/><line x1="14" y1="12" x2="18" y2="12"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/><polyline points="12 8 12 12 15 14"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    'chevron-left': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    'chevron-right': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  });

  /* ======================================================================== *
   * EVOLUTION SYSTEM — named stages layered on the existing XP/level engine.
   * Nothing about how XP is earned changes; this only names the level bands
   * and gives each a color used in the sidebar badge and the Passport.
   * ======================================================================== */
  const EVOLUTION_STAGES = [
    { name: 'Seed',      min: 1,  max: 2,        color: '#8B96AC' },
    { name: 'Explorer',  min: 3,  max: 5,        color: '#59E7D9' },
    { name: 'Builder',   min: 6,  max: 9,        color: '#4ADE9A' },
    { name: 'Creator',   min: 10, max: 14,       color: '#FBC55C' },
    { name: 'Innovator', min: 15, max: 19,       color: '#FB923C' },
    { name: 'Engineer',  min: 20, max: 25,       color: '#60A5FA' },
    { name: 'Architect', min: 26, max: 32,       color: '#B18CFF' },
    { name: 'Visionary', min: 33, max: 40,       color: '#F472B6' },
    { name: 'Master',    min: 41, max: 50,       color: '#F43F5E' },
    { name: 'Legend',    min: 51, max: 65,       color: '#FBBF24' },
    { name: 'Titan',     min: 66, max: Infinity, color: '#F8FAFC' },
  ];
  function evolutionOf(level) {
    return EVOLUTION_STAGES.find(s => level >= s.min && level <= s.max) || EVOLUTION_STAGES[EVOLUTION_STAGES.length - 1];
  }
  function nextEvolution(level) {
    const idx = EVOLUTION_STAGES.findIndex(s => level >= s.min && level <= s.max);
    return EVOLUTION_STAGES[idx + 1] || null;
  }

  function mountEvolutionBadge() {
    const brandText = document.querySelector('.brand-text');
    if (!brandText || document.getElementById('evolution-badge')) return;
    const badge = document.createElement('span');
    badge.id = 'evolution-badge';
    badge.className = 'evolution-badge';
    badge.title = 'Your evolution stage — click to open your Passport';
    badge.addEventListener('click', () => renderView('passport'));
    brandText.appendChild(badge);
    refreshEvolutionBadge();
  }
  function refreshEvolutionBadge() {
    const badge = document.getElementById('evolution-badge');
    if (!badge) return;
    const level = Ext.levelInfo(Ext.XP.total()).level;
    const stage = evolutionOf(level);
    badge.textContent = stage.name;
    badge.style.color = stage.color;
    badge.style.borderColor = stage.color + '66';
  }
  if (Ext.Bus) Ext.Bus.on('xp', refreshEvolutionBadge);

  /* ======================================================================== *
   * SVBG PASSPORT — a locally-generated identity card. Drawn straight to a
   * <canvas> (no DOM-to-image library needed) so the exact same drawing
   * routine used for on-screen display can be exported as a PNG.
   * ======================================================================== */
  function passportData() {
    const level = Ext.levelInfo(Ext.XP.total());
    const stage = evolutionOf(level.level);
    const dna = Ext.computeDNA();
    const unlocked = Ext.Achievements.unlocked();
    const meta = Store.get('system_meta', {});
    const entries = Object.entries(Ext.DNA_LABELS).map(([k, label]) => ({ label, value: dna[k] }));
    const top3 = [...entries].sort((a, b) => b.value - a.value).slice(0, 3);
    return {
      username: Auth?.current?.() || 'Guest',
      level: level.level, xpPct: level.pct, xpIntoLevel: level.xpIntoLevel, xpForNext: level.xpForNext,
      stage, overall: dna.overall, top3,
      achievements: unlocked.length, achievementsTotal: Ext.ACHIEVEMENT_DEFS.length,
      joined: meta.firstUsed ? new Date(meta.firstUsed).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function drawPassport(canvas) {
    const data = passportData();
    const W = 900, H = 520, DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = '100%'; canvas.style.maxWidth = W + 'px'; canvas.style.aspectRatio = `${W}/${H}`;
    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);
    const [r, g, b] = hexToRgb(data.stage.color);

    // background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a0d16');
    bg.addColorStop(1, `rgba(${r},${g},${b},0.14)`);
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, W, H, 26); ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`;
    ctx.lineWidth = 1.5;
    roundRect(ctx, 6, 6, W - 12, H - 12, 22); ctx.stroke();

    // faint corner glow
    const glow = ctx.createRadialGradient(W - 60, 60, 10, W - 60, 60, 260);
    glow.addColorStop(0, `rgba(${r},${g},${b},0.25)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // header
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px "Space Grotesk", sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SVBG LABS · PASSPORT', 40, 52);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText('LOCAL IDENTITY CARD — NO CLOUD, NO SERVER', 40, 70);

    // avatar (initials disc)
    const initials = (data.username || '?').slice(0, 2).toUpperCase();
    const ax = 100, ay = 175, ar = 62;
    const avatarGrad = ctx.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar);
    avatarGrad.addColorStop(0, `rgb(${r},${g},${b})`);
    avatarGrad.addColorStop(1, '#0a0d16');
    ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.fillStyle = avatarGrad; ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(initials, ax, ay + 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    // name + stage
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 30px "Space Grotesk", sans-serif';
    ctx.fillText(data.username, 190, 150);
    ctx.font = '700 13px "Inter", sans-serif';
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillText(`${data.stage.name.toUpperCase()} · LEVEL ${data.level}`, 190, 175);

    // xp bar
    const barX = 190, barY = 190, barW = 300, barH = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, barX, barY, barW, barH, 4); ctx.fill();
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    roundRect(ctx, barX, barY, Math.max(6, barW * data.xpPct / 100), barH, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '500 10.5px "JetBrains Mono", monospace';
    ctx.fillText(`${data.xpIntoLevel}/${data.xpForNext} XP to next stage`, barX, barY + 24);

    // joined + achievements
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '500 11px "Inter", sans-serif';
    ctx.fillText(`Joined ${data.joined}`, 190, 240);
    ctx.fillText(`${data.achievements}/${data.achievementsTotal} achievements unlocked`, 190, 258);

    // overall core score ring (top right)
    const rx = W - 130, ry = 150, rr = 52;
    ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 8; ctx.stroke();
    ctx.beginPath(); ctx.arc(rx, ry, rr, -Math.PI / 2, -Math.PI / 2 + (data.overall / 100) * Math.PI * 2);
    ctx.strokeStyle = `rgb(${r},${g},${b})`; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 22px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(data.overall + '%', rx, ry);
    ctx.font = '600 10px "Inter", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('CORE SCORE', rx, ry + rr + 18);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    // top attributes
    let ty = 330;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '700 11px "Inter", sans-serif';
    ctx.fillText('TOP ATTRIBUTES', 40, ty);
    ty += 22;
    data.top3.forEach(attr => {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '600 13px "Inter", sans-serif';
      ctx.fillText(attr.label, 40, ty + 9);
      const chipX = 220, chipW = 560;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      roundRect(ctx, chipX, ty - 6, chipW, 14, 7); ctx.fill();
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      roundRect(ctx, chipX, ty - 6, Math.max(8, chipW * attr.value / 100), 14, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '600 10.5px "JetBrains Mono", monospace';
      ctx.fillText(attr.value + '%', chipX + chipW + 12, ty + 6);
      ty += 30;
    });

    // footer
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillText('Generated entirely offline by SVBG Labs — every value above is real local activity data.', 40, H - 28);
  }

  Views.passport = function () {
    return `
      <div class="view-header"><div><div class="view-title">SVBG Passport</div><div class="view-sub">Your local identity card — generated from real activity, exportable as an image</div></div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-sm" id="passport-share"><span class="nav-icon" data-icon="link"></span>Share</button>
          <button class="btn btn-primary btn-sm" id="passport-download"><span class="nav-icon" data-icon="download"></span>Download PNG</button>
        </div>
      </div>
      <div class="card passport-card-wrap">
        <canvas id="passport-canvas"></canvas>
      </div>
      <p style="font-size:11.5px;color:var(--text-faint);margin-top:10px;">Nothing here is uploaded anywhere — the image is rendered and downloaded entirely in your browser.</p>
    `;
  };
  ViewMount.passport = function (root) {
    const canvas = root.querySelector('#passport-canvas');
    drawPassport(canvas);
    root.querySelector('#passport-download').addEventListener('click', () => {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `svbg-passport-${(Auth?.current?.() || 'guest')}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast('Passport downloaded', 'success');
      }, 'image/png');
    });
    root.querySelector('#passport-share').addEventListener('click', async () => {
      canvas.toBlob(async blob => {
        const filename = `svbg-passport-${(Auth?.current?.() || 'guest')}.png`;
        const file = new File([blob], filename, { type: 'image/png' });

        // 1) Native share sheet with the actual image (best on mobile, when available)
        if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
          try { await navigator.share({ files: [file], title: 'My SVBG Labs Passport' }); return; }
          catch (e) { if (e.name === 'AbortError') return; /* user cancelled — fall through to other options */ }
        }
        // 2) Some browsers support navigator.share without file support — still worth trying
        if (navigator.share) {
          try { await navigator.share({ title: 'My SVBG Labs Passport', text: 'Check out my SVBG Labs Passport!' }); return; }
          catch (e) { if (e.name === 'AbortError') return; }
        }
        // 3) Copy the image straight to the clipboard so it can be pasted anywhere
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast('Passport image copied — paste it anywhere to share', 'success');
            return;
          }
        } catch (e) { /* fall through to the universal fallback below */ }
        // 4) Universal fallback (always works, even under file:// with no share/clipboard
        //    APIs available at all): open the image in a new tab so it can be long-pressed
        //    or right-clicked to save/share, or downloaded if even that's blocked
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
          toast('Opened your Passport in a new tab — long-press or right-click it to save or share', 'default');
        } else {
          const a = document.createElement('a');
          a.href = url; a.download = filename;
          document.body.appendChild(a); a.click(); a.remove();
          toast('Sharing isn\'t available here, so the Passport was downloaded instead', 'default');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }, 'image/png');
    });
  };

  /* ======================================================================== *
   * TIME MACHINE — pick any past day and replay it. Built entirely from the
   * XP activity log (every tracked action already writes a timestamped
   * entry there), plus tasks/transactions for the completion percentage.
   * ======================================================================== */
  const REASON_ICON = {
    'Task completed': 'check-square', 'Habit checked in': 'activity', 'Journal entry logged': 'book-open',
    'Focus session completed': 'clock', 'Note created': 'file-text', 'Bookmark saved': 'bookmark',
    'Transaction logged': 'dollar', 'Password generated': 'shield',
  };
  const TimeMachineState = { date: todayStr(), speed: 1, playing: false, timer: null };

  // Shifts a 'YYYY-MM-DD' string by N days using UTC arithmetic throughout,
  // matching todayStr()'s own convention (new Date().toISOString()). Doing
  // this via a local-time Date round-trip instead (new Date(str+'T00:00:00')
  // then .toISOString()) silently drifts by a day for anyone in a UTC+
  // timezone — that was the Time Machine's prev/next-day bug.
  function shiftDateStr(dateStr, deltaDays) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + deltaDays);
    return d.toISOString().slice(0, 10);
  }

  function dayLog(dateStr) {
    return Ext.XP.log()
      .filter(e => new Date(e.at).toISOString().slice(0, 10) === dateStr)
      .sort((a, b) => a.at - b.at);
  }
  function dayPart(hour) {
    if (hour < 5) return 'Night';
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
  }
  function dayCompletionPct(dateStr) {
    const tasks = Store.get('tasks', []);
    const due = tasks.filter(t => t.due === dateStr).length;
    const done = tasks.filter(t => t.completedOn === dateStr).length;
    if (due === 0) return done > 0 ? 100 : null;
    return Math.round((done / due) * 100);
  }

  Views.timemachine = function () {
    const pct = dayCompletionPct(TimeMachineState.date);
    return `
      <div class="view-header"><div><div class="view-title">Time Machine</div><div class="view-sub">Revisit — or replay — any day you've used SVBG Labs</div></div></div>
      <div class="card" style="margin-bottom:18px;">
        <div class="tm-controls">
          <button class="btn btn-icon btn-ghost" id="tm-prev" data-icon="chevron-left" title="Previous day"></button>
          <input type="date" id="tm-date" value="${TimeMachineState.date}" max="${todayStr()}" />
          <button class="btn btn-icon btn-ghost" id="tm-next" data-icon="chevron-right" title="Next day" ${TimeMachineState.date >= todayStr() ? 'disabled' : ''}></button>
          <div class="tm-speed-group">
            ${[1, 2, 4].map(s => `<button class="btn btn-sm tm-speed ${TimeMachineState.speed===s?'is-active':''}" data-speed="${s}">${s}×</button>`).join('')}
          </div>
          <button class="btn btn-primary btn-sm" id="tm-play"><span class="nav-icon" data-icon="play"></span>Replay day</button>
          <button class="btn btn-sm" id="tm-export"><span class="nav-icon" data-icon="download"></span>Export log</button>
          ${pct !== null ? `<span class="chip ${pct>=70?'chip-success':pct>=35?'chip-warning':'chip-danger'}" style="margin-left:auto;">${pct}% of that day's plan done</span>` : ''}
        </div>
      </div>
      <div class="card">
        <div id="tm-timeline" class="tm-timeline"></div>
      </div>
    `;
  };

  function renderTimeline(root) {
    const mount = root.querySelector('#tm-timeline');
    const entries = dayLog(TimeMachineState.date);
    if (!entries.length) {
      mount.innerHTML = `<div class="empty-state"><span class="nav-icon" data-icon="history"></span><span class="empty-state-title">No recorded activity that day</span><span>Try a date you were active in SVBG Labs.</span></div>`;
      paintIcons(mount);
      return;
    }
    const groups = { Morning: [], Afternoon: [], Evening: [], Night: [] };
    entries.forEach(e => groups[dayPart(new Date(e.at).getHours())].push(e));
    mount.innerHTML = ['Morning', 'Afternoon', 'Evening', 'Night'].filter(p => groups[p].length).map(part => `
      <div class="tm-part">
        <div class="tm-part-label">${part}</div>
        ${groups[part].map((e, i) => `
          <div class="tm-event" data-idx="${entries.indexOf(e)}" style="opacity:0;">
            <span class="nav-icon tm-event-icon" data-icon="${REASON_ICON[e.reason] || 'sparkles'}"></span>
            <div class="tm-event-body"><div class="tm-event-title">${escapeHtml(e.reason)}</div><div class="tm-event-time">${new Date(e.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · +${e.amount} XP</div></div>
          </div>`).join('')}
      </div>`).join('');
    paintIcons(mount);
  }

  function playReplay(root) {
    const items = [...root.querySelectorAll('.tm-event')];
    if (!items.length || TimeMachineState.playing) return;
    TimeMachineState.playing = true;
    items.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; });
    let i = 0;
    const interval = Math.max(120, 700 / TimeMachineState.speed);
    clearInterval(TimeMachineState.timer);
    TimeMachineState.timer = setInterval(() => {
      if (i >= items.length) { clearInterval(TimeMachineState.timer); TimeMachineState.playing = false; return; }
      items[i].style.transition = 'opacity .35s var(--ease), transform .35s var(--ease)';
      items[i].style.opacity = '1'; items[i].style.transform = 'translateY(0)';
      i++;
    }, interval);
  }

  ViewMount.timemachine = function (root) {
    renderTimeline(root);
    root.querySelectorAll('.tm-event').forEach(el => { el.style.opacity = '1'; }); // visible by default; replay re-animates
    root.querySelector('#tm-date').addEventListener('change', e => { TimeMachineState.date = e.target.value; renderView('timemachine'); });
    root.querySelector('#tm-prev').addEventListener('click', () => { TimeMachineState.date = shiftDateStr(TimeMachineState.date, -1); renderView('timemachine'); });
    root.querySelector('#tm-next').addEventListener('click', () => { const next = shiftDateStr(TimeMachineState.date, 1); if (next <= todayStr()) { TimeMachineState.date = next; renderView('timemachine'); } });
    root.querySelectorAll('.tm-speed').forEach(b => b.addEventListener('click', () => { TimeMachineState.speed = parseInt(b.dataset.speed, 10); renderView('timemachine'); }));
    root.querySelector('#tm-play').addEventListener('click', () => playReplay(root));
    root.querySelector('#tm-export').addEventListener('click', () => {
      const entries = dayLog(TimeMachineState.date);
      const lines = [`SVBG Labs — day log for ${TimeMachineState.date}`, ''].concat(
        entries.map(e => `${new Date(e.at).toLocaleTimeString()} — ${e.reason} (+${e.amount} XP)`)
      );
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `svbg-daylog-${TimeMachineState.date}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  };
  ViewUnmount.timemachine = function () { clearInterval(TimeMachineState.timer); TimeMachineState.playing = false; };

  /* ======================================================================== *
   * SVBG LIFE COACH — rule-based weekly/monthly/yearly reports, built the
   * same way generateReflection() works (pattern comparisons over your own
   * history), just aggregated over a longer window and broken into
   * insights / warnings / strengths / weaknesses / motivation.
   * ======================================================================== */
  const CoachState = { period: 'week' };
  const PERIOD_DAYS = { week: 7, month: 30, year: 365 };
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function xpInRange(startMs, endMs) { return Ext.XP.log().filter(e => e.at >= startMs && e.at < endMs); }
  function countReason(entries, reason) { return entries.filter(e => e.reason === reason).length; }

  function computeCoachReport(period) {
    const days = PERIOD_DAYS[period];
    const now = Date.now();
    const startMs = now - days * 86400000;
    const prevStartMs = now - days * 2 * 86400000;
    const current = xpInRange(startMs, now);
    const previous = xpInRange(prevStartMs, startMs);

    const stat = (label, reason) => {
      const c = countReason(current, reason), p = countReason(previous, reason);
      const delta = p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);
      return { label, count: c, delta };
    };
    const stats = [
      stat('Tasks completed', 'Task completed'),
      stat('Focus sessions', 'Focus session completed'),
      stat('Journal entries', 'Journal entry logged'),
      stat('Habit check-ins', 'Habit checked in'),
    ];

    const insights = [];
    if (current.length >= 8) {
      const hourCounts = new Array(24).fill(0);
      current.forEach(e => hourCounts[new Date(e.at).getHours()]++);
      let bestStart = 0, bestSum = -1;
      for (let h = 0; h < 24; h++) {
        const sum = hourCounts[h] + hourCounts[(h + 1) % 24] + hourCounts[(h + 2) % 24];
        if (sum > bestSum) { bestSum = sum; bestStart = h; }
      }
      if (bestSum > 0) insights.push(`You tend to be most active between ${String(bestStart).padStart(2,'0')}:00 and ${String((bestStart + 3) % 24).padStart(2,'0')}:00.`);

      const dowCounts = new Array(7).fill(0);
      current.forEach(e => dowCounts[new Date(e.at).getDay()]++);
      const bestDow = dowCounts.indexOf(Math.max(...dowCounts));
      if (dowCounts[bestDow] > 0) insights.push(`${WEEKDAYS[bestDow]} is your most active day of the week in this period.`);
    }

    const journalEvents = current.filter(e => e.reason === 'Journal entry logged');
    const focusEvents = current.filter(e => e.reason === 'Focus session completed');
    if (journalEvents.length >= 2 && focusEvents.length >= 2) {
      const after = journalEvents.filter(j => focusEvents.some(f => j.at - f.at > 0 && j.at - f.at <= 3 * 3600000)).length;
      const pct = Math.round((after / journalEvents.length) * 100);
      if (pct >= 40) insights.push(`${pct}% of your journal entries follow a focus session within a few hours.`);
    }

    const tx = Store.get('transactions', []).filter(t => new Date(t.date).getTime() >= startMs && t.type === 'expense');
    if (tx.length >= 4) {
      const weekend = tx.filter(t => [0, 6].includes(new Date(t.date + 'T00:00:00').getDay()));
      const weekday = tx.filter(t => ![0, 6].includes(new Date(t.date + 'T00:00:00').getDay()));
      if (weekend.length && weekday.length) {
        const avgWeekend = weekend.reduce((s, t) => s + t.amount, 0) / weekend.length;
        const avgWeekday = weekday.reduce((s, t) => s + t.amount, 0) / weekday.length;
        if (avgWeekend > avgWeekday * 1.25) insights.push(`Your average weekend expense (${fmtMoney(avgWeekend)}) runs noticeably higher than weekdays (${fmtMoney(avgWeekday)}).`);
      }
    }

    const warnings = [];
    Store.get('habits', []).forEach(h => {
      const lastDone = Object.keys(h.history || {}).filter(d => h.history[d]).sort().pop();
      const idle = lastDone ? Math.round((now - new Date(lastDone).getTime()) / 86400000) : null;
      if (idle !== null && idle >= 3) warnings.push(`You haven't logged "${h.name}" in ${idle} days.`);
      const streak = calcStreak(h.history);
      [7, 30, 100].forEach(target => { if (streak > 0 && streak < target && target - streak <= 2) warnings.push(`${target - streak} more day${target-streak===1?'':'s'} for a ${target}-day streak on "${h.name}".`); });
    });

    const dna = Ext.computeDNA();
    const dnaEntries = Object.entries(Ext.DNA_LABELS).map(([k, label]) => ({ label, value: dna[k] })).sort((a, b) => b.value - a.value);

    return {
      period, stats, insights, warnings,
      strengths: dnaEntries.slice(0, 2), weaknesses: dnaEntries.slice(-2).reverse(),
      motivation: Ext.quoteOfTheDay(),
    };
  }

  Views.coach = function () {
    const report = computeCoachReport(CoachState.period);
    return `
      <div class="view-header"><div><div class="view-title">SVBG Life Coach</div><div class="view-sub">Rule-based reports over your own history — no AI model involved</div></div>
        <div class="tool-tabs" style="margin:0;">
          ${['week','month','year'].map(p => `<button class="tool-tab btn btn-sm coach-period ${CoachState.period===p?'is-active':''}" data-period="${p}">${p[0].toUpperCase()+p.slice(1)}ly</button>`).join('')}
        </div>
      </div>

      <div class="grid grid-4" style="margin-bottom:18px;">
        ${report.stats.map(s => `
          <div class="card stat-card">
            <span class="stat-label">${s.label}</span>
            <span class="stat-value">${s.count}</span>
            <span class="stat-hint" style="color:${s.delta>0?'var(--success)':s.delta<0?'var(--danger)':'var(--text-faint)'};">${s.delta>0?'▲ +':s.delta<0?'▼ ':''}${s.delta}% vs previous ${report.period}</span>
          </div>`).join('')}
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h3 style="font-size:14px;margin-bottom:12px;">Insights</h3>
          ${report.insights.length ? `<ul style="padding-left:18px;color:var(--text);font-size:13px;line-height:1.9;">${report.insights.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
            : `<p style="font-size:13px;color:var(--text-faint);">Not enough activity yet in this period for reliable patterns — keep using the app and check back.</p>`}
        </div>
        <div class="card">
          <h3 style="font-size:14px;margin-bottom:12px;">Warnings &amp; opportunities</h3>
          ${report.warnings.length ? `<ul style="padding-left:18px;color:var(--text);font-size:13px;line-height:1.9;">${report.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
            : `<p style="font-size:13px;color:var(--text-faint);">Nothing urgent — no idle habits or near-miss streaks right now.</p>`}
        </div>
        <div class="card">
          <h3 style="font-size:14px;margin-bottom:12px;">Strengths &amp; growth areas</h3>
          <div style="margin-bottom:10px;"><span class="chip chip-success">Strongest</span>
            ${report.strengths.map(s => `<div class="list-row"><div class="list-row-body"><div class="list-row-title">${s.label}</div></div><span class="stat-hint">${s.value}%</span></div>`).join('')}
          </div>
          <div><span class="chip chip-warning">Growth area</span>
            ${report.weaknesses.map(s => `<div class="list-row"><div class="list-row-body"><div class="list-row-title">${s.label}</div></div><span class="stat-hint">${s.value}%</span></div>`).join('')}
          </div>
        </div>
        <div class="card">
          <h3 style="font-size:14px;margin-bottom:12px;">Motivation</h3>
          <p style="font-size:13.5px;color:var(--text);line-height:1.7;font-style:italic;">"${escapeHtml(report.motivation)}"</p>
        </div>
      </div>
    `;
  };
  ViewMount.coach = function (root) {
    root.querySelectorAll('.coach-period').forEach(b => b.addEventListener('click', () => { CoachState.period = b.dataset.period; renderView('coach'); }));
  };

  /* ======================================================================== *
   * NEURAL SEARCH — extends the existing global search corpus (app.js) with
   * commands, achievements, DNA attributes, and the new views above, rather
   * than building a second, separate search implementation.
   * ======================================================================== */
  const originalBuildSearchCorpus = buildSearchCorpus;
  const COMMAND_VIEW_MAP = {
    'new-task': 'tasks', 'open-notes': 'notes', 'open-journal': 'journal', 'open-habits': 'habits',
    'start-focus': 'pomodoro', 'open-finance': 'finance', 'open-bookmarks': 'bookmarks', 'open-vault': 'vault',
    'gen-password': 'vault', 'open-dna': 'dna', 'open-graph': 'graph', 'open-reflection': 'reflection',
    'open-mission': 'mission', 'export-data': 'settings', 'open-settings': 'settings',
    'open-dashboard': 'dashboard',
  };
  buildSearchCorpus = function () {
    const corpus = originalBuildSearchCorpus();
    (Ext.buildCommands ? Ext.buildCommands() : []).forEach(c => {
      const view = COMMAND_VIEW_MAP[c.id];
      if (!view) return;
      corpus.push({ type: 'Command', view, title: c.label, snippet: c.hint, text: c.label + ' ' + c.hint });
    });
    (Ext.ACHIEVEMENT_DEFS || []).forEach(def => {
      corpus.push({ type: 'Achievement', view: 'mission', title: def.title, snippet: def.desc, text: def.title + ' ' + def.desc });
    });
    Object.entries(Ext.DNA_LABELS || {}).forEach(([, label]) => {
      corpus.push({ type: 'DNA', view: 'dna', title: label, snippet: 'SVBG DNA attribute', text: label + ' svbg dna' });
    });
    corpus.push({ type: 'View', view: 'coach', title: 'Life Coach', snippet: 'Weekly / monthly / yearly rule-based reports', text: 'life coach insights reports' });
    corpus.push({ type: 'View', view: 'timemachine', title: 'Time Machine', snippet: 'Revisit or replay any past day', text: 'time machine daily replay history' });
    corpus.push({ type: 'View', view: 'passport', title: 'SVBG Passport', snippet: 'Exportable local identity card', text: 'passport identity card export' });
    corpus.push({ type: 'View', view: 'identity', title: 'SVBG Identity', snippet: 'Your profile, level, and XP', text: 'identity profile level xp name' });
    corpus.push({ type: 'View', view: 'neuralprofile', title: 'Neural Profile', snippet: 'A behavioral read of your DNA traits', text: 'neural profile traits behavior' });
    corpus.push({ type: 'View', view: 'achievementsfull', title: 'Achievements', snippet: 'Full achievement gallery', text: 'achievements badges trophies gallery' });
    corpus.push({ type: 'View', view: 'goals', title: 'Goals', snippet: 'Longer-horizon targets and progress', text: 'goals targets progress' });
    corpus.push({ type: 'View', view: 'privacy', title: 'Privacy', snippet: 'What SVBG Labs does with your data', text: 'privacy data local storage' });
    corpus.push({ type: 'View', view: 'datavault', title: 'Data Vault', snippet: 'Export, import, or erase your data', text: 'data vault export import erase backup' });
    corpus.push({ type: 'View', view: 'mindlab', title: 'SVBG Mind Lab', snippet: 'Memory, reaction, and pattern experiments', text: 'mind lab memory reaction pattern focus perception experiments' });
    corpus.push({ type: 'View', view: 'activityfeed', title: 'SVBG Activity', snippet: 'A real chronological feed of your activity', text: 'activity feed events timeline recent' });
    corpus.push({ type: 'View', view: 'dailymission', title: "Today's Mission", snippet: 'Daily objectives from real activity', text: 'daily mission today challenge streak' });
    corpus.push({ type: 'View', view: 'focusforest', title: 'Focus Forest', snippet: 'Grows from your real focus sessions', text: 'focus forest tree growth sessions' });
    return corpus;
  };

  /* ======================================================================== *
   * FOCUS ENVIRONMENT — while a focus session is actively running, recolor
   * the existing ambient background (via CSS custom properties it already
   * reads every frame) instead of building a second background system.
   * ======================================================================== */
  const FOCUS_ENVS = {
    off:    null,
    cyber:  { accent: '89,231,217',  grad: 'radial-gradient(circle at 15% 0%, #101a2e 0%, #090c13 45%)' },
    rain:   { accent: '110,150,255', grad: 'radial-gradient(circle at 50% 0%, #131c2e 0%, #060a12 55%)' },
    space:  { accent: '190,150,255', grad: 'radial-gradient(circle at 50% 10%, #1a1030 0%, #05040a 55%)' },
    forest: { accent: '110,220,150', grad: 'radial-gradient(circle at 30% 0%, #10241a 0%, #060c09 55%)' },
    ocean:  { accent: '90,200,230',  grad: 'radial-gradient(circle at 70% 0%, #0b2530 0%, #050c10 55%)' },
  };
  function focusEnvMode() { return Store.get('focus_env_mode', 'off'); }
  function setFocusEnvMode(mode) { Store.set('focus_env_mode', mode); }
  function applyFocusEnv(active) {
    const root = document.documentElement;
    const mode = focusEnvMode();
    const env = active && mode !== 'off' ? FOCUS_ENVS[mode] : null;
    if (env) {
      root.style.setProperty('--accent-rgb', env.accent);
      root.style.setProperty('--bg-grad', env.grad);
      document.body.classList.add('focus-env-active');
    } else {
      root.style.removeProperty('--accent-rgb');
      root.style.removeProperty('--bg-grad');
      document.body.classList.remove('focus-env-active');
    }
  }
  setInterval(() => { applyFocusEnv(typeof PomoState !== 'undefined' && PomoState.running && PomoState.mode === 'focus'); }, 1000);

  const originalPomodoroView = Views.pomodoro;
  const originalPomodoroMount = ViewMount.pomodoro;
  Views.pomodoro = function () {
    return originalPomodoroView() + `
      <div class="card" style="margin-top:18px;">
        <h3 style="font-size:14px;margin-bottom:10px;">Focus Environment</h3>
        <p style="font-size:12px;color:var(--text-faint);margin-bottom:12px;">Pick an ambient mood. It only takes over the background while a focus session is actively running.</p>
        <div class="focus-env-grid">
          ${Object.keys(FOCUS_ENVS).map(k => `<button class="btn btn-sm focus-env-btn ${focusEnvMode()===k?'is-active':''}" data-env="${k}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')}
        </div>
      </div>
    `;
  };
  ViewMount.pomodoro = function (root) {
    originalPomodoroMount(root);
    root.querySelectorAll('.focus-env-btn').forEach(b => b.addEventListener('click', () => {
      setFocusEnvMode(b.dataset.env);
      root.querySelectorAll('.focus-env-btn').forEach(x => x.classList.toggle('is-active', x === b));
      toast(b.dataset.env === 'off' ? 'Focus Environment off' : `Focus Environment set to ${b.dataset.env}`, 'success');
    }));
  };

  /* ---------------------------------------------------------------------- *
   * INIT
   * ---------------------------------------------------------------------- */
  function initAdvanced() {
    mountEvolutionBadge();
    paintIcons();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAdvanced);
  else initAdvanced();
})();
