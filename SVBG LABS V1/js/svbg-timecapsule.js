/* ==========================================================================
   SVBG TIME CAPSULE — write yourself a message, lock it for a chosen
   duration, and it can't be opened until that date arrives (enforced by
   comparing against Date.now() — there's no way around it short of
   changing your system clock, same honesty tradeoff any offline app has).
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};

  Object.assign(ICONS, {
    capsule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="10" rx="5"/><line x1="3" y1="14" x2="21" y2="14"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/></svg>',
  });

  const DURATIONS = { '30d': 30 * 86400000, '90d': 90 * 86400000, '1y': 365 * 86400000, '5y': 5 * 365 * 86400000 };
  const DURATION_LABELS = { '30d': '30 Days', '90d': '90 Days', '1y': '1 Year', '5y': '5 Years' };

  function capsules() { return Store.get('time_capsules', []); }
  function saveCapsules(c) { Store.set('time_capsules', c); }

  function fmtCountdown(ms) {
    if (ms <= 0) return 'Ready to open';
    const days = Math.floor(ms / 86400000);
    if (days >= 365) return `${(days / 365).toFixed(1)} years left`;
    if (days >= 1) return `${days} day${days === 1 ? '' : 's'} left`;
    const hours = Math.floor(ms / 3600000);
    return `${Math.max(1, hours)} hour${hours === 1 ? '' : 's'} left`;
  }

  Views.timecapsule = function () {
    const list = capsules().slice().sort((a, b) => a.unlockAt - b.unlockAt);
    const now = Date.now();
    return `
      <div class="view-header"><div><div class="view-title">Time Capsule</div><div class="view-sub">Write a message to your future self and lock it away</div></div></div>
      <div class="card" style="margin-bottom:18px;">
        <div class="field"><label>Message</label><textarea id="tc-message" rows="4" placeholder="Dear future me..."></textarea></div>
        <div class="field"><label>Lock for</label>
          <div class="tc-duration-row">
            ${Object.keys(DURATIONS).map(k => `<button class="btn btn-sm tc-duration ${k==='30d'?'is-active':''}" data-dur="${k}">${DURATION_LABELS[k]}</button>`).join('')}
          </div>
        </div>
        <button class="btn btn-primary" id="tc-create">Seal the capsule</button>
      </div>
      <div class="tc-grid">
        ${list.length ? list.map(c => {
          const remaining = c.unlockAt - now;
          const ready = remaining <= 0;
          return `<div class="card tc-card ${c.opened ? 'tc-opened' : ready ? 'tc-ready' : 'tc-locked'}" data-id="${c.id}">
            <span class="nav-icon tc-icon" data-icon="capsule"></span>
            <div class="tc-status">${c.opened ? 'Opened' : fmtCountdown(remaining)}</div>
            <div class="tc-created">Sealed ${new Date(c.createdAt).toLocaleDateString()}</div>
            ${c.opened ? `<div class="tc-message">${escapeHtml(c.message)}</div>` :
              ready ? `<button class="btn btn-primary btn-sm tc-open-btn" data-open="${c.id}">Open now</button>` :
              `<div class="tc-locked-label">Locked</div>`}
          </div>`;
        }).join('') : `<div class="empty-state" style="grid-column:1/-1;"><span class="nav-icon" data-icon="capsule"></span><span class="empty-state-title">No capsules yet</span><span>Seal your first message above.</span></div>`}
      </div>
    `;
  };

  ViewMount.timecapsule = function (root) {
    let dur = '30d';
    root.querySelectorAll('.tc-duration').forEach(b => b.addEventListener('click', () => { dur = b.dataset.dur; root.querySelectorAll('.tc-duration').forEach(x => x.classList.toggle('is-active', x === b)); }));
    root.querySelector('#tc-create')?.addEventListener('click', () => {
      const msg = root.querySelector('#tc-message').value.trim();
      if (!msg) { toast('Write something for future you first'); return; }
      const list = capsules();
      list.push({ id: uid(), message: msg, createdAt: Date.now(), unlockAt: Date.now() + DURATIONS[dur], opened: false });
      saveCapsules(list);
      if (Ext.award) Ext.award(5, 'Sealed a Time Capsule');
      if (Ext.Bus) Ext.Bus.emit('activity');
      toast('Capsule sealed — check back later', 'success');
      renderView('timecapsule');
    });
    root.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => {
      const list = capsules();
      const c = list.find(x => x.id === btn.dataset.open);
      if (!c || Date.now() < c.unlockAt) return;
      c.opened = true; c.openedAt = Date.now();
      saveCapsules(list);
      if (Ext.award) Ext.award(8, 'Opened a Time Capsule');
      if (Ext.Bus) Ext.Bus.emit('activity');
      toast('A message from your past self ✨', 'success');
      renderView('timecapsule');
    }));
  };
})();
