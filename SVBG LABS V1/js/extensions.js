/* ==========================================================================
   SVBG Labs EXTENSIONS
   ==========================================================================
   Additive module loaded after js/app.js. It reuses everything already
   defined there (Store, Views, ViewMount, ViewUnmount, renderView, toast,
   icon/paintIcons, escapeHtml, uid, todayStr, daysAgo, calcStreak, fmtMoney,
   fmtDate, debounce, confirmModal, THEMES, applyTheme, Auth) rather than
   redefining any of it, so the original app.js is left untouched apart from
   a handful of one-line hooks that call into window.SVBGLabsExt.

   Everything below is still 100% local: no network calls, no external AI
   APIs. The one optional network dependency is the Three.js CDN script
   used for the 3D neural background — if it fails to load (e.g. no
   internet on first run), the original 2D particle field keeps working
   and nothing else in this file is affected.
   ========================================================================== */
'use strict';

(function () {

/* ---------------------------------------------------------------------- *
 * Extra icons for the new nav items / UI (added to the existing ICONS
 * registry from app.js rather than duplicating it).
 * ---------------------------------------------------------------------- */
Object.assign(ICONS, {
  dna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3c0 4 12 4 12 8s-12 4-12 8"/><path d="M18 3c0 4-12 4-12 8s12 4 12 8"/><line x1="7" y1="7" x2="17" y2="7"/><line x1="7" y1="17" x2="17" y2="17"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>',
  radar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.07 4.93A10 10 0 1 0 22 12"/><circle cx="12" cy="12" r="3"/><path d="M12 12 20 5"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
});

/* ---------------------------------------------------------------------- *
 * MINI EVENT BUS — lets independent systems react to app activity
 * (task completed, habit checked, etc.) without tangling their code
 * together. This is the "nervous system" the other modules hang off.
 * ---------------------------------------------------------------------- */
const Bus = (() => {
  const handlers = {};
  return {
    on(evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); },
    emit(evt, payload) { (handlers[evt] || []).forEach(fn => { try { fn(payload); } catch (e) { console.warn('Bus handler failed', evt, e); } }); },
  };
})();

/* ---------------------------------------------------------------------- *
 * XP / LEVEL ENGINE
 * A local rule engine: fixed XP rewards per action type, a triangular-ish
 * level curve, and a running log capped at 500 entries so storage stays
 * bounded.
 * ---------------------------------------------------------------------- */
const XP = {
  log() { return Store.get('xp_log', []); },
  total() { return Store.get('xp_total', 0); },
  add(amount, reason) {
    const total = this.total() + amount;
    Store.set('xp_total', total);
    const log = this.log();
    log.push({ amount, reason, at: Date.now() });
    if (log.length > 500) log.shift();
    Store.set('xp_log', log);
    Bus.emit('xp', { amount, reason, total });
    Achievements.check();
    return total;
  },
};

function levelInfo(xp) {
  let level = 1, totalNeeded = 0, xpForNext = 100;
  while (xp >= totalNeeded + xpForNext) {
    totalNeeded += xpForNext;
    level++;
    xpForNext = Math.round(100 * Math.pow(level, 1.15));
  }
  return { level, xpIntoLevel: xp - totalNeeded, xpForNext, pct: Math.round(((xp - totalNeeded) / xpForNext) * 100) };
}

/* ---------------------------------------------------------------------- *
 * ACHIEVEMENTS — evaluated against real local data, no fabricated stats.
 * ---------------------------------------------------------------------- */
const ACHIEVEMENT_DEFS = [
  { id: 'first_task', title: 'First Task', desc: 'Complete your first task', rarity: 'common', check: s => s.tasks.some(t => t.done) },
  { id: 'ten_tasks', title: 'Ten Down', desc: 'Complete 10 tasks', rarity: 'common', check: s => s.tasks.filter(t => t.done).length >= 10 },
  { id: 'fifty_tasks', title: 'Task Master', desc: 'Complete 50 tasks', rarity: 'rare', check: s => s.tasks.filter(t => t.done).length >= 50 },
  { id: 'first_note', title: 'Knowledge Seeker', desc: 'Write your first note', rarity: 'common', check: s => s.notes.length >= 1 },
  { id: 'ten_notes', title: 'Archivist', desc: 'Write 10 notes', rarity: 'rare', check: s => s.notes.length >= 10 },
  { id: 'first_journal', title: 'Self-Aware', desc: 'Log your first journal entry', rarity: 'common', check: s => s.journal.length >= 1 },
  { id: 'first_habit', title: 'Habit Former', desc: 'Create your first habit', rarity: 'common', check: s => s.habits.length >= 1 },
  { id: 'seven_streak', title: 'One Week Strong', desc: 'Hit a 7-day habit streak', rarity: 'rare', check: s => s.habits.some(h => calcStreak(h.history) >= 7) },
  { id: 'thirty_streak', title: 'Iron Will', desc: 'Hit a 30-day habit streak', rarity: 'epic', check: s => s.habits.some(h => calcStreak(h.history) >= 30) },
  { id: 'hundred_streak', title: 'Legend', desc: 'Hit a 100-day habit streak', rarity: 'legendary', check: s => s.habits.some(h => calcStreak(h.history) >= 100) },
  { id: 'first_focus', title: 'Focused', desc: 'Complete your first focus session', rarity: 'common', check: s => totalPomoSessions(s.pomoSessions) >= 1 },
  { id: 'ten_focus', title: 'Deep Worker', desc: 'Complete 10 focus sessions', rarity: 'rare', check: s => totalPomoSessions(s.pomoSessions) >= 10 },
  { id: 'fifty_focus', title: 'Flow State', desc: 'Complete 50 focus sessions', rarity: 'epic', check: s => totalPomoSessions(s.pomoSessions) >= 50 },
  { id: 'first_bookmark', title: 'Bookworm', desc: 'Save your first bookmark', rarity: 'common', check: s => s.bookmarks.length >= 1 },
  { id: 'money_minded', title: 'Money Minded', desc: 'Log 5 transactions', rarity: 'common', check: s => s.transactions.length >= 5 },
  { id: 'level_10', title: 'Rising', desc: 'Reach level 10', rarity: 'rare', check: () => levelInfo(XP.total()).level >= 10 },
  { id: 'level_25', title: 'Ascended', desc: 'Reach level 25', rarity: 'epic', check: () => levelInfo(XP.total()).level >= 25 },
  { id: 'well_rounded', title: 'Well Rounded', desc: 'Reach a 90+ overall core score', rarity: 'legendary', check: () => computeDNA().overall >= 90 },
];
const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };

function totalPomoSessions(sessions) { return Object.values(sessions || {}).reduce((a, b) => a + b, 0); }

