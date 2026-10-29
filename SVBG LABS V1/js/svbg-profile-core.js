/* SVBG PROFILE CORE — pure functions (no DOM, no storage) shared by the
   Identity 2.0 and Mission Control 2.0 modules, and unit-tested in Node
   (tests/core.test.js). Everything here derives from real data passed in. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SVBGCore2 = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCHEMA = 2;
  const LIST_FIELDS = ['expertise', 'programmingLanguages', 'technologies', 'technicalSkills', 'researchInterests', 'personalInterests', 'customSkills', 'shortGoals', 'longGoals', 'careerGoals', 'learningGoals', 'devGoals'];
  const TEXT_FIELDS = ['fullName', 'displayName', 'bio', 'location', 'website', 'currentRole', 'occupation', 'organization', 'degree', 'fieldOfStudy', 'currentWork', 'email', 'github', 'linkedin', 'portfolio', 'otherLink', 'systemName'];
  const LIMITS = { bio: 280, default: 120, list: 30, listItem: 60 };

  const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  function toList(v) {
    const arr = Array.isArray(v) ? v : String(v == null ? '' : v).split(/[\n,]/);
    const out = [];
    arr.forEach(x => { const t = clean(x).slice(0, LIMITS.listItem); if (t && !out.includes(t)) out.push(t); });
    return out.slice(0, LIMITS.list);
  }
  function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 120; }
  // only http(s) URLs are ever allowed through (blocks javascript:, data:, etc.)
  function sanitizeUrl(s) {
    s = clean(s);
    if (!s) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
    try { const u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') ? u.href : null; }
    catch (e) { return null; }
  }

  // Backward-compatible: keeps every key an older profile (e.g. the onboarding
  // wizard's fullName/roles/workingOn/skills/goals/helpAreas/systemName) had.
  function normalizeProfile(raw, authUser) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const p = Object.assign({}, src);
    TEXT_FIELDS.forEach(k => { p[k] = clean(src[k]).slice(0, k === 'bio' ? LIMITS.bio : LIMITS.default); });
    LIST_FIELDS.forEach(k => { p[k] = toList(src[k]); });
    p.roles = toList(src.roles); p.skills = toList(src.skills); p.goals = toList(src.goals); p.helpAreas = toList(src.helpAreas);
    if (!p.currentRole && p.roles.length) p.currentRole = p.roles[0];
    if (!p.currentWork && src.workingOn) p.currentWork = clean(src.workingOn).slice(0, LIMITS.default);
    if (!p.technicalSkills.length && p.skills.length) p.technicalSkills = p.skills.slice();
    if (!p.email && authUser && authUser.email) p.email = clean(authUser.email);
    if (!p.fullName && authUser && authUser.username) p.fullName = clean(authUser.username);
    p.username = clean((authUser && authUser.username) || src.username);
    p.schema = SCHEMA;
    p.createdAt = src.createdAt || src.onboardedAt || null;
    return p;
  }
  function displayNameOf(p) { return p.displayName || (p.fullName ? p.fullName.split(' ')[0] : '') || p.username || 'there'; }

  // returns { ok, errors{field:msg}, profile }
  function validateProfile(input) {
    const errors = {};
    const p = normalizeProfile(input);
    if (!p.fullName || p.fullName.length < 2) errors.fullName = 'Enter at least 2 characters.';
    if (p.email && !isEmail(p.email)) errors.email = 'Enter a valid email address.';
    ['website', 'github', 'linkedin', 'portfolio', 'otherLink'].forEach(k => {
      const raw = clean(input && input[k]);
      if (!raw) { p[k] = ''; return; }
      const u = sanitizeUrl(raw);
      if (u === null) errors[k] = 'Enter a valid http(s) link.'; else p[k] = u;
    });
    if (clean(input && input.bio).length > LIMITS.bio) errors.bio = `Keep it under ${LIMITS.bio} characters.`;
    return { ok: Object.keys(errors).length === 0, errors, profile: p };
  }

  // Completion from fields actually filled. Location/email are deliberately
  // not counted — we never nudge people toward optional personal details.
  function profileCompletion(p, hasAvatar) {
    const has = a => a.some(k => Array.isArray(p[k]) ? p[k].length : !!p[k]);
    const checks = [
      { label: 'Add your full name', done: !!p.fullName },
      { label: 'Add a display name', done: !!p.displayName },
      { label: 'Complete your biography', done: !!p.bio },
      { label: 'Add a profile picture', done: !!hasAvatar },
      { label: 'Add your current role', done: !!p.currentRole },
      { label: 'Add your organization or university', done: has(['organization', 'occupation']) },
      { label: 'Add your skills', done: has(['expertise', 'programmingLanguages', 'technologies', 'technicalSkills', 'customSkills']) },
      { label: 'Add a goal', done: has(['shortGoals', 'longGoals', 'careerGoals', 'learningGoals', 'devGoals', 'goals']) },
      { label: 'Add a professional link', done: has(['github', 'linkedin', 'portfolio', 'website', 'otherLink']) },
      { label: 'Describe your current work', done: !!p.currentWork },
    ];
    const done = checks.filter(c => c.done).length;
    return { percent: Math.round((done / checks.length) * 100), done, total: checks.length, missing: checks.filter(c => !c.done).map(c => c.label) };
  }

  // Real file-type check from magic bytes (not the filename/MIME claim).
  function sniffImage(bytes) {
    if (!bytes || bytes.length < 12) return null;
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
    return null;
  }
  const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
  function validateAvatarFile(bytes, size) {
    if (!size || size > MAX_AVATAR_BYTES) return { ok: false, error: 'Image must be under 8 MB.' };
    const type = sniffImage(bytes);
    return type ? { ok: true, type } : { ok: false, error: 'Use a JPEG, PNG or WebP image.' };
  }

  /* ---- time series (all from real records) ---- */
  function dayKeys(n, today) {
    const base = new Date(today + 'T00:00:00Z');
    return Array.from({ length: n }, (_, i) => { const d = new Date(base); d.setUTCDate(d.getUTCDate() - (n - 1 - i)); return d.toISOString().slice(0, 10); });
  }
  const dayOf = ms => new Date(ms).toISOString().slice(0, 10);
  function completedSeries(tasks, n, today) {
    const keys = dayKeys(n, today), c = {};
    (tasks || []).forEach(t => { if (t && t.done && t.completedOn) c[t.completedOn] = (c[t.completedOn] || 0) + 1; });
    return keys.map(k => ({ day: k, value: c[k] || 0 }));
  }
  function focusSeries(pomo, n, today) { return dayKeys(n, today).map(k => ({ day: k, value: (pomo && pomo[k]) || 0 })); }
  function activitySeries(log, n, today) {
    const keys = dayKeys(n, today), c = {};
    (log || []).forEach(e => { if (e && e.at) { const k = dayOf(e.at); c[k] = (c[k] || 0) + 1; } });
    return keys.map(k => ({ day: k, value: c[k] || 0 }));
  }
  const sum = s => s.reduce((a, b) => a + b.value, 0);
  function taskStats(tasks, today) {
    tasks = (tasks || []).filter(Boolean);
    const week = new Set(dayKeys(7, today));
    const completed = tasks.filter(t => t.done).length;
    const pending = tasks.length - completed;
    const doneWeek = tasks.filter(t => t.done && week.has(t.completedOn)).length;
    const dueToday = tasks.filter(t => !t.done && t.due === today).length;
    const denom = doneWeek + pending;
    return { total: tasks.length, completed, pending, dueToday, doneWeek, weeklyRate: denom ? Math.round((doneWeek / denom) * 100) : null };
  }

  /* ---- dashboard layout ---- */
  const MODES = ['balance', 'build', 'learn', 'focus', 'explore'];
  function validateLayout(raw, knownIds) {
    const base = { v: 1, mode: 'balance', hidden: [], order: null };
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return base;
    const known = new Set(knownIds);
    const out = Object.assign({}, base);
    if (MODES.includes(raw.mode)) out.mode = raw.mode;
    if (Array.isArray(raw.hidden)) out.hidden = [...new Set(raw.hidden.filter(id => known.has(id)))];
    if (Array.isArray(raw.order)) {
      const o = [...new Set(raw.order.filter(id => known.has(id)))];
      knownIds.forEach(id => { if (!o.includes(id)) o.push(id); });
      out.order = o;
    }
    return out;
  }
  function orderedWidgets(layout, defaultOrder, modeOrders) {
    if (layout.order) return layout.order.filter(id => !layout.hidden.includes(id));
    const pri = (modeOrders && modeOrders[layout.mode]) || [];
    const o = pri.filter(id => defaultOrder.includes(id));
    defaultOrder.forEach(id => { if (!o.includes(id)) o.push(id); });
    return o.filter(id => !layout.hidden.includes(id));
  }

  /* ---- journey: only milestones that actually happened ---- */
  function journeyMilestones(profile, log, goals, unlockedCount) {
    const first = t => (log || []).find(e => e.type === t);
    const out = [];
    const created = profile && (profile.createdAt || profile.onboardedAt);
    if (created) out.push({ label: 'SVBG identity created', at: created });
    [['TASK_COMPLETED', 'First task completed'], ['FOCUS_COMPLETED', 'First focus session'], ['MINDLAB_COMPLETED', 'First Mind Lab experiment'], ['ACHIEVEMENT_UNLOCKED', 'First achievement unlocked']]
      .forEach(([t, label]) => { const e = first(t); if (e) out.push({ label, at: e.at }); });
    const g = (goals || []).filter(x => x.progress >= 100);
    if (g.length) out.push({ label: 'First goal completed', at: g.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))[0].createdAt || null });
    return out.sort((a, b) => (a.at || 0) - (b.at || 0));
  }

  return { SCHEMA, LIST_FIELDS, TEXT_FIELDS, MODES, clean, toList, isEmail, sanitizeUrl, normalizeProfile, displayNameOf, validateProfile, profileCompletion, sniffImage, validateAvatarFile, dayKeys, completedSeries, focusSeries, activitySeries, sum, taskStats, validateLayout, orderedWidgets, journeyMilestones };
});
