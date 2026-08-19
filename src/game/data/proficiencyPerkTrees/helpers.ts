import type { ModifiableCombatStatKey } from '../../combat/combatTypes'
import type { CombatProficiencyId, PerkPrerequisiteRule, ProficiencyPerkDefinition, ProficiencyPerkEffect } from '../../progression/progressionTypes'

export type WeaponBranchKind = 'power' | 'bleed' | 'armour' | 'tempo' | 'precision' | 'critical' | 'guard' | 'mobility' | 'cleave' | 'multi' | 'execution' | 'control' | 'opening' | 'penetration'

export interface WeaponBranchSpec {
  name: string
  kind: WeaponBranchKind
  names: [string, string, string, string, string, string, string]
  icon?: string
}

export interface WeaponCrossNodeSpec {
  name: string
  links: [[number, number], [number, number]]
  effects?: ProficiencyPerkEffect[]
  description?: string
}

export interface WeaponTreeProfile {
  proficiencyId: CombatProficiencyId
  weaponName: string
  rootName: string
  icon: string
  branches: [WeaponBranchSpec, WeaponBranchSpec, WeaponBranchSpec, WeaponBranchSpec, WeaponBranchSpec]
  crossNodes: [WeaponCrossNodeSpec, WeaponCrossNodeSpec, WeaponCrossNodeSpec]
  apexName: string
  apexEffects: ProficiencyPerkEffect[]
}

const id = (proficiencyId: CombatProficiencyId, slug: string) => `perk.${proficiencyId}.${slug}`
const slugify = (value: string) => value.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const all = (...requirements: Array<[string, number]>): PerkPrerequisiteRule[] => requirements.length === 0 ? [] : [{ mode: 'all', requirements: requirements.map(([perkId, requiredRank]) => ({ perkId, requiredRank })) }]
const any = (requirements: Array<[string, number]>, minimumSatisfied = 1): PerkPrerequisiteRule[] => [{ mode: 'any', requirements: requirements.map(([perkId, requiredRank]) => ({ perkId, requiredRank })), minimumSatisfied }]
const pos = (column: number, row: number, size: ProficiencyPerkDefinition['presentation']['size'] = 'minor', icon = 'spark') => ({ column, row, size, icon })
const make = (proficiencyId: CombatProficiencyId, branch: string, slug: string, name: string, requiredProficiencyLevel: number, maxRank: number, costPerRank: number, description: string, effects: ProficiencyPerkEffect[], prerequisiteRules: PerkPrerequisiteRule[], presentation: ProficiencyPerkDefinition['presentation']): ProficiencyPerkDefinition => ({ id: id(proficiencyId, slug), proficiencyId, branch, name, requiredProficiencyLevel, maxRank, costPerRank, description, effects, prerequisiteRules, presentation })
const stat = (statName: ModifiableCombatStatKey, valuePerRank: number): ProficiencyPerkEffect => ({ type: 'statModifier', stat: statName, operation: 'flat', valuePerRank })
const damage = (valuePerRank: number): ProficiencyPerkEffect => ({ type: 'weaponDamageModifier', valuePerRank })
const conditional = (valuePerRank: number, condition: Extract<ProficiencyPerkEffect, { type: 'weaponConditionalDamageModifier' }>['condition']): ProficiencyPerkEffect => ({ type: 'weaponConditionalDamageModifier', operation: 'increased', valuePerRank, condition })
const interval = (valuePerRank: number): ProficiencyPerkEffect => ({ type: 'weaponAttackSpeedModifier', valuePerRank: 1 / Math.max(0.01, 1 + valuePerRank) - 1 })