const Achievements = {
  unlocked() { return Store.get('achievements', []); },
  check() {
    const state = {
      tasks: Store.get('tasks', []), notes: Store.get('notes', []), journal: Store.get('journal', []),
      habits: Store.get('habits', []), transactions: Store.get('transactions', []), bookmarks: Store.get('bookmarks', []),
      pomoSessions: Store.get('pomoSessions', {}),
    };
    const unlocked = this.unlocked();
    const unlockedIds = new Set(unlocked.map(u => u.id));
    ACHIEVEMENT_DEFS.forEach(def => {
      if (unlockedIds.has(def.id)) return;
      if (def.check(state)) {
        unlocked.push({ id: def.id, at: Date.now() });
        Store.set('achievements', unlocked);
        showAchievementToast(def);
      }
    });
  },
};

function showAchievementToast(def) {
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = 'toast achievement-toast rarity-' + def.rarity;
  el.innerHTML = `<div class="ach-toast-top">Achievement Unlocked · ${RARITY_LABEL[def.rarity]}</div><div class="ach-toast-title">${escapeHtml(def.title)}</div><div class="ach-toast-desc">${escapeHtml(def.desc)}</div>`;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400); }, 4200);
}

/* ---------------------------------------------------------------------- *
 * PUBLIC HOOK SURFACE — this is what the one-line calls added to app.js
 * (task complete, habit check-in, journal save, etc.) actually touch.
 * ---------------------------------------------------------------------- */
let sessionPasswordsGenerated = 0;
window.SVBGLabsExt = {
  award(amount, reason) { XP.add(amount, reason); refreshCoreChrome(); },
  pulse() { Bus.emit('activity'); },
  trackPasswordGenerated() { sessionPasswordsGenerated++; },
  sessionPasswordsGenerated: () => sessionPasswordsGenerated,
};


/* ---------------------------------------------------------------------- *
 * refreshCoreChrome — lightweight, called after XP changes. The main
 * views re-render themselves right after any action anyway, so this is
 * just a safe hook point for future chrome-wide indicators.
 * ---------------------------------------------------------------------- */
function refreshCoreChrome() { /* intentionally minimal */ }

/* ======================================================================== *
 * SVBG DNA — derives 8 life-metrics from real local data. Nothing here is
 * simulated; every number is computed from your actual tasks/habits/notes/
 * journal/transactions/focus sessions.
 * ======================================================================== */
function daysBetween(a, b) { return Math.round((new Date(a) - new Date(b)) / 86400000); }

function computeDNA() {
  const tasks = Store.get('tasks', []);
  const notes = Store.get('notes', []);
  const journal = Store.get('journal', []);
  const habits = Store.get('habits', []);
  const tx = Store.get('transactions', []);
  const pomo = Store.get('pomoSessions', {});
  const clamp = n => Math.max(0, Math.min(100, Math.round(n)));

  const journalLast30 = journal.filter(j => daysBetween(todayStr(), j.date) <= 30).length;
  const mind = clamp((journalLast30 / 20) * 100);

  const pomoLast7 = Array.from({ length: 7 }, (_, i) => daysAgo(i)).reduce((s, d) => s + (pomo[d] || 0), 0);
  const focus = clamp((pomoLast7 / 14) * 100);

  let health = 0;
  if (habits.length) {
    const last7 = Array.from({ length: 7 }, (_, i) => daysAgo(i));
    const rate = last7.reduce((s, d) => s + habits.filter(h => h.history[d]).length, 0) / (habits.length * 7);
    health = clamp(rate * 100);
  }

  const notesLast30 = notes.filter(n => daysBetween(todayStr(), new Date(n.updatedAt).toISOString().slice(0,10)) <= 30).length;
  const learning = clamp((notesLast30 / 15) * 100);

  const discipline = tasks.length ? clamp((tasks.filter(t => t.done).length / tasks.length) * 100) : 0;

  const monthKey = todayStr().slice(0, 7);
  const monthTx = tx.filter(t => t.date.slice(0, 7) === monthKey);
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  let finance = 50;
  if (income > 0) finance = clamp(50 + ((income - expense) / income) * 50);
  else if (expense > 0) finance = 30;

  const creativity = clamp(((notes.length + Store.get('bookmarks', []).length) / 20) * 100);

  const consistency = habits.length ? clamp((habits.reduce((s, h) => s + calcStreak(h.history), 0) / (habits.length * 14)) * 100) : 0;

  const metrics = { mind, focus, health, learning, discipline, finance, creativity, consistency };
  const overall = clamp(Object.values(metrics).reduce((a, b) => a + b, 0) / 8);

  // snapshot today's overall score so trend comparisons are possible later
  const snaps = Store.get('dna_snapshots', {});
  snaps[todayStr()] = overall;
  Store.set('dna_snapshots', snaps);

  return { ...metrics, overall, snaps };
}

function dnaTrend(snaps, daysBack) {
  const target = daysAgo(daysBack);
  const dates = Object.keys(snaps).filter(d => d <= target).sort();
  if (!dates.length) return null;
  const past = snaps[dates[dates.length - 1]];
  const current = snaps[todayStr()];
  return current - past;
}

const DNA_LABELS = { mind: 'Mind', focus: 'Focus', health: 'Health', learning: 'Learning', discipline: 'Discipline', finance: 'Finance', creativity: 'Creativity', consistency: 'Consistency' };

