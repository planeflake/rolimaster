# Mana World Repository Guide

## Project

Mana World is a fantasy setting built around Rolemaster 2nd Edition.

- Primary setting location: Aethergate.
- Obsidian vault root: `Aethergate/`.
- The Smouldering Cog is the starting tavern.

## Repository Layout

World lore is stored as Obsidian Markdown notes under `Aethergate/`.

- `00 World Overview/`: setting-level concepts and history.
- `01 Locations/`: cities, settlements, and local places.
- `02 Factions/`: organizations and political groups.
- `03 Regions/`: broad geographic areas.
- `04 Mysteries/`: hidden history and campaign mysteries.
- `05 NPCs/`: named characters and notable entities.
- `06 Campaign/`: campaign notes, sessions, and starting quests.
- `07 Player Handouts/`: player-facing material.
- `08 Items and Menus/`: props, items, and menus.
- `09 Lore/`: additional setting lore.
- `Rolemaster/`: Rolemaster imports, indexes, professions, spell lists, tables, and templates.

## Markdown Rules

- Use one Markdown file per location, faction, NPC, profession, spell list, training package, or concept.
- Add YAML frontmatter to every new page.
- Prefer Obsidian wiki links such as `[[The Nine Fonts]]` and `[[The Smouldering Cog]]`.
- Use aliased wiki links when the sentence needs different display text, such as `[[Aetherspark, Architect of the Currents|Aetherspark's]]`.
- Prefer creating new Markdown files over restructuring existing content.
- Keep player-facing notes separate from campaign secrets.

## Rolemaster Import Rules

- Use one file per spell list.
- Use one file per profession.
- Use one file per training package.
- Do not create individual spell files unless explicitly requested.
- Preserve original Rolemaster spell list names, including punctuation and apostrophes.
- Use the existing templates in `Aethergate/Rolemaster/99 Templates/` when applicable.
- Add or update the relevant index when creating Rolemaster pages.
- For scanned PDF imports, use the reusable OCR workflow in `OCR.md` before rediscovering extraction tools.

## World Rules

- Magic is powered by mana.
- Mana originates from the Nine Fonts.
- Fonts cycle between Essence, Mentalism, Channeling, and Arcane.
- The world uses Cycles as its primary historical dating system.
- Aethergate is the main campaign city.
- The Smouldering Cog is the starting tavern.

## Current Priority

1. Build Rolemaster spell indexes.
2. Build profession pages.
3. Build training package pages.
4. Expand world lore.
5. Connect Rolemaster mechanics to Mana World lore.

## Existing Material Notes

- The vault already contains imported spell-list pages for Channeling, Essence, and Mentalism.
- `Aethergate/Rolemaster/00 Indexes/` contains the central Rolemaster indexes.
- `Aethergate/Rolemaster/04 Training Packages/` contains training-package rules and one page per package.
- `Aethergate/Rolemaster/99 Templates/` contains profession, spell-list, and spell templates.
- Some older lore and index pages predate the YAML convention. Add frontmatter when touching those pages if it can be done without broad restructuring.
- ZIP files in the vault root are source or archive packages. Do not unpack, replace, or remove them unless explicitly requested.
