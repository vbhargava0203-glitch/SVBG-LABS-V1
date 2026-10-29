/* ==========================================================================
   SVBG MISSION CONTROL 2.0 — wraps the existing Views.mission (kept intact
   as the "System status" widget) and adds: a personalized header, widgets
   computed from real Store data / Activity Core events, SVG charts with
   7/30-day filters, show/hide + reorder + modes, and an optional Neural
   Core canvas. Nothing is mocked: empty data shows an empty state.
   Honest limits: SVBG has no Projects module, and the Focus Timer stores
   sessions per day (not minutes), so those are not invented here.
   ========================================================================== */
'use strict';

(function () {
  const C = window.SVBGCore2;
  const Ext = window.SVBGLabsExt || {};
  if (!C || typeof Views.mission !== 'function') return;
  const E = escapeHtml;
  const origMission = Views.mission;

  const DEFAULT_ORDER = ['neural', 'mission', 'productivity', 'focus', 'goals', 'achievements', 'learning', 'dna', 'heatmap', 'journey', 'activity', 'system'];
  const TITLES = { neural: 'Neural Core', mission: "Today's Mission", productivity: 'Productivity', focus: 'Focus analytics', goals: 'Personal goals', achievements: 'Achievements', learning: 'Learning', dna: 'SVBG DNA', heatmap: 'Activity heatmap', journey: 'Personal journey', activity: 'Recent activity', system: 'System status' };
  const WIDE = new Set(['neural', 'heatmap', 'journey', 'activity', 'system']);
  const MODE_ORDERS = { balance: [], build: ['productivity', 'goals', 'mission', 'journey'], learn: ['learning', 'goals', 'dna', 'mission'], focus: ['focus', 'mission', 'productivity', 'neural'], explore: ['neural', 'dna', 'heatmap', 'activity'] };
  const LKEY = 'mc_layout';
  let range = 7, panelOpen = false;

  const layout = () => C.validateLayout(Store.get(LKEY, null), DEFAULT_ORDER);
  const saveLayout = l => Store.set(LKEY, l);
  const log = () => (window.SVBGActivityCore ? window.SVBGActivityCore.log() : []);
  const goBtn = (view, label) => `<button class="btn btn-sm" data-go="${view}">${label}</button>`;
  const empty = (msg, btn) => `<div class="mc2-empty">${E(msg)}${btn ? '<div style="margin-top:8px;">' + btn + '</div>' : ''}</div>`;
  const statBox = (v, l) => `<div class="mc2-stat"><div class="mc2-stat-v">${E(String(v))}</div><div class="mc2-stat-l">${E(l)}</div></div>`;
  const rangeToggle = () => `<div class="mc2-range">${[7, 30].map(n => `<button class="chip-btn ${range === n ? 'is-selected' : ''}" data-range="${n}">${n}d</button>`).join('')}</div>`;

  function barChart(series, unit) {
    const max = Math.max(1, ...series.map(s => s.value)), W = 300, H = 80, n = series.length, bw = W / n;
    const bars = series.map((s, i) => { const h = Math.round((s.value / max) * (H - 4)); return `<rect x="${(i * bw + bw * 0.15).toFixed(1)}" y="${H - h}" width="${(bw * 0.7).toFixed(1)}" height="${Math.max(h, s.value ? 2 : 0)}" rx="2" class="mc2-bar"><title>${s.day}: ${s.value} ${unit}</title></rect>`; }).join('');
    return `<svg viewBox="0 0 ${W} ${H + 14}" class="mc2-chart" role="img" aria-label="${unit} per day, last ${n} days, peak ${max}">${bars}<text x="0" y="${H + 12}" class="mc2-axis">${series[0].day.slice(5)}</text><text x="${W}" y="${H + 12}" text-anchor="end" class="mc2-axis">${series[n - 1].day.slice(5)}</text><text x="${W}" y="9" text-anchor="end" class="mc2-axis">peak ${max}</text></svg>`;
  }

  /* ---------------- widgets ---------------- */
  const W = {};
  W.productivity = () => {
    const tasks = Store.get('tasks', []), s = C.taskStats(tasks, todayStr());
    if (!s.total) return empty('Create your first task to begin tracking progress.', `<button class="btn btn-primary btn-sm" data-act="add-task">Add task</button>`);
    const order = { high: 0, med: 1, low: 2 };
    const top = tasks.filter(t => !t.done).sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3) || String(a.due || '9').localeCompare(String(b.due || '9'))).slice(0, 3);
    const series = C.completedSeries(tasks, range, todayStr());
    return `<div class="mc2-stats">${statBox(s.total, 'Total')}${statBox(s.completed, 'Completed')}${statBox(s.pending, 'Pending')}${statBox(s.dueToday, 'Due today')}${statBox(s.weeklyRate == null ? '\u2014' : s.weeklyRate + '%', 'Done this week vs open')}</div>
      ${rangeToggle()}${C.sum(series) ? barChart(series, 'tasks completed') : empty('No tasks completed in the last ' + range + ' days.')}
      ${top.length ? `<div class="mc2-sub">Top priorities</div>${top.map(t => `<div class="mc2-line"><span class="chip ${t.priority === 'high' ? 'chip-danger' : t.priority === 'med' ? 'chip-warning' : ''}">${E(t.priority || '')}</span> ${E(t.title)}</div>`).join('')}` : ''}`;
  };
  W.focus = () => {
    const pomo = Store.get('pomoSessions', {}), td = todayStr();
    const total = Object.values(pomo).reduce((a, b) => a + b, 0);
    if (!total) return empty('Start a focus session to build your focus history.', `<button class="btn btn-primary btn-sm" data-act="start-focus">Start focus</button>`);
    const week = C.sum(C.focusSeries(pomo, 7, td)), best = Math.max(...Object.values(pomo));
    const series = C.focusSeries(pomo, range, td);
    return `<div class="mc2-stats">${statBox(pomo[td] || 0, 'Today')}${statBox(week, 'This week')}${statBox(total, 'All-time')}${statBox(best, 'Best day')}</div>${rangeToggle()}${C.sum(series) ? barChart(series, 'sessions') : empty('No sessions in the last ' + range + ' days.')}<div class="mc2-note">Counted in completed sessions; session length is set in the Focus Timer.</div>`;
  };
  W.goals = () => {
    const g = Store.get('goals', []), active = g.filter(x => x.progress < 100), done = g.filter(x => x.progress >= 100);
    if (!g.length) return empty('Set a goal to track longer-term progress.', goBtn('goals', 'Add goal'));
    return `${active.slice(0, 4).map(x => `<div class="mc2-goal"><div class="mc2-goal-top"><span>${E(x.title)}</span><span>${x.progress}%</span></div><div class="identity-xp-bar"><div class="identity-xp-bar-fill" style="width:${x.progress}%"></div></div>${x.targetDate ? `<div class="mc2-note">Target ${E(x.targetDate)}</div>` : ''}</div>`).join('') || '<div class="mc2-note">All goals complete.</div>'}<div class="mc2-note">${active.length} active \u00b7 ${done.length} completed</div>${goBtn('goals', 'Manage goals')}`;
  };
  W.achievements = () => {
    const lv = Ext.levelInfo && Ext.XP ? Ext.levelInfo(Ext.XP.total()) : null;
    const un = Ext.Achievements ? Ext.Achievements.unlocked() : [], defs = Ext.ACHIEVEMENT_DEFS || [];
    const next = defs.find(d => !un.some(u => u.id === d.id));
    const recent = log().filter(e => e.type === 'ACHIEVEMENT_UNLOCKED').slice(-3).reverse();
    return `<div class="mc2-stats">${statBox(Ext.XP ? Ext.XP.total() : 0, 'XP')}${statBox(lv ? lv.level : 1, 'Level')}${statBox(un.length + '/' + defs.length, 'Unlocked')}</div>
      ${lv ? `<div class="mc2-note">${lv.xpIntoLevel}/${lv.xpForNext} XP to level ${lv.level + 1}</div><div class="identity-xp-bar"><div class="identity-xp-bar-fill" style="width:${lv.pct}%"></div></div>` : ''}
      ${next ? `<div class="mc2-sub">Up next</div><div class="mc2-line"><strong>${E(next.title)}</strong> \u2014 ${E(next.desc)}</div>` : ''}
      ${recent.length ? `<div class="mc2-sub">Recently unlocked</div>${recent.map(e => `<div class="mc2-line">${E((e.payload || {}).title || '')}</div>`).join('')}` : empty('Your achievements will appear here as you progress.')}${goBtn('achievementsfull', 'View all')}`;
  };
  W.learning = () => {
    const p = C.normalizeProfile(Store.get('svbg_profile', null));
    const skills = [...p.programmingLanguages, ...p.technicalSkills, ...p.customSkills].slice(0, 8);
    const notes = Store.get('notes', []).length, marks = Store.get('bookmarks', []).length;
    return `<div class="mc2-stats">${statBox(notes, 'Notes')}${statBox(marks, 'Bookmarks')}${statBox(Store.get('mindlab_history', {}) ? Object.keys(Store.get('mindlab_history', {})).length : 0, 'Mind Lab tried')}</div>
      <div class="mc2-sub">Skills being developed</div>${skills.length ? `<div class="idn-chips">${skills.map(x => `<span class="chip">${E(x)}</span>`).join('')}</div>` : empty('Add your skills in SVBG Identity.', goBtn('profileedit', 'Edit profile'))}
      ${p.learningGoals.length ? `<div class="mc2-sub">Learning goals</div>${p.learningGoals.slice(0, 3).map(x => `<div class="mc2-line">${E(x)}</div>`).join('')}` : ''}
      <div style="margin-top:10px;">${goBtn('graph', 'Open Knowledge Graph')}</div>`;
  };
  W.dna = () => {
    if (!Ext.computeDNA || !Ext.dnaRingSvg) return empty('DNA is unavailable.');
    const d = Ext.computeDNA(), labels = Ext.DNA_LABELS || {};
    const top = Object.keys(labels).map(k => [k, d[k] || 0]).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return `<div class="mc2-note">Overall <strong>${d.overall}</strong>/100</div><div class="mc2-rings">${top.map(([k, v]) => `<div class="mc2-ring">${Ext.dnaRingSvg(k, v, 52, 5)}<span>${E(labels[k] || k)}</span></div>`).join('')}</div>${goBtn('dna', 'Open DNA')}`;
  };
  W.heatmap = () => {
    const series = C.activitySeries(log(), 84, todayStr());
    if (!C.sum(series)) return empty('Activity you record in SVBG will light up this map.');
    const max = Math.max(...series.map(s => s.value)), lead = new Date(series[0].day + 'T00:00:00Z').getUTCDay();
    const cells = Array(lead).fill('<span class="mc2-cell mc2-pad"></span>').concat(series.map(s => `<span class="mc2-cell l${s.value ? Math.min(4, Math.ceil((s.value / max) * 4)) : 0}" title="${s.day}: ${s.value} event${s.value === 1 ? '' : 's'}"></span>`));
    return `<div class="mc2-heat" aria-label="Recorded activity, last 12 weeks">${cells.join('')}</div><div class="mc2-note">Last 12 weeks \u00b7 each square is a day \u00b7 darker = more recorded events</div>`;
  };
  W.journey = () => {
    const ms = C.journeyMilestones(Store.get('svbg_profile', null), log(), Store.get('goals', []), 0);
    return `${ms.length ? ms.map(m => `<div class="mc2-ms"><span class="mc2-dot"></span><span>${E(m.label)}</span><span class="mc2-note">${m.at ? new Date(m.at).toLocaleDateString() : ''}</span></div>`).join('') : empty('Your journey starts here.')}<div style="margin-top:10px;">${goBtn('timeline', 'Timeline')} ${goBtn('timemachine', 'Time Machine')}</div>`;
  };
  W.activity = () => `${window.SVBGActivityFeedSnippet ? window.SVBGActivityFeedSnippet(6) : ''}<div style="margin-top:10px;">${goBtn('activityfeed', 'Full activity feed')}</div>`;
  W.system = () => `<div class="mc2-system">${origMission()}</div>`;
  W.mission = () => {
    const tasks = Store.get('tasks', []), s = C.taskStats(tasks, todayStr()), p = C.normalizeProfile(Store.get('svbg_profile', null));
    const high = tasks.filter(t => !t.done && t.priority === 'high').length, pomoToday = (Store.get('pomoSessions', {}))[todayStr()] || 0;
    return `${window.SVBGDailyMissionWidget ? window.SVBGDailyMissionWidget() : ''}
      <div class="mc2-brief"><span>Priority tasks</span><b>${high}</b><span>Focus today</span><b>${pomoToday}</b><span>Learning goal</span><b>${E(p.learningGoals[0] || 'not set')}</b><span>Current work</span><b>${E(p.currentWork || 'not set')}</b></div>
      <div class="mc2-actions"><button class="btn btn-primary btn-sm" data-act="add-task">Add task</button><button class="btn btn-sm" data-act="start-focus">Start focus</button>${goBtn('graph', 'Open learning')}${goBtn('goals', 'View goals')}</div>`;
  };
  W.neural = () => {
    const c = neuralCounts();
    return `<canvas id="mc2-neural" class="mc2-neural" width="640" height="200" role="img" aria-label="Neural Core: activity in the last 7 days"></canvas>
      <div class="mc2-legend">${NEURAL.map(n => `<span><i style="background:${n.color}"></i>${n.label} ${c[n.id]}</span>`).join('')}</div>
      <div class="mc2-note">Each cluster glows with its real event count from the last 7 days; new events pulse it.</div>`;
  };

  /* ---------------- header ---------------- */
  function header() {
    const p = C.normalizeProfile(Store.get('svbg_profile', null), (() => { try { return { username: Auth.current() }; } catch (e) { return {}; } })());
    const lv = Ext.levelInfo && Ext.XP ? Ext.levelInfo(Ext.XP.total()) : { level: 1 };
    const streak = Store.get('habits', []).reduce((m, h) => Math.max(m, calcStreak(h.history || {})), 0);
    const st = Store.get('daily_mission_state', null), mDone = st && st.date === todayStr() ? st.completedIds.length : 0;
    const tdone = Store.get('tasks', []).filter(t => t.done && t.completedOn === todayStr()).length;
    const online = navigator.onLine;
    return `<div class="card mc2-welcome">
      ${window.SVBGProfile && window.SVBGProfile.avatarHtml ? window.SVBGProfile.avatarHtml(72) : ''}
      <div class="mc2-welcome-main">
        <div class="mc2-eyebrow">${E(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))}</div>
        <div class="mc2-hello">WELCOME BACK, ${E(C.displayNameOf(p).toUpperCase())}</div>
        <div class="mc2-sub2">Your personal system is ready.</div>
        <div class="mc2-meta"><span><b>Role</b> ${p.currentRole ? E(p.currentRole) : '<em>add in Identity</em>'}</span><span><b>Focus</b> ${p.currentWork ? E(p.currentWork) : '<a href="#" data-go="profileedit">Add your current focus in SVBG Identity.</a>'}</span><span><b>Workspace</b> ${p.systemName ? E(p.systemName) : '<em>unnamed</em>'}</span></div>
        <div class="mc2-chips"><span class="chip chip-accent">Level ${lv.level}</span><span class="chip">XP ${(Ext.XP ? Ext.XP.total() : 0).toLocaleString()}</span><span class="chip">Streak ${streak}d</span><span class="chip">Today: ${mDone}/3 missions \u00b7 ${tdone} task${tdone === 1 ? '' : 's'} done</span><span class="chip ${online ? 'chip-success' : 'chip-warning'}">${online ? 'System online' : 'Offline \u2014 local systems operational'}</span></div>
      </div>
      <button class="btn btn-sm mc2-customize" id="mc2-customize" aria-expanded="${panelOpen}">Customize</button>
    </div>`;
  }

  function panel(l) {
    const full = l.order || C.orderedWidgets({ mode: l.mode, hidden: [], order: null }, DEFAULT_ORDER, MODE_ORDERS);
    return `<div class="card mc2-panel"><div class="mc2-sub">Emphasis</div><div class="mc2-modes">${C.MODES.map(m => `<button class="chip-btn ${l.mode === m ? 'is-selected' : ''}" data-mode="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
      <div class="mc2-sub">Widgets</div>${full.map((id, i) => `<div class="mc2-wrow"><label><input type="checkbox" data-vis="${id}" ${l.hidden.includes(id) ? '' : 'checked'}> ${E(TITLES[id])}</label><span><button class="btn btn-sm" data-move="${id}:-1" ${i === 0 ? 'disabled' : ''} aria-label="Move ${E(TITLES[id])} up">\u25B2</button><button class="btn btn-sm" data-move="${id}:1" ${i === full.length - 1 ? 'disabled' : ''} aria-label="Move ${E(TITLES[id])} down">\u25BC</button></span></div>`).join('')}
      <button class="btn btn-sm" id="mc2-reset">Restore default layout</button></div>`;
  }

  Views.mission = function () {
    const l = layout();
    const ids = C.orderedWidgets(l, DEFAULT_ORDER, MODE_ORDERS);
    const body = ids.map(id => {
      let html;
      try { html = W[id](); } catch (e) { console.warn('widget failed', id, e); html = empty('This widget is unavailable right now.'); }
      return `<section class="card mc2-widget ${WIDE.has(id) ? 'mc2-wide' : ''}" data-widget="${id}"><h3 class="mc2-wtitle">${E(TITLES[id])}</h3>${html}</section>`;
    }).join('');
    return `${header()}${panelOpen ? panel(l) : ''}<div class="mc2-grid">${body || empty('All widgets are hidden. Use Customize to bring them back.')}</div>`;
  };

  /* ---------------- Neural Core (optional, isolated) ---------------- */
  const NEURAL = [
    { id: 'tasks', label: 'Tasks', color: '#59E7D9', types: ['TASK_COMPLETED'] },
    { id: 'focus', label: 'Focus', color: '#B18CFF', types: ['FOCUS_COMPLETED'] },
    { id: 'learning', label: 'Learning', color: '#FFB86C', types: ['NOTE_CREATED', 'BOOKMARK_SAVED', 'MINDLAB_COMPLETED', 'JOURNAL_ENTRY'] },
    { id: 'achievements', label: 'Achievements', color: '#FF6B9D', types: ['ACHIEVEMENT_UNLOCKED', 'LEVEL_UP'] },
    { id: 'goals', label: 'Goals', color: '#7DD87F', types: ['MILESTONE_REACHED', 'DAILY_MISSION_COMPLETED', 'HABIT_COMPLETED'] },
  ];
  function neuralCounts() {
    const since = Date.now() - 7 * 86400000, out = {};
    NEURAL.forEach(n => { out[n.id] = log().filter(e => e.at >= since && n.types.includes(e.type)).length; });
    return out;
  }
  let nState = null;
  function startNeural(root) {
    stopNeural();
    const cv = root.querySelector('#mc2-neural'); if (!cv) return;
    const ctx = cv.getContext('2d'), Wd = cv.width, Hd = cv.height;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // fixed seed -> same layout every time
    const nodes = [], edges = [];
    NEURAL.forEach((n, ci) => {
      const cx = Wd * (0.12 + ci * 0.19), cy = Hd * (ci % 2 ? 0.35 : 0.65), start = nodes.length;
      for (let i = 0; i < 6; i++) nodes.push({ c: ci, x: cx + (rnd() - 0.5) * 90, y: cy + (rnd() - 0.5) * 80 });
      for (let i = start + 1; i < nodes.length; i++) edges.push([start, i]);
      if (ci) edges.push([start, nodes.findIndex(x => x.c === ci - 1)]);
    });
    const counts = neuralCounts(), energy = {}; NEURAL.forEach((n, i) => { energy[i] = Math.min(1, counts[n.id] / 8); });
    const pulses = {}; let lastLen = log().length, visible = true, raf = 0, last = 0;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw(t) {
      ctx.clearRect(0, 0, Wd, Hd);
      edges.forEach(([a, b]) => { const A = nodes[a], B = nodes[b]; ctx.strokeStyle = `rgba(160,180,220,${0.08 + 0.2 * Math.max(energy[A.c], energy[B.c])})`; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); });
      nodes.forEach(n => {
        const p = pulses[n.c] ? Math.max(0, 1 - (t - pulses[n.c]) / 1500) : 0, e = energy[n.c];
        ctx.globalAlpha = 0.3 + 0.7 * e; ctx.fillStyle = NEURAL[n.c].color;
        ctx.beginPath(); ctx.arc(n.x, n.y, 3 + 2 * e + 4 * p, 0, 6.2832); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    function frame(t) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || t - last < 33) return; last = t;
      const l = log();
      if (l.length !== lastLen) { // a new real event -> pulse its cluster, refresh energy
        const ev = l[l.length - 1], ci = NEURAL.findIndex(n => ev && n.types.includes(ev.type));
        if (ci >= 0) pulses[ci] = t; const c2 = neuralCounts(); NEURAL.forEach((n, i) => { energy[i] = Math.min(1, c2[n.id] / 8); }); lastLen = l.length;
      }
      draw(t);
    }
    draw(0);
    if (reduce) { nState = { stop() {} }; return; } // static, no animation loop
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }) : null;
    if (io) io.observe(cv);
    raf = requestAnimationFrame(frame);
    nState = { stop() { cancelAnimationFrame(raf); if (io) io.disconnect(); } };
  }
  function stopNeural() { if (nState) { nState.stop(); nState = null; } }

  /* ---------------- events ---------------- */
  function runCmd(id) { const c = Ext.buildCommands && Ext.buildCommands().find(x => x.id === id); if (c) c.run(); else toast('That action is unavailable.', 'danger'); }
  ViewMount.mission = function (root) {
    if (window.SVBGProfile && window.SVBGProfile.paintAvatars) window.SVBGProfile.paintAvatars(root);
    startNeural(root);
    // #content persists across views, so listen on this render's own wrapper (discarded with the DOM on next render)
    const scope = root.querySelector('.view') || root;
    scope.addEventListener('click', e => {
      const t = e.target.closest('[data-go],[data-act],[data-range],[data-mode],[data-move],#mc2-customize,#mc2-reset');
      if (!t || !scope.contains(t)) return;
      const l = layout();
      if (t.dataset.go) { e.preventDefault(); renderView(t.dataset.go); }
      else if (t.dataset.act) runCmd(t.dataset.act);
      else if (t.dataset.range) { range = +t.dataset.range; renderView('mission'); }
      else if (t.id === 'mc2-customize') { panelOpen = !panelOpen; renderView('mission'); }
      else if (t.dataset.mode) { l.mode = t.dataset.mode; l.order = null; saveLayout(l); renderView('mission'); }
      else if (t.id === 'mc2-reset') { Store.set(LKEY, null); renderView('mission'); toast('Default layout restored'); }
      else if (t.dataset.move) {
        const [id, d] = t.dataset.move.split(':'), full = (l.order || C.orderedWidgets({ mode: l.mode, hidden: [], order: null }, DEFAULT_ORDER, MODE_ORDERS)).slice();
        const i = full.indexOf(id), j = i + (+d);
        if (i >= 0 && j >= 0 && j < full.length) { [full[i], full[j]] = [full[j], full[i]]; l.order = full; saveLayout(l); renderView('mission'); }
      }
    });
    scope.addEventListener('change', e => {
      const id = e.target.dataset && e.target.dataset.vis; if (!id) return;
      const l = layout(); l.hidden = e.target.checked ? l.hidden.filter(x => x !== id) : [...new Set(l.hidden.concat(id))];
      saveLayout(l); renderView('mission');
    });
  };
  const prevUnmount = ViewUnmount.mission;
  ViewUnmount.mission = function () { stopNeural(); if (prevUnmount) prevUnmount(); };
})();