function dnaRingSvg(id, pct, size = 64, stroke = 6) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="dna-ring">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" class="dna-ring-track"></circle>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" class="dna-ring-fill" style="stroke-dasharray:${c};stroke-dashoffset:${offset};transform:rotate(-90deg);transform-origin:50% 50%;"></circle>
  </svg>`;
}

Views.dna = function () {
  const dna = computeDNA();
  const trend7 = dnaTrend(dna.snaps, 7);
  const trend30 = dnaTrend(dna.snaps, 30);
  const entries = Object.entries(DNA_LABELS).map(([k, label]) => ({ key: k, label, value: dna[k] }));
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const strengths = sorted.slice(0, 2);
  const weaknesses = sorted.slice(-2).reverse();

  const insight = (() => {
    const lines = [];
    if (weaknesses[0]) lines.push(`Your ${weaknesses[0].label.toLowerCase()} score is your biggest opportunity right now — small, consistent effort there moves your overall score the most.`);
    if (strengths[0]) lines.push(`${strengths[0].label} is your strongest attribute — whatever you're doing there is working.`);
    if (dna.overall >= 80) lines.push('Your overall profile is thriving. Keep the routine that got you here.');
    else if (dna.overall < 40) lines.push('Most attributes are still warming up — that\'s normal for a new profile. Log a few days of activity to see clearer trends.');
    return lines;
  })();

  return `
    <div class="view-header"><div><div class="view-title">SVBG DNA</div><div class="view-sub">Your core life metrics, computed from real activity in this app</div></div></div>

    <div class="dna-hero card">
      <div class="dna-hero-ring">
        ${dnaRingSvg('overall', dna.overall, 128, 10)}
        <div class="dna-hero-value">${dna.overall}%</div>
      </div>
      <div class="dna-hero-info">
        <div class="dna-hero-label">Overall Evolution</div>
        <div class="dna-hero-trends">
          <span class="chip ${trend7 === null ? '' : trend7 >= 0 ? 'chip-success' : 'chip-danger'}">${trend7 === null ? 'Not enough data for a 7-day trend yet' : (trend7 >= 0 ? '▲ +' : '▼ ') + trend7 + '% vs last week'}</span>
          <span class="chip ${trend30 === null ? '' : trend30 >= 0 ? 'chip-success' : 'chip-danger'}">${trend30 === null ? 'Not enough data for a 30-day trend yet' : (trend30 >= 0 ? '▲ +' : '▼ ') + trend30 + '% vs last month'}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-4" style="margin:20px 0;">
      ${entries.map(e => `
        <div class="card dna-attr-card">
          ${dnaRingSvg(e.key, e.value, 60, 5)}
          <div class="dna-attr-info"><div class="dna-attr-label">${e.label}</div><div class="dna-attr-value">${e.value}%</div></div>
        </div>`).join('')}
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:12px;">Strengths &amp; weaknesses</h3>
        <div style="margin-bottom:12px;"><span class="chip chip-success" style="margin-bottom:6px;display:inline-block;">Strongest</span>
          ${strengths.map(s => `<div class="list-row"><div class="list-row-body"><div class="list-row-title">${s.label}</div></div><span class="stat-hint">${s.value}%</span></div>`).join('')}
        </div>
        <div><span class="chip chip-warning" style="margin-bottom:6px;display:inline-block;">Needs attention</span>
          ${weaknesses.map(s => `<div class="list-row"><div class="list-row-body"><div class="list-row-title">${s.label}</div></div><span class="stat-hint">${s.value}%</span></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:12px;">Dynamic insights</h3>
        <ul style="padding-left:18px;color:var(--text-muted);font-size:13px;line-height:1.9;">
          ${insight.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
        </ul>
        <p style="font-size:11px;color:var(--text-faint);margin-top:12px;">Computed locally from your tasks, habits, journal, notes, focus sessions, and transactions — not from any external model.</p>
      </div>
    </div>
  `;
};

/* ======================================================================== *
 * INTERACTIVE KNOWLEDGE GRAPH
 * A small hand-rolled force-directed graph (no D3 dependency, so it works
 * fully offline). Nodes are your real tasks/notes/journal entries/habits/
 * bookmarks; edges are auto-linked by shared significant keywords, so the
 * graph is a genuine reflection of your data, not decoration.
 * ======================================================================== */
const STOPWORDS = new Set(['the','a','an','and','or','but','to','of','in','on','for','with','is','it','this','that','was','were','be','are','at','as','by','from','my','your','i','you']);
function keywordsOf(text) {
  return (text || '').toLowerCase().match(/[a-z0-9']{4,}/g)?.filter(w => !STOPWORDS.has(w)) || [];
}

function buildGraphData() {
  const nodes = [];
  Store.get('tasks', []).forEach(t => nodes.push({ id: 'task:' + t.id, type: 'Task', label: t.title, text: t.title, view: 'tasks' }));
  Store.get('notes', []).forEach(n => nodes.push({ id: 'note:' + n.id, type: 'Note', label: n.title || 'Untitled', text: n.title + ' ' + n.body, view: 'notes' }));
  Store.get('journal', []).forEach(j => nodes.push({ id: 'journal:' + j.id, type: 'Journal', label: fmtDate(j.date), text: j.body, view: 'journal' }));
  Store.get('habits', []).forEach(h => nodes.push({ id: 'habit:' + h.id, type: 'Habit', label: h.name, text: h.name, view: 'habits' }));
  Store.get('bookmarks', []).forEach(b => nodes.push({ id: 'bookmark:' + b.id, type: 'Bookmark', label: b.title, text: b.title + ' ' + (b.tags||[]).join(' '), view: 'bookmarks' }));

  nodes.forEach(n => { n.keywords = new Set(keywordsOf(n.text)); });

  const links = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = [...nodes[i].keywords].filter(k => nodes[j].keywords.has(k));
      if (shared.length >= 1) links.push({ source: i, target: j, weight: shared.length, shared });
    }
  }
  return { nodes, links };
}

const GraphState = { sim: null, selected: null };

Views.graph = function () {
  const { nodes } = buildGraphData();
  return `
    <div class="view-header"><div><div class="view-title">Knowledge Graph</div><div class="view-sub">${nodes.length} node${nodes.length===1?'':'s'} · auto-linked by shared keywords</div></div>
      <div style="display:flex;gap:8px;"><button class="btn btn-sm" id="graph-recenter"><span class="nav-icon" data-icon="refresh"></span>Recenter</button></div>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="graph-wrap">
        <canvas id="graph-canvas"></canvas>
        <div class="graph-empty ${nodes.length ? 'hidden' : ''}">Add a few tasks, notes, or habits to see your graph come alive.</div>
        <div class="graph-panel hidden" id="graph-panel">
          <button class="btn btn-icon btn-ghost graph-panel-close" data-icon="x" style="position:absolute;top:8px;right:8px;"></button>
          <div class="graph-panel-type" id="graph-panel-type"></div>
          <div class="graph-panel-title" id="graph-panel-title"></div>
          <div class="graph-panel-snippet" id="graph-panel-snippet"></div>
          <button class="btn btn-primary btn-sm" id="graph-panel-goto">Open</button>
        </div>
      </div>
    </div>
    <p style="font-size:11.5px;color:var(--text-faint);margin-top:10px;">Drag nodes to rearrange · scroll to zoom · click a node for details</p>
  `;
};

function runForceLayout(canvas, nodes, links, onTick) {
  const w = canvas.width, h = canvas.height;
  nodes.forEach(n => { n.x = w/2 + (Math.random()-0.5)*w*0.6; n.y = h/2 + (Math.random()-0.5)*h*0.6; n.vx = 0; n.vy = 0; });
  let stopped = false;
  let scale = 1, panX = 0, panY = 0;
  let dragNode = null, dragging = false;
  let raf;

  function step() {
    // repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let dist = Math.hypot(dx, dy) || 0.01;
        const force = 1400 / (dist * dist);
        dx /= dist; dy /= dist;
        a.vx += dx * force; a.vy += dy * force;
        b.vx -= dx * force; b.vy -= dy * force;
      }
    }
    // attraction along links
    links.forEach(l => {
      const a = nodes[l.source], b = nodes[l.target];
      let dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const force = (dist - 90) * 0.01 * l.weight;
      dx /= dist; dy /= dist;
      a.vx += dx * force; a.vy += dy * force;
      b.vx -= dx * force; b.vy -= dy * force;
    });
    // centering
    nodes.forEach(n => {
      n.vx += (w/2 - n.x) * 0.0015;
      n.vy += (h/2 - n.y) * 0.0015;
      n.vx *= 0.82; n.vy *= 0.82;
      if (n !== dragNode) { n.x += n.vx; n.y += n.vy; }
    });
    onTick(scale, panX, panY);
    if (!stopped) raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    scale = Math.max(0.4, Math.min(2.5, scale - e.deltaY * 0.001));
  }, { passive: false });

  function nodeAt(px, py) {
    return nodes.find(n => Math.hypot((n.x*scale+panX) - px, (n.y*scale+panY) - py) < 14);
  }
  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const n = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (n) { dragNode = n; dragging = true; }
  });
  window.addEventListener('mousemove', e => {
    if (!dragging || !dragNode) return;
    const rect = canvas.getBoundingClientRect();
    dragNode.x = (e.clientX - rect.left - panX) / scale;
    dragNode.y = (e.clientY - rect.top - panY) / scale;
  });
  window.addEventListener('mouseup', () => { dragging = false; dragNode = null; });

  return { stop() { stopped = true; cancelAnimationFrame(raf); }, nodeAt, recenter() { scale = 1; panX = 0; panY = 0; } };
}

const NODE_COLORS = { Task: '#59E7D9', Note: '#B18CFF', Journal: '#FBC55C', Habit: '#4ADE9A', Bookmark: '#FB7185' };

ViewMount.graph = function (root) {
  const canvas = root.querySelector('#graph-canvas');
  if (!canvas) return;
  const wrap = root.querySelector('.graph-wrap');
  canvas.width = wrap.clientWidth;
  canvas.height = 460;
  const ctx = canvas.getContext('2d');
  const { nodes, links } = buildGraphData();
  if (!nodes.length) return;

  const panel = root.querySelector('#graph-panel');
  let hoverNode = null;

  const controller = runForceLayout(canvas, nodes, links, (scale, panX, panY) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);
    links.forEach(l => {
      const a = nodes[l.source], b = nodes[l.target];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(150,170,255,0.15)';
      ctx.lineWidth = Math.min(3, l.weight);
      ctx.stroke();
    });
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n === GraphState.selected ? 10 : 7, 0, Math.PI * 2);
      ctx.fillStyle = NODE_COLORS[n.type] || '#8B96AC';
      ctx.shadowColor = NODE_COLORS[n.type] || '#8B96AC';
      ctx.shadowBlur = n === hoverNode ? 14 : 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    ctx.restore();
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    hoverNode = controller.nodeAt(e.clientX - rect.left, e.clientY - rect.top);
    canvas.style.cursor = hoverNode ? 'pointer' : 'grab';
  });
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const n = controller.nodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (!n) { panel.classList.add('hidden'); GraphState.selected = null; return; }
    GraphState.selected = n;
    root.querySelector('#graph-panel-type').textContent = n.type;
    root.querySelector('#graph-panel-type').style.color = NODE_COLORS[n.type];
    root.querySelector('#graph-panel-title').textContent = n.label;
    root.querySelector('#graph-panel-snippet').textContent = (n.text || '').slice(0, 140);
    root.querySelector('#graph-panel-goto').onclick = () => renderView(n.view);
    panel.classList.remove('hidden');
  });
  root.querySelector('.graph-panel-close')?.addEventListener('click', () => panel.classList.add('hidden'));
  root.querySelector('#graph-recenter')?.addEventListener('click', () => controller.recenter());

  ViewUnmount.graph = () => controller.stop();
};

/* ======================================================================== *
 * COMMAND PALETTE + TERMINAL
 * Two power-user surfaces built on the same command registry. The palette
 * is fuzzy-searchable; the terminal is a small REPL with its own parser
 * (still just calling the same JS functions — no hidden network calls).
 * ======================================================================== */
function buildCommands() {
  return [
    { id: 'new-task', label: 'Create task', hint: 'Tasks', run: () => { renderView('tasks'); setTimeout(() => document.getElementById('task-add-btn')?.click(), 50); } },
    { id: 'open-notes', label: 'Open Notes', hint: 'Navigate', run: () => renderView('notes') },
    { id: 'open-journal', label: 'Open Journal', hint: 'Navigate', run: () => renderView('journal') },
    { id: 'open-habits', label: 'Open Habits', hint: 'Navigate', run: () => renderView('habits') },
    { id: 'start-focus', label: 'Start Focus Timer', hint: 'Focus', run: () => { renderView('pomodoro'); setTimeout(() => { if (!PomoState.running) document.getElementById('pomo-toggle')?.click(); }, 50); } },
    { id: 'open-finance', label: 'Open Finance', hint: 'Navigate', run: () => renderView('finance') },
    { id: 'open-bookmarks', label: 'Open Bookmarks', hint: 'Navigate', run: () => renderView('bookmarks') },
    { id: 'open-vault', label: 'Open Vault Tools', hint: 'Navigate', run: () => renderView('vault') },
    { id: 'gen-password', label: 'Generate Password', hint: 'Vault', run: () => { renderView('vault'); } },
    { id: 'open-dna', label: 'Open SVBG DNA', hint: 'Navigate', run: () => renderView('dna') },
    { id: 'open-graph', label: 'Open Knowledge Graph', hint: 'Navigate', run: () => renderView('graph') },
    { id: 'open-reflection', label: 'Open Reflection & Heatmap', hint: 'Navigate', run: () => renderView('reflection') },
    { id: 'open-mission', label: 'Open Mission Control', hint: 'Navigate', run: () => renderView('mission') },
    { id: 'export-data', label: 'Export Data', hint: 'Settings', run: () => { renderView('settings'); setTimeout(() => document.getElementById('export-btn')?.click(), 50); } },
    { id: 'switch-theme', label: 'Switch Theme', hint: 'Settings', run: () => document.getElementById('theme-toggle')?.click() },
    { id: 'open-terminal', label: 'Open Terminal', hint: 'System', run: () => Terminal.open() },
    { id: 'open-settings', label: 'Open Settings', hint: 'Navigate', run: () => renderView('settings') },
    { id: 'open-dashboard', label: 'Open Dashboard', hint: 'Navigate', run: () => renderView('dashboard') },
    { id: 'open-mindlab', label: 'Open SVBG Mind Lab', hint: 'Navigate', run: () => renderView('mindlab') },
    { id: 'open-activityfeed', label: 'Open SVBG Activity', hint: 'Navigate', run: () => renderView('activityfeed') },
    { id: 'open-dailymission', label: "Open Today's Mission", hint: 'Navigate', run: () => renderView('dailymission') },
    { id: 'open-focusforest', label: 'Open Focus Forest', hint: 'Navigate', run: () => renderView('focusforest') },
    { id: 'open-identity', label: 'Open SVBG Identity', hint: 'Navigate', run: () => renderView('identity') },
    { id: 'open-neuralprofile', label: 'Open Neural Profile', hint: 'Navigate', run: () => renderView('neuralprofile') },
    { id: 'open-achievementsfull', label: 'Open Achievements', hint: 'Navigate', run: () => renderView('achievementsfull') },
    { id: 'open-goals', label: 'Open Goals', hint: 'Navigate', run: () => renderView('goals') },
    { id: 'open-privacy', label: 'Open Privacy', hint: 'Navigate', run: () => renderView('privacy') },
    { id: 'open-datavault', label: 'Open Data Vault', hint: 'Navigate', run: () => renderView('datavault') },
  ];
}

const Palette = {
  el: null, input: null, list: null, items: [], activeIndex: 0,
  ensure() {
    if (this.el) return;
    const el = document.createElement('div');
    el.className = 'modal-backdrop palette-backdrop hidden';
    el.innerHTML = `
      <div class="palette">
        <div class="palette-input-row">
          <span class="nav-icon" data-icon="zap"></span>
          <input type="text" id="palette-input" placeholder="Type a command..." autocomplete="off" />
          <kbd>esc</kbd>
        </div>
        <div class="palette-list" id="palette-list"></div>
      </div>`;
    document.body.appendChild(el);
    paintIcons(el);
    this.el = el;
    this.input = el.querySelector('#palette-input');
    this.list = el.querySelector('#palette-list');
    el.addEventListener('click', e => { if (e.target === el) this.close(); });
    this.input.addEventListener('input', () => this.renderList());
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
      if (e.key === 'Enter') { e.preventDefault(); this.runActive(); }
    });
  },
  open() {
    this.ensure();
    this.el.classList.remove('hidden');
    this.input.value = '';
    this.renderList();
    setTimeout(() => this.input.focus(), 10);
  },
  close() { this.el?.classList.add('hidden'); },
  move(dir) { this.activeIndex = (this.activeIndex + dir + this.items.length) % this.items.length; this.paintActive(); },
  paintActive() {
    this.list.querySelectorAll('.palette-item').forEach((el, i) => el.classList.toggle('is-active', i === this.activeIndex));
  },
  renderList() {
    const q = this.input.value.trim().toLowerCase();
    const all = buildCommands();
    this.items = q ? all.filter(c => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)) : all;
    this.activeIndex = 0;
    this.list.innerHTML = this.items.length ? this.items.map((c, i) => `
      <div class="palette-item ${i === 0 ? 'is-active' : ''}" data-idx="${i}">
        <span>${escapeHtml(c.label)}</span><span class="chip">${c.hint}</span>
      </div>`).join('') : `<div class="sr-empty">No matching commands</div>`;
    this.list.querySelectorAll('.palette-item').forEach(el => el.addEventListener('click', () => { this.activeIndex = parseInt(el.dataset.idx, 10); this.runActive(); }));
  },
  runActive() {
    const cmd = this.items[this.activeIndex];
    if (!cmd) return;
    this.close();
    cmd.run();
  },
};

/* ---- Terminal ---- */
const Terminal = {
  el: null, output: null, input: null, history: [], histIdx: -1,
  ensure() {
    if (this.el) return;
    const el = document.createElement('div');
    el.className = 'modal-backdrop terminal-backdrop hidden';
    el.innerHTML = `
      <div class="terminal-window">
        <div class="terminal-titlebar"><span></span><span></span><span></span><span class="terminal-title-text">svbg labs — terminal</span></div>
        <div class="terminal-output" id="terminal-output"></div>
        <div class="terminal-input-row"><span class="terminal-prompt">&gt;</span><input type="text" id="terminal-input" autocomplete="off" spellcheck="false" /></div>
      </div>`;
    document.body.appendChild(el);
    this.el = el;
    this.output = el.querySelector('#terminal-output');
    this.input = el.querySelector('#terminal-input');
    this.history = Store.get('terminal_history', []);
    el.addEventListener('click', e => { if (e.target === el) this.close(); });
    this.print('SVBG Labs terminal v2.0 — type "help" to see commands.');
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { this.run(this.input.value); this.input.value = ''; this.histIdx = -1; }
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowUp') { e.preventDefault(); this.navHistory(1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); this.navHistory(-1); }
    });
  },
  navHistory(dir) {
    if (!this.history.length) return;
    this.histIdx = Math.max(-1, Math.min(this.history.length - 1, this.histIdx + dir));
    this.input.value = this.histIdx === -1 ? '' : this.history[this.history.length - 1 - this.histIdx];
  },
  open() { this.ensure(); this.el.classList.remove('hidden'); setTimeout(() => this.input.focus(), 10); },
  close() { this.el?.classList.add('hidden'); },
  print(text, cls) { const line = document.createElement('div'); line.className = 'terminal-line ' + (cls||''); line.textContent = text; this.output.appendChild(line); this.output.scrollTop = this.output.scrollHeight; },
  run(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    this.print('> ' + cmd, 'terminal-echo');
    this.history.push(cmd);
    if (this.history.length > 100) this.history.shift();
    Store.set('terminal_history', this.history);
    const [name, ...rest] = cmd.split(' ');
    const arg = rest.join(' ');
    const handlers = {
      help: () => this.print('Commands: help, human score, tasks, task add <title>, note add <title>, focus start, theme <cyber|dark|light>, achievements, level, open <view>, whoami, clear'),
      clear: () => { this.output.innerHTML = ''; },
      whoami: () => this.print(Auth?.current?.() || 'guest'),
      level: () => { const l = levelInfo(XP.total()); this.print(`Level ${l.level} — ${l.xpIntoLevel}/${l.xpForNext} XP (${l.pct}%)`); },
      achievements: () => this.print(`${Achievements.unlocked().length}/${ACHIEVEMENT_DEFS.length} achievements unlocked`),
      tasks: () => { const t = Store.get('tasks', []).filter(x => !x.done); this.print(t.length ? t.map(x => '- ' + x.title).join('\n') : 'No open tasks.'); },
      focus: () => { if (arg === 'start') { renderView('pomodoro'); Terminal.close(); setTimeout(() => document.getElementById('pomo-toggle')?.click(), 100); } else this.print('Try: focus start'); },
      theme: () => { if (THEMES.includes(arg)) { applyTheme(arg); this.print('Theme set to ' + arg); } else this.print('Usage: theme <cyber|dark|light>'); },
      open: () => { if (Views[arg]) { renderView(arg); this.print('Opened ' + arg); } else this.print('Unknown view: ' + arg); },
      task: () => { if (rest[0] === 'add') { const title = rest.slice(1).join(' '); if (!title) return this.print('Usage: task add <title>'); const tasks = Store.get('tasks', []); tasks.push({ id: uid(), title, priority: 'med', due: '', done: false, createdAt: Date.now() }); Store.set('tasks', tasks); this.print('Task added: ' + title); } else this.print('Usage: task add <title>'); },
      note: () => { if (rest[0] === 'add') { const title = rest.slice(1).join(' ') || 'Untitled'; const notes = Store.get('notes', []); notes.push({ id: uid(), title, body: '', updatedAt: Date.now() }); Store.set('notes', notes); this.print('Note created: ' + title); } else this.print('Usage: note add <title>'); },
      human: () => { if (rest[0] === 'score') { const dna = computeDNA(); this.print('Overall core score: ' + dna.overall + '%'); } else this.print('Try: human score'); },
    };
    if (handlers[name]) handlers[name]();
    else this.print(`Command not found: ${name}. Type "help".`, 'terminal-error');
  },
};

/* ======================================================================== *
 * MISSION CONTROL — a single-screen operational overview. Every widget is
 * a real, locally-derived number (no placeholder gauges).
 * ======================================================================== */
function gaugeSvg(pct, color, size = 90) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r;
  const offset = c - (Math.max(0,Math.min(100,pct)) / 100) * c;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--border)" stroke-width="7"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${offset}" transform="rotate(-90 ${size/2} ${size/2})" style="filter:drop-shadow(0 0 5px ${color}80);"/>
  </svg>`;
}

