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
  {
    id: 'effect.disruptive-shield',
    name: 'Disruptive Shield',
    description: 'A short-lived interruption barrier.',
    icon: 'shield',
    kind: 'barrier',
    tags: ['beneficial', 'barrier', 'disruption'],
    durationSeconds: 5,
    stacking: { mode: 'replace-stronger', maxStacks: 1 },
    barrierAmount: 20,
    persistence: 'between-enemies',
    beneficial: true,
  },
  {
    id: 'effect.riposte-form', name: 'Riposte Form', description: 'Parry-powered Sword damage.', icon: 'sword', kind: 'buff', tags: ['beneficial', 'sword'], durationSeconds: 3, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'attackPower', operation: 'addPercent', value: .1 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.deflecting-angle', name: 'Deflecting Angle', description: 'Parry-powered Accuracy.', icon: 'shield', kind: 'buff', tags: ['beneficial', 'sword'], durationSeconds: 4, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'accuracy', operation: 'flat', value: 6 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.counter-window', name: 'Counter Window', description: 'A brief faster attack window after a Parry.', icon: 'timer', kind: 'buff', tags: ['beneficial', 'sword'], durationSeconds: 3, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'attackInterval', operation: 'addPercent', value: -.08 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.flowing-stance', name: 'Flowing Stance', description: 'Stance-switch momentum.', icon: 'wind', kind: 'buff', tags: ['beneficial', 'sword'], durationSeconds: 4, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'attackPower', operation: 'addPercent', value: .05 }, { stat: 'accuracy', operation: 'flat', value: 5 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.afterglow', name: 'Afterglow', description: 'Recent Fire casting improves Spell Accuracy.', icon: 'spark', kind: 'buff', tags: ['beneficial', 'fire'], durationSeconds: 3, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'accuracy', operation: 'flat', value: 5 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.reactive-weave', name: 'Reactive Weave', description: 'Barrier break recovery window.', icon: 'rune', kind: 'buff', tags: ['beneficial', 'warding'], durationSeconds: 1, stacking: { mode: 'refresh', maxStacks: 1 }, persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.unbroken-cycle', name: 'Unbroken Cycle', description: 'Barrier break recovery window.', icon: 'rune', kind: 'buff', tags: ['beneficial', 'warding'], durationSeconds: 1, stacking: { mode: 'refresh', maxStacks: 1 }, persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.absorptive-discipline', name: 'Absorptive Discipline', description: 'Armor gained after Barrier absorption.', icon: 'shield', kind: 'buff', tags: ['beneficial', 'warding'], durationSeconds: 3, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'armor', operation: 'flat', value: 4 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.reactive-fortification', name: 'Reactive Fortification', description: 'Armor and Status Resistance after Barrier break.', icon: 'shield', kind: 'buff', tags: ['beneficial', 'warding'], durationSeconds: 4, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'armor', operation: 'flat', value: 10 }, { stat: 'statusResistance', operation: 'flat', value: .1 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.null-pressure', name: 'Null Pressure', description: 'Exposed targets have reduced Accuracy.', icon: 'target', kind: 'debuff', tags: ['harmful', 'disruption'], durationSeconds: 4, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'accuracy', operation: 'flat', value: -5 }], persistence: 'enemy-life',
  },
  {
    id: 'effect.counter-discipline', name: 'Counter Discipline', description: 'Armor gained after a successful interrupt.', icon: 'shield', kind: 'buff', tags: ['beneficial', 'disruption'], durationSeconds: 4, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'armor', operation: 'flat', value: 3 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.reflexive-null', name: 'Reflexive Null', description: 'Dodge gained after a successful interrupt.', icon: 'shield', kind: 'buff', tags: ['beneficial', 'disruption'], durationSeconds: 4, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'dodgeChance', operation: 'flat', value: .01 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.arcane-reprisal', name: 'Arcane Reprisal', description: 'Damage gained after a successful interrupt.', icon: 'spark', kind: 'buff', tags: ['beneficial', 'disruption'], durationSeconds: 4, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'attackPower', operation: 'addPercent', value: .1 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.unbreakable-counter', name: 'Unbreakable Counter', description: 'Armor gained after a successful interrupt.', icon: 'shield', kind: 'buff', tags: ['beneficial', 'disruption'], durationSeconds: 5, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'armor', operation: 'flat', value: 10 }], persistence: 'between-enemies', beneficial: true,
  },
  {
    id: 'effect.opening-created', name: 'Opening Created', description: 'Accuracy gained after an interrupt.', icon: 'target', kind: 'buff', tags: ['beneficial', 'disruption'], durationSeconds: 4, stacking: { mode: 'refresh', maxStacks: 1 }, statModifiers: [{ stat: 'accuracy', operation: 'flat', value: 5 }], persistence: 'between-enemies', beneficial: true,
  },
])

export const effectById = Object.fromEntries(effectDefinitions.map((effect) => [effect.id, effect])) as Record<string, EffectDefinition>
