/* ==========================================================================
   SVBG Labs — client application
   Zero build step, zero external runtime deps, zero network calls required.
   Everything persists to localStorage. Nothing here phones home.
   ========================================================================== */
'use strict';

/* ---------------------------------------------------------------------- *
 * ICONS — inline SVG, stroke-based, no icon-font/network dependency
 * ---------------------------------------------------------------------- */
const ICONS = {
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  'check-square': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  'file-text': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  'book-open': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  dollar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  hash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  'log-out': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
};
function icon(name) { return ICONS[name] || ''; }
function paintIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
}

/* ---------------------------------------------------------------------- *
 * STORE — namespaced localStorage wrapper with JSON (de)serialization
 * ---------------------------------------------------------------------- */
const Store = {
  prefix: 'humanos:',
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { console.warn('Store.get failed for', key, e); return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); return true; }
    catch (e) { console.warn('Store.set failed for', key, e); toast('Storage full or unavailable', 'danger'); return false; }
  },
  all() {
    const out = {};
    Object.keys(localStorage).filter(k => k.startsWith(this.prefix)).forEach(k => {
      out[k.slice(this.prefix.length)] = this.get(k.slice(this.prefix.length));
    });
    return out;
  },
  wipe() {
    Object.keys(localStorage).filter(k => k.startsWith(this.prefix)).forEach(k => localStorage.removeItem(k));
  }
};

/* ---------------------------------------------------------------------- *
 * AUTH — local-only sign up / log in gate. Still no server and nothing
 * ever leaves this device, but accounts now carry a username, an email,
 * and a password: passwords are salted and hashed with the Web Crypto
 * API (SHA-256, same primitive Vault Tools already uses) — never stored
 * or compared in plain text.
 * ---------------------------------------------------------------------- */
const Auth = {
  usersKey: 'users',
  activeKey: 'activeUser',
  list() { return Store.get(this.usersKey, []); },
  current() { return Store.get(this.activeKey, null); },
  uname(u) { return typeof u === 'string' ? u : u.username; },
  findByUsername(name) {
    const n = name.trim().toLowerCase();
    return this.list().find(u => this.uname(u).toLowerCase() === n);
  },
  findByEmail(email) {
    const e = email.trim().toLowerCase();
    if (!e) return null;
    return this.list().find(u => typeof u !== 'string' && (u.email || '').toLowerCase() === e);
  },
  findByIdentifier(identifier) {
    const id = identifier.trim().toLowerCase();
    return this.list().find(u => {
      const uname = this.uname(u).toLowerCase();
      const email = typeof u === 'string' ? '' : (u.email || '').toLowerCase();
      return uname === id || (email && email === id);
    });
  },
  genSalt() { return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join(''); },
  async hash(password, salt) { return sha(salt + ':' + password, 'SHA-256'); },
  async signup(username, email, password) {
    const cleanUser = username.trim();
    const cleanEmail = email.trim();
    if (this.findByUsername(cleanUser)) return { ok: false, error: 'That username is already taken — try Log In instead.' };
    if (this.findByEmail(cleanEmail)) return { ok: false, error: 'That email is already registered — try Log In instead.' };
    const salt = this.genSalt();
    const passwordHash = await this.hash(password, salt);
    const users = this.list();
    users.push({ username: cleanUser, email: cleanEmail, salt, passwordHash, createdAt: Date.now() });
    Store.set(this.usersKey, users);
    Store.set(this.activeKey, cleanUser);
    return { ok: true, username: cleanUser };
  },
  async login(identifier, password) {
    const user = this.findByIdentifier(identifier);
    if (!user) return { ok: false, error: 'No account found with that username or email — try Sign Up instead.' };
    if (typeof user === 'string') return { ok: false, error: 'This account predates passwords — please Sign Up again to set one.' };
    const candidateHash = await this.hash(password, user.salt);
    if (candidateHash !== user.passwordHash) return { ok: false, error: 'Incorrect password.' };
    Store.set(this.activeKey, user.username);
    return { ok: true, username: user.username };
  },
  logout() { localStorage.removeItem(Store.prefix + this.activeKey); }
};

function initAuthGate() {
  const overlay = document.getElementById('auth-overlay');
  const tabs = document.getElementById('auth-tabs');
  const form = document.getElementById('auth-form');
  const input = document.getElementById('auth-username');
  const usernameLabel = document.getElementById('auth-username-label');
  const emailField = document.getElementById('auth-email-field');
  const emailInput = document.getElementById('auth-email');
  const confirmField = document.getElementById('auth-confirm-field');
  const confirmInput = document.getElementById('auth-confirm');
  const passwordInput = document.getElementById('auth-password');
  const strengthWrap = document.getElementById('auth-strength');
  const strengthFill = document.createElement('div');
  strengthFill.className = 'auth-strength-fill';
  strengthWrap.appendChild(strengthFill);
  const errorEl = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');
  const accountName = document.getElementById('account-name');
  const accountPill = document.getElementById('account-pill');
  let mode = 'login';

  function paintAccount() {
    const user = Auth.current();
    if (accountName) accountName.textContent = user || '—';
  }

  function setMode(m) {
    mode = m;
    tabs.querySelectorAll('.auth-tab').forEach(b => {
      const active = b.dataset.tab === m;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    });
    const signup = m === 'signup';
    emailField.classList.toggle('is-hidden', !signup);
    confirmField.classList.toggle('is-hidden', !signup);
    strengthWrap.classList.toggle('is-hidden', !signup);
    usernameLabel.textContent = signup ? 'Username' : 'Username or email';
    passwordInput.autocomplete = signup ? 'new-password' : 'current-password';
    submitBtn.textContent = signup ? 'Sign Up' : 'Log In';
    errorEl.textContent = '';
  }

  function showError(msg) { errorEl.textContent = msg; }

  function showOverlay() {
    overlay.classList.remove('is-hidden');
    errorEl.textContent = '';
    form.reset();
    strengthFill.style.width = '0%';
    setTimeout(() => input.focus(), 50);
  }
  function hideOverlay() {
    overlay.classList.add('is-hidden');
    paintAccount();
  }

  tabs.addEventListener('click', e => {
    const btn = e.target.closest('.auth-tab');
    if (!btn) return;
    setMode(btn.dataset.tab);
    input.focus();
  });

  passwordInput.addEventListener('input', () => {
    if (mode !== 'signup') return;
    const r = assessStrength(passwordInput.value);
    strengthFill.style.width = r.score + '%';
    strengthFill.style.background = r.color;
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errorEl.textContent = '';
    const username = input.value.trim();
    const password = passwordInput.value;

    if (mode === 'signup') {
      const email = emailInput.value.trim();
      if (username.length < 2) return showError('Username needs at least 2 characters.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Enter a valid email address.');
      if (password.length < 8) return showError('Password needs at least 8 characters.');
      if (password !== confirmInput.value) return showError("Passwords don't match.");
      submitBtn.disabled = true;
      const result = await Auth.signup(username, email, password);
      submitBtn.disabled = false;
      if (!result.ok) return showError(result.error);
      hideOverlay();
      toast(`Welcome, ${result.username}!`, 'success');
    } else {
      if (username.length < 2) return showError('Enter your username or email.');
      if (!password) return showError('Enter your password.');
      submitBtn.disabled = true;
      const result = await Auth.login(username, password);
      submitBtn.disabled = false;
      if (!result.ok) return showError(result.error);
      hideOverlay();
      toast(`Welcome back, ${result.username}!`, 'success');
    }
  });

  if (accountPill) {
    accountPill.addEventListener('click', () => {
      Auth.logout();
      setMode('login');
      showOverlay();
    });
  }

  setMode('login');
  if (Auth.current()) hideOverlay(); else showOverlay();
}
initAuthGate();

/* ---------------------------------------------------------------------- *
 * UTILITIES
 * ---------------------------------------------------------------------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().slice(0, 10);
const escapeHtml = (s = '') => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function fmtDate(d) {
  const dt = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function fmtMoney(n) {
  const sign = n < 0 ? '-' : '';
  return sign + '$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function toast(msg, kind = 'default') {
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = 'toast';
  if (kind === 'danger') el.style.borderColor = 'var(--danger)';
  if (kind === 'success') el.style.borderColor = 'var(--success)';
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
}

function confirmModal({ title, body, confirmLabel = 'Confirm', danger = false }) {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">${escapeHtml(title)}</div>
        <div style="color:var(--text-muted);font-size:13px;">${escapeHtml(body || '')}</div>
        <div class="modal-actions">
          <button class="btn" data-act="cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop || e.target.dataset.act === 'cancel') { backdrop.remove(); resolve(false); }
      if (e.target.dataset.act === 'ok') { backdrop.remove(); resolve(true); }
    });
  });
}

/* ---------------------------------------------------------------------- *
 * CLOCK
 * ---------------------------------------------------------------------- */