Views.mission = function () {
  const tasks = Store.get('tasks', []);
  const habits = Store.get('habits', []);
  const notes = Store.get('notes', []);
  const bookmarks = Store.get('bookmarks', []);
  const tx = Store.get('transactions', []);
  const pomo = Store.get('pomoSessions', {});
  const meta = Store.get('system_meta', {});
  const dna = computeDNA();
  const level = levelInfo(XP.total());
  const unlocked = Achievements.unlocked();

  const openToday = tasks.filter(t => t.due === todayStr() && !t.done).length;
  const doneToday = tasks.filter(t => t.done && t.completedOn === todayStr()).length;
  const productivity = (openToday + doneToday) ? Math.round((doneToday / (openToday + doneToday)) * 100) : (tasks.length ? Math.round((tasks.filter(t=>t.done).length/tasks.length)*100) : 0);
  const focusToday = pomo[todayStr()] || 0;
  const habitsToday = habits.filter(h => h.history[todayStr()]).length;
  const monthKey = todayStr().slice(0, 7);
  const monthTx = tx.filter(t => t.date.slice(0,7) === monthKey);
  const net = monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0) - monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const overdue = tasks.filter(t => !t.done && t.due && t.due < todayStr()).length;
  const daysActive = meta.firstUsed ? Math.max(1, Math.ceil((Date.now() - meta.firstUsed) / 86400000)) : 1;
  const storageKb = Math.round(JSON.stringify(Store.all()).length / 1024);

  const allSystemsGood = overdue === 0;

  return `
    <div class="view-header"><div><div class="view-title">Mission Control</div><div class="view-sub">System day ${daysActive} &middot; ${new Date().toLocaleString()}</div></div>
      <span class="chip ${allSystemsGood ? 'chip-success' : 'chip-warning'}">${allSystemsGood ? 'All systems operational' : overdue + ' task' + (overdue===1?'':'s') + ' overdue'}</span>
    </div>

    <div class="grid grid-4" style="margin-bottom:20px;">
      <div class="card mc-gauge-card">${gaugeSvg(productivity, 'var(--accent)')}<div class="mc-gauge-label">Productivity</div><div class="mc-gauge-value">${productivity}%</div></div>
      <div class="card mc-gauge-card">${gaugeSvg(Math.min(100, focusToday*20), 'var(--accent-2)')}<div class="mc-gauge-label">Focus</div><div class="mc-gauge-value">${focusToday} session${focusToday===1?'':'s'}</div></div>
      <div class="card mc-gauge-card">${gaugeSvg(habits.length ? (habitsToday/habits.length)*100 : 0, 'var(--success)')}<div class="mc-gauge-label">Habits</div><div class="mc-gauge-value">${habitsToday}/${habits.length}</div></div>
      <div class="card mc-gauge-card">${gaugeSvg(dna.overall, 'var(--warning)')}<div class="mc-gauge-label">Core Score</div><div class="mc-gauge-value">${dna.overall}%</div></div>
    </div>

    <div class="grid grid-3" style="margin-bottom:20px;">
      <div class="card stat-card"><span class="stat-label">Level</span><span class="stat-value">${level.level}</span><span class="stat-hint">${level.xpIntoLevel}/${level.xpForNext} XP to next</span></div>
      <div class="card stat-card"><span class="stat-label">This month</span><span class="stat-value" style="color:${net>=0?'var(--success)':'var(--danger)'}">${fmtMoney(net)}</span><span class="stat-hint">net cash flow</span></div>
      <div class="card stat-card"><span class="stat-label">Knowledge base</span><span class="stat-value">${notes.length + bookmarks.length}</span><span class="stat-hint">${notes.length} notes &middot; ${bookmarks.length} bookmarks</span></div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:12px;">System status</h3>
        <div class="mc-status-row"><span>Storage engine</span><span class="chip chip-success">localStorage &middot; ${storageKb} KB</span></div>
        <div class="mc-status-row"><span>Network requests</span><span class="chip chip-success">0 required at runtime</span></div>
        <div class="mc-status-row"><span>Vault sessions</span><span class="chip">${window.SVBGLabsExt.sessionPasswordsGenerated()} password(s) generated this session</span></div>
        <div class="mc-status-row"><span>Overdue tasks</span><span class="chip ${overdue ? 'chip-danger' : 'chip-success'}">${overdue}</span></div>
        ${(() => {
          if (!window.SVBGMindLab) return '';
          const h = window.SVBGMindLab.history();
          const tried = Object.keys(h).length;
          return `<div class="mc-status-row"><span>Mind Lab</span><span class="chip">${tried ? `${tried} experiment${tried===1?'':'s'} tried` : 'not started'}</span></div>`;
        })()}
      </div>
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:12px;">Achievements &middot; ${unlocked.length}/${ACHIEVEMENT_DEFS.length}</h3>
        <div class="mc-ach-grid">
          ${ACHIEVEMENT_DEFS.map(def => {
            const got = unlocked.find(u => u.id === def.id);
            return `<div class="mc-ach ${got ? 'is-unlocked rarity-'+def.rarity : ''}" title="${escapeHtml(def.desc)}">
              <div class="mc-ach-title">${escapeHtml(def.title)}</div>
              <div class="mc-ach-rarity">${RARITY_LABEL[def.rarity]}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    ${window.SVBGActivityFeedSnippet ? `
    <div class="card" style="margin-top:20px;">
      <h3 style="font-size:14px;margin-bottom:10px;">Recent activity</h3>
      ${window.SVBGActivityFeedSnippet(6)}
    </div>` : ''}
  `;
};

/* ======================================================================== *
 * AI REFLECTION ENGINE + PRODUCTIVITY HEATMAP
 * A local rule engine: pattern detection over your own historical data,
 * plus a rotating (but locally-stored, not fetched) set of prompts. No
 * text generation model is involved — this is decision-tree style logic,
 * same spirit as the rest of SVBG Labs's "AI" features.
 * ======================================================================== */
const QUOTES = [
  "Small daily wins compound into big changes.",
  "Discipline is choosing between what you want now and what you want most.",
  "Consistency beats intensity over the long run.",
  "You don't have to be great to start, but you have to start to be great.",
  "Progress, not perfection.",
  "What gets measured gets managed.",
  "The best time to build the habit was yesterday. The next best time is today.",
  "Focus on systems, not just goals.",
];
function quoteOfTheDay() {
  const seed = todayStr().split('-').reduce((a, b) => a + parseInt(b, 10), 0);
  return QUOTES[seed % QUOTES.length];
}

function generateReflection(dateStr) {
  const tasks = Store.get('tasks', []);
  const habits = Store.get('habits', []);
  const journal = Store.get('journal', []);
  const tx = Store.get('transactions', []);
  const pomo = Store.get('pomoSessions', {});

  const doneCount = tasks.filter(t => t.completedOn === dateStr).length;
  const focusCount = pomo[dateStr] || 0;
  const habitsCount = habits.filter(h => h.history[dateStr]).length;
  const spend = tx.filter(t => t.date === dateStr && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const loggedJournal = journal.some(j => j.date === dateStr);

  const last7 = Array.from({ length: 7 }, (_, i) => daysAgo(i + 1));
  const avgTasks = last7.reduce((s, d) => s + tasks.filter(t => t.completedOn === d).length, 0) / 7;

  const lines = [];
  if (doneCount === 0 && focusCount === 0 && habitsCount === 0) {
    lines.push("Looks like a quiet day on the record so far — no tasks, focus sessions, or habits logged yet.");
  } else {
    lines.push(`You completed ${doneCount} task${doneCount===1?'':'s'}${focusCount ? ` and ran ${focusCount} focus session${focusCount===1?'':'s'}` : ''} today.`);
    if (doneCount > avgTasks * 1.2 && avgTasks > 0) lines.push(`That's above your recent 7-day average of ${avgTasks.toFixed(1)} tasks/day — good momentum.`);
    else if (doneCount < avgTasks * 0.6 && avgTasks > 0) lines.push(`That's a bit under your recent 7-day average of ${avgTasks.toFixed(1)} tasks/day.`);
  }
  if (habits.length) lines.push(`${habitsCount}/${habits.length} habits checked in today.`);
  if (spend > 0) lines.push(`You logged ${fmtMoney(spend)} in expenses today.`);
  lines.push(loggedJournal ? "You already journaled today — nice." : "You haven't journaled yet today; a couple of lines can help you spot patterns later.");
  lines.push(quoteOfTheDay());
  return lines.join(' ');
};

