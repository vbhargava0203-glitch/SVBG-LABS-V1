/* ==========================================================================
   SVBG IDENTITY — a profile hub placed above About Us in the sidebar.
   Shows the signed-in account's name, level, and XP, then nine linked
   sections. Four of those are direct links to existing views (DNA,
   Activity -> Reflection & Heatmap, Streaks -> Habits, Preferences ->
   Settings); the other five are new, lightweight views built here:
   Neural Profile, a full Achievements gallery, a Goals tracker, a Privacy
   explainer, and a Data Vault (export/import/reset, same actions Settings
   already offers, surfaced as their own destination).

   Reuses window.SVBGLabsExt (XP, levelInfo, computeDNA, DNA_LABELS,
   dnaRingSvg, Achievements, ACHIEVEMENT_DEFS, RARITY_LABEL) rather than
   recomputing any of that scoring logic itself.
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};

  Object.assign(ICONS, {
    identity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
  });

  const TRAIT_BLURB = {
    mind: 'how consistently you reflect and journal',
    focus: 'how much deep, timed focus work you have put in lately',
    health: 'how consistently you keep up your daily habits',
    learning: 'how often you capture and revisit notes',
    discipline: 'how reliably you finish what you start',
    finance: 'how your logged income and spending balance out this month',
    creativity: 'how much you are building up across notes and bookmarks',
    consistency: 'how long your habit streaks tend to run',
  };

  const IDENTITY_ROWS = [
    { emoji: '\uD83E\uDDEC', label: 'DNA', view: 'dna' },
    { emoji: '\uD83E\uDDE0', label: 'Neural Profile', view: 'neuralprofile' },
    { emoji: '\uD83C\uDFC6', label: 'Achievements', view: 'achievementsfull' },
    { emoji: '\uD83D\uDCCA', label: 'Activity', view: 'reflection' },
    { emoji: '\uD83D\uDD25', label: 'Streaks', view: 'habits' },
    { emoji: '\uD83C\uDFAF', label: 'Goals', view: 'goals' },
    { emoji: '\u2699\uFE0F', label: 'Preferences', view: 'settings' },
    { emoji: '\uD83D\uDD10', label: 'Privacy', view: 'privacy' },
    { emoji: '\uD83D\uDCBE', label: 'Data Vault', view: 'datavault' },
  ];

  /* ---------------------------------------------------------------------- *
   * HUB
   * ---------------------------------------------------------------------- */
  Views.identity = function () {
    const p = window.SVBGProfile ? window.SVBGProfile.get() : null;
    const name = (p && p.fullName) || (typeof Auth !== 'undefined' && Auth.current && Auth.current()) || 'Guest';
    const level = Ext.levelInfo && Ext.XP ? Ext.levelInfo(Ext.XP.total()) : { level: 1, xpIntoLevel: 0, xpForNext: 100, pct: 0 };
    const xpTotal = Ext.XP ? Ext.XP.total() : 0;
    const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
    return `
      <div class="view-header"><div><div class="view-title">SVBG Identity</div><div class="view-sub">${p && p.systemName ? escapeHtml(p.systemName) : 'Your profile, stats, and quick links'} \u2014 all local, nothing shared</div></div></div>
      <div class="card identity-header-card">
        <div class="identity-avatar">${escapeHtml(initials)}</div>
        <div class="identity-header-info">
          <div class="identity-name">${escapeHtml(name.toUpperCase())}</div>
          <div class="identity-level-row"><span class="chip chip-accent">Level ${level.level}</span><span class="identity-xp">XP ${xpTotal.toLocaleString()}</span></div>
          <div class="identity-xp-bar"><div class="identity-xp-bar-fill" style="width:${level.pct}%"></div></div>
          <div class="identity-xp-hint">${level.xpIntoLevel}/${level.xpForNext} XP to Level ${level.level + 1}</div>
          ${p && (p.roles || []).length ? `<div class="identity-xp-hint" style="margin-top:6px;">${p.roles.map(escapeHtml).join(' \u00b7 ')}</div>` : ''}
        </div>
      </div>
      <div class="card identity-menu-card">
        ${IDENTITY_ROWS.map(r => `
          <button class="identity-row" data-view="${r.view}">
            <span class="identity-row-emoji">${r.emoji}</span>
            <span class="identity-row-label">${escapeHtml(r.label)}</span>
            <span class="nav-icon identity-row-chevron" data-icon="chevron-left"></span>
          </button>`).join('')}
      </div>
    `;
  };
  ViewMount.identity = function (root) {
    root.querySelectorAll('.identity-row').forEach(row => row.addEventListener('click', () => renderView(row.dataset.view)));
  };

  /* ---------------------------------------------------------------------- *
   * NEURAL PROFILE — a narrative read of the same DNA trait scores, framed
   * as a behavioral profile rather than the DNA page's gauge grid.
   * ---------------------------------------------------------------------- */
  Views.neuralprofile = function () {
    if (!Ext.computeDNA) return `<div class="view-header"><div><div class="view-title">Neural Profile</div></div></div><p style="color:var(--text-muted);font-size:13px;">Not available right now.</p>`;
    const dna = Ext.computeDNA();
    const labels = Ext.DNA_LABELS || {};
    const traits = Object.keys(TRAIT_BLURB).map(k => ({ key: k, label: labels[k] || k, value: dna[k] || 0 }));
    const sorted = [...traits].sort((a, b) => b.value - a.value);
    const strongest = sorted[0], weakest = sorted[sorted.length - 1];
    const reflection = Ext.generateReflection ? Ext.generateReflection(todayStr()) : '';
    return `
      <div class="view-header"><div><div class="view-title">Neural Profile</div><div class="view-sub">A behavioral read of your own local activity, not a personality test, just pattern-matching on real data</div></div></div>
      <div class="card" style="margin-bottom:20px;">
        <p style="font-size:13.5px;color:var(--text);line-height:1.7;">
          Right now your strongest trait is <strong style="color:var(--accent);">${escapeHtml(strongest.label)}</strong> (${strongest.value}/100) —
          ${escapeHtml(TRAIT_BLURB[strongest.key])}. Your most room-to-grow trait is <strong>${escapeHtml(weakest.label)}</strong> (${weakest.value}/100) — ${escapeHtml(TRAIT_BLURB[weakest.key])}.
        </p>
      </div>
      <div class="identity-trait-grid">
        ${sorted.map(t => `
          <div class="card identity-trait-card">
            ${Ext.dnaRingSvg ? Ext.dnaRingSvg(t.key, t.value, 56, 5) : ''}
            <div class="identity-trait-info">
              <div class="identity-trait-label">${escapeHtml(t.label)}</div>
              <div class="identity-trait-value">${t.value}/100</div>
              <div class="identity-trait-blurb">${escapeHtml(TRAIT_BLURB[t.key])}</div>
            </div>
          </div>`).join('')}
      </div>
      ${reflection ? `<div class="card" style="margin-top:20px;"><h3 style="font-size:14px;margin-bottom:8px;">Today, in a sentence</h3><p style="font-size:13px;color:var(--text-muted);line-height:1.7;">${escapeHtml(reflection)}</p></div>` : ''}
      ${(() => {
        if (!window.SVBGMindLab) return '';
        const h = window.SVBGMindLab.history();
        const ready = window.SVBGMindLab.EXPERIMENTS.filter(e => e.ready);
        const tried = ready.filter(e => h[e.id]);
        return `<div class="card" style="margin-top:20px;">
          <h3 style="font-size:14px;margin-bottom:4px;">SVBG Experimental Scores</h3>
          <p style="font-size:11.5px;color:var(--text-faint);margin-bottom:14px;">From Mind Lab \u2014 for entertainment and self-exploration, not a medical or psychological assessment.</p>
          ${tried.length === 0 ? `<p style="font-size:13px;color:var(--text-muted);">No Mind Lab experiments run yet. <a href="#" onclick="renderView('mindlab');return false;" style="color:var(--accent);">Try one</a>.</p>` : `
          <div class="identity-mindlab-grid">
            ${ready.map(e => {
              const rec = h[e.id];
              return `<div class="identity-mindlab-stat"><span class="identity-mindlab-emoji">${e.emoji}</span><span class="identity-mindlab-name">${escapeHtml(e.label)}</span><span class="identity-mindlab-score">${rec ? rec.best : '\u2014'}</span></div>`;
            }).join('')}
          </div>`}
        </div>`;
      })()}
    `;
  };

  /* ---------------------------------------------------------------------- *
   * ACHIEVEMENTS — a full gallery (Mission Control shows a condensed grid
   * of these too, but this is a dedicated destination for just this).
   * ---------------------------------------------------------------------- */
  Views.achievementsfull = function () {
    const defs = Ext.ACHIEVEMENT_DEFS || [];
    const unlocked = Ext.Achievements ? Ext.Achievements.unlocked() : [];
    const unlockedIds = new Set(unlocked.map(u => u.id));
    const rarityLabel = Ext.RARITY_LABEL || {};
    const byRarity = {};
    defs.forEach(d => (byRarity[d.rarity] || (byRarity[d.rarity] = [])).push(d));
    const order = ['legendary', 'epic', 'rare', 'common'];
    return `
      <div class="view-header"><div><div class="view-title">Achievements</div><div class="view-sub">${unlocked.length}/${defs.length} unlocked</div></div></div>
      ${order.filter(r => byRarity[r] && byRarity[r].length).map(rarity => `
        <div style="margin-bottom:22px;">
          <h3 style="font-size:13px;margin-bottom:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(rarityLabel[rarity] || rarity)}</h3>
          <div class="identity-ach-grid">
            ${byRarity[rarity].map(def => {
              const got = unlockedIds.has(def.id);
              return `<div class="card identity-ach-card ${got ? 'is-unlocked rarity-' + def.rarity : ''}">
                <div class="identity-ach-title">${escapeHtml(def.title)}</div>
                <div class="identity-ach-desc">${escapeHtml(def.desc)}</div>
                <div class="identity-ach-status">${got ? 'Unlocked' : 'Locked'}</div>
              </div>`;
            }).join('')}
          </div>
        </div>`).join('')}
    `;
  };

  /* ---------------------------------------------------------------------- *
   * GOALS — a simple longer-horizon tracker, separate from day-to-day
   * Tasks: a title, an optional target date, and a manual progress bar.
   * ---------------------------------------------------------------------- */
  function goalsList() { return Store.get('goals', []); }
  function saveGoals(list) { Store.set('goals', list); }

  Views.goals = function () {
    const list = [...goalsList()].sort((a, b) => (b.progress === 100 ? 0 : 1) - (a.progress === 100 ? 0 : 1) || b.createdAt - a.createdAt);
    return `
      <div class="view-header"><div><div class="view-title">Goals</div><div class="view-sub">Longer-horizon targets, separate from day-to-day tasks</div></div></div>
      <div class="card" style="margin-bottom:20px;">
        <div class="field"><label>New goal</label><input type="text" id="goal-title-input" placeholder="e.g. Ship the v2 redesign" /></div>
        <div class="field"><label>Target date (optional)</label><input type="date" id="goal-date-input" /></div>
        <button class="btn btn-primary btn-sm" id="goal-add-btn"><span class="nav-icon" data-icon="plus"></span>Add goal</button>
      </div>
      ${list.length === 0 ? `<p style="font-size:13px;color:var(--text-muted);">No goals yet — add one above.</p>` : `
      <div class="identity-goal-list">
        ${list.map(g => `
          <div class="card identity-goal-card ${g.progress >= 100 ? 'is-complete' : ''}" data-id="${g.id}">
            <div class="identity-goal-top">
              <div class="identity-goal-title">${escapeHtml(g.title)}</div>
              <button class="btn btn-icon btn-ghost identity-goal-delete" data-icon="trash" title="Delete"></button>
            </div>
            ${g.targetDate ? `<div class="identity-goal-date">Target: ${escapeHtml(g.targetDate)}</div>` : ''}
            <div class="identity-goal-bar"><div class="identity-goal-bar-fill" style="width:${g.progress}%"></div></div>
            <div class="identity-goal-controls">
              <input type="range" min="0" max="100" step="5" value="${g.progress}" class="identity-goal-slider" />
              <span class="identity-goal-pct">${g.progress}%</span>
            </div>
          </div>`).join('')}
      </div>`}
    `;
  };
  ViewMount.goals = function (root) {
    root.querySelector('#goal-add-btn').addEventListener('click', () => {
      const titleInput = root.querySelector('#goal-title-input');
      const dateInput = root.querySelector('#goal-date-input');
      const title = titleInput.value.trim();
      if (!title) return;
      const list = goalsList();
      list.push({ id: 'g' + Date.now(), title, targetDate: dateInput.value || null, progress: 0, createdAt: Date.now() });
      saveGoals(list);
      renderView('goals');
    });
    root.querySelectorAll('.identity-goal-slider').forEach(slider => {
      slider.addEventListener('change', () => {
        const card = slider.closest('.identity-goal-card');
        const id = card.dataset.id;
        const list = goalsList();
        const g = list.find(x => x.id === id);
        if (!g) return;
        const wasComplete = g.progress >= 100;
        g.progress = parseInt(slider.value, 10);
        saveGoals(list);
        if (!wasComplete && g.progress >= 100 && Ext.award) { Ext.award(25, 'Goal completed'); toast('Goal complete — +25 XP', 'success'); }
        renderView('goals');
      });
    });
    root.querySelectorAll('.identity-goal-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.identity-goal-card').dataset.id;
        saveGoals(goalsList().filter(g => g.id !== id));
        renderView('goals');
      });
    });
  };

  /* ---------------------------------------------------------------------- *
   * PRIVACY
   * ---------------------------------------------------------------------- */
  Views.privacy = function () {
    const storageKb = Math.round(JSON.stringify(Store.all()).length / 1024);
    const STATUS = [
      { label: 'Local storage', value: 'On', good: true },
      { label: 'External API', value: 'Off', good: true },
      { label: 'Cloud sync', value: 'Off', good: true },
      { label: 'Tracking', value: 'Off', good: true },
      { label: 'Network dependency', value: 'Off', good: true },
    ];
    return `
      <div class="view-header"><div><div class="view-title">Privacy</div><div class="view-sub">Your personal SVBG data belongs to you</div></div></div>
      <div class="card" style="margin-bottom:20px;">
        <h3 style="font-size:14px;margin-bottom:10px;">System status</h3>
        <div class="privacy-status-grid">
          ${STATUS.map(s => `<div class="privacy-status-row"><span>${escapeHtml(s.label)}</span><span class="chip ${s.good ? 'chip-success' : ''}">${escapeHtml(s.value)}</span></div>`).join('')}
        </div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <h3 style="font-size:14px;margin-bottom:10px;">What stays local</h3>
          <p style="font-size:13px;color:var(--text-muted);line-height:1.75;">Every task, note, journal entry, habit, transaction, password you generate, and this profile's XP/level all live in this browser's local storage, under one key prefix. None of it is sent anywhere — there is no server for it to go to. Currently using about ${storageKb} KB.</p>
        </div>
        <div class="card">
          <h3 style="font-size:14px;margin-bottom:10px;">What can erase it</h3>
          <p style="font-size:13px;color:var(--text-muted);line-height:1.75;">Clearing this browser's site data, using a different browser or device, or private/incognito windows will not preserve it. Export a backup from Data Vault if you want to keep a copy or move it elsewhere.</p>
        </div>
        <div class="card">
          <h3 style="font-size:14px;margin-bottom:10px;">Accounts</h3>
          <p style="font-size:13px;color:var(--text-muted);line-height:1.75;">Sign-up/log-in is local-only too: passwords are salted and hashed with the Web Crypto API before being stored, and are never transmitted anywhere, because nothing in this app makes network requests.</p>
        </div>
        <div class="card">
          <h3 style="font-size:14px;margin-bottom:10px;">Manage your data</h3>
          <p style="font-size:13px;color:var(--text-muted);line-height:1.75;margin-bottom:10px;">Export, import, or permanently erase everything from Data Vault.</p>
          <button class="btn btn-sm" id="privacy-open-vault">Open Data Vault</button>
        </div>
      </div>
    `;
  };
  ViewMount.privacy = function (root) {
    root.querySelector('#privacy-open-vault')?.addEventListener('click', () => renderView('datavault'));
  };

  /* ---------------------------------------------------------------------- *
   * DATA VAULT — export / import / reset, as their own destination
   * ---------------------------------------------------------------------- */
  Views.datavault = function () {
    const all = Store.all();
    const keys = Object.keys(all);
    const storageKb = Math.round(JSON.stringify(all).length / 1024);
    const dataKeys = ['tasks','notes','journal','habits','transactions','bookmarks','goals'];
    const counts = dataKeys.map(k => `${(all[k] || []).length} ${k}`).join(' · ');
    return `
      <div class="view-header"><div><div class="view-title">Data Vault</div><div class="view-sub">Everything SVBG Labs has stored on this device</div></div></div>
      <div class="card" style="margin-bottom:20px;">
        <div class="settings-row"><div><div class="settings-row-title">Currently stored</div><div class="settings-row-sub">${counts}</div></div></div>
        <div class="settings-row"><div><div class="settings-row-title">Storage used</div><div class="settings-row-sub">${keys.length} keys · ${storageKb} KB · localStorage</div></div></div>
      </div>
      <div class="card">
        <div class="settings-row">
          <div><div class="settings-row-title">Export data</div><div class="settings-row-sub">Download everything as a single JSON file</div></div>
          <button class="btn" id="vault-export-btn"><span class="nav-icon" data-icon="download"></span>Export</button>
        </div>
        <div class="settings-row">
          <div><div class="settings-row-title">Import data</div><div class="settings-row-sub">Restore from a previously exported JSON file</div></div>
          <button class="btn" id="vault-import-btn"><span class="nav-icon" data-icon="upload"></span>Import</button>
          <input type="file" id="vault-import-file" accept="application/json" style="display:none;" />
        </div>
        <div class="settings-row">
          <div><div class="settings-row-title">Erase everything</div><div class="settings-row-sub">Permanently deletes all local SVBG Labs data, including your account</div></div>
          <button class="btn btn-danger" id="vault-reset-btn"><span class="nav-icon" data-icon="trash"></span>Erase</button>
        </div>
      </div>
    `;
  };
  ViewMount.datavault = function (root) {
    root.querySelector('#vault-export-btn').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(Store.all(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `svbg-labs-backup-${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Export downloaded', 'success');
    });
    const fileInput = root.querySelector('#vault-import-file');
    root.querySelector('#vault-import-btn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          Object.entries(data).forEach(([k, v]) => Store.set(k, v));
          toast('Data imported', 'success');
          renderView('datavault');
        } catch (e) { toast('That file could not be read', 'danger'); }
      };
      reader.readAsText(file);
    });
    root.querySelector('#vault-reset-btn').addEventListener('click', async () => {
      if (!(await confirmModal({ title: 'Erase all SVBG Labs data?', body: 'This permanently deletes every task, note, habit, transaction, and account on this device. Export first if you want a backup.', confirmLabel: 'Erase everything', danger: true }))) return;
      Store.wipe();
      toast('All data erased');
      renderView('dashboard');
    });
  };
})();
