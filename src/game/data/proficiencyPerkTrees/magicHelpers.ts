import type { DamageType, ModifiableCombatStatKey } from '../../combat/combatTypes'
import type { MagicProficiencyId, ProficiencyPerkDefinition, ProficiencyPerkEffect } from '../../progression/progressionTypes'
import { all, id, pos } from './helpers'

export type MagicBranchKind = 'frost' | 'tidal' | 'flow' | 'restoration' | 'mist' | 'lightning' | 'chain' | 'haste' | 'control' | 'wind' | 'stone' | 'armor-penetration' | 'fortification' | 'barrier' | 'quake' | 'shadow' | 'curse' | 'decay' | 'drain' | 'doom'

export interface MagicBranchSpec {
  name: string
  kind: MagicBranchKind
  names: [string, string, string, string, string, string, string]
  icon?: string
}

export interface MagicCrossNodeSpec {
  name: string
  links: [[number, number], [number, number]]
  effects?: ProficiencyPerkEffect[]
  description?: string
}

export interface MagicTreeProfile {
  proficiencyId: MagicProficiencyId
  schoolName: string
  damageType: DamageType
  rootName: string
  icon: string
  branches: [MagicBranchSpec, MagicBranchSpec, MagicBranchSpec, MagicBranchSpec, MagicBranchSpec]
  crossNodes: [MagicCrossNodeSpec, MagicCrossNodeSpec, MagicCrossNodeSpec]
  apexName: string
  apexEffects: ProficiencyPerkEffect[]
}

const stat = (statName: ModifiableCombatStatKey, valuePerRank: number): ProficiencyPerkEffect => ({ type: 'statModifier', stat: statName, operation: 'flat', valuePerRank })
const spellDamage = (valuePerRank: number): ProficiencyPerkEffect => ({ type: 'spellDamageModifier', valuePerRank })
const conditional = (valuePerRank: number, condition: Extract<ProficiencyPerkEffect, { type: 'spellConditionalDamageModifier' }>['condition']): ProficiencyPerkEffect => ({ type: 'spellConditionalDamageModifier', operation: 'increased', valuePerRank, condition })
const effectChance = (effectId: string, chancePerRank: number): ProficiencyPerkEffect => ({ type: 'onSpellHitApplyEffect', effectId, chancePerRank })
const effectDuration = (effectId: string, valuePerRank: number): ProficiencyPerkEffect => ({ type: 'appliedEffectDurationModifier', effectId, valuePerRank })
const effectStacks = (effectId: string, valuePerRank: number): ProficiencyPerkEffect => ({ type: 'appliedEffectMaxStacksModifier', effectId, valuePerRank })
const cost = (valuePerRank: number): ProficiencyPerkEffect => ({ type: 'spellManaCostModifier', valuePerRank })
const cooldown = (valuePerRank: number): ProficiencyPerkEffect => ({ type: 'spellCooldownModifier', valuePerRank })

// CombatBound proficiency/perk trees are still prototype content and are scheduled for a future full identity/rebalance redesign.