function branchEffects(kind: WeaponBranchKind, index: number, icon: string): ProficiencyPerkEffect[] {
  const variants = (entries: Array<Array<ProficiencyPerkEffect>>) => entries[index] ?? [damage(.03)]
  if (kind === 'power') return variants([[damage(.03)], [stat('attackDamage', 3)], [damage(.04)], [stat('criticalStrikeMultiplier', .05)], [conditional(.12, { type: 'targetHpAbove', fraction: .5 })], [damage(.12)], [damage(.2)]])
  if (kind === 'bleed') return variants([[{ type: 'onWeaponHitApplyEffect', effectId: 'effect.bleed', chancePerRank: .05 }], [{ type: 'appliedEffectPeriodicDamageModifier', effectId: 'effect.bleed', valuePerRank: .1 }], [{ type: 'appliedEffectMaxStacksModifier', effectId: 'effect.bleed', valuePerRank: 1 }], [conditional(.04, { type: 'targetHasEffect', effectId: 'effect.bleed' })], [{ type: 'appliedEffectDurationModifier', effectId: 'effect.bleed', valuePerRank: 1 }], [conditional(.12, { type: 'targetHasEffect', effectId: 'effect.bleed' })], [conditional(.3, { type: 'targetHasEffectAndHpBelow', effectId: 'effect.bleed', fraction: .25 })]])
  if (kind === 'armour' || kind === 'penetration') return variants([[{ type: 'onWeaponHitApplyEffect', effectId: 'effect.crushed', chancePerRank: .05 }], [{ type: 'appliedEffectDurationModifier', effectId: 'effect.crushed', valuePerRank: .5 }], [{ type: 'weaponArmorPenetrationModifier', mode: 'flat', valuePerRank: 6 }], [conditional(.12, { type: 'targetHasEffect', effectId: 'effect.crushed' })], [{ type: 'weaponArmorPenetrationModifier', mode: 'percent', valuePerRank: .05 }], [{ type: 'weaponArmorPenetrationModifier', mode: 'percent', valuePerRank: .2 }], [{ type: 'weaponArmorPenetrationModifier', mode: 'percent', valuePerRank: .35 }, conditional(.15, { type: 'targetHasEffect', effectId: 'effect.crushed' })]])
  if (kind === 'tempo') return variants([[stat('staminaRegen', .5)], [interval(-.02)], [{ type: 'weaponOnHitResourceRestore', resource: 'stamina', amountPerRank: .5 }], [damage(.03)], [{ type: 'conditionalStatModifier', stat: 'moreAttackSpeed', operation: 'more', valuePerRank: 1 / .94 - 1, condition: { type: 'stamina-above', fraction: .7 } }], [stat('staminaRegen', 1), interval(-.06)], [{ type: 'weaponOnHitAdvanceAttack', chancePerRank: .1, fraction: .3 }]])
  if (kind === 'precision') return variants([[stat('accuracyRating', 2), stat('criticalStrikeChance', .01)], [stat('accuracyRating', 3)], [stat('criticalStrikeMultiplier', .05)], [stat('criticalStrikeChance', .02)], [damage(.08)], [stat('accuracyRating', 8), stat('criticalStrikeChance', .03)], [stat('criticalStrikeMultiplier', .25)]])
  if (kind === 'critical') return variants([[stat('criticalStrikeChance', .015)], [stat('criticalStrikeMultiplier', .06)], [stat('accuracyRating', 3), stat('criticalStrikeMultiplier', .03)], [stat('criticalStrikeChance', .02)], [stat('criticalStrikeChance', .05)], [stat('criticalStrikeMultiplier', .2)], [conditional(.35, { type: 'targetHpBelow', fraction: .5 })]])
  if (kind === 'guard') return variants([[stat('blockChance', .015)], [stat('armour', 3)], [{ type: 'weaponDamageModifier', valuePerRank: .04 }], [{ type: 'onBlockApplyEffect', effectId: 'effect.guarded-counter', durationSeconds: 4 }], [{ type: 'weaponDamageModifier', valuePerRank: .06 }], [{ type: 'onBlockApplyEffect', effectId: 'effect.counterweight', durationSeconds: 3 }], [{ type: 'weaponDamageModifier', valuePerRank: .1 }, stat('armour', 8)]])
  if (kind === 'mobility') return variants([[stat('evasionRating', 6)], [stat('evasionRating', 3)], [interval(-.03)], [stat('evasionRating', 8)], [interval(-.04)], [stat('evasionRating', 10)], [stat('evasionRating', 14), damage(.1)]])
  if (kind === 'cleave' || kind === 'multi') return variants([[{ type: 'weaponSecondaryTargetDamage', fractionPerRank: .1, maxAdditionalTargets: 1 }], [{ type: 'weaponSecondaryTargetDamage', fractionPerRank: .08, maxAdditionalTargets: 1 }], [{ type: 'weaponSecondaryTargetDamage', fractionPerRank: .1, maxAdditionalTargets: 1 }], [damage(.05)], [{ type: 'weaponSecondaryTargetDamage', fractionPerRank: .12, maxAdditionalTargets: kind === 'multi' ? 2 : 1 }], [{ type: 'weaponSecondaryTargetDamage', fractionPerRank: .15, maxAdditionalTargets: kind === 'multi' ? 2 : 1 }], [{ type: 'weaponSecondaryTargetDamage', fractionPerRank: .25, maxAdditionalTargets: kind === 'multi' ? 3 : 2 }]])
  if (kind === 'execution') return variants([[stat('accuracyRating', 2)], [conditional(.04, { type: 'targetHpBelow', fraction: .5 })], [stat('criticalStrikeChance', .02)], [conditional(.06, { type: 'targetHpBelow', fraction: .35 })], [stat('criticalStrikeMultiplier', .15)], [conditional(.15, { type: 'targetHpBelow', fraction: .35 })], [conditional(.35, { type: 'targetHpBelow', fraction: .2 })]])
  if (kind === 'control') return variants([[{ type: 'onWeaponHitApplyEffect', effectId: 'effect.concussed', chancePerRank: .05 }], [{ type: 'appliedEffectDurationModifier', effectId: 'effect.concussed', valuePerRank: .5 }], [{ type: 'onWeaponHitApplyEffect', effectId: 'effect.concussed', chancePerRank: .05 }], [conditional(.05, { type: 'targetHasEffect', effectId: 'effect.concussed' })], [conditional(.18, { type: 'targetHpBelow', fraction: .35 })], [conditional(.2, { type: 'targetHasEffect', effectId: 'effect.concussed' })], [conditional(.45, { type: 'targetHpBelow', fraction: .2 })]])
  if (kind === 'opening') return variants([[conditional(.06, { type: 'targetHpAbove', fraction: .75 })], [stat('accuracyRating', 3)], [conditional(.08, { type: 'targetHpAbove', fraction: .75 })], [conditional(.1, { type: 'targetHpAbove', fraction: .75 })], [conditional(.15, { type: 'targetHpAbove', fraction: .75 })], [conditional(.2, { type: 'targetHpAbove', fraction: .75 })], [conditional(.3, { type: 'targetHpAbove', fraction: .75 })]])
  return [damage(.03)]
}