Views.reflection = function () {
  const today = generateReflection(todayStr());
  const HeatState = window.__heatState || (window.__heatState = { metric: 'overall' });
  return `
    <div class="view-header"><div><div class="view-title">Reflection &amp; Heatmap</div><div class="view-sub">Local pattern detection over your own history</div></div></div>
    <div class="card" style="margin-bottom:20px;">
      <h3 style="font-size:14px;margin-bottom:10px;">Today's reflection</h3>
      <p style="font-size:13.5px;color:var(--text);line-height:1.7;">${escapeHtml(today)}</p>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
        <h3 style="font-size:14px;">Productivity heatmap</h3>
        <div class="tool-tabs" style="margin:0;">
          <button class="tool-tab btn btn-sm heat-filter ${HeatState.metric==='overall'?'is-active':''}" data-metric="overall">Overall</button>
          <button class="tool-tab btn btn-sm heat-filter ${HeatState.metric==='tasks'?'is-active':''}" data-metric="tasks">Tasks</button>
          <button class="tool-tab btn btn-sm heat-filter ${HeatState.metric==='focus'?'is-active':''}" data-metric="focus">Focus</button>
          <button class="tool-tab btn btn-sm heat-filter ${HeatState.metric==='habits'?'is-active':''}" data-metric="habits">Habits</button>
        </div>
      </div>
      <div id="heatmap-mount"></div>
    </div>
  `;
};

