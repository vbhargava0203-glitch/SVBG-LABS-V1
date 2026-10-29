// Run: node tests/core.test.js   (no dependencies; uses node:assert)
const assert = require('assert');
const C = require('../js/svbg-profile-core.js');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e.message); } }
const TODAY = '2026-03-10';

t('normalize keeps legacy onboarding data & maps it', () => {
  const p = C.normalizeProfile({ fullName: 'Asha Rao', roles: ['Developer'], workingOn: 'Building apps', skills: ['Python'], goals: ['Get a job'], systemName: "Asha's SVBG", onboardedAt: 5 }, { username: 'asha', email: 'a@b.co' });
  assert.equal(p.currentRole, 'Developer'); assert.equal(p.currentWork, 'Building apps');
  assert.deepEqual(p.technicalSkills, ['Python']); assert.deepEqual(p.goals, ['Get a job']);
  assert.equal(p.systemName, "Asha's SVBG"); assert.equal(p.createdAt, 5); assert.equal(p.email, 'a@b.co'); assert.equal(p.schema, 2);
});
t('normalize survives null / garbage', () => { assert.equal(C.normalizeProfile(null).schema, 2); assert.equal(C.normalizeProfile('x').fullName, ''); });
t('validate: name required, bad email & link rejected', () => {
  const r = C.validateProfile({ fullName: 'A', email: 'nope', github: 'javascript:alert(1)' });
  assert.equal(r.ok, false); assert.ok(r.errors.fullName && r.errors.email && r.errors.github);
});
t('validate: good profile passes; bare domain gets https', () => {
  const r = C.validateProfile({ fullName: 'Asha Rao', email: 'a@b.com', github: 'github.com/asha', bio: 'hi' });
  assert.equal(r.ok, true); assert.equal(r.profile.github, 'https://github.com/asha');
});
t('sanitizeUrl blocks non-http schemes', () => { assert.equal(C.sanitizeUrl('data:text/html,x'), null); assert.equal(C.sanitizeUrl('ftp://a.com'), null); assert.equal(C.sanitizeUrl(''), ''); });
t('bio over 280 chars rejected', () => assert.ok(C.validateProfile({ fullName: 'Asha', bio: 'x'.repeat(281) }).errors.bio));
t('list parsing dedupes, trims, caps', () => { assert.deepEqual(C.toList(' a, b\nb ,, c '), ['a', 'b', 'c']); assert.equal(C.toList('x,'.repeat(100)).length, 1); });
t('completion: empty profile is 0%, only real fields count', () => {
  assert.equal(C.profileCompletion(C.normalizeProfile({}), false).percent, 0);
  const p = C.normalizeProfile({ fullName: 'Asha Rao', bio: 'hi', location: 'Chennai', email: 'a@b.co' });
  const c = C.profileCompletion(p, false); assert.equal(c.done, 2); assert.equal(c.percent, 20);
  assert.ok(!c.missing.some(m => /location|email/i.test(m)));
});
t('completion counts avatar', () => assert.equal(C.profileCompletion(C.normalizeProfile({}), true).done, 1));
t('image sniffing from magic bytes (not filename)', () => {
  assert.equal(C.sniffImage(Uint8Array.from([0xFF,0xD8,0xFF,0xE0,0,0,0,0,0,0,0,0])), 'image/jpeg');
  assert.equal(C.sniffImage(Uint8Array.from([0x89,0x50,0x4E,0x47,0,0,0,0,0,0,0,0])), 'image/png');
  assert.equal(C.sniffImage(Uint8Array.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50])), 'image/webp');
  assert.equal(C.sniffImage(Uint8Array.from([0x3C,0x73,0x76,0x67,0,0,0,0,0,0,0,0])), null);
});
t('avatar validation rejects oversize and non-images', () => {
  assert.equal(C.validateAvatarFile(Uint8Array.from([0xFF,0xD8,0xFF,0,0,0,0,0,0,0,0,0]), 9 * 1024 * 1024).ok, false);
  assert.equal(C.validateAvatarFile(new Uint8Array(20), 20).ok, false);
  assert.equal(C.validateAvatarFile(Uint8Array.from([0xFF,0xD8,0xFF,0,0,0,0,0,0,0,0,0]), 1000).ok, true);
});
t('dayKeys is contiguous & ends today', () => { const k = C.dayKeys(7, TODAY); assert.equal(k.length, 7); assert.equal(k[6], TODAY); assert.equal(k[0], '2026-03-04'); });
t('dayKeys crosses month boundary', () => assert.equal(C.dayKeys(3, '2026-03-01')[0], '2026-02-27'));
t('completedSeries counts only done tasks by completedOn', () => {
  const s = C.completedSeries([{ done: true, completedOn: TODAY }, { done: true, completedOn: TODAY }, { done: false, completedOn: null }, { done: true, completedOn: '2020-01-01' }], 7, TODAY);
  assert.equal(s[6].value, 2); assert.equal(C.sum(s), 2);
});
t('focusSeries / activitySeries from real records', () => {
  assert.equal(C.sum(C.focusSeries({ [TODAY]: 3, '2020-01-01': 9 }, 7, TODAY)), 3);
  assert.equal(C.sum(C.activitySeries([{ at: Date.parse(TODAY + 'T12:00:00Z') }, {}, null], 7, TODAY)), 1);
});
t('taskStats: empty -> zeros & null rate (no fake %)', () => { const s = C.taskStats([], TODAY); assert.equal(s.total, 0); assert.equal(s.weeklyRate, null); });
t('taskStats: counts and weekly rate', () => {
  const s = C.taskStats([{ done: true, completedOn: TODAY }, { done: false, due: TODAY }, { done: false }, { done: true, completedOn: '2020-01-01' }], TODAY);
  assert.equal(s.total, 4); assert.equal(s.completed, 2); assert.equal(s.pending, 2); assert.equal(s.dueToday, 1); assert.equal(s.doneWeek, 1); assert.equal(s.weeklyRate, 33);
});
const IDS = ['a', 'b', 'c', 'd'];
t('layout: garbage -> safe default', () => { assert.deepEqual(C.validateLayout('x', IDS), { v: 1, mode: 'balance', hidden: [], order: null }); assert.equal(C.validateLayout({ v: 9 }, IDS).mode, 'balance'); });
t('layout: unknown ids dropped, missing ids appended, bad mode ignored', () => {
  const l = C.validateLayout({ v: 1, mode: 'hax', hidden: ['a', 'zzz'], order: ['c', 'zzz', 'a'] }, IDS);
  assert.equal(l.mode, 'balance'); assert.deepEqual(l.hidden, ['a']); assert.deepEqual(l.order, ['c', 'a', 'b', 'd']);
});
t('orderedWidgets: mode priority, hidden removed, nothing lost', () => {
  const l = C.validateLayout({ v: 1, mode: 'focus', hidden: ['b'] }, IDS);
  assert.deepEqual(C.orderedWidgets(l, IDS, { focus: ['d', 'c'] }), ['d', 'c', 'a']);
});
t('journey only lists milestones that really happened', () => {
  assert.deepEqual(C.journeyMilestones(null, [], [], 0), []);
  const m = C.journeyMilestones({ onboardedAt: 1 }, [{ type: 'TASK_COMPLETED', at: 5 }, { type: 'FOCUS_COMPLETED', at: 9 }], [{ progress: 100, createdAt: 3 }], 0);
  assert.deepEqual(m.map(x => x.label), ['SVBG identity created', 'First goal completed', 'First task completed', 'First focus session']);
});
t('displayNameOf fallbacks', () => { assert.equal(C.displayNameOf({ displayName: 'Ash' }), 'Ash'); assert.equal(C.displayNameOf({ fullName: 'Asha Rao' }), 'Asha'); assert.equal(C.displayNameOf({ username: 'u' }), 'u'); });
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