function descriptionFor(kind: WeaponBranchKind, weaponName: string, index: number) {
  const labels: Record<WeaponBranchKind, string> = { power: 'direct damage', bleed: 'Bleed pressure', armour: 'Armour breaking', penetration: 'Armour penetration', tempo: 'tempo and Stamina', precision: 'Accuracy and precision', critical: 'Critical Strike power', guard: 'guard and Block', mobility: 'evasion and mobility', cleave: 'secondary-target cleave', multi: 'multi-shot pressure', execution: 'execution damage', control: 'Concussed control', opening: 'opening-shot pressure' }
  return `${weaponName} ${labels[kind]} training (${index + 1}/7).`
}

export function createWeaponTree(profile: WeaponTreeProfile): ProficiencyPerkDefinition[] {
  const { proficiencyId } = profile
  const root = {
    id: id(proficiencyId, slugify(profile.rootName)), proficiencyId, branch: 'Root', name: profile.rootName, requiredProficiencyLevel: 1, maxRank: 5, costPerRank: 1, description: `+2% ${profile.weaponName} direct damage per rank.`, effects: [damage(.02)], prerequisiteRules: [], presentation: { column: 4, row: 0, size: 'root' as const, icon: profile.icon },
  } satisfies ProficiencyPerkDefinition
  const definitions: ProficiencyPerkDefinition[] = [root]
  const branchCapstones: string[] = []
  const branchColumns = [0, 2, 4, 6, 8]
  profile.branches.forEach((branch, branchIndex) => {
    let previous = root.id
    branch.names.forEach((name, index) => {
      const perkId = id(proficiencyId, slugify(name))
      const isCapstone = index === 6
      definitions.push({ id: perkId, proficiencyId, branch: branch.name, name, requiredProficiencyLevel: [5, 10, 20, 30, 40, 60, 90][index], maxRank: isCapstone ? 1 : index === 0 ? 3 : index === 1 ? 3 : index === 2 ? 2 : index === 3 ? 2 : 1, costPerRank: isCapstone ? 2 : 1, description: descriptionFor(branch.kind, profile.weaponName, index), effects: branchEffects(branch.kind, index, branch.icon ?? profile.icon), prerequisiteRules: all([previous, 1]), presentation: { column: branchColumns[branchIndex], row: isCapstone ? 9 : index + 1, size: isCapstone ? 'capstone' : index === 5 ? 'major' : 'minor', icon: branch.icon ?? profile.icon } })
      previous = perkId
      if (isCapstone) branchCapstones.push(perkId)
    })
  })
  profile.crossNodes.forEach((cross, index) => {
    const first = profile.branches[cross.links[0][0]].names[cross.links[0][1]]
    const second = profile.branches[cross.links[1][0]].names[cross.links[1][1]]
    definitions.push({ id: id(proficiencyId, slugify(cross.name)), proficiencyId, branch: 'Cross-Branch', name: cross.name, requiredProficiencyLevel: index === 2 ? 80 : 70, maxRank: 1, costPerRank: 2, description: cross.description ?? `${profile.weaponName} training converges across ${first} and ${second}.`, effects: cross.effects ?? [damage(.1)], prerequisiteRules: all([id(proficiencyId, slugify(first)), 1], [id(proficiencyId, slugify(second)), 1]), presentation: { column: 1 + index * 2, row: 8, size: 'major', icon: profile.icon } })
  })
  definitions.push({ id: id(proficiencyId, slugify(profile.apexName)), proficiencyId, branch: 'Apex', name: profile.apexName, requiredProficiencyLevel: 100, maxRank: 1, costPerRank: 3, description: `The complete ${profile.weaponName} discipline.`, effects: profile.apexEffects, prerequisiteRules: all([root.id, 5]).concat(any(branchCapstones.map((perkId) => [perkId, 1] as [string, number]), 3)), presentation: { column: 4, row: 10, size: 'capstone', icon: 'crown' } })
  if (definitions.length !== 40) throw new Error(`${proficiencyId} weapon tree expected 40 nodes, found ${definitions.length}`)
  return definitions
}

export { all, id, make, pos, stat, damage, conditional, interval }
