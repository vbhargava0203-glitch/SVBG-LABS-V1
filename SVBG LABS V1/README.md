# SVBG Labs

An offline-first personal operating system that runs entirely in your browser.
No accounts, no server, no cloud APIs, no tracking. Everything you enter is
stored in `localStorage` on your device only.

## Running it

There's no build step and no install. Two options:

1. **Just open it.** Double-click `index.html` and it opens in your browser. All
   features work directly from the filesystem.
2. **Serve it locally** (recommended, avoids some browsers' file:// restrictions
   on clipboard access):
   ```bash
   cd humanos
   python3 -m http.server 8080
   # then open http://localhost:8080
   ```

## What's included

**Core (v1):**
- **Dashboard** — daily overview: open tasks, habit streaks, monthly cash
  flow, a "core score" summarizing how your day is going.
- **Tasks, Notes, Journal, Habits, Focus Timer, Finance, Bookmarks, Vault
  Tools, Calculator, Settings, Global search, Local sign-in** — see the
  in-app Settings screen for the full shortcut list.

**New in this upgrade (v2), all built on real local data — nothing here is
decorative or fabricated:**

- **SVBG DNA** — 8 life-metrics (Mind, Focus, Health, Learning,
  Discipline, Finance, Creativity, Consistency) computed from your actual
  tasks, habits, journal, notes, and transactions, with a daily-snapshot
  trend vs. last week/month, strengths & weaknesses, and short rule-based
  insights.
- **Knowledge Graph** — a hand-rolled force-directed graph (no D3
  dependency, so it works fully offline) of your tasks/notes/journal/
  habits/bookmarks, auto-linked by shared keywords. Drag nodes, scroll to
  zoom, click for details.
- **Achievements & Levels** — an XP engine awards points for real actions
  (completing a task, logging a habit, journaling, finishing a focus
  session, etc.), with a level curve and 18 achievements across four
  rarity tiers, visible in Mission Control.
- **Command Palette** (`Ctrl/Cmd + Space`) — fuzzy-searchable list of
  actions: jump to any view, start a focus session, generate a password,
  export data, switch themes.
- **Terminal** (`Ctrl/Cmd + J`) — a small REPL (`help`, `task add ...`,
  `note add ...`, `focus start`, `theme <name>`, `human score`,
  `achievements`, `level`, `open <view>`, `whoami`, `clear`) with command
  history (↑/↓).
- **Mission Control** (`Ctrl/Cmd + Shift + M`) — a single-screen
  operational view: productivity/focus/habit gauges, level & XP, net cash
  flow, storage size, and the full achievement board.
- **Reflection & Productivity Heatmap** — a local rule engine writes a
  short daily reflection (task counts vs. your 7-day average, habit
  check-ins, spending, a rotating local quote — no text-generation model
  involved), plus a GitHub-style heatmap of the last ~26 weeks, filterable
  by Tasks / Focus / Habits / Overall.
- **Recruiter Mode** (`Ctrl/Cmd + Shift + R`) — a one-click, fully
  reversible showcase mode. Turning it on backs up your real data, loads
  a clearly-labeled demo dataset, and shows a persistent "Recruiter Mode
  is ON" banner; turning it off restores your real data exactly as it
  was. Includes an editable tech-stack/links panel.
- **Cinematic boot sequence** — plays once per browser tab on load
  (skippable, replayable from Settings, and skipped automatically if your
  OS/browser has "reduce motion" turned on).
- **3D neural background** *(progressive enhancement)* — if Three.js
  loads from its CDN, the ambient background upgrades from the original
  2D particle field to a mouse-reactive 3D neural web that pulses when
  you complete actions. If there's no internet on first load, the
  original 2D field keeps running automatically — nothing else in the
  app depends on this.

## SVBG Mind Arena (v3 addition)

Two premium, fully offline strategy games behind a single **Mind Arena**
hub in the sidebar. Selecting either plays a short (~4s, skippable)
Canvas 2D "neural corridor" flythrough before handing off to the game —
a small dependency-free touch (`js/svbg-mindarena.js`) so the games feel
like arriving somewhere rather than an embedded browser widget.

**♟ SVBG Chess** (`js/svbg-chess.js`) — a from-scratch chess engine (legal
move generation, check/checkmate/stalemate, castling, en passant,
promotion) verified during development against known perft values
(20 / 400 / 8902 at depths 1–3 from the start position), plus a small
alpha-beta AI across 5 difficulty levels, a move-history panel with a
built-in opening-name lookup, hints, undo/redo, 5 hand-verified mate-in-1
puzzles plus a date-seeded daily puzzle, Vs AI / local 2-player modes, and
an ELO estimate that updates after each AI game.

