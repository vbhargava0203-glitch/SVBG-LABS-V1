/* ==========================================================================
   SVBG ASSISTANT — a floating, always-available panel that surfaces
   rule-based insights from your own local data. Explicitly NOT an AI /
   language model — every response here is a pattern match against real
   Store data (tasks, habits, journal, focus sessions, transactions, the
   XP activity log) mapped to a canned, clearly-labeled template sentence,
   the same "local rule engine" approach the existing Reflection and Life
   Coach features already use. A handful of small insight rules are
   duplicated here rather than reaching into svbg-advanced.js's internals,
   to keep this module self-contained like svbg-chess.js/svbg-sudoku.js
   already are.

   Expanded with: a real back-and-forth conversation feed (previous answers
   used to be overwritten one at a time), quick-action shortcut chips,
   clickable example-question chips, plain-language navigation ("open dna",
   "go to journal", "start focus") that reuses the same command list as the
   command palette, several new answerable topics (finance, mood/journal,
   games, level/XP, overall DNA score, a daily quote, a weekly digest,
   greetings), and a small notification dot on the launcher when there's a
   fresh insight worth a look.
   ========================================================================== */
'use strict';

(function () {
  const Ext = window.SVBGLabsExt || {};

  Object.assign(ICONS, {
    'assistant-spark': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.2"/></svg>',
  });

  const SUGGESTIONS = ["How's my streak?", "What should I do next?", "How's this week going?", "Motivate me", "Open my DNA"];

  function weekdayName(d) { return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d]; }

  function buildInsights() {
    const insights = [];
    const tasks = Store.get('tasks', []);
    const habits = Store.get('habits', []);
    const journal = Store.get('journal', []);
    const tx = Store.get('transactions', []);
    const pomo = Store.get('pomoSessions', {});
    const log = Ext.XP ? Ext.XP.log() : [];
    const today = todayStr();

    // open tasks
    const openTasks = tasks.filter(t => !t.completedOn);
    if (openTasks.length > 0) insights.push(`You have ${openTasks.length} open task${openTasks.length===1?'':'s'} — the oldest is "${[...openTasks].sort((a,b)=>a.createdAt-b.createdAt)[0].title}".`);
    else if (tasks.length > 0) insights.push(`Every tracked task is complete right now — nice clean slate.`);

    // habit streaks
    habits.forEach(h => {
      const streak = calcStreak(h.history);
      if (streak >= 3) insights.push(`You've maintained a ${streak}-day streak on "${h.name}".`);
    });
    const idleHabit = habits.find(h => { const last = Object.keys(h.history||{}).filter(d=>h.history[d]).sort().pop(); const idle = last ? Math.round((Date.now()-new Date(last).getTime())/86400000) : 999; return idle >= 4; });
    if (idleHabit) insights.push(`You haven't checked in "${idleHabit.name}" in a few days — a quick one now keeps the habit alive.`);

    // focus sessions time-of-day
    if (log.length >= 10) {
      const hourCounts = new Array(24).fill(0);
      log.forEach(e => hourCounts[new Date(e.at).getHours()]++);
      let best = 0; for (let h = 1; h < 24; h++) if (hourCounts[h] > hourCounts[best]) best = h;
      if (hourCounts[best] > 0) insights.push(`You tend to be most active around ${best % 12 === 0 ? 12 : best % 12}${best < 12 ? 'am' : 'pm'}.`);
      const dowCounts = new Array(7).fill(0);
      log.forEach(e => dowCounts[new Date(e.at).getDay()]++);
      let bestDow = 0; for (let d = 1; d < 7; d++) if (dowCounts[d] > dowCounts[bestDow]) bestDow = d;
      if (dowCounts[bestDow] > 0) insights.push(`${weekdayName(bestDow)} tends to be your most active day.`);
    }

    // focus session average length (count-based, since only counts are stored per day)
    const pomoDays = Object.keys(pomo).filter(d => pomo[d] > 0);
    if (pomoDays.length >= 3) {
      const avg = pomoDays.reduce((s, d) => s + pomo[d], 0) / pomoDays.length;
      insights.push(`You average ${avg.toFixed(1)} focus session${avg===1?'':'s'} on the days you use the timer.`);
    }

    // journal
    if (!journal.some(j => j.date === today)) insights.push(`No journal entry yet today — even a couple of lines helps future-you.`);

    // finance
    const thisMonthTx = tx.filter(t => t.date && t.date.slice(0,7) === today.slice(0,7));
    if (thisMonthTx.length > 0) {
      const spend = thisMonthTx.filter(t => t.type === 'expense').reduce((s,t)=>s+t.amount,0);
      const income = thisMonthTx.filter(t => t.type === 'income').reduce((s,t)=>s+t.amount,0);
      if (spend > income && income > 0) insights.push(`This month you've spent more than you've logged in income so far — worth a glance at Finance.`);
    }

    // games
    const sudoku = Store.get('sudoku_stats', {}), cyberlock = Store.get('cyberlock_stats', {});
    if (!sudoku.completed && !cyberlock.totalVaultsOpened) insights.push(`You haven't tried Mind Arena yet — Sudoku and Cyber Lock are both in there.`);

    // achievements
    if (Ext.Achievements && Ext.ACHIEVEMENT_DEFS) {
      const unlocked = Ext.Achievements.unlocked().length;
      insights.push(`${unlocked}/${Ext.ACHIEVEMENT_DEFS.length} achievements unlocked so far.`);
    }

    if (insights.length === 0) insights.push(`Not enough activity yet for a reliable insight — use SVBG Labs for a few days and check back.`);
    return insights;
  }

  // whether there's something fresh enough to flag with a dot on the launcher
  function hasNudge() {
    const tasks = Store.get('tasks', []);
    const habits = Store.get('habits', []);
    const journal = Store.get('journal', []);
    const idleHabit = habits.some(h => { const last = Object.keys(h.history||{}).filter(d=>h.history[d]).sort().pop(); const idle = last ? Math.round((Date.now()-new Date(last).getTime())/86400000) : 999; return idle >= 4; });
    const overdueFeel = tasks.filter(t => !t.completedOn).length >= 5;
    const noJournalToday = journal.length > 0 && !journal.some(j => j.date === todayStr());
    return idleHabit || overdueFeel || noJournalToday;
  }

  /* ---------------------------------------------------------------------- *
   * NAVIGATION-BY-CHAT — "open dna", "go to journal", "take me to focus",
   * "start focus timer"... matched against the same command list the
   * command palette uses, so it stays in sync automatically.
   * ---------------------------------------------------------------------- */
  const NAV_TRIGGER = /\b(open|go to|goto|take me to|navigate to|show me|launch|start)\b/;
  function tryRunCommand(qRaw) {
    if (!Ext.buildCommands || !NAV_TRIGGER.test(qRaw.toLowerCase())) return null;
    const q = qRaw.toLowerCase().replace(NAV_TRIGGER, '').trim();
    if (q.length < 2) return null;
    const commands = Ext.buildCommands();
    // prefer the command whose label shares the most words with the query
    let best = null, bestScore = 0;
    commands.forEach(cmd => {
      const label = cmd.label.toLowerCase();
      let score = 0;
      q.split(/\s+/).forEach(word => { if (word.length > 2 && label.includes(word)) score++; });
      if (label.includes(q)) score += 3;
      if (score > bestScore) { bestScore = score; best = cmd; }
    });
    if (best && bestScore > 0) return best;
    return null;
  }

  function answerQuery(qRaw) {
    const q = qRaw.toLowerCase();
    const tasks = Store.get('tasks', []);
    const habits = Store.get('habits', []);

    // plain-language navigation first — this is an action, not a question
    const cmd = tryRunCommand(qRaw);
    if (cmd) { setTimeout(() => cmd.run(), 250); return `Opening ${cmd.label}\u2026`; }

    if (/^(hi|hey|hello|yo|sup)\b/.test(q)) return "Hey! Ask me about your streaks, tasks, focus times, or say \"open journal\" to jump straight there.";
    if (/streak|habit/.test(q)) {
      if (!habits.length) return "You haven't set up any habits yet — head to Habits to start one.";
      const best = habits.map(h => ({ name: h.name, streak: calcStreak(h.history) })).sort((a,b)=>b.streak-a.streak)[0];
      return best.streak > 0 ? `Your best current streak is "${best.name}" at ${best.streak} day${best.streak===1?'':'s'}.` : `None of your habits are on an active streak right now — today's a good day to start one.`;
    }
    if (/achievement|badge|trophy/.test(q)) {
      const unlocked = Ext.Achievements ? Ext.Achievements.unlocked().length : 0;
      const total = Ext.ACHIEVEMENT_DEFS ? Ext.ACHIEVEMENT_DEFS.length : 0;
      return `You've unlocked ${unlocked} of ${total} achievements.`;
    }
    if (/level|xp\b|experience points/.test(q)) {
      if (!Ext.XP || !Ext.levelInfo) return "Level tracking isn't available right now.";
      const l = Ext.levelInfo(Ext.XP.total());
      return `You're Level ${l.level}, with ${l.xpIntoLevel}/${l.xpForNext} XP toward the next one (${l.pct}%).`;
    }
    if (/\bdna\b|overall score|how am i overall/.test(q)) {
      if (!Ext.computeDNA) return "DNA scoring isn't available right now.";
      const dna = Ext.computeDNA();
      const traits = Object.entries(dna).filter(([k]) => !['overall','snaps'].includes(k));
      const strongest = traits.sort((a,b)=>b[1]-a[1])[0];
      return `Your overall SVBG DNA score is ${dna.overall}/100 right now — strongest trait is ${strongest[0]} at ${strongest[1]}.`;
    }
    if (/focus|productive|active/.test(q)) {
      const log = Ext.XP ? Ext.XP.log() : [];
      if (log.length < 10) return "Not enough activity logged yet to spot a reliable pattern — check back after a few more days.";
      const hourCounts = new Array(24).fill(0);
      log.forEach(e => hourCounts[new Date(e.at).getHours()]++);
      let best = 0; for (let h = 1; h < 24; h++) if (hourCounts[h] > hourCounts[best]) best = h;
      return `You tend to be most active around ${best % 12 === 0 ? 12 : best % 12}${best < 12 ? 'am' : 'pm'}.`;
    }
    if (/task|todo|to-do/.test(q)) {
      const open = tasks.filter(t => !t.completedOn);
      return open.length ? `You have ${open.length} open task${open.length===1?'':'s'}.` : "No open tasks right now — you're caught up.";
    }
    if (/spend|spending|money|budget|finance|expense/.test(q)) {
      const tx = Store.get('transactions', []);
      const monthKey = todayStr().slice(0, 7);
      const monthTx = tx.filter(t => t.date && t.date.slice(0,7) === monthKey);
      if (!monthTx.length) return "No transactions logged this month yet.";
      const spend = monthTx.filter(t => t.type === 'expense').reduce((s,t)=>s+t.amount,0);
      const income = monthTx.filter(t => t.type === 'income').reduce((s,t)=>s+t.amount,0);
      return `This month so far: ${income.toFixed(0)} logged in income, ${spend.toFixed(0)} in expenses.`;
    }
    if (/mood|feeling|journal/.test(q)) {
      const journal = Store.get('journal', []);
      if (!journal.length) return "No journal entries yet — even a couple of lines a day builds a useful record.";
      const last = [...journal].sort((a,b)=>b.createdAt-a.createdAt)[0];
      return last.mood ? `Your last journal entry (${last.date}) was logged as "${last.mood}".` : `Your last journal entry was on ${last.date}.`;
    }
    if (/sudoku|cyber ?lock|mind arena|game/.test(q)) {
      const sudoku = Store.get('sudoku_stats', {}), cyberlock = Store.get('cyberlock_stats', {});
      const parts = [];
      if (sudoku.completed) parts.push(`${sudoku.completed} Sudoku puzzle${sudoku.completed===1?'':'s'} completed`);
      if (cyberlock.totalVaultsOpened) parts.push(`${cyberlock.totalVaultsOpened} vault${cyberlock.totalVaultsOpened===1?'':'s'} cracked in Cyber Lock`);
      return parts.length ? parts.join(', ') + '.' : "You haven't played anything in Mind Arena yet — Sudoku and Cyber Lock are both in there.";
    }
    if (/quote|motivate|inspire|encourage/.test(q)) {
      return Ext.quoteOfTheDay ? Ext.quoteOfTheDay() : "Small daily wins compound into big changes.";
    }
    if (/this week|weekly|week going/.test(q)) {
      const log = Ext.XP ? Ext.XP.log() : [];
      const weekAgo = Date.now() - 7 * 86400000;
      const weekLog = log.filter(e => e.at >= weekAgo);
      const xpThisWeek = weekLog.reduce((s, e) => s + (e.amount || 0), 0);
      const tasksDone = tasks.filter(t => t.completedOn && new Date(t.completedOn).getTime() >= weekAgo).length;
      const pomo = Store.get('pomoSessions', {});
      const focusThisWeek = Array.from({length:7},(_,i)=>daysAgo(i)).reduce((s,d)=>s+(pomo[d]||0),0);
      return `This week: ${tasksDone} task${tasksDone===1?'':'s'} completed, ${focusThisWeek} focus session${focusThisWeek===1?'':'s'}, ${xpThisWeek} XP earned.`;
    }
    if (/what.*(day|date)|today/.test(q)) {
      const d = new Date();
      return `Today is ${weekdayName(d.getDay())}, ${d.toLocaleDateString()}.`;
    }
    if (/suggest|what should|recommend/.test(q)) {
      const open = tasks.filter(t => !t.completedOn);
      if (open.length) return `Maybe start with "${open[0].title}" — it's been open the longest.`;
      return "You're clear on tasks — a focus session or a habit check-in would be a good next move.";
    }
    if (/status|how am i doing|summary/.test(q)) {
      const insights = buildInsights();
      return insights.slice(0, 2).join(' ');
    }
    return "I can answer things like: \"how's my streak?\", \"what should I do next?\", \"how's this week going?\", \"motivate me\", or say \"open journal\" / \"open dna\" to jump straight there.";
  }

  function mountLauncher() {
    if (document.getElementById('assistant-launcher')) return;
    const btn = document.createElement('button');
    btn.id = 'assistant-launcher';
    btn.className = 'assistant-launcher';
    btn.title = 'SVBG Assistant';
    btn.innerHTML = `<span class="nav-icon" data-icon="assistant-spark"></span>${hasNudge() ? '<span class="assistant-dot" id="assistant-dot"></span>' : ''}`;
    document.body.appendChild(btn);
    paintIcons(btn);
    btn.addEventListener('click', togglePanel);
  }

  function addBubble(feed, text, kind) {
    const bubble = document.createElement('div');
    bubble.className = `assistant-bubble${kind ? ' assistant-bubble-' + kind : ''}`;
    bubble.textContent = text;
    feed.appendChild(bubble);
    feed.scrollTop = feed.scrollHeight;
    return bubble;
  }

  let panelOpen = false;
  function togglePanel() {
    let panel = document.getElementById('assistant-panel');
    if (panel) { panel.remove(); panelOpen = false; return; }
    panelOpen = true;
    document.getElementById('assistant-dot')?.remove(); // seen it, dismiss for this session
    panel = document.createElement('div');
    panel.id = 'assistant-panel';
    panel.className = 'assistant-panel';
    const insights = buildInsights();
    const headline = insights[Math.floor(Math.random() * insights.length)];
    panel.innerHTML = `
      <div class="assistant-panel-head">
        <span>SVBG Assistant</span>
        <button class="assistant-close" id="assistant-close">&times;</button>
      </div>
      <div class="assistant-quick-row" id="assistant-quick-row"></div>
      <div class="assistant-panel-body" id="assistant-feed">
        <div class="assistant-bubble">${escapeHtml(headline)}</div>
      </div>
      <div class="assistant-suggest-row" id="assistant-suggest-row">
        ${SUGGESTIONS.map(s => `<button type="button" class="assistant-suggest-chip">${escapeHtml(s)}</button>`).join('')}
      </div>
      <form class="assistant-ask-row" id="assistant-ask-form">
        <input type="text" id="assistant-ask-input" placeholder="Ask, or say &quot;open journal&quot;..." autocomplete="off" />
        <button type="submit" class="btn btn-sm btn-primary">Ask</button>
      </form>
      <div class="assistant-hint">Rule-based and fully offline — not a language model. Reads only what SVBG Labs already tracks locally.</div>
    `;
    document.body.appendChild(panel);

    // quick-action shortcuts, sourced from the same command list as the palette
    const quickRow = panel.querySelector('#assistant-quick-row');
    const quickIds = ['new-task', 'start-focus', 'open-journal', 'open-dna'];
    if (Ext.buildCommands) {
      const commands = Ext.buildCommands();
      quickIds.forEach(id => {
        const cmd = commands.find(c => c.id === id);
        if (!cmd) return;
        const chip = document.createElement('button');
        chip.type = 'button'; chip.className = 'assistant-quick-chip'; chip.textContent = cmd.label;
        chip.addEventListener('click', () => { togglePanel(); cmd.run(); });
        quickRow.appendChild(chip);
      });
    }

    const feed = panel.querySelector('#assistant-feed');
    function ask(text) {
      if (!text.trim()) return;
      addBubble(feed, text, 'user');
      addBubble(feed, answerQuery(text.trim()), 'answer');
    }

    panel.querySelector('#assistant-close').addEventListener('click', togglePanel);
    panel.querySelector('#assistant-ask-form').addEventListener('submit', e => {
      e.preventDefault();
      const input = panel.querySelector('#assistant-ask-input');
      ask(input.value);
      input.value = '';
    });
    panel.querySelectorAll('.assistant-suggest-chip').forEach(chip => {
      chip.addEventListener('click', () => ask(chip.textContent));
    });
  }

  function init() { mountLauncher(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
