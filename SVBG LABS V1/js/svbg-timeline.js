/* ==========================================================================
   SVBG TIMELINE — a single chronological feed of everything you've done in
   SVBG Labs, built entirely from the existing XP activity log (every
   tracked action already writes a timestamped entry there — Time Machine
   and Life Coach already rely on the same source). Filterable by category,
   searchable by text, exportable as a text file.
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};

  Object.assign(ICONS, {
    timeline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2" fill="currentColor" stroke="none"/></svg>',
  });

  const CATEGORY_MAP = [
    { match: r => /task/i.test(r), cat: 'tasks', icon: 'check-square', label: 'Tasks' },
    { match: r => /habit/i.test(r), cat: 'habits', icon: 'activity', label: 'Habits' },
    { match: r => /journal/i.test(r), cat: 'journal', icon: 'book-open', label: 'Journal' },
    { match: r => /focus session/i.test(r), cat: 'focus', icon: 'clock', label: 'Focus' },
    { match: r => /note/i.test(r), cat: 'notes', icon: 'file-text', label: 'Notes' },
    { match: r => /bookmark/i.test(r), cat: 'bookmarks', icon: 'bookmark', label: 'Bookmarks' },
    { match: r => /transaction/i.test(r), cat: 'finance', icon: 'dollar', label: 'Finance' },
    { match: r => /password/i.test(r), cat: 'security', icon: 'shield', label: 'Security' },
    { match: r => /chess|sudoku|cyber lock|vault/i.test(r), cat: 'games', icon: 'brain', label: 'Mind Arena' },
  ];
  function categorize(reason) {
    const found = CATEGORY_MAP.find(c => c.match(reason));
    return found || { cat: 'other', icon: 'sparkles', label: 'Other' };
  }

  const TimelineState = { filter: 'all', search: '', limit: 60 };

  Views.timeline = function () {
    const log = (Ext.XP ? Ext.XP.log() : []).slice().sort((a, b) => b.at - a.at);
    const filtered = log.filter(e => {
      const c = categorize(e.reason);
      if (TimelineState.filter !== 'all' && c.cat !== TimelineState.filter) return false;
      if (TimelineState.search && !e.reason.toLowerCase().includes(TimelineState.search.toLowerCase())) return false;
      return true;
    });
    const shown = filtered.slice(0, TimelineState.limit);
    const cats = ['all', ...Array.from(new Set(CATEGORY_MAP.map(c => c.cat)))];

    let lastDay = null;
    const rows = shown.map(e => {
      const d = new Date(e.at);
      const dayStr = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      const c = categorize(e.reason);
      const dayHeader = dayStr !== lastDay ? `<div class="tl-day-header">${dayStr}</div>` : '';
      lastDay = dayStr;
      return `${dayHeader}
        <div class="tl-row">
          <span class="nav-icon tl-row-icon" data-icon="${c.icon}"></span>
          <div class="tl-row-body"><div class="tl-row-title">${escapeHtml(e.reason)}</div><div class="tl-row-time">${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · +${e.amount} XP</div></div>
        </div>`;
    }).join('');

    return `
      <div class="view-header"><div><div class="view-title">Timeline</div><div class="view-sub">Every tracked action across SVBG Labs, in one chronological feed</div></div>
        <button class="btn btn-sm" id="tl-export"><span class="nav-icon" data-icon="download"></span>Export</button>
      </div>
      <div class="card" style="margin-bottom:16px;">
        <div class="tl-controls">
          <div class="tl-filter-row">
            ${cats.map(c => `<button class="btn btn-sm tl-filter ${TimelineState.filter===c?'is-active':''}" data-filter="${c}">${c === 'all' ? 'All' : (CATEGORY_MAP.find(x=>x.cat===c)?.label || c)}</button>`).join('')}
          </div>
          <input type="text" id="tl-search" placeholder="Search timeline..." value="${escapeHtml(TimelineState.search)}" />
        </div>
      </div>
      <div class="card">
        ${shown.length ? `<div class="tl-feed">${rows}</div>` : `<div class="empty-state"><span class="nav-icon" data-icon="timeline"></span><span class="empty-state-title">Nothing here yet</span><span>Use SVBG Labs a little and your activity will show up here.</span></div>`}
        ${filtered.length > TimelineState.limit ? `<button class="btn btn-sm" id="tl-load-more" style="margin-top:14px;">Load more (${filtered.length - TimelineState.limit} remaining)</button>` : ''}
      </div>
    `;
  };

  ViewMount.timeline = function (root) {
    root.querySelectorAll('.tl-filter').forEach(b => b.addEventListener('click', () => { TimelineState.filter = b.dataset.filter; TimelineState.limit = 60; renderView('timeline'); }));
    const search = root.querySelector('#tl-search');
    if (search) search.addEventListener('input', debounce(() => { TimelineState.search = search.value; TimelineState.limit = 60; renderView('timeline'); }, 250));
    root.querySelector('#tl-load-more')?.addEventListener('click', () => { TimelineState.limit += 60; renderView('timeline'); });
    root.querySelector('#tl-export')?.addEventListener('click', () => {
      const log = (Ext.XP ? Ext.XP.log() : []).slice().sort((a, b) => b.at - a.at);
      const lines = log.map(e => `${new Date(e.at).toLocaleString()} — ${e.reason} (+${e.amount} XP)`);
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `svbg-timeline-${todayStr()}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  };
})();
