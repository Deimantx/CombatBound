# CombatBound Idle

CombatBound Idle is a combat-focused idle RPG interface prototype built with React, TypeScript, Vite, Zustand, Lucide React, and CSS.

## Run it

```bash
npm install
npm run dev
```

Checks:

```bash
npm run typecheck
npm run test
npm run build
```

## Current scope

The first gameplay vertical slice includes a persistent shell, hierarchical Continent → Region → Area → Sub-area → Combat Location navigation, weighted random group generation, continuous location Hunts, real multi-enemy combat, automatic attacks, explicit runtime targeting, enemy specials and interrupts, stances, sustained techniques, spells, healing potions, XP and Hunter Rank, real loot, equipment-derived combat stats, Inventory, Collection/Bestiary progress, and a development-only UI Inspector.

Balance and content are still temporary MVP values. There is no offline simulation, crafting, movement, companion system, or final art yet.

Available screens: Home, Combat, Equipment, Inventory, Collection Log, Settings, and Info.

The source is organized by application shell, screen, shared component, gameplay domain, state, persistence, and style responsibilities. Combat calculations live outside React and are covered by deterministic domain tests. The interface uses normal authored CSS grid and flex layouts.