function branchEffects(profile: MagicTreeProfile, kind: MagicBranchKind, index: number): ProficiencyPerkEffect[] {
  const decay = 'effect.shadow-decay'
  const variants: Record<MagicBranchKind, ProficiencyPerkEffect[][]> = {
    frost: [[effectChance('effect.chilled', .06)], [effectDuration('effect.chilled', .1)], [{ type: 'sourceEffectOutgoingDamageModifier', effectId: 'effect.chilled', valuePerRank: .02 }], [conditional(.05, { type: 'targetHasEffect', effectId: 'effect.chilled' })], [effectDuration('effect.chilled', .1)], [conditional(.15, { type: 'targetHasEffect', effectId: 'effect.chilled' }), effectStacks('effect.chilled', 1)], [conditional(.25, { type: 'targetHasEffect', effectId: 'effect.chilled' }), effectDuration('effect.chilled', .15)]],
    tidal: [[spellDamage(.03)], [spellDamage(.03)], [spellDamage(.05)], [{ type: 'spellCriticalDamageModifier', valuePerRank: .05 }], [conditional(.12, { type: 'manaAbove', fraction: .7 })], [spellDamage(.15)], [conditional(.25, { type: 'targetHpAbove', fraction: .6 })]],
    flow: [[cost(-.04)], [stat('maxMana', 5)], [{ type: 'spellOnHpDamageResourceRestore', resource: 'mana', amountPerRank: 1, chancePerRank: .1 }], [stat('manaRegenFlat', .25)], [cost(-.08)], [stat('manaRegenFlat', .5), stat('maxMana', 10)], [cost(-.1), stat('maxMana', 15), stat('manaRegenFlat', .5)]],
    restoration: [[{ type: 'spellHealingModifier', valuePerRank: .05 }], [{ type: 'spellHealingOverTimeModifier', valuePerRank: .05 }], [effectDuration('effect.water-mist', 1)], [{ type: 'spellOnEffectiveHealingResourceRestore', resource: 'mana', amountPerRank: 1, divisor: 20 }], [{ type: 'spellHealingModifier', valuePerRank: .2 }], [{ type: 'spellHealingModifier', valuePerRank: .15 }, { type: 'barrierAmountModifier', valuePerRank: .1 }], [{ type: 'spellHealingModifier', valuePerRank: .3 }]],
    mist: [[stat('evasionRating', 4)], [stat('evasionRating', 2)], [{ type: 'onSpellCastApplyEffect', effectId: 'effect.water-mist', durationSeconds: 4 }], [stat('evasionRating', 6)], [spellDamage(.03)], [stat('evasionRating', 10)], [cooldown(-.15)]],
    lightning: [[effectChance('effect.shocked', .06)], [conditional(.05, { type: 'targetHasEffect', effectId: 'effect.shocked' })], [{ type: 'spellCriticalChanceModifier', valuePerRank: .02 }], [{ type: 'spellCriticalDamageModifier', valuePerRank: .08 }], [effectDuration('effect.shocked', .1)], [conditional(.15, { type: 'targetHasEffect', effectId: 'effect.shocked' }), { type: 'spellCriticalDamageModifier', valuePerRank: .1 }], [conditional(.3, { type: 'targetHasEffectAndHpBelow', effectId: 'effect.shocked', fraction: .4 })]],
    chain: [[{ type: 'spellSecondaryTargetDamage', fractionPerRank: .1, maxAdditionalTargets: 1 }], [{ type: 'spellSecondaryTargetDamage', fractionPerRank: .05, maxAdditionalTargets: 1 }], [{ type: 'spellSecondaryTargetDamage', fractionPerRank: .1, maxAdditionalTargets: 2 }], [spellDamage(.03)], [{ type: 'onSpellHitApplyEffect', effectId: 'effect.shocked', chancePerRank: .1, secondaryOnly: true }], [{ type: 'spellSecondaryTargetDamage', fractionPerRank: .2, maxAdditionalTargets: 2 }], [{ type: 'spellSecondaryTargetDamage', fractionPerRank: .55, maxAdditionalTargets: 3 }]],
    haste: [[cooldown(-.04)], [cost(-.03)], [stat('manaRegenFlat', .25)], [cooldown(-.025)], [cooldown(-.08)], [cooldown(-.1), spellDamage(.03)], [cooldown(-.15)]],
    control: [[cost(-.04)], [cooldown(-.04)], [effectChance('effect.shocked', .06)], [effectChance('effect.concussed', .06)], [{ type: 'sourceEffectOutgoingDamageModifier', effectId: 'effect.shocked', valuePerRank: .03 }], [cooldown(-.12)], [effectChance('effect.shocked', .2), spellDamage(.1)]],
    wind: [[stat('evasionRating', 5)], [stat('evasionRating', 2)], [spellDamage(.03)], [{ type: 'onSpellCastApplyEffect', effectId: 'effect.air-windstep', durationSeconds: 3 }], [stat('evasionRating', 8)], [stat('evasionRating', 12)], [cooldown(-.1)]],
    stone: [[spellDamage(.03)], [spellDamage(.03)], [spellDamage(.05)], [{ type: 'spellCriticalDamageModifier', valuePerRank: .07 }], [conditional(.15, { type: 'targetHpAbove', fraction: .6 })], [spellDamage(.15)], [{ type: 'spellCriticalDamageModifier', valuePerRank: .3 }]],
    'armor-penetration': [[effectChance('effect.crushed', .06)], [{ type: 'spellArmorPenetrationModifier', mode: 'flat', valuePerRank: 5 }], [{ type: 'spellArmorPenetrationModifier', mode: 'percent', valuePerRank: .05 }], [conditional(.12, { type: 'targetHasEffect', effectId: 'effect.crushed' })], [effectDuration('effect.crushed', .1)], [effectChance('effect.off-balance', .1)], [conditional(.35, { type: 'targetHasEffect', effectId: 'effect.crushed' })]],
    fortification: [[{ type: 'onSpellCastApplyEffect', effectId: 'effect.earth-fortified', durationSeconds: 5 }], [stat('armour', 3)], [stat('blockChance', .05)], [stat('blockEffect', .03)], [stat('armour', 10)], [stat('armour', 12), stat('blockEffect', .1)], [stat('armour', 20), stat('blockChance', .1), stat('blockEffect', .15)]],
    barrier: [[{ type: 'barrierAmountModifier', valuePerRank: .05 }], [{ type: 'barrierFlatAmountModifier', valuePerRank: 5 }], [{ type: 'barrierDurationModifier', valuePerRank: 1 }], [{ type: 'barrierAbsorbResourceRestore', resource: 'stamina', amountPerRank: .05 }], [{ type: 'barrierAmountModifier', valuePerRank: .15 }], [{ type: 'barrierAmountModifier', valuePerRank: .15 }, { type: 'barrierDurationModifier', valuePerRank: .15 }], [{ type: 'barrierAmountModifier', valuePerRank: .3 }, stat('armour', 10)]],
    quake: [[effectChance('effect.concussed', .06)], [effectDuration('effect.concussed', .1)], [{ type: 'sourceEffectOutgoingDamageModifier', effectId: 'effect.concussed', valuePerRank: .02 }], [{ type: 'sourceEffectOutgoingDamageModifier', effectId: 'effect.concussed', valuePerRank: .03 }], [conditional(.15, { type: 'targetHasEffect', effectId: 'effect.concussed' })], [effectDuration('effect.concussed', .1)], [conditional(.25, { type: 'targetHasEffect', effectId: 'effect.concussed' })]],
    shadow: [[spellDamage(.03)], [spellDamage(.03)], [spellDamage(.05)], [{ type: 'spellCriticalDamageModifier', valuePerRank: .06 }], [conditional(.15, { type: 'targetHpAbove', fraction: .6 })], [spellDamage(.15)], [{ type: 'spellCriticalDamageModifier', valuePerRank: .3 }]],
    curse: [[effectChance('effect.cursed', .06)], [effectDuration('effect.cursed', .1)], [{ type: 'sourceEffectOutgoingDamageModifier', effectId: 'effect.cursed', valuePerRank: .02 }], [{ type: 'sourceEffectOutgoingDamageModifier', effectId: 'effect.cursed', valuePerRank: .03 }], [conditional(.15, { type: 'targetHasEffect', effectId: 'effect.cursed' })], [effectDuration('effect.cursed', .1)], [conditional(.3, { type: 'targetHasEffectAndHpBelow', effectId: 'effect.cursed', fraction: .35 })]],
    decay: [[{ type: 'appliedEffectPeriodicDamageModifier', effectId: decay, valuePerRank: .08 }], [effectDuration(decay, .5)], [effectStacks(decay, 1)], [conditional(.04, { type: 'targetHasEffect', effectId: decay })], [{ type: 'appliedEffectPeriodicDamageModifier', effectId: decay, valuePerRank: .1 }], [{ type: 'appliedEffectPeriodicDamageModifier', effectId: decay, valuePerRank: .2 }, conditional(.1, { type: 'targetHasEffect', effectId: decay })], [{ type: 'appliedEffectPeriodicDamageModifier', effectId: decay, valuePerRank: .3 }, effectStacks(decay, 1)]],
    drain: [[{ type: 'spellDamageBasedManaRestore', valuePerRank: .01 }], [{ type: 'spellLifeDrainModifier', valuePerRank: .01 }], [cost(-.03)], [stat('maxMana', 5)], [{ type: 'spellDamageBasedManaRestore', valuePerRank: .03 }], [{ type: 'spellLifeDrainModifier', valuePerRank: .05 }, { type: 'spellDamageBasedManaRestore', valuePerRank: .03 }], [{ type: 'spellLifeDrainModifier', valuePerRank: .08 }, stat('maxMana', 10)]],
    doom: [[conditional(.03, { type: 'targetHpBelow', fraction: .5 })], [{ type: 'spellCriticalChanceModifier', valuePerRank: .02 }], [conditional(.06, { type: 'targetHpBelow', fraction: .4 })], [{ type: 'spellCriticalDamageModifier', valuePerRank: .06 }], [conditional(.18, { type: 'targetHpBelow', fraction: .3 })], [conditional(.18, { type: 'targetHpBelow', fraction: .35 })], [conditional(.45, { type: 'targetHpBelow', fraction: .2 })]],
  }
  return variants[kind][index] ?? [spellDamage(.03)]
}

