/* ==========================================================================
   SVBG IDENTITY 2.0 — a local, editable profile. Extends (does not replace)
   the onboarding profile in Store('svbg_profile'): old keys are preserved,
   new ones added (schema 2). It is a LOCAL identity on this device, not a
   cloud account — the UI says so.
   Avatar binary lives in IndexedDB (never base64 in localStorage); only a
   256px JPEG is stored. Logic (validation/completion) is in
   svbg-profile-core.js and unit-tested.
   ========================================================================== */
'use strict';

(function () {
  const C = window.SVBGCore2;
  const Ext = window.SVBGLabsExt || {};
  if (!C) { console.warn('SVBG Identity 2.0: core missing'); return; }

  /* ---------------- storage ---------------- */
  function authUser() { try { const n = Auth.current(); return (Auth.list() || []).find(u => u.username === n) || { username: n }; } catch (e) { return {}; } }
  function rawProfile() { return Store.get('svbg_profile', null); }
  function getProfile() { return C.normalizeProfile(rawProfile(), authUser()); }
  function saveProfile(p) {
    const out = Object.assign({}, rawProfile() || {}, p);
    if (!out.createdAt && !out.onboardedAt) out.createdAt = Date.now();
    out.updatedAt = Date.now(); out.schema = C.SCHEMA;
    Store.set('svbg_profile', out);
  }

  /* ---------------- avatar (IndexedDB) ---------------- */
  let avatarUrl = null;
  function idb() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
      const r = indexedDB.open('svbg_labs_media', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('blobs');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function idbOp(mode, fn) {
    const db = await idb();
    return new Promise((res, rej) => { const tx = db.transaction('blobs', mode); const req = fn(tx.objectStore('blobs')); tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error); });
  }
  async function loadAvatar() {
    try {
      const blob = await idbOp('readonly', s => s.get('avatar'));
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
      avatarUrl = blob instanceof Blob ? URL.createObjectURL(blob) : null;
    } catch (e) { avatarUrl = null; } // missing/corrupt/unavailable -> initials avatar
    paintAvatars(document);
  }
  const saveAvatarBlob = b => idbOp('readwrite', s => s.put(b, 'avatar'));
  const removeAvatarBlob = () => idbOp('readwrite', s => s.delete('avatar'));

  function initials(p) { return (p.displayName || p.fullName || p.username || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'; }
  function avatarHtml(px) { return `<span class="svbg-avatar" data-svbg-avatar style="--av:${px}px">${escapeHtml(initials(getProfile()))}</span>`; }
  function paintAvatars(root) {
    root.querySelectorAll('[data-svbg-avatar]').forEach(el => {
      el.innerHTML = '';
      if (avatarUrl) { const img = document.createElement('img'); img.alt = ''; img.src = avatarUrl; img.onerror = () => { el.textContent = initials(getProfile()); }; el.appendChild(img); }
      else el.textContent = initials(getProfile());
    });
    // existing sidebar account pill: show avatar + display name
    const pill = document.querySelector('#account-pill .nav-icon[data-icon="user"], #account-pill .nav-icon[data-svbg-pill]');
    if (pill) {
      pill.setAttribute('data-svbg-pill', '1'); pill.removeAttribute('data-icon');
      pill.classList.add('svbg-avatar', 'svbg-avatar-pill'); pill.setAttribute('data-svbg-avatar', '');
      pill.innerHTML = ''; pill.style.setProperty('--av', '24px');
      if (avatarUrl) { const img = document.createElement('img'); img.alt = ''; img.src = avatarUrl; pill.appendChild(img); } else pill.textContent = initials(getProfile());
    }
    const nm = document.getElementById('account-name');
    const p = getProfile();
    if (nm && (p.displayName || p.fullName)) nm.textContent = p.displayName || p.fullName.split(' ')[0];
  }

  window.SVBGProfile = Object.assign(window.SVBGProfile || {}, {
    get: rawProfile, getNormalized: getProfile, save: saveProfile, displayName: () => C.displayNameOf(getProfile()),
    avatarHtml, paintAvatars, hasAvatar: () => !!avatarUrl,
  });

  /* ---------------- rendering helpers ---------------- */
  const E = escapeHtml;
  const val = v => v ? E(v) : '<span class="idn-empty">Not added</span>';
  const chips = a => a && a.length ? `<div class="idn-chips">${a.map(x => `<span class="chip">${E(x)}</span>`).join('')}</div>` : '<span class="idn-empty">Not added</span>';
  const link = u => { const s = u && C.sanitizeUrl(u); return s ? `<a href="${E(s)}" target="_blank" rel="noopener noreferrer">${E(s.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : '<span class="idn-empty">Not added</span>'; };
  const row = (l, v) => `<div class="idn-row"><span class="idn-label">${l}</span><span class="idn-val">${v}</span></div>`;
  const section = (title, body, extra) => `<div class="card idn-section"><div class="idn-section-head"><h3>${title}</h3>${extra || ''}</div>${body}</div>`;

  const ROWS = [
    ['\uD83E\uDDEC', 'DNA', 'dna'], ['\uD83E\uDDE0', 'Neural Profile', 'neuralprofile'], ['\uD83C\uDFC6', 'Achievements', 'achievementsfull'],
    ['\uD83D\uDCCA', 'Activity', 'reflection'], ['\uD83D\uDD25', 'Streaks', 'habits'], ['\uD83C\uDFAF', 'Goals', 'goals'],
    ['\u2699\uFE0F', 'Preferences', 'settings'], ['\uD83D\uDD10', 'Privacy', 'privacy'], ['\uD83D\uDCBE', 'Data Vault', 'datavault'],
  ];

  function stats() {
    const lv = Ext.levelInfo && Ext.XP ? Ext.levelInfo(Ext.XP.total()) : { level: 1, pct: 0, xpIntoLevel: 0, xpForNext: 100 };
    const habits = Store.get('habits', []);
    const streak = habits.reduce((m, h) => Math.max(m, typeof calcStreak === 'function' ? calcStreak(h.history || {}) : 0), 0);
    return { lv, xp: Ext.XP ? Ext.XP.total() : 0, streak };
  }

  /* ---------------- Identity view ---------------- */
  Views.identity = function () {
    const p = getProfile();
    const comp = C.profileCompletion(p, !!avatarUrl);
    const { lv, xp, streak } = stats();
    const goalsDone = Store.get('goals', []).filter(g => g.progress >= 100).length;
    const unlocked = Ext.Achievements ? Ext.Achievements.unlocked() : [];
    const defs = Ext.ACHIEVEMENT_DEFS || [];
    const recent = unlocked.slice(-3).reverse().map(u => (defs.find(d => d.id === u.id) || {}).title).filter(Boolean);
    const pomoTotal = Object.values(Store.get('pomoSessions', {})).reduce((a, b) => a + b, 0);
    const tasksDone = Store.get('tasks', []).filter(t => t.done).length;
    const goals5 = [['Short-term', p.shortGoals], ['Long-term', p.longGoals], ['Career', p.careerGoals], ['Learning', p.learningGoals], ['Personal development', p.devGoals], ['From onboarding', p.goals]];
    return `
      <div class="view-header"><div><div class="view-title">SVBG Identity</div><div class="view-sub">${p.systemName ? E(p.systemName) + ' \u2014 ' : ''}a local identity, stored only on this device</div></div></div>
      <div class="card idn-hero">
        ${avatarHtml(96)}
        <div class="idn-hero-main">
          <div class="idn-name">${E(p.fullName || p.username || 'Your name')}</div>
          <div class="idn-role">${E([p.currentRole, p.organization].filter(Boolean).join(' \u00b7 ') || p.occupation || 'Add your role in Edit Profile')}</div>
          <p class="idn-bio">${p.bio ? E(p.bio) : '<span class="idn-empty">Add a short biography in Edit Profile.</span>'}</p>
          <div class="idn-actions"><button class="btn btn-primary btn-sm" id="idn-edit">Edit profile</button><button class="btn btn-sm" id="idn-prefs">Preferences</button></div>
        </div>
        <div class="idn-level"><span class="chip chip-accent">Level ${lv.level}</span><span class="idn-xp">XP ${xp.toLocaleString()}</span><div class="identity-xp-bar"><div class="identity-xp-bar-fill" style="width:${lv.pct}%"></div></div></div>
      </div>
      <div class="card idn-completion">
        <div class="idn-comp-top"><span class="idn-label">PROFILE COMPLETION</span><strong>${comp.percent}%</strong></div>
        <div class="identity-xp-bar"><div class="identity-xp-bar-fill" style="width:${comp.percent}%"></div></div>
        ${comp.missing.length ? `<ul class="idn-todo">${comp.missing.slice(0, 3).map(m => `<li>${E(m)}</li>`).join('')}</ul>` : '<div class="idn-empty" style="margin-top:8px;">Profile complete.</div>'}
        <div class="idn-note">Optional details are never required, and completion does not affect XP.</div>
      </div>
      <div class="idn-grid">
        ${section('Personal information', row('Full name', val(p.fullName)) + row('Display name', val(p.displayName)) + row('Username', val(p.username)) + row('Email', val(p.email)) + row('Location', val(p.location)) + row('Website', link(p.website)))}
        ${section('Professional information', row('Current role', val(p.currentRole)) + row('Occupation', val(p.occupation)) + row('Organization', val(p.organization)) + row('Degree', val(p.degree)) + row('Field of study', val(p.fieldOfStudy)) + row('Expertise', chips(p.expertise)) + row('Current work', val(p.currentWork)))}
        ${section('Skills & interests', row('Languages', chips(p.programmingLanguages)) + row('Technologies', chips(p.technologies)) + row('Technical skills', chips(p.technicalSkills)) + row('Research', chips(p.researchInterests)) + row('Interests', chips(p.personalInterests)) + row('Custom', chips(p.customSkills)))}
        ${section('Current goals', goals5.map(([l, a]) => row(l, chips(a))).join(''), '<button class="btn btn-sm" data-go="goals">Goals</button>')}
        ${section('Projects & achievements', row('Achievements', `${unlocked.length}/${defs.length} unlocked`) + row('Recent', recent.length ? E(recent.join(', ')) : '<span class="idn-empty">None yet</span>') + row('Goals completed', String(goalsDone)) + '<div class="idn-note">SVBG does not track projects yet; goals are shown instead.</div>', '<button class="btn btn-sm" data-go="achievementsfull">Gallery</button>')}
        ${section('Personal progress', row('Level', String(lv.level)) + row('Total XP', xp.toLocaleString()) + row('Best habit streak', `${streak} day${streak === 1 ? '' : 's'}`) + row('Tasks completed', String(tasksDone)) + row('Focus sessions', String(pomoTotal)))}
        ${section('Social links', row('GitHub', link(p.github)) + row('LinkedIn', link(p.linkedin)) + row('Portfolio', link(p.portfolio)) + row('Other', link(p.otherLink)))}
        ${section('Privacy & data', '<p class="idn-note" style="margin:0 0 10px;">This is a local SVBG Identity. It is not a cloud account and is not synced anywhere. Your photo is stored in this browser only.</p><button class="btn btn-sm" data-go="privacy">Privacy</button> <button class="btn btn-sm" data-go="datavault">Data Vault</button>')}
      </div>
      <div class="card identity-menu-card" style="margin-top:20px;">
        ${ROWS.map(r => `<button class="identity-row" data-go="${r[2]}"><span class="identity-row-emoji">${r[0]}</span><span class="identity-row-label">${E(r[1])}</span><span class="nav-icon identity-row-chevron" data-icon="chevron-left"></span></button>`).join('')}
      </div>`;
  };
  ViewMount.identity = function (root) {
    paintAvatars(root);
    root.querySelector('#idn-edit').addEventListener('click', () => renderView('profileedit'));
    root.querySelector('#idn-prefs').addEventListener('click', () => renderView('settings'));
    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => renderView(b.dataset.go)));
  };

  /* ---------------- Edit view ---------------- */
  const LIST_LABELS = [['expertise', 'Areas of expertise'], ['programmingLanguages', 'Programming languages'], ['technologies', 'Technologies'], ['technicalSkills', 'Technical skills'], ['researchInterests', 'Research interests'], ['personalInterests', 'Personal interests'], ['customSkills', 'Custom skills'], ['shortGoals', 'Short-term goals'], ['longGoals', 'Long-term goals'], ['careerGoals', 'Career objectives'], ['learningGoals', 'Learning objectives'], ['devGoals', 'Personal development goals']];
  const TXT = [['fullName', 'Full name *', 'text'], ['displayName', 'Display name', 'text'], ['email', 'Email (contact only \u2014 not a login)', 'email'], ['location', 'Location (city / country, optional)', 'text'], ['website', 'Personal website', 'text'], ['currentRole', 'Current role', 'text'], ['occupation', 'Occupation', 'text'], ['organization', 'Organization or university', 'text'], ['degree', 'Degree or qualification', 'text'], ['fieldOfStudy', 'Field of study', 'text'], ['currentWork', 'Current work', 'text'], ['github', 'GitHub', 'text'], ['linkedin', 'LinkedIn', 'text'], ['portfolio', 'Portfolio', 'text'], ['otherLink', 'Other professional link', 'text']];
  const fld = (p, [k, l, type]) => `<div class="field"><label for="pf-${k}">${l}</label><input type="${type}" id="pf-${k}" name="${k}" value="${E(p[k] || '')}" maxlength="120" autocomplete="off" /><div class="idn-err" id="err-${k}"></div></div>`;

  Views.profileedit = function () {
    const p = getProfile();
    return `
      <div class="view-header"><div><div class="view-title">Edit profile</div><div class="view-sub">Everything except your name is optional</div></div></div>
      <div class="card idn-section" id="idn-photo">
        <div class="idn-section-head"><h3>Profile photo</h3></div>
        <div class="idn-photo-row">${avatarHtml(96)}
          <div class="idn-photo-actions">
            <input type="file" id="idn-file" accept="image/jpeg,image/png,image/webp" hidden />
            <button class="btn btn-sm" id="idn-pick">${avatarUrl ? 'Replace photo' : 'Upload photo'}</button>
            ${avatarUrl ? '<button class="btn btn-sm btn-danger" id="idn-remove">Remove</button>' : ''}
            <div class="idn-note">JPEG, PNG or WebP, up to 8 MB. Resized to 256px and kept in this browser only.</div>
          </div>
        </div>
        <div class="idn-crop is-hidden-crop" id="idn-crop">
          <canvas id="idn-canvas" width="220" height="220"></canvas>
          <div class="idn-crop-controls">
            <label>Zoom <input type="range" id="crop-zoom" min="1" max="3" step="0.05" value="1"></label>
            <label>Left / right <input type="range" id="crop-x" min="-1" max="1" step="0.02" value="0"></label>
            <label>Up / down <input type="range" id="crop-y" min="-1" max="1" step="0.02" value="0"></label>
            <div><button class="btn btn-primary btn-sm" id="crop-save">Save photo</button> <button class="btn btn-sm" id="crop-cancel">Cancel</button></div>
          </div>
        </div>
      </div>
      <form id="idn-form" novalidate>
        <div class="card idn-section"><div class="idn-section-head"><h3>Personal &amp; professional</h3></div>
          <div class="idn-form-grid">${TXT.map(f => fld(p, f)).join('')}</div>
          <div class="field"><label for="pf-bio">Short biography <span class="idn-count" id="bio-count"></span></label><textarea id="pf-bio" name="bio" maxlength="280" rows="3">${E(p.bio || '')}</textarea><div class="idn-err" id="err-bio"></div></div>
        </div>
        <div class="card idn-section"><div class="idn-section-head"><h3>Skills, interests &amp; goals</h3></div>
          <div class="idn-note" style="margin-bottom:10px;">One per line or comma-separated.</div>
          <div class="idn-form-grid">${LIST_LABELS.map(([k, l]) => `<div class="field"><label for="pf-${k}">${l}</label><textarea id="pf-${k}" name="${k}" rows="2">${E((p[k] || []).join(', '))}</textarea></div>`).join('')}</div>
        </div>
        <div class="idn-form-actions"><button type="submit" class="btn btn-primary">Save profile</button><button type="button" class="btn" id="idn-cancel">Cancel</button></div>
      </form>`;
  };

  ViewMount.profileedit = function (root) {
    paintAvatars(root);
    const $ = s => root.querySelector(s);
    const bio = $('#pf-bio'), count = $('#bio-count');
    const upd = () => { count.textContent = `${bio.value.length}/280`; }; bio.addEventListener('input', upd); upd();
    $('#idn-cancel').addEventListener('click', () => renderView('identity'));

    $('#idn-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = {};
      C.TEXT_FIELDS.concat(['bio']).forEach(k => { const el = root.querySelector(`[name="${k}"]`); if (el) data[k] = el.value; });
      C.LIST_FIELDS.forEach(k => { const el = root.querySelector(`[name="${k}"]`); if (el) data[k] = el.value; });
      root.querySelectorAll('.idn-err').forEach(x => { x.textContent = ''; });
      const r = C.validateProfile(Object.assign({}, rawProfile() || {}, data));
      if (!r.ok) { Object.entries(r.errors).forEach(([k, m]) => { const el = root.querySelector('#err-' + k); if (el) el.textContent = m; }); toast('Please fix the highlighted fields.', 'danger'); return; }
      const keep = {}; C.TEXT_FIELDS.concat(C.LIST_FIELDS, ['bio']).forEach(k => { keep[k] = r.profile[k]; });
      saveProfile(keep); paintAvatars(document);
      toast('Profile saved', 'success'); renderView('identity');
    });

    /* avatar: validate -> crop preview -> resize to 256px JPEG -> IndexedDB */
    const fileIn = $('#idn-file'), cropBox = $('#idn-crop'), cv = $('#idn-canvas'), ctx = cv.getContext('2d');
    let img = null;
    function draw() {
      const z = +$('#crop-zoom').value, ox = +$('#crop-x').value, oy = +$('#crop-y').value;
      const base = Math.min(img.width, img.height) / z, maxX = (img.width - base) / 2, maxY = (img.height - base) / 2;
      const sx = (img.width - base) / 2 + ox * maxX, sy = (img.height - base) / 2 + oy * maxY;
      ctx.clearRect(0, 0, 220, 220); ctx.drawImage(img, sx, sy, base, base, 0, 0, 220, 220);
    }
    $('#idn-pick').addEventListener('click', () => fileIn.click());
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files[0]; fileIn.value = '';
      if (!f) return;
      const bytes = new Uint8Array(await f.slice(0, 16).arrayBuffer());
      const v = C.validateAvatarFile(bytes, f.size);
      if (!v.ok) { toast(v.error, 'danger'); return; }
      const url = URL.createObjectURL(f);
      const im = new Image();
      im.onload = () => { img = im; URL.revokeObjectURL(url); ['crop-zoom', 'crop-x', 'crop-y'].forEach(id => { $('#' + id).value = id === 'crop-zoom' ? 1 : 0; }); cropBox.classList.remove('is-hidden-crop'); draw(); };
      im.onerror = () => { URL.revokeObjectURL(url); toast('That image could not be read.', 'danger'); };
      im.src = url;
    });
    ['crop-zoom', 'crop-x', 'crop-y'].forEach(id => $('#' + id).addEventListener('input', () => img && draw()));
    $('#crop-cancel').addEventListener('click', () => { img = null; cropBox.classList.add('is-hidden-crop'); });
    $('#crop-save').addEventListener('click', () => {
      if (!img) return;
      const out = document.createElement('canvas'); out.width = out.height = 256;
      out.getContext('2d').drawImage(cv, 0, 0, 256, 256);
      out.toBlob(async blob => {
        if (!blob) { toast('Could not process the image.', 'danger'); return; }
        try { await saveAvatarBlob(blob); await loadAvatar(); toast('Photo saved', 'success'); renderView('profileedit'); }
        catch (e) { toast('Could not store the photo in this browser.', 'danger'); }
      }, 'image/jpeg', 0.85);
    });
    $('#idn-remove')?.addEventListener('click', async () => {
      try { await removeAvatarBlob(); } catch (e) { /* nothing stored */ }
      await loadAvatar(); toast('Photo removed'); renderView('profileedit');
    });
  };

  loadAvatar();
})();