function tickClock() {
  const el = document.getElementById('clock');
  const now = new Date();
  el.textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(tickClock, 1000); tickClock();

/* ---------------------------------------------------------------------- *
 * THEME
 * ---------------------------------------------------------------------- */
const THEMES = ['cyber', 'dark', 'light'];
const THEME_ICON = { cyber: 'zap', dark: 'moon', light: 'sun' };
const THEME_LABEL = { cyber: 'Cyber', dark: 'Dark', light: 'Light' };
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.getElementById('theme-label').textContent = THEME_LABEL[theme];
  document.querySelector('#theme-toggle .nav-icon').dataset.icon = THEME_ICON[theme];
  paintIcons(document.getElementById('theme-toggle'));
  Store.set('settings', { ...Store.get('settings', {}), theme });
}
document.getElementById('theme-toggle').addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme;
  const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
  applyTheme(next);
});

/* ---------------------------------------------------------------------- *
 * ROUTER / NAV
 * ---------------------------------------------------------------------- */
const Views = {}; // populated by each module: Views.tasks = () => htmlString
const ViewMount = {}; // optional post-render hook per view
const ViewUnmount = {}; // optional cleanup hook per view (timers, RAF loops, etc.)
let currentViewName = null;

/* ---------------------------------------------------------------------- *
 * GLOBAL VIEW HISTORY — powers the Back button and the edge-swipe-back
 * gesture in the topbar, for every view app-wide (not just one screen).
 * ---------------------------------------------------------------------- */
let viewHistory = [];
let isGoingBack = false;
function updateGlobalBackBtn() {
  const btn = document.getElementById('global-back-btn');
  if (btn) btn.classList.toggle('is-visible', viewHistory.length > 0);
}
function goBack() {
  const prev = viewHistory.pop();
  isGoingBack = true;
  renderView(prev || 'dashboard');
}

function renderView(name) {
  if (currentViewName && ViewUnmount[currentViewName]) { try { ViewUnmount[currentViewName](); } catch (e) { console.warn(e); } }
  // only record real forward navigation in history — a Back/swipe-back
  // navigation must NOT re-push the view being left, or Back would just
  // ping-pong between the last two views instead of walking back one by one
  if (!isGoingBack && currentViewName && currentViewName !== name) { viewHistory.push(currentViewName); if (viewHistory.length > 50) viewHistory.shift(); }
  isGoingBack = false;
  currentViewName = name;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === name));
  const content = document.getElementById('content');
  try {
    content.innerHTML = `<div class="view is-active">${Views[name] ? Views[name]() : '<p>Not found</p>'}</div>`;
    paintIcons(content);
    if (ViewMount[name]) ViewMount[name](content);
  } catch (err) {
    console.error(`SVBG module "${name}" failed to render:`, err);
    content.innerHTML = `
      <div class="module-error-boundary">
        <div class="module-error-title">SVBG MODULE UNAVAILABLE</div>
        <div class="module-error-body">Something went wrong while loading this module.</div>
        <div class="module-error-actions">
          <button class="btn btn-primary" id="module-error-retry">Retry</button>
          <button class="btn" id="module-error-home">Return to Mission Control</button>
        </div>
      </div>`;
    document.getElementById('module-error-retry')?.addEventListener('click', () => renderView(name));
    document.getElementById('module-error-home')?.addEventListener('click', () => renderView('mission'));
  }
  document.getElementById('sidebar').classList.remove('is-open');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) backdrop.classList.remove('is-open');
  location.hash = name;
  updateNavBadges();
  updateGlobalBackBtn();
}
document.getElementById('nav').addEventListener('click', e => {
  const btn = e.target.closest('.nav-item');
  if (btn) renderView(btn.dataset.view);
});
document.getElementById('global-back-btn')?.addEventListener('click', goBack);
(function bindGlobalSwipeGestures() {
  // Two gestures, app-wide, on every view:
  //  - swipe right, starting within EDGE px of the left edge -> go back one
  //    view (only makes sense while the sidebar drawer is closed)
  //  - swipe left, anywhere -> toggle the sidebar drawer open/closed
  // Attached to #content (normal state), plus #sidebar and #sidebar-backdrop
  // (which is what actually receives touches once the drawer is open and
  // sitting on top of #content), so closing works from either place.
  const content = document.getElementById('content');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!content || !sidebar) return;
  const EDGE = 24, THRESHOLD = 70, MAX_VERTICAL = 60;
  let startX = null, startY = null, edgeStart = false;
  function onStart(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    edgeStart = t.clientX <= EDGE;
    startX = t.clientX; startY = t.clientY;
  }
  function onEnd(e) {
    if (startX == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX, dy = Math.abs(t.clientY - startY);
    const wasEdgeStart = edgeStart;
    startX = null; startY = null; edgeStart = false;
    if (dy >= MAX_VERTICAL) return; // too much vertical drift — not a horizontal swipe
    const sidebarOpen = sidebar.classList.contains('is-open');
    if (dx > THRESHOLD && wasEdgeStart && !sidebarOpen && viewHistory.length > 0) { goBack(); return; }
    if (dx < -THRESHOLD) { setMobileNavOpen(!sidebarOpen); return; }
  }
  [content, sidebar, backdrop].forEach(el => {
    if (!el) return;
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
  });
})();
function setMobileNavOpen(open) {
  document.getElementById('sidebar').classList.toggle('is-open', open);
  document.getElementById('sidebar-backdrop').classList.toggle('is-open', open);
}
document.getElementById('mobile-nav-btn').addEventListener('click', () => {
  setMobileNavOpen(!document.getElementById('sidebar').classList.contains('is-open'));
});
document.getElementById('sidebar-backdrop').addEventListener('click', () => setMobileNavOpen(false));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('sidebar').classList.contains('is-open')) setMobileNavOpen(false);
});

function updateNavBadges() {
  const tasks = Store.get('tasks', []);
  const openCount = tasks.filter(t => !t.done).length;
  document.getElementById('badge-tasks').textContent = openCount > 0 ? openCount : '';
}

/* ======================================================================== *
 * DASHBOARD
 * ======================================================================== */