function computeHeatmapData(metric, weeks = 26) {
  const tasks = Store.get('tasks', []);
  const habits = Store.get('habits', []);
  const pomo = Store.get('pomoSessions', {});
  const journal = Store.get('journal', []);
  const days = weeks * 7;
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const doneT = tasks.filter(t => t.completedOn === d).length;
    const focusN = pomo[d] || 0;
    const habitN = habits.filter(h => h.history[d]).length;
    const journalN = journal.some(j => j.date === d) ? 1 : 0;
    let value;
    if (metric === 'tasks') value = doneT;
    else if (metric === 'focus') value = focusN;
    else if (metric === 'habits') value = habitN;
    else value = doneT + focusN + habitN + journalN;
    cells.push({ date: d, value, doneT, focusN, habitN, journalN });
  }
  return cells;
}

function renderHeatmap(mount, metric) {
  const cells = computeHeatmapData(metric);
  const max = Math.max(1, ...cells.map(c => c.value));
  const level = v => v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4));
  // group into weeks (columns), 7 rows
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  mount.innerHTML = `
    <div class="heatmap-scroll">
      <div class="heatmap-grid">
        ${weeks.map(week => `<div class="heatmap-col">${week.map(c => `<div class="heatmap-cell level-${level(c.value)}" data-tip="${fmtDate(c.date)} — ${c.value} ${metric === 'overall' ? 'activity points' : metric}"></div>`).join('')}</div>`).join('')}
      </div>
    </div>
    <div class="heatmap-legend"><span>Low</span>${[0,1,2,3,4].map(l => `<div class="heatmap-cell level-${l}"></div>`).join('')}<span>High</span></div>
  `;
  mount.querySelectorAll('.heatmap-cell[data-tip]').forEach(cell => {
    cell.addEventListener('mouseenter', e => showHeatTip(e, cell.dataset.tip));
    cell.addEventListener('mouseleave', hideHeatTip);
  });
}
let heatTipEl = null;
function showHeatTip(e, text) {
  if (!heatTipEl) { heatTipEl = document.createElement('div'); heatTipEl.className = 'heat-tip'; document.body.appendChild(heatTipEl); }
  heatTipEl.textContent = text;
  heatTipEl.style.left = e.clientX + 12 + 'px';
  heatTipEl.style.top = e.clientY + 12 + 'px';
  heatTipEl.classList.add('is-visible');
}
function hideHeatTip() { heatTipEl?.classList.remove('is-visible'); }

