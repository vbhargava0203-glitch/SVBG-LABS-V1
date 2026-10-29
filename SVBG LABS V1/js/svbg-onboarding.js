/* ==========================================================================
   SVBG FIRST LAUNCH EXPERIENCE

   Two additive layers around the EXISTING login/signup system in app.js
   (const Auth, function initAuthGate) — neither is touched or rewritten:

   1. PRE-SIGNUP CINEMATIC (only when Auth.list().length === 0, i.e. this
      is a genuinely fresh install with zero local accounts ever created):
      five full-screen intro cards layered on top of the already-rendered
      auth overlay, ending in a "CREATE MY SVBG" button that simply clicks
      the existing "Sign Up" tab — the real signup form (username, email,
      password) still does the actual account creation exactly as before.

   2. POST-SIGNUP PERSONALIZATION WIZARD: Auth.signup is wrapped (not
      replaced — the original still runs first and still does the real
      work) so that right after a brand-new account is created, a short
      question sequence collects a profile (name, role, current work,
      skills, goals, focus areas, a system name), saved locally to
      Store('svbg_profile'). This never runs for existing accounts logging
      back in — only immediately after Auth.signup succeeds.

   Nothing here is sent anywhere; the honesty note on the real signup form
   ("stored only on this device") stays true for all of this too.
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};

  Object.assign(ICONS, {
    'svbg-mark': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="12" cy="12" r="2.4"/><path d="M7.6 7.1 10 10.7M16.4 7.1 14 10.7M7.6 16.9 10 13.3M16.4 16.9 14 13.3"/></svg>',
  });

  function profile() { return Store.get('svbg_profile', null); }
  function saveProfile(p) { Store.set('svbg_profile', p); }
  window.SVBGProfile = { get: profile };

  /* ---------------------------------------------------------------------- *
   * SHARED OVERLAY SHELL
   * ---------------------------------------------------------------------- */
  let overlayEl = null;
  function mountOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.className = 'flx-overlay';
    document.body.appendChild(overlayEl);
    return overlayEl;
  }
  function unmountOverlay() { if (overlayEl) { overlayEl.remove(); overlayEl = null; } }
  function render(html) {
    const el = mountOverlay();
    el.innerHTML = `<div class="flx-card">${html}</div>`;
    paintIcons(el);
  }

  /* ---------------------------------------------------------------------- *
   * 1. PRE-SIGNUP CINEMATIC — five screens, only for a genuinely fresh
   *    install (zero accounts ever created on this device)
   * ---------------------------------------------------------------------- */
  const INTRO_SCREENS = ['opening', 'what', 'why', 'how', 'identity'];
  let introIndex = 0;

  function introDots() {
    return `<div class="flx-dots">${INTRO_SCREENS.map((_, i) => `<span class="flx-dot ${i === introIndex ? 'is-active' : ''}"></span>`).join('')}</div>`;
  }
  function skipLink() { return `<button type="button" class="flx-skip" id="flx-skip">Skip intro</button>`; }

  function renderIntro() {
    const screen = INTRO_SCREENS[introIndex];
    let body = '';
    if (screen === 'opening') {
      body = `
        <div class="flx-opening">
          <span class="nav-icon flx-mark" data-icon="svbg-mark"></span>
          <div class="flx-title-xl">SVBG LABS</div>
          <div class="flx-eyebrow">SYNAPTIC VECTOR BRAIN GRID</div>
          <p class="flx-lede">A personal operating system for your ideas, work, learning, focus, creativity and growth.</p>
          <button class="btn btn-primary flx-next" id="flx-next">Discover SVBG \u2192</button>
        </div>`;
    } else if (screen === 'what') {
      const groups = [
        { title: 'YOUR WORK', items: ['Tasks', 'Projects', 'Ideas', 'Execution'] },
        { title: 'YOUR MIND', items: ['Learning', 'Knowledge', 'Experiments', 'Reflection'] },
        { title: 'YOUR PROGRESS', items: ['Focus', 'Habits', 'Achievements', 'Goals'] },
        { title: 'YOUR EVOLUTION', items: ['DNA', 'Timeline', 'Universe', 'Milestones'] },
      ];
      body = `
        <div class="flx-screen">
          <div class="flx-title">WHAT IS SVBG?</div>
          <p class="flx-body">SVBG stands for <strong>Synaptic Vector Brain Grid</strong>. It's a personal digital operating system designed to bring the different parts of your digital life into one connected environment \u2014 instead of tasks, goals, learning, projects, focus, achievements, experiments and personal progress scattered across different apps, SVBG connects them into one evolving system.</p>
          <div class="flx-group-grid">
            ${groups.map(g => `<div class="flx-group"><div class="flx-group-title">${g.title}</div><div class="flx-group-items">${g.items.join(' \u00b7 ')}</div></div>`).join('')}
          </div>
          ${skipLink()}<button class="btn btn-primary flx-next" id="flx-next">Continue \u2192</button>
        </div>`;
    } else if (screen === 'why') {
      body = `
        <div class="flx-screen">
          <div class="flx-title">WHY SVBG?</div>
          <p class="flx-body">Most digital tools are designed around individual functions. One app manages tasks. Another manages notes. Another tracks habits. Another stores projects. Another tracks productivity.</p>
          <p class="flx-body">SVBG is designed around the <strong>person</strong> connecting all of those activities.</p>
          <div class="flx-mantra">
            <div>You work.</div><div>SVBG remembers.</div><div>Your system evolves.</div>
          </div>
          ${skipLink()}<button class="btn btn-primary flx-next" id="flx-next">Continue \u2192</button>
        </div>`;
    } else if (screen === 'how') {
      const chain = ['YOU', 'WORK', 'SVBG REMEMBERS', 'ACTIVITY CORE', 'PROGRESS', 'XP + ACHIEVEMENTS', 'DNA EVOLUTION', 'TIMELINE', 'UNIVERSE'];
      const examples = [
        { t: 'Complete a task', d: 'Activity recorded \u2192 Progress updated' },
        { t: 'Complete a focus session', d: 'Focus history updated \u2192 XP earned' },
        { t: 'Learn something', d: 'Knowledge grows \u2192 Timeline remembers it' },
        { t: 'Complete a challenge', d: 'Achievement progress \u2192 Your system evolves' },
      ];
      body = `
        <div class="flx-screen">
          <div class="flx-title">HOW SVBG WORKS</div>
          <div class="flx-chain">${chain.map(c => `<div class="flx-chain-step">${c}</div>`).join('<div class="flx-chain-arrow">\u2193</div>')}</div>
          <p class="flx-body flx-body-center">Every meaningful action can become part of your personal SVBG journey.</p>
          <div class="flx-example-grid">
            ${examples.map(e => `<div class="flx-example"><div class="flx-example-title">${e.t}</div><div class="flx-example-detail">${e.d}</div></div>`).join('')}
          </div>
          ${skipLink()}<button class="btn btn-primary flx-next" id="flx-next">Continue \u2192</button>
        </div>`;
    } else if (screen === 'identity') {
      body = `
        <div class="flx-screen">
          <div class="flx-title">THIS IS YOUR SYSTEM</div>
          <p class="flx-body">SVBG isn't designed to be a generic dashboard. Your SVBG becomes different from everyone else's because it's shaped by your goals, skills, projects, focus, learning and activity.</p>
          <div class="flx-identity-list">
            ${['YOUR IDENTITY', 'YOUR GOALS', 'YOUR SKILLS', 'YOUR WORK', 'YOUR PROGRESS', 'YOUR JOURNEY'].map(x => `<div>${x}</div>`).join('')}
          </div>
          <p class="flx-body flx-body-center">Before entering SVBG, let's create your personal identity.</p>
          <button class="btn btn-primary flx-next" id="flx-create">Create My SVBG \u2192</button>
        </div>`;
    }
    render(introDots() + body);
    const skip = document.getElementById('flx-skip');
    if (skip) skip.addEventListener('click', () => { introIndex = INTRO_SCREENS.length - 1; renderIntro(); });
    const next = document.getElementById('flx-next');
    if (next) next.addEventListener('click', () => { introIndex++; renderIntro(); });
    const create = document.getElementById('flx-create');
    if (create) create.addEventListener('click', () => {
      unmountOverlay();
      const signupTab = document.querySelector('.auth-tab[data-tab="signup"]');
      if (signupTab) signupTab.click();
      document.getElementById('auth-username')?.focus();
    });
  }

  function maybeStartIntro() {
    if (Auth.list().length > 0) return; // not a fresh install — skip straight to the normal login/signup gate
    introIndex = 0;
    renderIntro();
  }

  /* ---------------------------------------------------------------------- *
   * 2. POST-SIGNUP PERSONALIZATION WIZARD
   * ---------------------------------------------------------------------- */
  const ROLE_OPTIONS = ['Student', 'Developer', 'Engineer', 'Designer', 'Researcher', 'Entrepreneur', 'Founder', 'Freelancer', 'Creator', 'Professional'];
  const SKILL_OPTIONS = ['Programming', 'Web Development', 'Python', 'C', 'JavaScript', 'React', 'AI', 'Machine Learning', 'Cybersecurity', 'Data Science', 'UI/UX', 'Mathematics', 'Communication', 'Leadership'];
  const GOAL_OPTIONS = ['Learn new skills', 'Build projects', 'Get an internship', 'Get a job', 'Start a company', 'Improve focus', 'Improve productivity', 'Build a portfolio', 'Learn AI', 'Learn cybersecurity', 'Improve discipline', 'Personal growth'];
  const HELP_OPTIONS = [
    { id: 'Focus', desc: 'Deep work and concentration.' },
    { id: 'Learning', desc: 'Knowledge and skill development.' },
    { id: 'Building', desc: 'Projects and execution.' },
    { id: 'Productivity', desc: 'Tasks and organization.' },
    { id: 'Growth', desc: 'Goals and consistency.' },
    { id: 'Creativity', desc: 'Ideas and experimentation.' },
    { id: 'Security', desc: 'Cybersecurity learning and tools.' },
  ];

  const draft = { fullName: '', roles: [], roleOther: '', workingOn: '', skills: [], goals: [], goalOther: '', helpAreas: [], systemName: '' };
  let wizardStep = 0;
  const WIZARD_STEPS = ['name', 'role', 'workingon', 'skills', 'goals', 'help', 'systemname'];

  function chipMultiSelect(containerId, options, selectedArr) {
    return `<div class="flx-chip-grid" id="${containerId}">${options.map(o => `<button type="button" class="chip-btn ${selectedArr.includes(o) ? 'is-selected' : ''}" data-val="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}</div>`;
  }

  function wizardChrome(title, sub, bodyHtml, opts) {
    opts = opts || {};
    const progress = Math.round(((wizardStep + 1) / WIZARD_STEPS.length) * 100);
    return `
      <div class="flx-wizard">
        <div class="flx-wizard-progress"><div class="flx-wizard-progress-fill" style="width:${progress}%"></div></div>
        <div class="flx-wizard-step-label">Step ${wizardStep + 1} of ${WIZARD_STEPS.length}</div>
        <div class="flx-title">${title}</div>
        ${sub ? `<p class="flx-body">${sub}</p>` : ''}
        ${bodyHtml}
        <div class="flx-wizard-actions">
          ${wizardStep > 0 ? `<button type="button" class="btn" id="flx-back">Back</button>` : '<span></span>'}
          <div style="display:flex;gap:10px;">
            ${opts.allowSkip ? `<button type="button" class="btn" id="flx-skip-step">Skip</button>` : ''}
            <button type="button" class="btn btn-primary" id="flx-continue">${opts.finalLabel || 'Continue'}</button>
          </div>
        </div>
      </div>`;
  }

  function renderWizard() {
    const step = WIZARD_STEPS[wizardStep];
    let html = '';
    if (step === 'name') {
      html = wizardChrome("What's your name?", '', `<input type="text" id="flx-input" class="auth-input" placeholder="Full name" value="${escapeHtml(draft.fullName)}" maxlength="60" autofocus />`);
    } else if (step === 'role') {
      html = wizardChrome('What do you currently do?', 'Pick as many as apply.',
        chipMultiSelect('flx-roles', ROLE_OPTIONS, draft.roles) +
        `<div class="flx-chip-grid"><button type="button" class="chip-btn ${draft.roles.includes('Other') ? 'is-selected' : ''}" data-val="Other" id="flx-role-other-toggle">Other</button></div>` +
        `<input type="text" id="flx-role-other-input" class="auth-input flx-conditional-input ${draft.roles.includes('Other') ? '' : 'is-hidden'}" placeholder="Tell us what you do" value="${escapeHtml(draft.roleOther)}" style="margin-top:10px;" />`);
    } else if (step === 'workingon') {
      html = wizardChrome('What are you working on right now?', '', `<textarea id="flx-input" class="auth-input flx-textarea" placeholder="Building projects, learning AI, preparing for internships...">${escapeHtml(draft.workingOn)}</textarea>`, { allowSkip: true });
    } else if (step === 'skills') {
      html = wizardChrome('What do you already know?', 'Select what applies, or add your own.',
        chipMultiSelect('flx-skills', SKILL_OPTIONS, draft.skills) +
        `<div class="flx-custom-add"><input type="text" id="flx-skill-custom" class="auth-input" placeholder="Add a custom skill" /><button type="button" class="btn btn-sm" id="flx-skill-add">Add</button></div>
         <div class="flx-chip-grid" id="flx-custom-skills">${draft.skills.filter(s => !SKILL_OPTIONS.includes(s)).map(s => `<button type="button" class="chip-btn is-selected" data-val="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}</div>`,
        { allowSkip: true });
    } else if (step === 'goals') {
      html = wizardChrome('What are you trying to achieve?', 'Pick as many as apply.',
        chipMultiSelect('flx-goals', GOAL_OPTIONS, draft.goals) +
        `<div class="flx-chip-grid"><button type="button" class="chip-btn ${draft.goals.includes('Other') ? 'is-selected' : ''}" data-val="Other" id="flx-goal-other-toggle">Other</button></div>` +
        `<input type="text" id="flx-goal-other-input" class="auth-input flx-conditional-input ${draft.goals.includes('Other') ? '' : 'is-hidden'}" placeholder="Tell us your goal" value="${escapeHtml(draft.goalOther)}" style="margin-top:10px;" />`,
        { allowSkip: true });
    } else if (step === 'help') {
      html = wizardChrome('What do you want SVBG to help you with?', 'Pick as many as apply.',
        `<div class="flx-help-grid">${HELP_OPTIONS.map(h => `<button type="button" class="flx-help-card ${draft.helpAreas.includes(h.id) ? 'is-selected' : ''}" data-val="${h.id}"><span class="flx-help-title">${h.id}</span><span class="flx-help-desc">${h.desc}</span></button>`).join('')}</div>`,
        { allowSkip: true });
    } else if (step === 'systemname') {
      const dflt = `${draft.fullName ? draft.fullName.split(' ')[0] : 'Your'}'s SVBG`;
      html = wizardChrome('What should your personal SVBG be called?', '', `<input type="text" id="flx-input" class="auth-input" placeholder="${escapeHtml(dflt)}" value="${escapeHtml(draft.systemName)}" maxlength="60" />`, { allowSkip: true, finalLabel: 'Initialize \u2192' });
    }
    render(html);
    wireWizardStep(step);
  }

  function wireWizardStep(step) {
    document.getElementById('flx-back')?.addEventListener('click', () => { wizardStep--; renderWizard(); });
    document.getElementById('flx-skip-step')?.addEventListener('click', () => advanceWizard(true));
    document.getElementById('flx-continue')?.addEventListener('click', () => advanceWizard(false));

    if (step === 'role' || step === 'goals') {
      const gridId = step === 'role' ? 'flx-roles' : 'flx-goals';
      const arr = step === 'role' ? draft.roles : draft.goals;
      document.getElementById(gridId)?.querySelectorAll('.chip-btn').forEach(btn => btn.addEventListener('click', () => {
        const v = btn.dataset.val;
        const i = arr.indexOf(v);
        if (i === -1) arr.push(v); else arr.splice(i, 1);
        btn.classList.toggle('is-selected');
      }));
      const otherToggleId = step === 'role' ? 'flx-role-other-toggle' : 'flx-goal-other-toggle';
      const otherInputId = step === 'role' ? 'flx-role-other-input' : 'flx-goal-other-input';
      document.getElementById(otherToggleId)?.addEventListener('click', function () {
        const has = arr.includes('Other');
        if (has) arr.splice(arr.indexOf('Other'), 1); else arr.push('Other');
        this.classList.toggle('is-selected');
        document.getElementById(otherInputId)?.classList.toggle('is-hidden', !arr.includes('Other'));
      });
    }
    if (step === 'skills') {
      document.getElementById('flx-skills')?.querySelectorAll('.chip-btn').forEach(btn => btn.addEventListener('click', () => {
        const v = btn.dataset.val;
        const i = draft.skills.indexOf(v);
        if (i === -1) draft.skills.push(v); else draft.skills.splice(i, 1);
        btn.classList.toggle('is-selected');
      }));
      document.getElementById('flx-skill-add')?.addEventListener('click', () => {
        const input = document.getElementById('flx-skill-custom');
        const v = input.value.trim();
        if (v && !draft.skills.includes(v)) { draft.skills.push(v); renderWizard(); }
      });
    }
    if (step === 'help') {
      document.querySelectorAll('.flx-help-card').forEach(card => card.addEventListener('click', () => {
        const v = card.dataset.val;
        const i = draft.helpAreas.indexOf(v);
        if (i === -1) draft.helpAreas.push(v); else draft.helpAreas.splice(i, 1);
        card.classList.toggle('is-selected');
      }));
    }
  }

  function advanceWizard(skipped) {
    const step = WIZARD_STEPS[wizardStep];
    if (!skipped) {
      if (step === 'name') {
        const v = document.getElementById('flx-input').value.trim();
        if (v.length < 2) { toast('Enter at least 2 characters.', 'danger'); return; }
        draft.fullName = v;
      } else if (step === 'role') {
        draft.roleOther = document.getElementById('flx-role-other-input')?.value.trim() || '';
      } else if (step === 'workingon') {
        draft.workingOn = document.getElementById('flx-input').value.trim();
      } else if (step === 'goals') {
        draft.goalOther = document.getElementById('flx-goal-other-input')?.value.trim() || '';
      } else if (step === 'systemname') {
        draft.systemName = document.getElementById('flx-input').value.trim();
      }
    }
    if (wizardStep < WIZARD_STEPS.length - 1) { wizardStep++; renderWizard(); }
    else finishWizard();
  }

  function finishWizard() {
    if (!draft.systemName) draft.systemName = `${draft.fullName ? draft.fullName.split(' ')[0] : 'Your'}'s SVBG`;
    const p = {
      fullName: draft.fullName,
      roles: draft.roles.filter(r => r !== 'Other').concat(draft.roleOther ? [draft.roleOther] : []),
      workingOn: draft.workingOn,
      skills: draft.skills,
      goals: draft.goals.filter(g => g !== 'Other').concat(draft.goalOther ? [draft.goalOther] : []),
      helpAreas: draft.helpAreas,
      systemName: draft.systemName,
      onboardedAt: Date.now(),
    };
    saveProfile(p);
    renderInitializing(p);
  }

  /* ---------------------------------------------------------------------- *
   * SYSTEM INITIALIZATION SEQUENCE
   * ---------------------------------------------------------------------- */
  function renderInitializing(p) {
    const items = ['IDENTITY', 'GOALS', 'SKILLS', 'FOCUS', 'PREFERENCES', 'WORKSPACE'];
    render(`
      <div class="flx-init">
        <div class="flx-init-title">INITIALIZING YOUR SVBG...</div>
        <div class="flx-init-list">
          ${items.map((it, i) => `<div class="flx-init-row" id="flx-init-${i}"><span>${it}</span><span class="flx-init-status">\u2026</span></div>`).join('')}
        </div>
      </div>`);
    items.forEach((it, i) => {
      setTimeout(() => {
        const row = document.getElementById(`flx-init-${i}`);
        if (row) row.querySelector('.flx-init-status').innerHTML = '<span class="flx-init-done">COMPLETE</span>';
        if (i === items.length - 1) setTimeout(() => renderReady(p), 500);
      }, 350 + i * 260);
    });
  }

  function renderReady(p) {
    render(`
      <div class="flx-ready">
        <span class="nav-icon flx-mark" data-icon="svbg-mark"></span>
        <div class="flx-title">YOUR SVBG IS READY.</div>
        <p class="flx-body">Welcome to your personal operating system, ${escapeHtml(p.systemName)}.</p>
        <button class="btn btn-primary flx-next" id="flx-enter">Enter SVBG \u2192</button>
      </div>`);
    document.getElementById('flx-enter').addEventListener('click', () => {
      unmountOverlay();
      if (Ext.award) Ext.award(20, 'System initialized');
      renderView('mission');
      setTimeout(() => showWelcomeBanner(p), 200);
    });
  }

  function showWelcomeBanner(p) {
    const content = document.getElementById('content');
    if (!content) return;
    const banner = document.createElement('div');
    banner.className = 'flx-welcome-banner';
    const bits = [];
    if (p.helpAreas.length) bits.push(`focused on ${p.helpAreas.slice(0, 3).join(', ').toLowerCase()}`);
    if (p.workingOn) bits.push(`currently: "${p.workingOn}"`);
    banner.innerHTML = `
      <button class="flx-welcome-close" aria-label="Dismiss">&times;</button>
      <div class="flx-welcome-title">WELCOME, ${escapeHtml((p.fullName || '').toUpperCase())}.</div>
      <div class="flx-welcome-sub">YOUR SYSTEM IS ONLINE.</div>
      <div class="flx-welcome-detail">${bits.length ? escapeHtml(bits.join(' \u00b7 ')) : 'Your journey starts here.'}</div>
    `;
    content.prepend(banner);
    banner.querySelector('.flx-welcome-close').addEventListener('click', () => banner.remove());
    setTimeout(() => banner.remove(), 9000);
  }

  /* ---------------------------------------------------------------------- *
   * WIRE-UP — wrap Auth.signup (original still runs and does the real
   * account creation; this only adds the post-signup wizard on success)
   * ---------------------------------------------------------------------- */
  if (typeof Auth !== 'undefined' && typeof Auth.signup === 'function') {
    const originalSignup = Auth.signup.bind(Auth);
    Auth.signup = async function (username, email, password) {
      const result = await originalSignup(username, email, password);
      if (result.ok) {
        Object.assign(draft, { fullName: '', roles: [], roleOther: '', workingOn: '', skills: [], goals: [], goalOther: '', helpAreas: [], systemName: '' });
        wizardStep = 0;
        setTimeout(() => renderWizard(), 0);
      }
      return result;
    };
  }

  maybeStartIntro();
})();
