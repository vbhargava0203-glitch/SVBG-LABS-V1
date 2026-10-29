/* ==========================================================================
   SVBG ACTIVITY — a chronological feed of real events from the Activity
   Core (js/svbg-activitycore.js). Every row here is a real, timestamped
   event that actually happened — nothing on this page is fabricated.
   ========================================================================== */
'use strict';

(function () {
  const Core = window.SVBGActivityCore;

  Object.assign(ICONS, {
    feed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  });

  const EVENT_META = {
    TASK_COMPLETED: { emoji: '\u2705', label: 'Task completed', category: 'Productivity' },
    HABIT_COMPLETED: { emoji: '\ud83d\udd25', label: 'Habit checked in', category: 'Productivity' },
    FOCUS_COMPLETED: { emoji: '\u26a1', label: 'Focus session completed', category: 'Productivity' },
    FINANCE_LOGGED: { emoji: '\ud83d\udcb0', label: 'Transaction logged', category: 'Productivity' },
    JOURNAL_ENTRY: { emoji: '\ud83d\udcd3', label: 'Journal entry', category: 'Mind' },
    NOTE_CREATED: { emoji: '\ud83d\udcdd', label: 'Note created', category: 'Productivity' },
    BOOKMARK_SAVED: { emoji: '\ud83d\udd16', label: 'Bookmark saved', category: 'Learning' },
    TIME_CAPSULE_SEALED: { emoji: '\ud83d\udce6', label: 'Time Capsule sealed', category: 'Mind' },
    TIME_CAPSULE_OPENED: { emoji: '\ud83d\udcec', label: 'Time Capsule opened', category: 'Mind' },
    SUDOKU_COMPLETED: { emoji: '\ud83e\udde9', label: 'Sudoku completed', category: 'Games' },
    CYBERLOCK_COMPLETED: { emoji: '\ud83d\udd10', label: 'Cyber Lock vault cracked', category: 'Games' },
    MILESTONE_REACHED: { emoji: '\ud83c\udfaf', label: 'Goal completed', category: 'Projects' },
    ACHIEVEMENT_UNLOCKED: { emoji: '\ud83c\udfc6', label: 'Achievement unlocked', category: 'Achievements' },
    LEVEL_UP: { emoji: '\ud83d\ude80', label: 'Level up', category: 'Achievements' },
    EASTER_EGG_FOUND: { emoji: '\ud83e\udd5a', label: 'Easter egg found', category: 'Games' },
    MINDLAB_COMPLETED: { emoji: '\ud83e\udde0', label: 'Mind Lab experiment', category: 'Mind' },
    DAILY_MISSION_COMPLETED: { emoji: '\ud83c\udfc1', label: "Today's Mission complete", category: 'Productivity' },
    XP_AWARDED: { emoji: '\u2728', label: 'XP awarded', category: 'Productivity' },
  };
  function metaFor(type) { return EVENT_META[type] || { emoji: '\u2022', label: type, category: 'Other' }; }

  function detailFor(entry) {
    const p = entry.payload || {};
    switch (entry.type) {
      case 'ACHIEVEMENT_UNLOCKED': return p.title || '';
      case 'LEVEL_UP': return `Reached Level ${p.level}`;
      case 'XP_AWARDED': case 'TASK_COMPLETED': case 'HABIT_COMPLETED': case 'FOCUS_COMPLETED':
      case 'JOURNAL_ENTRY': case 'NOTE_CREATED': case 'BOOKMARK_SAVED': case 'MILESTONE_REACHED':
        return p.amount ? `+${p.amount} XP` : '';
      default: return '';
    }
  }

  const CATEGORIES = ['All', 'Productivity', 'Learning', 'Games', 'Mind', 'Achievements', 'Projects'];
  let activeCategory = 'All';

  // reusable snippet other views (Mission Control, Dashboard) can embed
  function recentActivityHtml(limit) {
    if (!Core) return `<p style="font-size:12.5px;color:var(--text-muted);">Activity Core unavailable.</p>`;
    const items = Core.log(limit).reverse();
    if (!items.length) return `<p style="font-size:12.5px;color:var(--text-muted);">No activity recorded yet — use SVBG Labs and it'll show up here.</p>`;
    return `<div class="activity-mini-list">${items.map(e => {
      const m = metaFor(e.type);
      return `<div class="activity-mini-row"><span>${m.emoji}</span><span class="activity-mini-label">${escapeHtml(m.label)}</span><span class="activity-mini-time">${new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>`;
    }).join('')}</div>`;
  }
  window.SVBGActivityFeedSnippet = recentActivityHtml;

  Views.activityfeed = function () {
    const items = Core ? Core.log().reverse() : [];
    const filtered = activeCategory === 'All' ? items : items.filter(e => metaFor(e.type).category === activeCategory);
    const groups = {};
    filtered.forEach(e => { const d = new Date(e.at).toDateString(); (groups[d] = groups[d] || []).push(e); });
    return `
      <div class="view-header"><div><div class="view-title">SVBG Activity</div><div class="view-sub">A real, chronological record of what you've actually done in SVBG Labs</div></div></div>
      <div class="activity-filter-row">
        ${CATEGORIES.map(c => `<button class="chip-btn ${c === activeCategory ? 'is-selected' : ''}" data-cat="${c}">${c}</button>`).join('')}
      </div>
      ${filtered.length === 0 ? `<p style="font-size:13px;color:var(--text-muted);margin-top:16px;">Nothing here yet${activeCategory !== 'All' ? ' in ' + activeCategory : ''}.</p>` : Object.entries(groups).map(([date, entries]) => `
        <div class="activity-day-group">
          <div class="activity-day-label">${date === new Date().toDateString() ? 'Today' : date}</div>
          <div class="card activity-day-card">
            ${entries.map(e => {
              const m = metaFor(e.type);
              const detail = detailFor(e);
              return `<div class="activity-row">
                <span class="activity-row-emoji">${m.emoji}</span>
                <div class="activity-row-body">
                  <div class="activity-row-label">${escapeHtml(m.label)}</div>
                  ${detail ? `<div class="activity-row-detail">${escapeHtml(detail)}</div>` : ''}
                </div>
                <span class="activity-row-time">${new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </div>`;
            }).join('')}
          </div>
        </div>`).join('')}
    `;
  };
  ViewMount.activityfeed = function (root) {
    root.querySelectorAll('.activity-filter-row .chip-btn').forEach(btn => btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderView('activityfeed');
    }));
  };
})();
