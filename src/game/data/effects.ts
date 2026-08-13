import { combatBalance } from '../combat/combatBalance'
import type { EffectDefinition } from '../combat/combatEffectTypes'
import { deepFreeze } from './freeze'

/** Small reference catalogue used to exercise the generic effect runtime. */
export const effectDefinitions = deepFreeze<EffectDefinition[]>([
  {
    id: 'effect.burn',
    name: 'Burn',
    description: 'Takes periodic Fire damage.',
    icon: 'spark',
    kind: 'debuff',
    tags: ['harmful', 'burn', 'fire'],
    durationSeconds: combatBalance.burnDuration,
    stacking: { mode: 'refresh', maxStacks: 1 },
    periodic: { intervalSeconds: combatBalance.burnInterval, operation: { type: 'damage', damageType: 'fire', baseAmount: combatBalance.burnDamage, canCrit: false } },
    cleanseTags: ['harmful', 'burn'],
    persistence: 'enemy-life',
  },
  {
    id: 'effect.bleed',
    name: 'Bleed',
    description: 'Takes periodic Physical damage. Bleeds can stack.',
    icon: 'cross',
    kind: 'debuff',
    tags: ['harmful', 'bleed', 'physical'],
    durationSeconds: combatBalance.bleedDuration,
    stacking: { mode: 'stack-refresh', maxStacks: 3 },
    periodic: { intervalSeconds: combatBalance.bleedInterval, operation: { type: 'damage', damageType: 'physical', baseAmount: combatBalance.bleedDamage, canCrit: false } },
    cleanseTags: ['harmful', 'bleed'],
    persistence: 'enemy-life',
  },
  {
    id: 'effect.armor-broken',
    name: 'Armor Broken',
    description: 'Reduces Armor while active.',
    icon: 'shield',
    kind: 'debuff',
    tags: ['harmful', 'armor-break'],
    durationSeconds: combatBalance.armorBrokenDuration,
    stacking: { mode: 'refresh', maxStacks: 1 },
    statModifiers: [{ stat: 'armor', operation: 'flat', value: -15 }],
    cleanseTags: ['harmful', 'armor-break'],
    persistence: 'enemy-life',
  },
  {
    id: 'effect.exposed',
    name: 'Exposed',
    description: 'Reduces Evasion while active.',
    icon: 'target',
    kind: 'debuff',
    tags: ['harmful', 'exposed'],
    durationSeconds: combatBalance.exposedDuration,
    stacking: { mode: 'refresh', maxStacks: 1 },
    statModifiers: [{ stat: 'evasion', operation: 'flat', value: -15 }],
    cleanseTags: ['harmful', 'exposed'],
    persistence: 'enemy-life',
  },
  {
    id: 'effect.protective-sign',
    name: 'Protective Sign',
    description: 'Absorbs incoming damage before HP.',
    icon: 'shield',
    kind: 'barrier',
    tags: ['beneficial', 'barrier'],
    durationSeconds: combatBalance.protectiveSignDuration,
    stacking: { mode: 'replace-stronger', maxStacks: 1 },
    barrierAmount: combatBalance.protectiveSignAmount,
    persistence: 'between-enemies',
    beneficial: true,
  },
])

export const effectById = Object.fromEntries(effectDefinitions.map((effect) => [effect.id, effect])) as Record<string, EffectDefinition>
