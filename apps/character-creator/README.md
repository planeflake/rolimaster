# Aethergate Character Creator

Standalone Svelte 5 portal for building Mana World / Rolemaster characters.

The app uses the Obsidian Markdown notes in `Aethergate/Rolemaster/` as the source of truth. Before dev, preview, or build, `scripts/build-data.mjs` reads those notes and refreshes `src/lib/generated-data.json` for the Svelte app.

Current data sources:

- `06 Races/*.md`
- `02 Professions/*.md`
- `03 Spell Lists/**/*.md`
- `Talents.md`
- `04 Training Packages/*.md`
- `Skills.md`

## Commands

```bash
npm install
npm run dev
npm run build
```

`npm run dev` serves the built portal at `http://127.0.0.1:4173/`. `npm run dev:vite` is kept for later live-reload work, but the built preview is the reliable local runner for now.

`npm run dev` now also starts the shared character save service. Network devices should open the PC's network address, such as `http://10.0.0.9:4173/`, and they will load/save against the same character library.

The shared library is stored at `apps/character-creator/data/character-library.json`. The browser still keeps a local copy as a fallback if the shared service is unavailable.

## Current Character Model

- Choose race.
- Choose profession.
- Choose spell lists.
- Choose talents.
- Choose training packages.
- Spend XP on skills.

Skill XP modes:

| Mode | Rank gain per 1 XP |
|---|---:|
| Normal | 1 |
| Trained | 2 |
| Expert | 4 |

Characters are saved through the shared local server when available, with browser local storage kept as a fallback.

Do not edit `src/lib/generated-data.json` by hand; update the Markdown notes and rerun the app instead.