ViewMount.reflection = function (root) {
  const state = window.__heatState;
  const mount = root.querySelector('#heatmap-mount');
  renderHeatmap(mount, state.metric);
  root.querySelectorAll('.heat-filter').forEach(b => b.addEventListener('click', () => { state.metric = b.dataset.metric; renderView('reflection'); }));
};
ViewUnmount.reflection = function () { hideHeatTip(); };

/* ======================================================================== *
 * CINEMATIC BOOT SEQUENCE
 * Plays once per browser tab session (sessionStorage, not localStorage —
 * it's a cosmetic flourish, not user data). Respects prefers-reduced-
 * motion by skipping straight through. Replayable from Settings.
 * ======================================================================== */
const BOOT_LINES = [
  'Initializing SVBG Labs kernel...',
  'Loading core modules...',
  'Mounting local storage volume...',
  'Calibrating knowledge graph...',
  'Starting XP & achievement engine...',
  'Warming up 3D interface (optional)...',
  'All systems nominal.',
];

function playBootSequence(onDone) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) { onDone(); return; }
  const el = document.createElement('div');
  el.className = 'boot-overlay';
  el.innerHTML = `
    <div class="boot-inner">
      <div class="boot-logo">
        <svg viewBox="0 0 40 40" class="ring-svg"><circle class="ring-track" cx="20" cy="20" r="17"></circle><circle class="ring-progress" id="boot-ring" cx="20" cy="20" r="17" style="stroke-dashoffset:106.8;"></circle></svg>
      </div>
      <div class="boot-title">SVBG<span> LABS</span></div>
      <div class="boot-log" id="boot-log"></div>
      <div class="boot-bar"><div class="boot-bar-fill" id="boot-bar-fill"></div></div>
      <button class="btn btn-sm boot-skip" id="boot-skip">Skip</button>
    </div>`;
  document.body.appendChild(el);
  const log = el.querySelector('#boot-log');
  const barFill = el.querySelector('#boot-bar-fill');
  const ring = el.querySelector('#boot-ring');
  let i = 0;
  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 500);
    onDone();
  }
  const timer = setInterval(() => {
    if (i >= BOOT_LINES.length) { finish(); return; }
    const line = document.createElement('div');
    line.className = 'boot-line';
    line.innerHTML = `<span class="boot-check">[ok]</span> ${BOOT_LINES[i]}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    const pct = ((i + 1) / BOOT_LINES.length) * 100;
    barFill.style.width = pct + '%';
    ring.style.strokeDashoffset = 106.8 - (106.8 * pct / 100);
    i++;
  }, 420);
  el.querySelector('#boot-skip').addEventListener('click', finish);
}

/* ======================================================================== *
 * SETTINGS INTEGRATION — wrap (not replace) the existing Settings view so
 * app.js stays untouched. We append a new card with the boot replay
 * button and a keyboard shortcut reference.
 * ======================================================================== */
const originalSettingsView = Views.settings;
const originalSettingsMount = ViewMount.settings;
Views.settings = function () {
  return originalSettingsView() + `
    <div class="card" style="margin-top:20px;">
      <h3 style="font-size:14px;margin-bottom:10px;">Power features</h3>
      <div class="settings-row">
        <div><div class="settings-row-title">Boot sequence</div><div class="settings-row-sub">Replay the cinematic startup animation</div></div>
        <button class="btn btn-sm" id="ext-replay-boot">Replay</button>
      </div>
      <div class="settings-row" style="flex-direction:column;align-items:flex-start;gap:8px;">
        <div class="settings-row-title">Keyboard shortcuts</div>
        <div class="shortcut-grid">
          <div><kbd>/</kbd> Search everywhere</div>
          <div><kbd>Ctrl</kbd>+<kbd>K</kbd> Focus search</div>
          <div><kbd>Ctrl</kbd>+<kbd>Space</kbd> Command palette</div>
          <div><kbd>Ctrl</kbd>+<kbd>J</kbd> Open terminal</div>
          <div><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> SVBG DNA</div>
          <div><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>M</kbd> Mission Control</div>
          <div><kbd>Esc</kbd> Close overlay</div>
        </div>
      </div>
    </div>
  `;
};
ViewMount.settings = function (root) {
  originalSettingsMount(root);
  root.querySelector('#ext-replay-boot')?.addEventListener('click', () => playBootSequence(() => {}));
};

/* ======================================================================== *
 * BOOT / INIT
 * ======================================================================== */
function ensureSystemMeta() {
  const meta = Store.get('system_meta', {});
  if (!meta.firstUsed) { meta.firstUsed = Date.now(); Store.set('system_meta', meta); }
}

function bindGlobalShortcuts() {
  document.addEventListener('keydown', e => {
    const inField = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') { e.preventDefault(); Palette.open(); return; }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('global-search')?.focus(); return; }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'j') { e.preventDefault(); Terminal.open(); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') { e.preventDefault(); renderView('dna'); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') { e.preventDefault(); renderView('mission'); return; }
  });
}

function initExtensions() {
  ensureSystemMeta();
  paintIcons();
  bindGlobalShortcuts();
  Achievements.check();
  playBootSequence(() => {});
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtensions);
} else {
  initExtensions();
}

/* ---------------------------------------------------------------------- *
 * SHARED INTERNALS — exposed (read-only in practice) so later additive
 * modules (js/svbg-advanced.js) can reuse this file's engines instead of
 * re-implementing XP/DNA/achievements/graph/reflection logic.
 * ---------------------------------------------------------------------- */
Object.assign(window.SVBGLabsExt, {
  XP, levelInfo, Achievements, ACHIEVEMENT_DEFS, RARITY_LABEL,
  Bus, computeDNA, dnaTrend, DNA_LABELS, dnaRingSvg,
  buildGraphData, keywordsOf,
  generateReflection, computeHeatmapData, quoteOfTheDay,
  buildCommands, Terminal, Palette,
  gaugeSvg, totalPomoSessions,
});

})();