Views.dashboard = function () {
  const tasks = Store.get('tasks', []);
  const habits = Store.get('habits', []);
  const journal = Store.get('journal', []);
  const tx = Store.get('transactions', []);

  const todayTasks = tasks.filter(t => !t.done).slice(0, 5);
  const doneToday = tasks.filter(t => t.done && t.completedOn === todayStr()).length;

  const habitsDoneToday = habits.filter(h => h.history[todayStr()]).length;
  const habitScore = habits.length ? Math.round((habitsDoneToday / habits.length) * 100) : 0;

  const monthTx = tx.filter(t => t.date.slice(0, 7) === todayStr().slice(0, 7));
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const openTasksCount = tasks.filter(t => !t.done).length;
  const coreScore = Math.round(
    (habits.length ? habitsDoneToday / habits.length : 0) * 40 +
    (tasks.length ? tasks.filter(t=>t.done).length / tasks.length : 0) * 30 +
    (journal.some(j => j.date === todayStr()) ? 30 : 0)
  );
  setCoreRing(coreScore);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Still up?' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return `
    <div class="hero-card">
      <div>
        <div class="hero-greeting">${greeting}. Here's your system state.</div>
        <div class="hero-date">${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      <div class="hero-score">
        <div class="hero-score-value">${coreScore}%</div>
        <div class="hero-score-label">Daily core score</div>
      </div>
    </div>

    ${window.SVBGDailyMissionWidget ? `<div class="card" style="margin-bottom:20px;">${window.SVBGDailyMissionWidget()}</div>` : ''}

    <div class="grid grid-4" style="margin-bottom:20px;">
      <div class="card stat-card">
        <span class="stat-label">Open tasks</span>
        <span class="stat-value">${openTasksCount}</span>
        <span class="stat-hint">${doneToday} completed today</span>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Habits today</span>
        <span class="stat-value">${habitsDoneToday}/${habits.length}</span>
        <span class="stat-hint">${habitScore}% of routine done</span>
      </div>
      <div class="card stat-card">
        <span class="stat-label">This month</span>
        <span class="stat-value" style="color:${income - expense >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmtMoney(income - expense)}</span>
        <span class="stat-hint">${fmtMoney(income)} in &middot; ${fmtMoney(expense)} out</span>
      </div>
      <div class="card stat-card">
        <span class="stat-label">Journal</span>
        <span class="stat-value">${journal.length}</span>
        <span class="stat-hint">${journal.some(j=>j.date===todayStr()) ? 'Logged today' : 'Not logged today'}</span>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h3 style="margin-bottom:14px;font-size:15px;">Up next</h3>
        ${todayTasks.length ? `<div class="list">${todayTasks.map(taskRowHtml).join('')}</div>` :
          `<div class="empty-state"><span class="nav-icon" data-icon="check-square"></span><span class="empty-state-title">Nothing pending</span><span>Add a task to get moving.</span></div>`}
      </div>
      <div class="card">
        <h3 style="margin-bottom:14px;font-size:15px;">Habit streaks</h3>
        ${habits.length ? `<div class="list">${habits.slice(0,5).map(h => habitMiniRow(h)).join('')}</div>` :
          `<div class="empty-state"><span class="nav-icon" data-icon="activity"></span><span class="empty-state-title">No habits yet</span><span>Track something daily.</span></div>`}
      </div>
    </div>
  `;
};

function setCoreRing(pct) {
  const ring = document.getElementById('core-progress');
  const circumference = 106.8;
  const offset = circumference - (Math.max(0,Math.min(100,pct)) / 100) * circumference;
  if (ring) ring.style.strokeDashoffset = offset;
  const label = document.getElementById('core-score-label');
  if (label) label.textContent = `core ${pct}%`;
}

function habitMiniRow(h) {
  const streak = calcStreak(h.history);
  return `<div class="list-row"><div class="list-row-body"><div class="list-row-title">${escapeHtml(h.name)}</div></div>
    <span class="streak-flame">${streak > 0 ? `<span style="display:inline-flex;width:13px;vertical-align:-2px;" data-icon="flame"></span> ${streak}d` : '—'}</span></div>`;
}

function calcStreak(history) {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = daysAgo(i);
    if (history[d]) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

/* ======================================================================== *
 * TASKS
 * ======================================================================== */
const TaskState = { filter: 'open' };

function taskRowHtml(t) {
  const overdue = t.due && !t.done && t.due < todayStr();
  return `
  <div class="list-row ${t.done ? 'is-done' : ''}" data-id="${t.id}">
    <div class="checkbox task-toggle ${t.done ? 'is-checked' : ''}" data-icon-inline>${t.done ? icon('check') : ''}</div>
    <div class="list-row-body">
      <div class="list-row-title">${escapeHtml(t.title)}</div>
      <div class="list-row-meta">
        ${t.due ? `<span class="${overdue ? 'chip chip-danger' : ''}">${overdue ? 'Overdue &middot; ' : ''}${fmtDate(t.due)}</span>` : ''}
        <span class="chip ${t.priority === 'high' ? 'chip-danger' : t.priority === 'med' ? 'chip-warning' : ''}">${t.priority}</span>
      </div>
    </div>
    <div class="list-row-actions">
      <button class="btn btn-icon btn-ghost task-delete" data-icon="trash" title="Delete"></button>
    </div>
  </div>`;
}

Views.tasks = function () {
  const all = Store.get('tasks', []);
  let list = all;
  if (TaskState.filter === 'open') list = all.filter(t => !t.done);
  if (TaskState.filter === 'done') list = all.filter(t => t.done);
  list = [...list].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    const pOrder = { high: 0, med: 1, low: 2 };
    if (a.due !== b.due) return (a.due || '9999') < (b.due || '9999') ? -1 : 1;
    return pOrder[a.priority] - pOrder[b.priority];
  });

  return `
    <div class="view-header">
      <div><div class="view-title">Tasks</div><div class="view-sub">${all.filter(t=>!t.done).length} open &middot; ${all.filter(t=>t.done).length} completed</div></div>
      <button class="btn btn-primary" id="task-add-btn"><span class="nav-icon" data-icon="plus"></span>New task</button>
    </div>
    <div class="tool-tabs">
      <button class="tool-tab btn ${TaskState.filter==='open'?'is-active':''}" data-filter="open">Open</button>
      <button class="tool-tab btn ${TaskState.filter==='all'?'is-active':''}" data-filter="all">All</button>
      <button class="tool-tab btn ${TaskState.filter==='done'?'is-active':''}" data-filter="done">Completed</button>
    </div>
    <div class="card">
      ${list.length ? `<div class="list">${list.map(taskRowHtml).join('')}</div>` :
        `<div class="empty-state"><span class="nav-icon" data-icon="check-square"></span><span class="empty-state-title">Nothing here</span><span>Add a task to fill this list.</span></div>`}
    </div>
  `;
};

function taskFormModal(existing) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-title">${existing ? 'Edit task' : 'New task'}</div>
      <div class="field"><label>Title</label><input type="text" id="tf-title" value="${existing ? escapeHtml(existing.title) : ''}" placeholder="What needs doing?" /></div>
      <div class="field-row">
        <div class="field"><label>Due date</label><input type="date" id="tf-due" value="${existing?.due || ''}" /></div>
        <div class="field"><label>Priority</label>
          <select id="tf-priority">
            <option value="low" ${existing?.priority==='low'?'selected':''}>Low</option>
            <option value="med" ${!existing || existing?.priority==='med'?'selected':''}>Medium</option>
            <option value="high" ${existing?.priority==='high'?'selected':''}>High</option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn btn-primary" data-act="save">Save task</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  paintIcons(backdrop);
  backdrop.querySelector('#tf-title').focus();
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop || e.target.dataset.act === 'cancel') backdrop.remove();
    if (e.target.dataset.act === 'save') {
      const title = backdrop.querySelector('#tf-title').value.trim();
      if (!title) { toast('Give the task a title'); return; }
      const tasks = Store.get('tasks', []);
      if (existing) {
        const t = tasks.find(x => x.id === existing.id);
        Object.assign(t, { title, due: backdrop.querySelector('#tf-due').value, priority: backdrop.querySelector('#tf-priority').value });
      } else {
        tasks.push({ id: uid(), title, due: backdrop.querySelector('#tf-due').value, priority: backdrop.querySelector('#tf-priority').value, done: false, createdAt: Date.now() });
      }
      Store.set('tasks', tasks);
      backdrop.remove();
      renderView('tasks');
      toast(existing ? 'Task updated' : 'Task added', 'success');
    }
  });
}

ViewMount.tasks = function (root) {
  root.querySelector('#task-add-btn').addEventListener('click', () => taskFormModal());
  root.querySelectorAll('.tool-tab').forEach(b => b.addEventListener('click', () => { TaskState.filter = b.dataset.filter; renderView('tasks'); }));
  root.querySelectorAll('.task-toggle').forEach(el => el.addEventListener('click', () => {
    const id = el.closest('.list-row').dataset.id;
    const tasks = Store.get('tasks', []);
    const t = tasks.find(x => x.id === id);
    t.done = !t.done;
    t.completedOn = t.done ? todayStr() : null;
    Store.set('tasks', tasks);
    if (t.done) window.SVBGLabsExt?.award(10, 'Task completed');
    window.SVBGLabsExt?.pulse();
    renderView('tasks');
  }));
  root.querySelectorAll('.task-delete').forEach(el => el.addEventListener('click', async () => {
    const id = el.closest('.list-row').dataset.id;
    if (!(await confirmModal({ title: 'Delete task?', body: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
    Store.set('tasks', Store.get('tasks', []).filter(x => x.id !== id));
    renderView('tasks');
    toast('Task deleted');
  }));
};

/* ======================================================================== *
 * NOTES
 * ======================================================================== */
const NotesState = { activeId: null, query: '' };

Views.notes = function () {
  const notes = Store.get('notes', []).sort((a, b) => b.updatedAt - a.updatedAt);
  const filtered = NotesState.query
    ? notes.filter(n => (n.title + ' ' + n.body).toLowerCase().includes(NotesState.query.toLowerCase()))
    : notes;
  if (!NotesState.activeId && filtered.length) NotesState.activeId = filtered[0].id;
  const active = notes.find(n => n.id === NotesState.activeId);

  return `
    <div class="view-header">
      <div><div class="view-title">Notes</div><div class="view-sub">${notes.length} note${notes.length===1?'':'s'}</div></div>
      <button class="btn btn-primary" id="note-add-btn"><span class="nav-icon" data-icon="plus"></span>New note</button>
    </div>
    <div class="grid grid-2">
      <div class="card" style="padding:12px;">
        <div style="padding:6px 6px 12px;"><input type="text" id="note-search" placeholder="Filter notes..." value="${escapeHtml(NotesState.query)}" /></div>
        ${filtered.length ? `<div class="list">${filtered.map(n => `
          <div class="list-row note-row ${n.id===NotesState.activeId?'is-done':''}" data-id="${n.id}" style="cursor:pointer;${n.id===NotesState.activeId?'border-color:var(--accent);opacity:1;':''}">
            <div class="list-row-body">
              <div class="list-row-title">${escapeHtml(n.title || 'Untitled')}</div>
              <div class="list-row-meta"><span>${new Date(n.updatedAt).toLocaleDateString()}</span></div>
            </div>
          </div>`).join('')}</div>` :
          `<div class="empty-state"><span class="nav-icon" data-icon="file-text"></span><span class="empty-state-title">No notes yet</span></div>`}
      </div>
      <div class="card">
        ${active ? `
          <input type="text" id="note-title" value="${escapeHtml(active.title)}" placeholder="Note title" style="font-family:var(--font-display);font-weight:700;font-size:16px;border:none;background:none;padding:4px 0;margin-bottom:10px;" />
          <textarea id="note-body" placeholder="Start writing... (Markdown-friendly, plain text stored)" rows="16">${escapeHtml(active.body)}</textarea>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
            <span style="font-size:11px;color:var(--text-faint);">Autosaves as you type</span>
            <button class="btn btn-danger btn-sm" id="note-delete-btn"><span class="nav-icon" data-icon="trash"></span>Delete</button>
          </div>
        ` : `<div class="empty-state"><span class="nav-icon" data-icon="file-text"></span><span class="empty-state-title">Select or create a note</span></div>`}
      </div>
    </div>
  `;
};

ViewMount.notes = function (root) {
  root.querySelector('#note-add-btn').addEventListener('click', () => {
    const notes = Store.get('notes', []);
    const n = { id: uid(), title: 'Untitled', body: '', updatedAt: Date.now() };
    notes.push(n);
    Store.set('notes', notes);
    window.SVBGLabsExt?.award(5, 'Note created');
    NotesState.activeId = n.id;
    renderView('notes');
  });
  const search = root.querySelector('#note-search');
  if (search) search.addEventListener('input', debounce(e => { NotesState.query = e.target.value; renderView('notes'); }, 200));
  root.querySelectorAll('.note-row').forEach(el => el.addEventListener('click', () => { NotesState.activeId = el.dataset.id; renderView('notes'); }));

  const titleInput = root.querySelector('#note-title');
  const bodyInput = root.querySelector('#note-body');
  const saveNote = debounce(() => {
    const notes = Store.get('notes', []);
    const n = notes.find(x => x.id === NotesState.activeId);
    if (!n) return;
    n.title = titleInput.value;
    n.body = bodyInput.value;
    n.updatedAt = Date.now();
    Store.set('notes', notes);
    // update sidebar list titles without full rerender to keep cursor focus
    const row = root.querySelector(`.note-row[data-id="${n.id}"] .list-row-title`);
    if (row) row.textContent = n.title || 'Untitled';
  }, 350);
  if (titleInput) titleInput.addEventListener('input', saveNote);
  if (bodyInput) bodyInput.addEventListener('input', saveNote);

  const delBtn = root.querySelector('#note-delete-btn');
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (!(await confirmModal({ title: 'Delete note?', body: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
    Store.set('notes', Store.get('notes', []).filter(x => x.id !== NotesState.activeId));
    NotesState.activeId = null;
    renderView('notes');
    toast('Note deleted');
  });
};

/* ======================================================================== *
 * JOURNAL
 * ======================================================================== */
const MOODS = [
  { key: 'great', emoji: 'GR', color: 'var(--success)' },
];
const MOOD_DEFS = ['Great', 'Good', 'Okay', 'Low', 'Rough'];

Views.journal = function () {
  const entries = Store.get('journal', []).sort((a, b) => b.createdAt - a.createdAt);
  const todays = entries.find(e => e.date === todayStr());

  return `
    <div class="view-header">
      <div><div class="view-title">Journal</div><div class="view-sub">${entries.length} entr${entries.length===1?'y':'ies'}</div></div>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <h3 style="font-size:14px;margin-bottom:12px;">${todays ? "Today's entry" : "How was today?"}</h3>
      <div class="field-row" style="margin-bottom:12px;flex-wrap:wrap;">
        ${MOOD_DEFS.map(m => `<button class="btn btn-sm mood-btn ${todays?.mood===m?'is-active':''}" data-mood="${m}" style="${todays?.mood===m?'border-color:var(--accent);color:var(--accent);':''}">${m}</button>`).join('')}
      </div>
      <textarea id="journal-body" placeholder="Write freely. This stays on this device only." rows="5">${todays ? escapeHtml(todays.body) : ''}</textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:10px;">
        <button class="btn btn-primary" id="journal-save-btn"><span class="nav-icon" data-icon="check"></span>${todays ? 'Update entry' : 'Save entry'}</button>
      </div>
    </div>
    <div class="list">
      ${entries.filter(e => e.date !== todayStr()).map(e => `
        <div class="list-row" style="align-items:flex-start;" data-id="${e.id}">
          <div class="list-row-body">
            <div class="list-row-meta" style="margin-top:0;margin-bottom:4px;"><span class="chip chip-accent">${e.mood || '—'}</span><span>${fmtDate(e.date)}</span></div>
            <div style="font-size:13px;color:var(--text-muted);white-space:pre-wrap;">${escapeHtml(e.body).slice(0,240)}${e.body.length>240?'…':''}</div>
          </div>
          <button class="btn btn-icon btn-ghost journal-delete" data-icon="trash"></button>
        </div>`).join('') || `<div class="empty-state"><span class="nav-icon" data-icon="book-open"></span><span class="empty-state-title">No past entries</span></div>`}
    </div>
  `;
};

ViewMount.journal = function (root) {
  let selectedMood = (Store.get('journal', []).find(e => e.date === todayStr()) || {}).mood || null;
  root.querySelectorAll('.mood-btn').forEach(b => b.addEventListener('click', () => {
    selectedMood = b.dataset.mood;
    root.querySelectorAll('.mood-btn').forEach(x => { x.classList.remove('is-active'); x.style.borderColor=''; x.style.color=''; });
    b.classList.add('is-active'); b.style.borderColor = 'var(--accent)'; b.style.color = 'var(--accent)';
  }));
  root.querySelector('#journal-save-btn').addEventListener('click', () => {
    const body = root.querySelector('#journal-body').value.trim();
    if (!body && !selectedMood) { toast('Write something or pick a mood first'); return; }
    const entries = Store.get('journal', []);
    let e = entries.find(x => x.date === todayStr());
    if (e) { e.body = body; e.mood = selectedMood; }
    else { entries.push({ id: uid(), date: todayStr(), body, mood: selectedMood, createdAt: Date.now() }); window.SVBGLabsExt?.award(15, 'Journal entry logged'); window.SVBGLabsExt?.pulse(); }
    Store.set('journal', entries);
    renderView('journal');
    toast('Journal saved', 'success');
  });
  root.querySelectorAll('.journal-delete').forEach(el => el.addEventListener('click', async () => {
    const id = el.closest('.list-row').dataset.id;
    if (!(await confirmModal({ title: 'Delete entry?', confirmLabel: 'Delete', danger: true }))) return;
    Store.set('journal', Store.get('journal', []).filter(x => x.id !== id));
    renderView('journal');
  }));
};

/* ======================================================================== *
 * HABITS
 * ======================================================================== */
function habitFormModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-title">New habit</div>
      <div class="field"><label>Name</label><input type="text" id="hf-name" placeholder='e.g. "Drink water", "Read 10 pages"' maxlength="60" /></div>
      <div class="modal-actions">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn btn-primary" data-act="save">Add habit</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  paintIcons(backdrop);
  const nameInput = backdrop.querySelector('#hf-name');
  nameInput.focus();
  function save() {
    const name = nameInput.value.trim();
    if (!name) { toast('Give the habit a name'); nameInput.focus(); return; }
    const habits = Store.get('habits', []);
    habits.push({ id: uid(), name, history: {}, createdAt: Date.now() });
    Store.set('habits', habits);
    backdrop.remove();
    renderView('habits');
    toast('Habit added', 'success');
  }
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop || e.target.dataset.act === 'cancel') backdrop.remove();
    if (e.target.dataset.act === 'save') save();
  });
}

Views.habits = function () {
  const habits = Store.get('habits', []);
  const last7 = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));

  return `
    <div class="view-header">
      <div><div class="view-title">Habits</div><div class="view-sub">${habits.length} tracked</div></div>
      <button class="btn btn-primary" id="habit-add-btn"><span class="nav-icon" data-icon="plus"></span>New habit</button>
    </div>
    <div class="card">
      ${habits.length ? `<div class="list">${habits.map(h => `
        <div class="list-row habit-row" data-id="${h.id}">
          <div class="list-row-body">
            <div class="list-row-title">${escapeHtml(h.name)}</div>
            <div class="list-row-meta"><span class="streak-flame"><span style="display:inline-flex;width:12px;vertical-align:-2px;" data-icon="flame"></span> ${calcStreak(h.history)} day streak</span></div>
          </div>
          <div class="habit-dots">
            ${last7.map(d => `<div class="habit-dot ${h.history[d] ? 'is-filled' : ''}" data-day="${d}" title="${d}" style="cursor:pointer;"></div>`).join('')}
          </div>
          <button class="btn btn-icon btn-ghost habit-delete" data-icon="trash"></button>
        </div>`).join('')}</div>` :
        `<div class="empty-state"><span class="nav-icon" data-icon="activity"></span><span class="empty-state-title">No habits yet</span><span>Track water, reading, exercise — anything daily.</span></div>`}
    </div>
  `;
};

ViewMount.habits = function (root) {
  root.querySelector('#habit-add-btn').addEventListener('click', () => habitFormModal());
  root.querySelectorAll('.habit-dot').forEach(el => el.addEventListener('click', () => {
    const id = el.closest('.habit-row').dataset.id;
    const day = el.dataset.day;
    const habits = Store.get('habits', []);
    const h = habits.find(x => x.id === id);
    const wasChecked = !!h.history[day];
    if (wasChecked) delete h.history[day]; else h.history[day] = true;
    Store.set('habits', habits);
    if (!wasChecked && day === todayStr()) { window.SVBGLabsExt?.award(8, 'Habit checked in'); window.SVBGLabsExt?.pulse(); }
    renderView('habits');
  }));
  root.querySelectorAll('.habit-delete').forEach(el => el.addEventListener('click', async () => {
    const id = el.closest('.habit-row').dataset.id;
    if (!(await confirmModal({ title: 'Delete habit?', confirmLabel: 'Delete', danger: true }))) return;
    Store.set('habits', Store.get('habits', []).filter(x => x.id !== id));
    renderView('habits');
  }));
};

/* ======================================================================== *
 * POMODORO / FOCUS TIMER
 * ======================================================================== */
const PomoState = {
  modes: { focus: 25 * 60, short: 5 * 60, long: 15 * 60 },
  mode: 'focus',
  remaining: 25 * 60,
  running: false,
  intervalId: null,
  sessionsToday: Store.get('pomoSessions', {})[todayStr()] || 0,
};

function pomoCircumference() { return 2 * Math.PI * 118; }

Views.pomodoro = function () {
  const c = pomoCircumference();
  return `
    <div class="view-header"><div><div class="view-title">Focus Timer</div><div class="view-sub">${PomoState.sessionsToday} focus session${PomoState.sessionsToday===1?'':'s'} completed today</div></div></div>
    <div class="card">
      <div class="pomo-wrap">
        <div class="pomo-modes">
          <button class="btn pomo-mode-btn ${PomoState.mode==='focus'?'is-active':''}" data-mode="focus">Focus 25</button>
          <button class="btn pomo-mode-btn ${PomoState.mode==='short'?'is-active':''}" data-mode="short">Short break 5</button>
          <button class="btn pomo-mode-btn ${PomoState.mode==='long'?'is-active':''}" data-mode="long">Long break 15</button>
        </div>
        <div class="pomo-ring-wrap">
          <svg viewBox="0 0 260 260">
            <circle class="pomo-track" cx="130" cy="130" r="118"></circle>
            <circle class="pomo-progress" id="pomo-ring" cx="130" cy="130" r="118" stroke-dasharray="${c}" stroke-dashoffset="0"></circle>
          </svg>
          <div class="pomo-time">
            <div class="pomo-time-value" id="pomo-display">${fmtClock(PomoState.remaining)}</div>
            <div class="pomo-time-label">${PomoState.mode === 'focus' ? 'Focus' : PomoState.mode === 'short' ? 'Short break' : 'Long break'}</div>
          </div>
        </div>
        <div class="pomo-controls">
          <button class="btn btn-primary" id="pomo-toggle"><span class="nav-icon" data-icon="${PomoState.running ? 'pause' : 'play'}"></span>${PomoState.running ? 'Pause' : 'Start'}</button>
          <button class="btn" id="pomo-reset"><span class="nav-icon" data-icon="refresh"></span>Reset</button>
        </div>
      </div>
    </div>
  `;
};

function fmtClock(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

function pomoUpdateDom() {
  const display = document.getElementById('pomo-display');
  const ring = document.getElementById('pomo-ring');
  if (!display || !ring) return;
  display.textContent = fmtClock(PomoState.remaining);
  const total = PomoState.modes[PomoState.mode];
  const c = pomoCircumference();
  ring.style.strokeDashoffset = c * (1 - PomoState.remaining / total);
}

function pomoTick() {
  PomoState.remaining--;
  if (PomoState.remaining <= 0) {
    clearInterval(PomoState.intervalId);
    PomoState.running = false;
    if (PomoState.mode === 'focus') {
      const sessions = Store.get('pomoSessions', {});
      sessions[todayStr()] = (sessions[todayStr()] || 0) + 1;
      Store.set('pomoSessions', sessions);
      PomoState.sessionsToday = sessions[todayStr()];
      window.SVBGLabsExt?.award(20, 'Focus session completed');
      window.SVBGLabsExt?.pulse();
      toast('Focus session complete. Take a break.', 'success');
    } else {
      toast('Break over. Ready to focus?', 'success');
    }
    PomoState.remaining = PomoState.modes[PomoState.mode];
    renderView('pomodoro');
    return;
  }
  pomoUpdateDom();
}

ViewMount.pomodoro = function (root) {
  root.querySelectorAll('.pomo-mode-btn').forEach(b => b.addEventListener('click', () => {
    clearInterval(PomoState.intervalId);
    PomoState.running = false;
    PomoState.mode = b.dataset.mode;
    PomoState.remaining = PomoState.modes[b.dataset.mode];
    renderView('pomodoro');
  }));
  root.querySelector('#pomo-toggle').addEventListener('click', () => {
    PomoState.running = !PomoState.running;
    if (PomoState.running) {
      PomoState.intervalId = setInterval(pomoTick, 1000);
    } else {
      clearInterval(PomoState.intervalId);
    }
    renderView('pomodoro');
  });
  root.querySelector('#pomo-reset').addEventListener('click', () => {
    clearInterval(PomoState.intervalId);
    PomoState.running = false;
    PomoState.remaining = PomoState.modes[PomoState.mode];
    renderView('pomodoro');
  });
};

/* ======================================================================== *
 * FINANCE (income / expense tracker + budget breakdown)
 * ======================================================================== */
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Housing', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Investment', 'Other'];

Views.finance = function () {
  const tx = Store.get('transactions', []).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const monthKey = todayStr().slice(0, 7);
  const monthTx = tx.filter(t => t.date.slice(0, 7) === monthKey);
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const byCat = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const maxCat = Math.max(1, ...Object.values(byCat));

  return `
    <div class="view-header">
      <div><div class="view-title">Finance</div><div class="view-sub">Tracking ${new Date().toLocaleDateString(undefined,{month:'long', year:'numeric'})}</div></div>
      <button class="btn btn-primary" id="tx-add-btn"><span class="nav-icon" data-icon="plus"></span>Add transaction</button>
    </div>
    <div class="grid grid-3" style="margin-bottom:20px;">
      <div class="card stat-card"><span class="stat-label">Income</span><span class="stat-value" style="color:var(--success)">${fmtMoney(income)}</span></div>
      <div class="card stat-card"><span class="stat-label">Expenses</span><span class="stat-value" style="color:var(--danger)">${fmtMoney(expense)}</span></div>
      <div class="card stat-card"><span class="stat-label">Net</span><span class="stat-value">${fmtMoney(income - expense)}</span></div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:14px;">Recent transactions</h3>
        ${tx.length ? `<div class="list">${tx.slice(0, 12).map(t => `
          <div class="list-row" data-id="${t.id}">
            <div class="list-row-body">
              <div class="list-row-title">${escapeHtml(t.note || t.category)}</div>
              <div class="list-row-meta"><span class="chip">${t.category}</span><span>${fmtDate(t.date)}</span></div>
            </div>
            <div class="${t.type === 'income' ? 'tx-amount-in' : 'tx-amount-out'}">${t.type === 'income' ? '+' : '−'}${fmtMoney(t.amount)}</div>
            <button class="btn btn-icon btn-ghost tx-delete" data-icon="trash"></button>
          </div>`).join('')}</div>` : `<div class="empty-state"><span class="nav-icon" data-icon="dollar"></span><span class="empty-state-title">No transactions yet</span></div>`}
      </div>
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:14px;">Spending by category</h3>
        ${Object.keys(byCat).length ? Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat, amt]) => `
          <div class="cat-row">
            <span class="cat-label">${cat}</span>
            <div class="bar-track" style="flex:1;"><div class="bar-fill" style="width:${(amt/maxCat)*100}%;"></div></div>
            <span class="cat-amount">${fmtMoney(amt)}</span>
          </div>`).join('') : `<div class="empty-state"><span class="nav-icon" data-icon="dollar"></span><span class="empty-state-title">No expenses this month</span></div>`}
      </div>
    </div>
  `;
};

function txFormModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-title">Add transaction</div>
      <div class="field-row" style="margin-bottom:12px;">
        <button class="btn btn-sm tx-type-btn is-active" data-type="expense" style="border-color:var(--danger);color:var(--danger);">Expense</button>
        <button class="btn btn-sm tx-type-btn" data-type="income">Income</button>
      </div>
      <div class="field"><label>Amount</label><input type="number" id="tx-amount" step="0.01" min="0" placeholder="0.00" /></div>
      <div class="field"><label>Category</label><select id="tx-category">${EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Note (optional)</label><input type="text" id="tx-note" placeholder="What was it for?" /></div>
      <div class="field"><label>Date</label><input type="date" id="tx-date" value="${todayStr()}" /></div>
      <div class="modal-actions">
        <button class="btn" data-act="cancel">Cancel</button>
        <button class="btn btn-primary" data-act="save">Add</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  let type = 'expense';
  const catSelect = backdrop.querySelector('#tx-category');
  backdrop.querySelectorAll('.tx-type-btn').forEach(b => b.addEventListener('click', () => {
    type = b.dataset.type;
    backdrop.querySelectorAll('.tx-type-btn').forEach(x => { x.classList.remove('is-active'); x.style.borderColor=''; x.style.color=''; });
    b.classList.add('is-active');
    b.style.borderColor = type === 'income' ? 'var(--success)' : 'var(--danger)';
    b.style.color = type === 'income' ? 'var(--success)' : 'var(--danger)';
    catSelect.innerHTML = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => `<option>${c}</option>`).join('');
  }));
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop || e.target.dataset.act === 'cancel') backdrop.remove();
    if (e.target.dataset.act === 'save') {
      const amount = parseFloat(backdrop.querySelector('#tx-amount').value);
      if (!amount || amount <= 0) { toast('Enter a valid amount'); return; }
      const tx = Store.get('transactions', []);
      tx.push({
        id: uid(), type, amount, category: catSelect.value,
        note: backdrop.querySelector('#tx-note').value.trim(),
        date: backdrop.querySelector('#tx-date').value || todayStr(),
        createdAt: Date.now(),
      });
      Store.set('transactions', tx);
      window.SVBGLabsExt?.award(3, 'Transaction logged');
      backdrop.remove();
      renderView('finance');
      toast('Transaction added', 'success');
    }
  });
}

ViewMount.finance = function (root) {
  root.querySelector('#tx-add-btn').addEventListener('click', txFormModal);
  root.querySelectorAll('.tx-delete').forEach(el => el.addEventListener('click', async () => {
    const id = el.closest('.list-row').dataset.id;
    if (!(await confirmModal({ title: 'Delete transaction?', confirmLabel: 'Delete', danger: true }))) return;
    Store.set('transactions', Store.get('transactions', []).filter(x => x.id !== id));
    renderView('finance');
  }));
};

/* ======================================================================== *
 * BOOKMARKS
 * ======================================================================== */
Views.bookmarks = function () {
  const marks = Store.get('bookmarks', []).sort((a, b) => b.createdAt - a.createdAt);
  return `
    <div class="view-header">
      <div><div class="view-title">Bookmarks</div><div class="view-sub">${marks.length} saved link${marks.length===1?'':'s'}</div></div>
      <button class="btn btn-primary" id="bm-add-btn"><span class="nav-icon" data-icon="plus"></span>Save link</button>
    </div>
    <div class="grid grid-3">
      ${marks.length ? marks.map(b => `
        <div class="card" data-id="${b.id}" style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="nav-icon" data-icon="link" style="color:var(--accent);width:15px;"></span>
            <a href="${escapeHtml(b.url)}" target="_blank" rel="noopener noreferrer" style="font-weight:600;font-size:13.5px;color:var(--text);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(b.title)}</a>
          </div>
          <div style="font-size:11.5px;color:var(--text-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(b.url)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
            <div>${(b.tags||[]).map(t => `<span class="chip" style="margin-right:4px;">${escapeHtml(t)}</span>`).join('')}</div>
            <button class="btn btn-icon btn-ghost bm-delete" data-icon="trash"></button>
          </div>
        </div>`).join('') : `<div class="empty-state" style="grid-column:1/-1;"><span class="nav-icon" data-icon="bookmark"></span><span class="empty-state-title">No bookmarks yet</span></div>`}
    </div>
  `;
};

ViewMount.bookmarks = function (root) {
  root.querySelector('#bm-add-btn').addEventListener('click', () => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Save a link</div>
        <div class="field"><label>Title</label><input type="text" id="bm-title" placeholder="Page title" /></div>
        <div class="field"><label>URL</label><input type="text" id="bm-url" placeholder="https://..." /></div>
        <div class="field"><label>Tags (comma separated)</label><input type="text" id="bm-tags" placeholder="reference, reading" /></div>
        <div class="modal-actions"><button class="btn" data-act="cancel">Cancel</button><button class="btn btn-primary" data-act="save">Save</button></div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop || e.target.dataset.act === 'cancel') backdrop.remove();
      if (e.target.dataset.act === 'save') {
        let url = backdrop.querySelector('#bm-url').value.trim();
        const title = backdrop.querySelector('#bm-title').value.trim() || url;
        if (!url) { toast('A URL is required'); return; }
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        const tags = backdrop.querySelector('#bm-tags').value.split(',').map(t => t.trim()).filter(Boolean);
        const marks = Store.get('bookmarks', []);
        marks.push({ id: uid(), title, url, tags, createdAt: Date.now() });
        window.SVBGLabsExt?.award(5, 'Bookmark saved');
        Store.set('bookmarks', marks);
        backdrop.remove();
        renderView('bookmarks');
        toast('Bookmark saved', 'success');
      }
    });
  });
  root.querySelectorAll('.bm-delete').forEach(el => el.addEventListener('click', async () => {
    const id = el.closest('.card').dataset.id;
    if (!(await confirmModal({ title: 'Delete bookmark?', confirmLabel: 'Delete', danger: true }))) return;
    Store.set('bookmarks', Store.get('bookmarks', []).filter(x => x.id !== id));
    renderView('bookmarks');
  }));
};

/* ======================================================================== *
 * VAULT TOOLS — password generator/checker, hashing, base64, JWT decoder
 * All computation happens locally via the Web Crypto API. Nothing leaves
 * the browser, and no plaintext secret is ever persisted to Store.
 * ======================================================================== */
const VaultState = { tab: 'generator' };

Views.vault = function () {
  return `
    <div class="view-header"><div><div class="view-title">Vault Tools</div><div class="view-sub">Runs entirely in-browser. Nothing is stored or transmitted.</div></div></div>
    <div class="tool-tabs">
      <button class="tool-tab btn ${VaultState.tab==='generator'?'is-active':''}" data-tab="generator">Password generator</button>
      <button class="tool-tab btn ${VaultState.tab==='strength'?'is-active':''}" data-tab="strength">Strength checker</button>
      <button class="tool-tab btn ${VaultState.tab==='hash'?'is-active':''}" data-tab="hash">Hash generator</button>
      <button class="tool-tab btn ${VaultState.tab==='base64'?'is-active':''}" data-tab="base64">Base64</button>
      <button class="tool-tab btn ${VaultState.tab==='jwt'?'is-active':''}" data-tab="jwt">JWT decoder</button>
    </div>

    <div class="card tool-panel ${VaultState.tab==='generator'?'is-active':''}" data-panel="generator">
      <div class="mono-box" id="pw-output" style="font-size:18px;text-align:center;margin-bottom:16px;">Click generate</div>
      <div class="field"><label>Length: <span id="pw-length-val">16</span></label><input type="range" id="pw-length" min="6" max="64" value="16" /></div>
      <div class="grid grid-4" style="margin-bottom:16px;">
        <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="pw-upper" checked style="width:auto;" /> A-Z</label>
        <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="pw-lower" checked style="width:auto;" /> a-z</label>
        <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="pw-nums" checked style="width:auto;" /> 0-9</label>
        <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" id="pw-symbols" checked style="width:auto;" /> !@#$</label>
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" id="pw-generate"><span class="nav-icon" data-icon="refresh"></span>Generate</button>
        <button class="btn" id="pw-copy">Copy</button>
      </div>
    </div>

    <div class="card tool-panel ${VaultState.tab==='strength'?'is-active':''}" data-panel="strength">
      <div class="field"><label>Test a password</label><input type="password" id="strength-input" placeholder="Type a password to evaluate" /></div>
      <div class="strength-bar"><div class="strength-fill" id="strength-fill"></div></div>
      <div id="strength-label" style="margin-top:8px;font-weight:600;font-size:13px;">Enter a password above</div>
      <ul id="strength-notes" style="margin:10px 0 0;padding-left:18px;color:var(--text-muted);font-size:12.5px;"></ul>
    </div>

    <div class="card tool-panel ${VaultState.tab==='hash'?'is-active':''}" data-panel="hash">
      <div class="field"><label>Text to hash</label><textarea id="hash-input" rows="4" placeholder="Enter text..."></textarea></div>
      <div class="field"><label>Algorithm</label><select id="hash-algo"><option value="SHA-256">SHA-256</option><option value="SHA-1">SHA-1</option><option value="SHA-512">SHA-512</option></select></div>
      <button class="btn btn-primary" id="hash-generate" style="margin-bottom:14px;">Generate hash</button>
      <div class="mono-box" id="hash-output">—</div>
    </div>

    <div class="card tool-panel ${VaultState.tab==='base64'?'is-active':''}" data-panel="base64">
      <div class="grid grid-2">
        <div>
          <label>Plain text</label>
          <textarea id="b64-plain" rows="6" placeholder="Type text to encode..."></textarea>
        </div>
        <div>
          <label>Base64</label>
          <textarea id="b64-encoded" rows="6" placeholder="Or paste Base64 to decode..."></textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button class="btn btn-primary" id="b64-encode">Encode &rarr;</button>
        <button class="btn btn-primary" id="b64-decode">&larr; Decode</button>
      </div>
    </div>

    <div class="card tool-panel ${VaultState.tab==='jwt'?'is-active':''}" data-panel="jwt">
      <div class="field"><label>JWT token</label><textarea id="jwt-input" rows="4" placeholder="eyJhbGciOi..."></textarea></div>
      <div class="grid grid-2">
        <div><label>Header</label><div class="mono-box" id="jwt-header">—</div></div>
        <div><label>Payload</label><div class="mono-box" id="jwt-payload">—</div></div>
      </div>
      <p style="font-size:11.5px;color:var(--text-faint);margin-top:10px;">Decodes and displays claims only — this does not verify the signature.</p>
    </div>
  `;
};

function genPassword(len, opts) {
  const sets = { upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', nums: '0123456789', symbols: '!@#$%^&*()-_=+[]{}' };
  let pool = '';
  Object.keys(opts).forEach(k => { if (opts[k]) pool += sets[k]; });
  if (!pool) pool = sets.lower;
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => pool[b % pool.length]).join('');
}

function assessStrength(pw) {
  let score = 0; const notes = [];
  if (pw.length >= 12) score += 30; else notes.push('Use at least 12 characters');
  if (pw.length >= 16) score += 15;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 20; else notes.push('Mix uppercase and lowercase');
  if (/\d/.test(pw)) score += 15; else notes.push('Add numbers');
  if (/[^A-Za-z0-9]/.test(pw)) score += 15; else notes.push('Add symbols');
  if (/(.)\1{2,}/.test(pw)) { score -= 15; notes.push('Avoid repeated characters'); }
  const common = ['password','123456','qwerty','letmein','111111','admin','welcome'];
  if (common.some(c => pw.toLowerCase().includes(c))) { score -= 30; notes.push('Avoid common words and patterns'); }
  score = Math.max(0, Math.min(100, score));
  let label = 'Very weak', color = 'var(--danger)';
  if (score >= 80) { label = 'Excellent'; color = 'var(--success)'; }
  else if (score >= 60) { label = 'Strong'; color = 'var(--success)'; }
  else if (score >= 40) { label = 'Fair'; color = 'var(--warning)'; }
  else if (score >= 20) { label = 'Weak'; color = 'var(--danger)'; }
  return { score, label, color, notes };
}

async function sha(text, algo) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function b64EncodeUtf8(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64DecodeUtf8(str) { return decodeURIComponent(escape(atob(str))); }

function decodeJwtPart(part) {
  try {
    const norm = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.stringify(JSON.parse(b64DecodeUtf8(norm)), null, 2);
  } catch (e) { return null; }
}

ViewMount.vault = function (root) {
  root.querySelectorAll('.tool-tab').forEach(b => b.addEventListener('click', () => { VaultState.tab = b.dataset.tab; renderView('vault'); }));

  // password generator
  const lenInput = root.querySelector('#pw-length');
  const lenVal = root.querySelector('#pw-length-val');
  const pwOut = root.querySelector('#pw-output');
  const doGenerate = () => {
    const opts = { upper: root.querySelector('#pw-upper').checked, lower: root.querySelector('#pw-lower').checked, nums: root.querySelector('#pw-nums').checked, symbols: root.querySelector('#pw-symbols').checked };
    pwOut.textContent = genPassword(parseInt(lenInput.value, 10), opts);
    window.SVBGLabsExt?.trackPasswordGenerated();
  };
  if (lenInput) {
    lenInput.addEventListener('input', () => { lenVal.textContent = lenInput.value; doGenerate(); });
    root.querySelector('#pw-generate').addEventListener('click', doGenerate);
    root.querySelectorAll('#pw-upper,#pw-lower,#pw-nums,#pw-symbols').forEach(c => c.addEventListener('change', doGenerate));
    root.querySelector('#pw-copy').addEventListener('click', () => { navigator.clipboard?.writeText(pwOut.textContent).then(() => toast('Copied to clipboard', 'success')); });
    doGenerate();
  }

  // strength checker
  const strInput = root.querySelector('#strength-input');
  if (strInput) strInput.addEventListener('input', () => {
    const r = assessStrength(strInput.value);
    root.querySelector('#strength-fill').style.width = r.score + '%';
    root.querySelector('#strength-fill').style.background = r.color;
    root.querySelector('#strength-label').textContent = strInput.value ? r.label : 'Enter a password above';
    root.querySelector('#strength-label').style.color = strInput.value ? r.color : 'var(--text-muted)';
    root.querySelector('#strength-notes').innerHTML = r.notes.map(n => `<li>${n}</li>`).join('');
  });

  // hash generator
  const hashBtn = root.querySelector('#hash-generate');
  if (hashBtn) hashBtn.addEventListener('click', async () => {
    const text = root.querySelector('#hash-input').value;
    const algo = root.querySelector('#hash-algo').value;
    root.querySelector('#hash-output').textContent = text ? await sha(text, algo) : 'Enter text first';
  });

  // base64
  const b64Encode = root.querySelector('#b64-encode');
  if (b64Encode) {
    b64Encode.addEventListener('click', () => {
      try { root.querySelector('#b64-encoded').value = b64EncodeUtf8(root.querySelector('#b64-plain').value); }
      catch (e) { toast('Could not encode input'); }
    });
    root.querySelector('#b64-decode').addEventListener('click', () => {
      try { root.querySelector('#b64-plain').value = b64DecodeUtf8(root.querySelector('#b64-encoded').value.trim()); }
      catch (e) { toast('That is not valid Base64'); }
    });
  }

  // jwt decoder
  const jwtInput = root.querySelector('#jwt-input');
  if (jwtInput) jwtInput.addEventListener('input', debounce(() => {
    const parts = jwtInput.value.trim().split('.');
    const header = parts[0] ? decodeJwtPart(parts[0]) : null;
    const payload = parts[1] ? decodeJwtPart(parts[1]) : null;
    root.querySelector('#jwt-header').textContent = header || '—';
    root.querySelector('#jwt-payload').textContent = payload || '—';
  }, 150));
};

/* ======================================================================== *
 * CALCULATOR — safe expression evaluation (no eval/Function on raw input)
 * ======================================================================== */
const CalcState = { expr: '', result: '0' };

function calcTokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let num = c; i++;
      while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i++; }
      tokens.push({ t: 'num', v: parseFloat(num) });
      continue;
    }
    if ('+-*/%'.includes(c)) { tokens.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(' || c === ')') { tokens.push({ t: c, v: c }); i++; continue; }
    throw new Error('Invalid character');
  }
  return tokens;
}
// shunting-yard -> RPN -> evaluate, so no eval() is ever used
function calcEvaluate(expr) {
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };
  const tokens = calcTokenize(expr);
  const output = [], ops = [];
  tokens.forEach(tok => {
    if (tok.t === 'num') output.push(tok);
    else if (tok.t === 'op') {
      while (ops.length && ops[ops.length-1].t === 'op' && prec[ops[ops.length-1].v] >= prec[tok.v]) output.push(ops.pop());
      ops.push(tok);
    } else if (tok.t === '(') ops.push(tok);
    else if (tok.t === ')') {
      while (ops.length && ops[ops.length-1].t !== '(') output.push(ops.pop());
      ops.pop();
    }
  });
  while (ops.length) output.push(ops.pop());
  const stack = [];
  output.forEach(tok => {
    if (tok.t === 'num') stack.push(tok.v);
    else {
      const b = stack.pop(), a = stack.pop();
      let r;
      if (tok.v === '+') r = a + b;
      else if (tok.v === '-') r = a - b;
      else if (tok.v === '*') r = a * b;
      else if (tok.v === '/') r = b === 0 ? NaN : a / b;
      else if (tok.v === '%') r = a % b;
      stack.push(r);
    }
  });
  return stack.pop();
}

Views.calculator = function () {
  return `
    <div class="view-header"><div><div class="view-title">Calculator</div></div></div>
    <div class="calc">
      <div class="calc-display">
        <div class="calc-expr" id="calc-expr">${escapeHtml(CalcState.expr) || '&nbsp;'}</div>
        <div class="calc-result" id="calc-result">${escapeHtml(CalcState.result)}</div>
      </div>
      <div class="calc-grid">
        <button class="btn calc-key" data-key="clear">C</button>
        <button class="btn calc-key" data-key="(">(</button>
        <button class="btn calc-key" data-key=")">)</button>
        <button class="btn calc-key op" data-key="/">÷</button>
        <button class="btn calc-key" data-key="7">7</button>
        <button class="btn calc-key" data-key="8">8</button>
        <button class="btn calc-key" data-key="9">9</button>
        <button class="btn calc-key op" data-key="*">×</button>
        <button class="btn calc-key" data-key="4">4</button>
        <button class="btn calc-key" data-key="5">5</button>
        <button class="btn calc-key" data-key="6">6</button>
        <button class="btn calc-key op" data-key="-">−</button>
        <button class="btn calc-key" data-key="1">1</button>
        <button class="btn calc-key" data-key="2">2</button>
        <button class="btn calc-key" data-key="3">3</button>
        <button class="btn calc-key op" data-key="+">+</button>
        <button class="btn calc-key wide" data-key="0">0</button>
        <button class="btn calc-key" data-key=".">.</button>
        <button class="btn calc-key op" data-key="=">=</button>
      </div>
    </div>
  `;
};

ViewMount.calculator = function (root) {
  const exprEl = root.querySelector('#calc-expr');
  const resultEl = root.querySelector('#calc-result');
  root.querySelectorAll('.calc-key').forEach(btn => btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    if (key === 'clear') { CalcState.expr = ''; CalcState.result = '0'; }
    else if (key === '=') {
      try {
        const r = calcEvaluate(CalcState.expr);
        CalcState.result = Number.isFinite(r) ? String(Math.round(r * 1e10) / 1e10) : 'Error';
      } catch (e) { CalcState.result = 'Error'; }
    } else {
      CalcState.expr += key;
    }
    exprEl.innerHTML = escapeHtml(CalcState.expr) || '&nbsp;';
    resultEl.textContent = CalcState.result;
  }));
};

/* ======================================================================== *
 * SETTINGS — theme, data export/import, reset
 * ======================================================================== */
Views.settings = function () {
  const settings = Store.get('settings', {});
  const dataKeys = ['tasks','notes','journal','habits','transactions','bookmarks','goals'];
  const counts = dataKeys.map(k => `${Store.get(k, []).length} ${k}`).join(' &middot; ');
  return `
    <div class="view-header"><div><div class="view-title">Settings</div><div class="view-sub">Everything is stored locally in this browser.</div></div></div>
    <div class="card" style="margin-bottom:20px;">
      <h3 style="font-size:14px;margin-bottom:6px;">Appearance</h3>
      <div class="settings-row">
        <div><div class="settings-row-title">Theme</div><div class="settings-row-sub">Cyber, Dark, or Light</div></div>
        <div style="display:flex;gap:8px;">
          ${THEMES.map(t => `<button class="btn btn-sm settings-theme-btn ${document.documentElement.dataset.theme===t?'is-active':''}" data-theme-choice="${t}" style="${document.documentElement.dataset.theme===t?'border-color:var(--accent);color:var(--accent);':''}">${THEME_LABEL[t]}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <h3 style="font-size:14px;margin-bottom:6px;">Your data</h3>
      <div class="settings-row">
        <div><div class="settings-row-title">Currently stored</div><div class="settings-row-sub">${counts}</div></div>
      </div>
      <div class="settings-row">
        <div><div class="settings-row-title">Export data</div><div class="settings-row-sub">Download everything as a single JSON file</div></div>
        <button class="btn" id="export-btn"><span class="nav-icon" data-icon="download"></span>Export</button>
      </div>
      <div class="settings-row">
        <div><div class="settings-row-title">Import data</div><div class="settings-row-sub">Restore from a previously exported JSON file</div></div>
        <button class="btn" id="import-btn"><span class="nav-icon" data-icon="upload"></span>Import</button>
        <input type="file" id="import-file" accept="application/json" style="display:none;" />
      </div>
      <div class="settings-row">
        <div><div class="settings-row-title">Reset everything</div><div class="settings-row-sub">Permanently erase all local SVBG Labs data</div></div>
        <button class="btn btn-danger" id="reset-btn"><span class="nav-icon" data-icon="trash"></span>Reset</button>
      </div>
    </div>
    <div class="card">
      <h3 style="font-size:14px;margin-bottom:6px;">About</h3>
      <p style="font-size:13px;color:var(--text-muted);line-height:1.7;">
        SVBG Labs is a fully offline personal operating system. No account, no server, no analytics —
        every task, note, habit, and password you generate here stays on this device unless you
        explicitly export it. Clearing your browser data will erase it, so export regularly if this
        matters to you.
      </p>
    </div>
  `;
};

ViewMount.settings = function (root) {
  root.querySelectorAll('.settings-theme-btn').forEach(b => b.addEventListener('click', () => { applyTheme(b.dataset.themeChoice); renderView('settings'); }));
  root.querySelector('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(Store.all(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `svbg-labs-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export downloaded', 'success');
  });
  const fileInput = root.querySelector('#import-file');
  root.querySelector('#import-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        Object.entries(data).forEach(([k, v]) => Store.set(k, v));
        toast('Data imported', 'success');
        renderView('settings');
      } catch (e) { toast('That file could not be read', 'danger'); }
    };
    reader.readAsText(file);
  });
  root.querySelector('#reset-btn').addEventListener('click', async () => {
    if (!(await confirmModal({ title: 'Erase all SVBG Labs data?', body: 'This permanently deletes every task, note, habit, and transaction on this device. Export first if you want a backup.', confirmLabel: 'Erase everything', danger: true }))) return;
    Store.wipe();
    toast('All data erased');
    renderView('dashboard');
  });
};