function schoolDescription(profile: MagicTreeProfile, kind: MagicBranchKind, index: number) {
  const labels: Record<MagicBranchKind, string> = { frost: 'Frost and Chill', tidal: 'Tidal Force', flow: 'Mana and Flow', restoration: 'Restoration and Sustain', mist: 'Mist and Evasion', lightning: 'Lightning and Shock', chain: 'Chain and multi-target damage', haste: 'Haste and cooldowns', control: 'Shock and control', wind: 'Wind and Evasion', stone: 'Stone damage', 'armor-penetration': 'Crushed and penetration', fortification: 'Fortification and Armour', barrier: 'Barrier and Stone Ward', quake: 'Quake and Concussed control', shadow: 'Shadow damage', curse: 'Curse and Weakening', decay: 'Decay damage over time', drain: 'Drain and Sustain', doom: 'Execution and Doom' }
  return `${profile.schoolName} ${labels[kind]} training (${index + 1}/7).`
}

export function createMagicTree(profile: MagicTreeProfile): ProficiencyPerkDefinition[] {
  const rootSlug = profile.rootName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const root = { id: id(profile.proficiencyId, rootSlug), proficiencyId: profile.proficiencyId, branch: 'Root', name: profile.rootName, requiredProficiencyLevel: 1, maxRank: 5, costPerRank: 1, description: `+2% ${profile.schoolName} damage per rank.`, effects: [spellDamage(.02)], prerequisiteRules: [], presentation: pos(4, 0, 'root', profile.icon) } satisfies ProficiencyPerkDefinition
  const definitions: ProficiencyPerkDefinition[] = [root]
  const capstones: string[] = []
  const columns = [0, 2, 4, 6, 8]
  profile.branches.forEach((branch, branchIndex) => {
    let previous = root.id
    branch.names.forEach((name, index) => {
      const perkId = id(profile.proficiencyId, name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
      const capstone = index === 6
      definitions.push({ id: perkId, proficiencyId: profile.proficiencyId, branch: branch.name, name, requiredProficiencyLevel: [5, 10, 20, 30, 40, 60, 90][index], maxRank: capstone ? 1 : index < 2 ? 3 : index < 4 ? 2 : 1, costPerRank: capstone ? 2 : 1, description: schoolDescription(profile, branch.kind, index), effects: branchEffects(profile, branch.kind, index), prerequisiteRules: all([previous, 1]), presentation: pos(columns[branchIndex], capstone ? 9 : index + 1, capstone ? 'capstone' : index === 5 ? 'major' : 'minor', branch.icon ?? profile.icon) })
      previous = perkId
      if (capstone) capstones.push(perkId)
    })
  })
  profile.crossNodes.forEach((cross, index) => {
    const first = profile.branches[cross.links[0][0]].names[cross.links[0][1]]
    const second = profile.branches[cross.links[1][0]].names[cross.links[1][1]]
    const firstId = id(profile.proficiencyId, first.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    const secondId = id(profile.proficiencyId, second.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    definitions.push({ id: id(profile.proficiencyId, cross.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')), proficiencyId: profile.proficiencyId, branch: 'Cross-Branch', name: cross.name, requiredProficiencyLevel: index === 2 ? 80 : 70, maxRank: 1, costPerRank: 2, description: cross.description ?? `${profile.schoolName} mastery converges across ${first} and ${second}.`, effects: cross.effects ?? [spellDamage(.1)], prerequisiteRules: all([firstId, 1], [secondId, 1]), presentation: pos(1 + index * 2, 8, 'major', profile.icon) })
  })
  definitions.push({ id: id(profile.proficiencyId, profile.apexName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')), proficiencyId: profile.proficiencyId, branch: 'Apex', name: profile.apexName, requiredProficiencyLevel: 100, maxRank: 1, costPerRank: 3, description: `The complete ${profile.schoolName} discipline.`, effects: profile.apexEffects, prerequisiteRules: all([root.id, 5]).concat([{ mode: 'any', requirements: capstones.map((perkId) => ({ perkId, requiredRank: 1 })), minimumSatisfied: 3 }]), presentation: pos(4, 10, 'capstone', 'crown') })
  if (definitions.length !== 40) throw new Error(`${profile.proficiencyId} magic tree expected 40 nodes, found ${definitions.length}`)
  return definitions
}