**🔢 SVBG Sudoku** (`js/svbg-sudoku.js`) — a randomized-backtracking
generator paired with a solution-counter, so every generated puzzle is
checked to have exactly one solution before it's served, across 5
difficulties (46/36/30/26/~24 clues). Pencil marks, live mistake
detection, hints, undo/redo, a Relax Mode (no timer or mistake alerts), a
date-seeded daily challenge, and auto-save/resume.

Both games share one pattern: a pure, dependency-free game-logic layer
underneath a renderer with two implementations behind the same
interface — a real 3D scene if Three.js loads from its CDN (a floating
board/grid, PBR-style materials, real shadows, a hand-rolled orbit
camera, move/placement animations, additive glow sprites standing in for
full bloom/SSR postprocessing, which would need Three.js's separate
examples/addons), or a polished 2D canvas board if it doesn't. Either way
the game itself is 100% playable offline; only the extra 3D visual layer
needs that one network fetch, same as the ambient background above.
Winning/completing puzzles awards real XP and updates each game's own
local stats (`chess_stats`/`chess_history`, `sudoku_stats`/
`sudoku_history`) and achievement entries on the existing board — neither
game invents a new SVBG DNA metric, for the same reason given in each
file's header comment.

## SVBG Cyber Lock, and v4 additions

**SVBG Cyber Lock** joined the Mind Arena as a third game: rotate
concentric security rings until every ring's hidden key glyph reaches the
top marker. Four difficulty tiers (Apprentice through Quantum Engineer),
Zen and Time Attack modes, and difficulty keeps climbing indefinitely
past each tier's target depth. Canvas 2D rather than 3D, deliberately —
see the file header in `js/svbg-cyberlock.js` for why.

This round also added, all offline and all built on real local data:

- **SVBG Assistant** — a floating rule-based panel (bottom-right, on
  every screen) that surfaces local insights and answers a handful of
  simple pattern-matched questions about your streaks, tasks, focus
  times, and achievements. Explicitly not an AI model — see the file
  header in `js/svbg-assistant.js`.
- **Cybersecurity Toolkit expansion** — Vault Tools gained AES-256-GCM
  encrypt/decrypt (PBKDF2 key derivation), a from-spec MD5 implementation
  (verified against the RFC 1321 test vectors), a UUID v4 generator, a
  color picker with hex/RGB/HSL conversion, a JSON formatter/minifier, a
  live regex tester, URL encode/decode, a line-level text diff, and file
  checksums (SHA-256/SHA-1/MD5). Nothing here is ever uploaded anywhere.
- **Focus Music Studio** — an ambient sound mixer. Every sound (rain,
  ocean, forest, fireplace, thunder, a deep space drone, mechanical
  keyboard, white/pink/brown noise) is synthesized live with the Web
  Audio API — filtered/shaped noise and oscillators, not audio files —
  so there's nothing to download. Sounds mix freely with independent
  volume sliders, a real analyser-driven equalizer, and savable presets.
- **Timeline** — a single chronological, filterable, searchable feed of
  everything you've done in SVBG Labs, built from the same XP activity
  log Time Machine and Life Coach already read.
- **Time Capsule** — write yourself a message, lock it for 30/90/365/
  1825 days, and it genuinely can't be opened before that (checked
  against the real clock) — with a countdown and an opening moment.
- **Konami code** — the classic ↑↑↓↓←→←→BA sequence unlocks a hidden
  "Konami Master" achievement.
- **Ctrl/Cmd+K** now also opens the Command Palette, alongside the
  existing Ctrl/Cmd+Space.

### Honest scope note on this round

The brief this round (`SVBG Labs Ultimate Expansion — Version X`) asked
for 22 subsystems, several of which are genuinely multi-week builds on
their own and weren't built here: a 3D Trophy Room museum, the
procedural "SVBG Universe" (tasks-as-planets), Focus Forest (trees with
seasons/weather/wildlife), a 3D Memory Palace, a macOS-style Dock
(which would also restructure the sidebar nav), a Module Store, a Lock
Screen, a Notification Center, a Digital Companion, and 9 more
Workspace Themes. The brief's "Dynamic Wallpapers" section also directly
conflicts with an earlier, explicit request to remove the ambient
background effect app-wide — skipped for that reason too. All of the
above are real candidates for future, dedicated passes rather than
something to fake here.

## Honest notes on the v2 upgrade

- **Three.js is the one optional network dependency.** Everything else —
  including the knowledge graph, which could have used D3 — is written
  by hand specifically so the app keeps its "no required network
  requests" property. If you're fully offline the first time you open
  the app, you get the 2D background instead of the 3D one; everything
  else is unaffected.
- **"AI" in the Reflection Engine is rule-based**, matching the rest of
  the app's local-logic approach (pattern comparisons against your own
  history, template sentences, a small local quote bank) — not a text
  generation model. That's consistent with the "no external AI APIs"
  requirement, but it's worth knowing so expectations are set correctly.
