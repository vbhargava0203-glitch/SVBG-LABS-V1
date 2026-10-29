/* ==========================================================================
   SVBG ACTIVITY CORE — the connective layer between every SVBG module.

   This deliberately does NOT replace or duplicate the existing Bus/XP
   system in extensions.js (const Bus, const XP) — that pub/sub and XP
   ledger already exists and already fires on every meaningful action via
   window.SVBGLabsExt.award(amount, reason). Rewriting it would violate
   "do not rewrite working systems unnecessarily" for no real gain.

   Instead, this module listens to the existing Bus('xp') event (fired by
   every award() call across the app) and translates each free-text
   "reason" string into a typed SVBG_EVENT (TASK_COMPLETED, HABIT_COMPLETED,
   FOCUS_COMPLETED, etc.), appends it to a new persisted, capped activity
   log, and re-emits it on a new 'svbg:activity' Bus channel that any other
   module (Activity Feed, Today's Mission, Mind Lab, Focus Forest...) can
   subscribe to — without those modules needing to know about each other.
   This is the "clean event architecture" the product brief asks for,
   layered on top of what already works rather than beside it.

   Also detects two event types the XP ledger doesn't carry on its own:
   - LEVEL_UP: computed from the level before/after each award, using the
     existing levelInfo() the DNA/Mission Control pages already rely on.
   - ACHIEVEMENT_UNLOCKED: detected by safely wrapping the existing
     Achievements.check() (same object reference exposed on
     window.SVBGLabsExt, so the wrap applies wherever it's called from)
     and diffing the unlocked-id set before/after, rather than
     reimplementing achievement logic here.
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};
  if (!Ext.Bus || !Ext.XP || !Ext.levelInfo) { console.warn('SVBG Activity Core: required internals not found — skipping.'); return; }

  const LOG_KEY = 'activity_log';
  const LOG_CAP = 300;

  function log() { return Store.get(LOG_KEY, []); }
  function persist(entry) {
    const list = log();
    list.push(entry);
    if (list.length > LOG_CAP) list.shift();
    Store.set(LOG_KEY, list);
  }

  const ActivityCore = {
    emit(type, payload) {
      const entry = { type, payload: payload || {}, at: Date.now() };
      persist(entry);
      Ext.Bus.emit('svbg:activity', entry);
      return entry;
    },
    log(limit) { const l = log(); return limit ? l.slice(-limit) : l; },
    subscribe(handler) { Ext.Bus.on('svbg:activity', handler); },
    countSince(type, sinceMs) {
      return log().filter(e => (type === '*' || e.type === type) && e.at >= sinceMs).length;
    },
  };
  window.SVBGActivityCore = ActivityCore;

  // free-text XP "reason" -> typed activity event. Anything not in this
  // list still gets recorded, generically, as XP_AWARDED — nothing is
  // silently dropped.
  const REASON_MAP = {
    'Task completed': 'TASK_COMPLETED',
    'Journal entry logged': 'JOURNAL_ENTRY',
    'Focus session completed': 'FOCUS_COMPLETED',
    'Goal completed': 'MILESTONE_REACHED',
    'Transaction logged': 'FINANCE_LOGGED',
    'Found the Konami code': 'EASTER_EGG_FOUND',
    'Bookmark saved': 'BOOKMARK_SAVED',
    'Note created': 'NOTE_CREATED',
    'Sealed a Time Capsule': 'TIME_CAPSULE_SEALED',
    'Habit checked in': 'HABIT_COMPLETED',
    'Opened a Time Capsule': 'TIME_CAPSULE_OPENED',
    'Completed an SVBG Sudoku puzzle': 'SUDOKU_COMPLETED',
    'Unlocked an SVBG Cyber Lock vault': 'CYBERLOCK_COMPLETED',
  };

  Ext.Bus.on('xp', ({ amount, reason, total }) => {
    const type = REASON_MAP[reason] || 'XP_AWARDED';
    ActivityCore.emit(type, { amount, reason, total });
    const beforeLevel = Ext.levelInfo(Math.max(0, total - amount)).level;
    const afterLevel = Ext.levelInfo(total).level;
    if (afterLevel > beforeLevel) ActivityCore.emit('LEVEL_UP', { level: afterLevel });
  });

  // wrap Achievements.check (same object referenced by XP.add internally)
  // to detect newly-unlocked achievements without reimplementing the check
  if (Ext.Achievements && typeof Ext.Achievements.check === 'function' && Ext.ACHIEVEMENT_DEFS) {
    const originalCheck = Ext.Achievements.check.bind(Ext.Achievements);
    Ext.Achievements.check = function () {
      const before = new Set(Ext.Achievements.unlocked().map(u => u.id));
      originalCheck();
      Ext.Achievements.unlocked().forEach(u => {
        if (!before.has(u.id)) {
          const def = Ext.ACHIEVEMENT_DEFS.find(d => d.id === u.id);
          ActivityCore.emit('ACHIEVEMENT_UNLOCKED', { id: u.id, title: def ? def.title : u.id, rarity: def ? def.rarity : null });
        }
      });
    };
  }
})();