/* ======================================================================== *
 * GLOBAL SEARCH — lightweight local ranking (term frequency over titles/
 * bodies, no network, no external index). Searches tasks, notes, journal,
 * habits, bookmarks in one pass.
 * ======================================================================== */
function buildSearchCorpus() {
  const corpus = [];
  Store.get('tasks', []).forEach(t => corpus.push({ type: 'Task', view: 'tasks', title: t.title, snippet: t.priority + ' priority' + (t.due ? ' · due ' + fmtDate(t.due) : ''), text: t.title }));
  Store.get('notes', []).forEach(n => corpus.push({ type: 'Note', view: 'notes', id: n.id, title: n.title || 'Untitled', snippet: n.body.slice(0, 80), text: n.title + ' ' + n.body }));
  Store.get('journal', []).forEach(j => corpus.push({ type: 'Journal', view: 'journal', title: fmtDate(j.date) + (j.mood ? ' · ' + j.mood : ''), snippet: j.body.slice(0, 80), text: j.body + ' ' + (j.mood||'') }));
  Store.get('habits', []).forEach(h => corpus.push({ type: 'Habit', view: 'habits', title: h.name, snippet: calcStreak(h.history) + ' day streak', text: h.name }));
  Store.get('bookmarks', []).forEach(b => corpus.push({ type: 'Bookmark', view: 'bookmarks', title: b.title, snippet: b.url, text: b.title + ' ' + b.url + ' ' + (b.tags||[]).join(' ') }));
  return corpus;
}

function runSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return buildSearchCorpus()
    .map(item => {
      const hay = item.text.toLowerCase();
      let score = 0;
      terms.forEach(term => { if (hay.includes(term)) score += term.length >= 4 ? 3 : 1; });
      if (item.title.toLowerCase().includes(q)) score += 5;
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

const searchInput = document.getElementById('global-search');
const searchResultsEl = document.getElementById('search-results');

function showSearchResults(query) {
  const results = runSearch(query);
  if (!query.trim()) { searchResultsEl.classList.add('hidden'); return; }
  searchResultsEl.classList.remove('hidden');
  if (!results.length) { searchResultsEl.innerHTML = `<div class="sr-empty">No matches for "${escapeHtml(query)}"</div>`; return; }
  const groups = {};
  results.forEach(r => { (groups[r.type] = groups[r.type] || []).push(r); });
  searchResultsEl.innerHTML = Object.entries(groups).map(([type, items]) => `
    <div class="sr-group-label">${type}</div>
    ${items.map(it => `<div class="sr-item" data-view="${it.view}" ${it.id ? `data-id="${it.id}"` : ''}>
      <span class="sr-title">${escapeHtml(it.title)}</span>
      <span class="sr-snippet">${escapeHtml(it.snippet || '')}</span>
    </div>`).join('')}
  `).join('');
}

searchInput.addEventListener('input', debounce(e => showSearchResults(e.target.value), 120));
searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) showSearchResults(searchInput.value); });
document.addEventListener('click', e => {
  if (!searchResultsEl.contains(e.target) && e.target !== searchInput) searchResultsEl.classList.add('hidden');
});
searchResultsEl.addEventListener('click', e => {
  const item = e.target.closest('.sr-item');
  if (!item) return;
  if (item.dataset.view === 'notes' && item.dataset.id) NotesState.activeId = item.dataset.id;
  renderView(item.dataset.view);
  searchInput.value = '';
  searchResultsEl.classList.add('hidden');
});
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== searchInput && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault(); searchInput.focus();
  }
  if (e.key === 'Escape') { searchInput.blur(); searchResultsEl.classList.add('hidden'); }
});

/* ======================================================================== *
 * BOOT
 * ======================================================================== */
(function boot() {
  const settings = Store.get('settings', {});
  applyTheme(settings.theme || 'cyber');
  paintIcons();
  const startView = (location.hash || '#dashboard').slice(1);
  renderView(Views[startView] ? startView : 'dashboard');
})();
