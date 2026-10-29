/* ==========================================================================
   SVBG TODAY'S MISSION — a small set of daily objectives, progress driven
   entirely by real Activity Core events (js/svbg-activitycore.js). Nothing
   here is simulated: each mission's progress is a live count of matching
   events since local midnight today.
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};
  const Core = window.SVBGActivityCore;

  Object.assign(ICONS, {
    mission: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
  });

  // a small rotating pool; three are picked deterministically per day so
  // the set is stable all day but changes tomorrow
  const MISSION_POOL = [
    { id: 'tasks3', label: 'Complete 3 tasks', target: 3, types: ['TASK_COMPLETED'], xp: 15 },
    { id: 'focus1', label: 'Complete 1 focus session', target: 1, types: ['FOCUS_COMPLETED'], xp: 15 },
    { id: 'journal1', label: 'Write a journal entry', target: 1, types: ['JOURNAL_ENTRY'], xp: 10 },
    { id: 'habit1', label: 'Check in a habit', target: 1, types: ['HABIT_COMPLETED'], xp: 10 },
    { id: 'mindlab1', label: 'Complete a Mind Lab experiment', target: 1, types: ['MINDLAB_COMPLETED'], xp: 15 },
    { id: 'game1', label: 'Play a Mind Arena game', target: 1, types: ['SUDOKU_COMPLETED', 'CYBERLOCK_COMPLETED'], xp: 10 },
    { id: 'note1', label: 'Create a note', target: 1, types: ['NOTE_CREATED'], xp: 8 },
  ];

  function seededPick(dateStr, n) {
    let seed = dateStr.split('-').reduce((a, b) => a + parseInt(b, 10), 0);
    const pool = [...MISSION_POOL];
    const picked = [];
    for (let i = 0; i < n && pool.length; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const idx = seed % pool.length;
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }

  function todaysMissions() {
    return seededPick(todayStr(), 3);
  }

  function midnightMs() {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime();
  }

  function progressFor(mission) {
    if (!Core) return 0;
    const since = midnightMs();
    return mission.types.reduce((sum, t) => sum + Core.countSince(t, since), 0);
  }

  function stateKey() { return 'daily_mission_state'; }
  function loadState() { return Store.get(stateKey(), { date: null, completedIds: [], streak: 0, lastCompleteDate: null }); }
  function saveState(s) { Store.set(stateKey(), s); }

  function checkCompletion() {
    if (checkCompletion._running) return loadState();
    checkCompletion._running = true;
    try {
      const missions = todaysMissions();
      const state = loadState();
      if (state.date !== todayStr()) { state.date = todayStr(); state.completedIds = []; }
      let changed = false;
      missions.forEach(m => {
        if (state.completedIds.includes(m.id)) return;
        if (progressFor(m) >= m.target) {
          state.completedIds.push(m.id);
          changed = true;
          saveState(state); // save before awarding, so a re-entrant call (triggered by the award's own event) sees this mission as already done
          if (Ext.award) Ext.award(m.xp, `Today's Mission: ${m.label}`);
          toast(`Mission complete: ${m.label} (+${m.xp} XP)`, 'success');
          if (Core) Core.emit('DAILY_MISSION_COMPLETED', { id: m.id, label: m.label });
        }
      });
      const allDone = missions.every(m => state.completedIds.includes(m.id));
      if (allDone && state.lastCompleteDate !== todayStr()) {
        const yesterday = daysAgo(1);
        state.streak = state.lastCompleteDate === yesterday ? state.streak + 1 : 1;
        state.lastCompleteDate = todayStr();
        changed = true;
        toast(`All missions complete — ${state.streak} day streak!`, 'success');
      }
      if (changed) saveState(state);
      return state;
    } finally {
      checkCompletion._running = false;
    }
  }

  function widgetHtml() {
    const missions = todaysMissions();
    const state = checkCompletion();
    return `
      <div class="dm-widget">
        <div class="dm-widget-head"><span>\ud83c\udfaf Today's Mission</span>${state.streak > 1 ? `<span class="chip chip-accent">${state.streak} day streak</span>` : ''}</div>
        ${missions.map(m => {
          const done = state.completedIds.includes(m.id);
          const pct = Math.min(100, Math.round((progressFor(m) / m.target) * 100));
          return `<div class="dm-row ${done ? 'is-done' : ''}">
            <span class="dm-check">${done ? '\u2713' : ''}</span>
            <span class="dm-label">${escapeHtml(m.label)}</span>
            <span class="dm-bar"><span class="dm-bar-fill" style="width:${pct}%"></span></span>
          </div>`;
        }).join('')}
      </div>
    `;
  }
  window.SVBGDailyMissionWidget = widgetHtml;

  Views.dailymission = function () {
    return `
      <div class="view-header"><div><div class="view-title">Today's Mission</div><div class="view-sub">Three small objectives, refreshed daily \u2014 progress comes from real activity only</div></div></div>
      <div class="card">${widgetHtml()}</div>
    `;
  };
  ViewMount.dailymission = function () {};

  // re-check whenever any activity happens, so the widget/page update live
  if (Core) Core.subscribe(() => checkCompletion());
})();