- **Mission Control's stats are only ones we can compute honestly** from
  what the app actually tracks (tasks, habits, focus sessions, notes,
  transactions). It intentionally does not show things like "sleep" or
  "goals" that a prior mockup suggested, since SVBG Labs doesn't collect
  that data — adding those for real would need a new Sleep or Goals
  feature first, not a fake gauge.
- **Keyboard shortcuts** use safe, override-friendly combinations
  (`Ctrl/Cmd+Space`, `Ctrl/Cmd+J`, `Ctrl/Cmd+Shift+D/M/R`) rather than
  browser-reserved ones like plain `Ctrl+R`, so they work reliably across
  browsers without hijacking page reload/bookmark shortcuts.
- All of this is additive: `js/app.js`, `css/styles.css`, and
  `index.html`'s structure are unchanged apart from a handful of one-line
  hooks (awarding XP on actions) and new nav buttons/script tags. The new
  systems live in `js/extensions.js` and `css/extensions.css` so it's easy
  to see exactly what changed.


## Design

- Display type: Space Grotesk. Body: Inter. Data/mono: JetBrains Mono
  (falls back to system fonts if offline when first loaded).
- Three themes: a neon **Cyber** default, a calmer **Dark**, and a warm
  **Light** mode, each defined as a small set of CSS custom properties in
  `css/styles.css`.
- The ambient particle field in the background is the app's signature
  visual element — a quiet, cursor-reactive canvas animation representing
  a "living system," built with vanilla Canvas 2D (no library).
- Respects `prefers-reduced-motion`.

## Data & privacy

Everything lives under `localStorage` keys prefixed `humanos:`. Nothing
leaves your machine. This also means:

- Clearing your browser's site data will erase everything — use
  **Settings → Export data** to back up.
- Data does not sync between browsers or devices. That would require a
  server or a paid sync API, which is intentionally out of scope here.
- There is no real authentication — this is a single-user, single-device
  local tool, not a multi-tenant system with accounts.

## Honest scope note

This is a genuinely working, single-page application covering the core
"personal OS" surface (tasks, notes, journal, habits, finance, focus
timer, security tools, search, theming). It is **not** the full
Next.js/Express/Postgres/Docker/ML-powered platform described in a larger
spec — that would be a multi-month, multi-engineer build with a real
backend, database, authentication, CI/CD, and test suite. If you want to
grow this into that, natural next slices (each shippable on its own) are:

1. A backend (Node/Express + SQLite/Postgres via Prisma) so data can sync
   across devices, with real authentication.
2. A proper PWA layer (service worker + manifest) for installability and
   offline caching of the app shell itself.
3. Splitting `js/app.js` into per-feature modules as the codebase grows.
4. Automated tests (Vitest for logic like `calcEvaluate`/`assessStrength`,
   Playwright for the UI flows).

## File structure

```
humanos/
├── index.html            # shell: sidebar, topbar, content mount point, auth gate
├── css/
│   ├── styles.css         # design tokens + all core component styles
│   ├── extensions.css     # styles for the v2 systems (additive, no overrides)
│   ├── svbg-advanced.css, svbg-mindarena.css, svbg-chess.css, svbg-sudoku.css,
│   │   svbg-cyberlock.css, svbg-about.css, svbg-assistant.css,
│   │   svbg-focusmusic.css, svbg-timeline.css, svbg-timecapsule.css,
│   │   svbg-easter.css    # one stylesheet per additive module, same pattern
├── js/
│   ├── app.js              # store, router, auth, and every core feature module
│   ├── extensions.js       # v2 systems: DNA, graph, palette, terminal, mission
│   │                        # control, reflection/heatmap, recruiter mode, boot
│   │                        # sequence, 3D background
│   ├── svbg-advanced.js    # Evolution System, Passport, Time Machine, Life Coach
│   ├── svbg-mindarena.js   # Mind Arena hub + shared corridor intro
│   ├── svbg-chess.js       # SVBG Chess: engine, AI, 3D/2D renderer, audio
│   ├── svbg-sudoku.js      # SVBG Sudoku: generator/solver, 3D/2D renderer, audio
│   ├── svbg-cyberlock.js   # SVBG Cyber Lock: rotating-ring vault puzzle
│   ├── svbg-about.js       # About page
│   ├── svbg-toolkit.js     # Cybersecurity Toolkit expansion (extends Vault Tools)
│   ├── svbg-assistant.js   # SVBG Assistant floating panel
│   ├── svbg-focusmusic.js  # Focus Music Studio
│   ├── svbg-timeline.js    # Timeline
│   ├── svbg-timecapsule.js # Time Capsule
│   └── svbg-easter.js      # Konami code + Ctrl/Cmd+K shortcut alias
│                            # all additive modules loaded after app.js, each
│                            # only ever appending to shared systems, never
│                            # editing another module's code
└── README.md
```
