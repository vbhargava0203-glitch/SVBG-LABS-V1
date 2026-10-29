/* ==========================================================================
   SVBG FOCUS FOREST — connected directly to the existing Focus Timer's
   pomoSessions data (Store 'pomoSessions', the same key Mission Control and
   the DNA page already read). Every tree in the grid corresponds to a real
   day with at least one completed focus session; its size reflects how
   many sessions that day actually had. This is deliberately a real SVG
   visualization, not a 3D scene — a full 3D forest ecosystem is a much
   larger undertaking than this pass covers, and a fake one would be worse
   than an honest, simpler real one.
   ========================================================================== */
'use strict';

(function () {
  Object.assign(ICONS, {
    forest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 7 10h3l-4 6h4v4h4v-4h4l-4-6h3z"/></svg>',
  });

  function sessions() { return Store.get('pomoSessions', {}); }

  function stageFor(total) {
    if (total >= 50) return { name: 'Grand Tree', emoji: '\ud83c\udf33', next: null };
    if (total >= 25) return { name: 'Tree', emoji: '\ud83c\udf32', next: 50 };
    if (total >= 10) return { name: 'Sapling', emoji: '\ud83c\udf3f', next: 25 };
    if (total >= 3) return { name: 'Sprout', emoji: '\ud83c\udf31', next: 10 };
    return { name: 'Seed', emoji: '\ud83c\udf30', next: 3 };
  }

  function treeSvg(count, size) {
    const h = 40 + Math.min(count, 8) * 6;
    const trunkH = h * 0.28;
    const canopyR = 14 + Math.min(count, 8) * 2.2;
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect x="${size/2-3}" y="${size-trunkH-4}" width="6" height="${trunkH}" rx="2" fill="#8a6a4a"/>
      <circle cx="${size/2}" cy="${size-trunkH-canopyR*0.6}" r="${canopyR}" fill="url(#ffGrad)"/>
    </svg>`;
  }

  Views.focusforest = function () {
    const s = sessions();
    const total = Object.values(s).reduce((a, b) => a + b, 0);
    const stage = stageFor(total);
    const days = Array.from({ length: 30 }, (_, i) => daysAgo(29 - i));
    const activeDays = days.filter(d => s[d] > 0);
    return `
      <div class="view-header"><div><div class="view-title">Focus Forest</div><div class="view-sub">Grows from your real Focus Timer sessions \u2014 ${total} total, ${activeDays.length} active days in the last 30</div></div></div>
      <svg width="0" height="0"><defs><linearGradient id="ffGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#59E7D9"/><stop offset="100%" stop-color="#2f8f7f"/></linearGradient></defs></svg>
      <div class="card forest-hero-card">
        <div class="forest-hero-tree">${treeSvg(Math.min(total, 12), 140)}</div>
        <div class="forest-hero-info">
          <div class="forest-hero-stage">${stage.emoji} ${stage.name}</div>
          <div class="forest-hero-sub">${stage.next ? `${stage.next - total} more session${stage.next-total===1?'':'s'} to reach the next stage` : 'Fully grown \u2014 the highest stage'}</div>
        </div>
      </div>
      <h3 style="font-size:13px;margin:20px 0 10px;color:var(--text-muted);">Last 30 days</h3>
      <div class="forest-grid">
        ${days.map(d => {
          const count = s[d] || 0;
          return `<div class="forest-cell ${count ? 'has-tree' : ''}" title="${d}: ${count} session${count===1?'':'s'}">${count ? treeSvg(count, 34) : ''}</div>`;
        }).join('')}
      </div>
    `;
  };
  ViewMount.focusforest = function () {};
})();
