// Headless UI smoke test (needs `npm i jsdom`; serves the folder on :8765). Run: node tests/ui-smoke.js
const { JSDOM, VirtualConsole } = require(process.env.JSDOM_PATH || 'jsdom');
let pass = 0, fail = 0; const errors = [];
const t = (n, ok, extra) => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : (extra || '')); };
const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(String(e.message).slice(0, 160))); vc.on('error', e => errors.push(String(e).slice(0, 160)));
JSDOM.fromURL('http://localhost:8765/index.html', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => {} , set: () => true }); w.matchMedia = () => ({ matches: false }); } })
.then(dom => new Promise(r => dom.window.addEventListener('load', () => setTimeout(() => r(dom), 800))))
.then(async dom => {
  const w = dom.window, d = w.document, $ = s => d.querySelector(s);
  w.eval("document.querySelector('.flx-overlay')&&document.querySelector('.flx-overlay').remove()");
  const go = n => w.renderView(n), html = () => $('#content').innerHTML;
  t('app booted, core present', !!w.SVBGCore2 && typeof w.renderView === 'function');
  // ---- Mission Control, brand-new empty state
  go('mission');
  t('mission: welcome header renders', /WELCOME BACK/.test(html()));
  t('mission: honest empty states (no fake data)', /Create your first task/.test(html()) && /Start a focus session/.test(html()) && /Your journey starts here/.test(html()));
  t('mission: original system status preserved', !!$('[data-widget="system"]') && /Level/.test($('[data-widget="system"]').textContent));
  // ---- real data -> metrics
  w.eval(`Store.set('tasks',[{id:'1',title:'Ship <b>it</b>',priority:'high',done:true,completedOn:todayStr(),createdAt:1},{id:'2',title:'Write docs',priority:'med',done:false,createdAt:2}]);Store.set('pomoSessions',{[todayStr()]:3});Store.set('goals',[{id:'g',title:'Launch',progress:40,createdAt:1}])`);
  go('mission');
  t('mission: real task stats shown', /Total/.test($('[data-widget="productivity"]').textContent) && $('[data-widget="productivity"] .mc2-stat-v').textContent === '2');
  t('mission: task title is escaped (no HTML injection)', !$('[data-widget="productivity"] b'));
  t('mission: focus analytics from pomoSessions', /All-time/.test($('[data-widget="focus"]').textContent) && $('[data-widget="focus"] svg.mc2-chart'));
  t('mission: goals widget shows progress', /40%/.test($('[data-widget="goals"]').textContent));
  // ---- customization persists
  $('#mc2-customize').click();
  t('customize panel opens', !!$('.mc2-panel'));
  $('[data-vis="focus"]').checked = false; $('[data-vis="focus"]').dispatchEvent(new w.Event('change', { bubbles: true }));
  t('hide widget works + persists', !$('[data-widget="focus"]') && JSON.parse(w.localStorage.getItem('humanos:mc_layout')).hidden.includes('focus'));
  $('[data-mode="learn"]').click();
  t('mode changes widget priority', $('.mc2-grid > section').dataset.widget === 'learning');
  $('[data-move="learning:1"]').click();
  t('reorder works', $('.mc2-grid > section').dataset.widget !== 'learning');
  $('#mc2-reset').click();
  t('restore default layout', w.localStorage.getItem('humanos:mc_layout') === 'null' && !!$('[data-widget="focus"]'));
  // ---- quick actions go somewhere real
  go('mission'); $('[data-go="goals"]').click();
  t('quick action navigates (View goals)', /Longer-horizon/.test(html()));
  // ---- no listener leak: Identity buttons fire exactly once
  go('mission'); go('identity');
  let n = 0; const orig = w.renderView; w.renderView = x => { n++; return orig(x); };
  t('profile page renders w/ completion %', /PROFILE COMPLETION/.test(html()) && /Edit profile/.test(html()));
  $('#idn-edit').click(); w.renderView = orig;
  t('no duplicate handlers after navigation', n === 1, 'fired ' + n);
  // ---- Identity empty + edit + validation + persistence
  go('profileedit');
  $('#pf-fullName').value = 'Asha Rao'; $('#pf-email').value = 'not-an-email'; $('#pf-github').value = 'javascript:alert(1)';
  $('#idn-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  t('invalid email/link rejected with messages', $('#err-email').textContent && $('#err-github').textContent && !w.localStorage.getItem('humanos:svbg_profile'));
  $('#pf-email').value = 'asha@example.com'; $('#pf-github').value = 'github.com/asha'; $('#pf-bio').value = '<img src=x onerror=alert(1)> builder'; $('#pf-currentRole').value = 'Developer';
  $('#pf-technicalSkills').value = 'Python, JS\nPython';
  $('#idn-form').dispatchEvent(new w.Event('submit', { cancelable: true, bubbles: true }));
  const saved = JSON.parse(w.localStorage.getItem('humanos:svbg_profile') || 'null');
  t('valid profile saved & normalized', saved && saved.fullName === 'Asha Rao' && saved.github === 'https://github.com/asha' && saved.technicalSkills.length === 2 && saved.schema === 2);
  t('after save: identity page shows it, bio escaped', /Asha Rao/.test(html()) && !$('#content img[src="x"]') && /Developer/.test(html()));
  go('mission');
  t('mission header uses profile name', /WELCOME BACK, ASHA/.test(html()));
  // ---- legacy onboarding profile is preserved/mapped, not wiped
  w.eval(`Store.set('svbg_profile',{fullName:'Legacy User',roles:['Founder'],workingOn:'Building',skills:['AI'],goals:['Get a job'],systemName:'Legacy SVBG',onboardedAt:1})`);
  go('identity');
  t('legacy onboarding profile reused', /Legacy User/.test(html()) && /Founder/.test(html()) && /Legacy SVBG/.test(html()));
  go('mission'); t('legacy workspace/focus shown on dashboard', /Legacy SVBG/.test(html()) && /Building/.test(html()));
  // ---- existing modules still render
  ['dashboard','tasks','habits','dna','achievementsfull','goals','privacy','datavault','mindlab','activityfeed','timeline','settings','archives','focusforest','dailymission'].forEach(v => { go(v); t('regression: ' + v + ' renders', $('#content').innerHTML.length > 80 && !/MODULE UNAVAILABLE/.test(html())); });
  // ---- back button still walks history
  go('mission'); go('goals'); w.goBack();
  t('back button returns to previous view', /WELCOME BACK/.test(html()));
  console.log(`\n${pass} passed, ${fail} failed`);
  const real = errors.filter(e => !/Not implemented|indexedDB|serviceWorker|Could not load/i.test(e));
  console.log('runtime errors captured:', real.length, real.slice(0, 5));
  dom.window.close(); process.exit(fail || real.length ? 1 : 0);
}).catch(e => { console.log('HARNESS ERROR', e); process.exit(2); });
