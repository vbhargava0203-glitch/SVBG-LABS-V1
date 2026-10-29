/* ==========================================================================
   SVBG EASTER EGGS & SHORTCUT ALIASES — small, self-contained additions:
   the Konami code (with a hidden achievement), and Ctrl/Cmd+K as an alias
   for the existing Command Palette (Ctrl/Cmd+Space still works exactly as
   before — this just adds the more commonly-expected binding alongside it).
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};

  const KONAMI_ACHIEVEMENT = { id: 'konami_master', title: 'Konami Master', desc: 'Found the hidden code', rarity: 'epic', check: () => Store.get('konami_unlocked', false) === true };
  if (Ext.ACHIEVEMENT_DEFS && !Ext.ACHIEVEMENT_DEFS.some(d => d.id === KONAMI_ACHIEVEMENT.id)) Ext.ACHIEVEMENT_DEFS.push(KONAMI_ACHIEVEMENT);

  const KONAMI_SEQUENCE = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konamiProgress = 0;

  function triggerKonami() {
    if (Store.get('konami_unlocked', false)) { toast('The code still works. 🕹️', 'success'); return; }
    Store.set('konami_unlocked', true);
    if (Ext.award) Ext.award(30, 'Found the Konami code');
    if (Ext.Achievements) Ext.Achievements.check();
    document.body.classList.add('konami-flash');
    setTimeout(() => document.body.classList.remove('konami-flash'), 900);
    toast('🕹️ Konami code accepted — +30 XP', 'success');
  }

  document.addEventListener('keydown', e => {
    // Konami code
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI_SEQUENCE[konamiProgress]) {
      konamiProgress++;
      if (konamiProgress === KONAMI_SEQUENCE.length) { triggerKonami(); konamiProgress = 0; }
    } else {
      konamiProgress = (key === KONAMI_SEQUENCE[0]) ? 1 : 0;
    }

    // Ctrl/Cmd+K — alias for the existing Command Palette (Ctrl/Cmd+Space)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (Ext.Palette) Ext.Palette.open();
    }
  });
})();
