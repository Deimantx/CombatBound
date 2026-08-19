import { normalizeCombatStats } from '../combat/combatStats'
import type { CombatStats, ResistanceDamageType, StatModifier } from '../combat/combatTypes'
import { applyCombatStatModifiers } from '../combat/combatStats'
import { perkById } from '../data/proficiencyPerks'
import { proficiencyById } from '../data/proficiencies'
import { getProficiencyLevel } from './proficiencyProgression'
import type { DefensiveEquipmentContext } from '../equipment/defensiveEquipment'
import type {
  CombatProficiencyId,
  MagicProficiencyId,
  PerkPurchaseResult,
  PerkPurchaseState,
  ProgressionState,
  ProficiencyPerkDefinition,
  ProficiencyPerkEffect,
  WeaponProficiencyId,
} from './progressionTypes'

const scopedDefinitionCache = new WeakMap<object, Map<CombatProficiencyId, ProficiencyPerkDefinition[]>>()

export function calculateSpentPerkPoints(progression: ProgressionState, perkDefinitions: Record<string, ProficiencyPerkDefinition>) {
  return Object.entries(progression.purchasedPerks).reduce((total, [perkId, rank]) => total + (perkDefinitions[perkId]?.costPerRank ?? 0) * Math.max(0, rank), 0)
}

export interface PerkPointSummary {
  bonus: number
  totalGranted: number
  spent: number
  available: number
}

export function getPerkPointSummary(progression: ProgressionState, perkDefinitions: Record<string, ProficiencyPerkDefinition>): PerkPointSummary {
  const bonus = Math.max(0, Number.isFinite(progression.bonusPerkPoints) ? Math.floor(progression.bonusPerkPoints) : 0)
  const spent = calculateSpentPerkPoints(progression, perkDefinitions)
  return { bonus, totalGranted: bonus, spent, available: Math.max(0, bonus - spent) }
}

export function calculateAvailablePerkPoints(progression: ProgressionState, perkDefinitions: Record<string, ProficiencyPerkDefinition>) {
  return getPerkPointSummary(progression, perkDefinitions).available
}

export function getPurchasedPerkRank(progression: ProgressionState, perkId: string) {
  return Math.max(0, progression.purchasedPerks[perkId] ?? 0)
}

function isPerkInKnownTree(perk: ProficiencyPerkDefinition) {
  const tree = proficiencyById[perk.proficiencyId]
  return Boolean(tree && (tree.perkIds.includes(perk.id) || perk.branch === 'Legacy'))
}

function missingPrerequisites(progression: ProgressionState, perk: ProficiencyPerkDefinition) {
  const missing: Array<{ perkId: string; requiredRank: number }> = []
  for (const rule of perk.prerequisiteRules) {
    const satisfied = rule.requirements.filter((requirement) => getPurchasedPerkRank(progression, requirement.perkId) >= requirement.requiredRank).length
    const minimum = rule.mode === 'all' ? rule.requirements.length : Math.max(1, rule.minimumSatisfied ?? 1)
    if (satisfied >= minimum) continue
    for (const requirement of rule.requirements) {
      if (getPurchasedPerkRank(progression, requirement.perkId) < requirement.requiredRank) missing.push(requirement)
    }
  }
  return missing
}

/** The single canonical purchase validator used by the UI, tooltips, and purchase action. */
export function getPerkPurchaseState(
  progression: ProgressionState,
  perkId: string,
  definitions: Record<string, ProficiencyPerkDefinition> = perkById,
): PerkPurchaseState {
  const perk = definitions[perkId]
  const currentRank = getPurchasedPerkRank(progression, perkId)
  if (!perk || !isPerkInKnownTree(perk)) return { status: 'unknown', currentRank }
  if (currentRank >= perk.maxRank) return { status: 'maxed', perk, currentRank }

  const level = getProficiencyLevel(progression, perk.proficiencyId)
  if (level < perk.requiredProficiencyLevel) return { status: 'level-locked', perk, currentRank, missingLevel: perk.requiredProficiencyLevel - level }

  const missing = missingPrerequisites(progression, perk)
  if (missing.length > 0) return { status: 'prerequisite-locked', perk, currentRank, missingPrerequisites: missing }

  const available = calculateAvailablePerkPoints(progression, definitions)
  if (available < perk.costPerRank) return { status: 'points-locked', perk, currentRank, missingPoints: perk.costPerRank - available }
  return { status: 'available', perk, currentRank }
}

export function purchasePerk(progression: ProgressionState, perkId: string, definitions: Record<string, ProficiencyPerkDefinition> = perkById): PerkPurchaseResult {
  const state = getPerkPurchaseState(progression, perkId, definitions)
  const rank = state.currentRank
  if (state.status === 'unknown') return { progression, outcome: 'unknown-perk', perkId, rank }
  if (state.status === 'maxed') return { progression, outcome: 'max-rank', perkId, rank }
  if (state.status === 'level-locked') return { progression, outcome: 'level-locked', perkId, rank }
  if (state.status === 'prerequisite-locked') return { progression, outcome: 'prerequisite-locked', perkId, rank }
  if (state.status === 'points-locked') return { progression, outcome: 'insufficient-points', perkId, rank }
  const nextRank = rank + 1
  return {
    progression: { ...progression, purchasedPerks: { ...progression.purchasedPerks, [perkId]: nextRank } },
    outcome: 'purchased',
    perkId,
    rank: nextRank,
  }
}

function activeEffects(progression: ProgressionState, proficiencyId: CombatProficiencyId, definitions: Record<string, ProficiencyPerkDefinition>) {
  let byProficiency = scopedDefinitionCache.get(definitions)
  if (!byProficiency) {
    byProficiency = new Map()
    for (const perk of Object.values(definitions)) {
      const current = byProficiency.get(perk.proficiencyId) ?? []
      current.push(perk)
      byProficiency.set(perk.proficiencyId, current)
    }
    scopedDefinitionCache.set(definitions, byProficiency)
  }
  return (byProficiency.get(proficiencyId) ?? []).flatMap((perk) => {
    const rank = getPurchasedPerkRank(progression, perk.id)
    return rank > 0 ? perk.effects.map((effect) => ({ effect, rank })) : []
  })
}

function toStatModifier(effect: Extract<ProficiencyPerkEffect, { type: 'statModifier' }>, rank: number): StatModifier {
  return { stat: effect.stat, operation: effect.operation, value: effect.valuePerRank * rank }
}

function defensivePieceCount(proficiencyId: CombatProficiencyId, context: DefensiveEquipmentContext) {
  if (proficiencyId === 'light-armor') return context.lightArmorPieces
  if (proficiencyId === 'medium-armor') return context.mediumArmorPieces
  if (proficiencyId === 'heavy-armor') return context.heavyArmorPieces
  if (proficiencyId === 'shield') return context.shieldEquipped ? 1 : 0
  return 0
}

export interface ActiveDefensiveEquipmentModifiers {
  statModifiers: StatModifier[]
  resistanceModifiers: Array<{ damageType: ResistanceDamageType; value: number }>
  spellModifiers: Array<{ modifier: Extract<ProficiencyPerkEffect, { type: 'equippedArmorSpellModifier' }>['modifier']; value: number }>
  weaponModifiers: Array<{ modifier: Extract<ProficiencyPerkEffect, { type: 'equippedArmorWeaponModifier' }>['modifier']; value: number }>
}

/** Resolves all purchased defensive perks against the currently equipped pieces. */
export function getActiveDefensiveEquipmentModifiers(
  progression: ProgressionState,
  equipmentContext: DefensiveEquipmentContext,
  definitions: Record<string, ProficiencyPerkDefinition> = perkById,
): ActiveDefensiveEquipmentModifiers {
  const result: ActiveDefensiveEquipmentModifiers = { statModifiers: [], resistanceModifiers: [], spellModifiers: [], weaponModifiers: [] }
  const defensiveIds: CombatProficiencyId[] = ['light-armor', 'medium-armor', 'heavy-armor', 'shield']
  for (const proficiencyId of defensiveIds) {
    const pieces = defensivePieceCount(proficiencyId, equipmentContext)
    if (pieces <= 0) continue
    for (const { effect, rank } of activeEffects(progression, proficiencyId, definitions)) {
      if (effect.type === 'statModifier') {
        result.statModifiers.push({ stat: effect.stat, operation: effect.operation, value: effect.valuePerRank * rank * pieces })
      }
      if (effect.type === 'equippedArmorStatModifier') {
        if (pieces < (effect.minimumPieces ?? 1)) continue
        result.statModifiers.push({ stat: effect.stat, operation: effect.operation, value: effect.valuePerRankPerPiece * rank * pieces })
      }
      if (effect.type === 'equippedArmorResistanceModifier') {
        if (pieces < (effect.minimumPieces ?? 1)) continue
        result.resistanceModifiers.push({ damageType: effect.damageType, value: effect.valuePerRankPerPiece * rank * pieces })
      }
      if (effect.type === 'equippedArmorSpellModifier' && pieces >= effect.minimumPieces) result.spellModifiers.push({ modifier: effect.modifier, value: effect.valuePerRank * rank })
      if (effect.type === 'equippedArmorWeaponModifier' && pieces >= effect.minimumPieces) result.weaponModifiers.push({ modifier: effect.modifier, value: effect.valuePerRank * rank })
    }
  }
  return result
}

export function getActiveDefensiveStatModifiers(progression: ProgressionState, equipmentContext: DefensiveEquipmentContext, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  return getActiveDefensiveEquipmentModifiers(progression, equipmentContext, definitions).statModifiers
}

export interface ActiveStatContext {
  activeTechniqueCount?: number
  staminaFraction?: number
  playerHpFraction?: number
  barrierActive?: boolean
}

export function getActiveProficiencyStatModifiers(
  progression: ProgressionState,
  proficiencyId: CombatProficiencyId | null,
  definitions: Record<string, ProficiencyPerkDefinition> = perkById,
  context: ActiveStatContext = {},
): StatModifier[] {
  if (!proficiencyId) return []
  const modifiers: StatModifier[] = []
  for (const { effect, rank } of activeEffects(progression, proficiencyId, definitions)) {
    if (effect.type === 'statModifier') modifiers.push(toStatModifier(effect, rank))
    if (effect.type === 'weaponAttackSpeedModifier') modifiers.push({ stat: 'moreAttackSpeed', operation: 'more', value: effect.valuePerRank * rank })
    if (effect.type === 'conditionalStatModifier') {
      const matches = effect.condition.type === 'active-barrier' ? context.barrierActive === true
        : effect.condition.type === 'stamina-above' ? (context.staminaFraction ?? 0) >= (effect.condition.fraction ?? 0)
          : effect.condition.type === 'player-hp-below' ? (context.playerHpFraction ?? 1) < (effect.condition.fraction ?? 1)
            : effect.condition.type === 'active-technique' ? (context.activeTechniqueCount ?? 0) > 0
              : false
      if (matches) modifiers.push({ stat: effect.stat, operation: effect.operation, value: effect.valuePerRank * rank })
    }
    if (effect.type === 'activeTechniqueStatModifier' && (context.activeTechniqueCount ?? 0) > 0) modifiers.push({ stat: effect.stat, operation: effect.operation, value: effect.valuePerRank * rank * Math.max(1, context.activeTechniqueCount ?? 0) })
  }
  return modifiers
}

export function getConditionalProficiencyStatModifiers(
  progression: ProgressionState,
  proficiencyId: CombatProficiencyId | null,
  context: ActiveStatContext,
  definitions: Record<string, ProficiencyPerkDefinition> = perkById,
): StatModifier[] {
  if (!proficiencyId) return []
  return activeEffects(progression, proficiencyId, definitions).flatMap(({ effect, rank }) => {
    if (effect.type !== 'conditionalStatModifier') return []
    const matches = effect.condition.type === 'active-barrier' ? context.barrierActive === true
      : effect.condition.type === 'stamina-above' ? (context.staminaFraction ?? 0) >= (effect.condition.fraction ?? 0)
        : effect.condition.type === 'player-hp-below' ? (context.playerHpFraction ?? 1) < (effect.condition.fraction ?? 1)
          : effect.condition.type === 'active-technique' ? (context.activeTechniqueCount ?? 0) > 0
            : false
    return matches ? [{ stat: effect.stat, operation: effect.operation, value: effect.valuePerRank * rank }] : []
  })
}

export function applyProficiencyStatModifiers(baseStats: CombatStats, modifiers: StatModifier[]) {
  return applyCombatStatModifiers(normalizeCombatStats({ ...baseStats } as CombatStats & Record<string, unknown>), modifiers)
}

export function getWeaponHitEffectHooks(progression: ProgressionState, proficiencyId: WeaponProficiencyId | null, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  if (!proficiencyId) return [] as Array<{ effectId: string; chance: number }>
  return activeEffects(progression, proficiencyId, definitions).flatMap(({ effect, rank }) => effect.type === 'onWeaponHitApplyEffect' ? [{ effectId: effect.effectId, chance: Math.min(1, effect.chancePerRank * rank) }] : [])
}

export function getWeaponHitResourceHooks(progression: ProgressionState, proficiencyId: WeaponProficiencyId | null, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  if (!proficiencyId) return [] as Array<{ resource: 'stamina' | 'mana'; amount: number; chance: number }>
  return activeEffects(progression, proficiencyId, definitions).flatMap(({ effect, rank }) => effect.type === 'weaponOnHitResourceRestore' ? [{ resource: effect.resource, amount: effect.amountPerRank * rank, chance: Math.min(1, effect.chancePerRank === undefined ? 1 : effect.chancePerRank * rank) }] : [])
}

export function getWeaponHitAdvanceHooks(progression: ProgressionState, proficiencyId: WeaponProficiencyId | null, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  if (!proficiencyId) return [] as Array<{ chance: number; fraction: number }>
  return activeEffects(progression, proficiencyId, definitions).flatMap(({ effect, rank }) => effect.type === 'weaponOnHitAdvanceAttack' ? [{ chance: Math.min(1, effect.chancePerRank * rank), fraction: effect.fraction }] : [])
}

export interface WeaponAttackModifiers {
  armorPenetrationPercent: number
  armorPenetrationFlat: number
  secondaryTargetFraction: number
  secondaryTargetCount: number
}

/** Aggregates attack-local weapon effects. These are applied to one hit only. */
export function getWeaponAttackModifiers(progression: ProgressionState, proficiencyId: WeaponProficiencyId | null, definitions: Record<string, ProficiencyPerkDefinition> = perkById, equipmentContext?: DefensiveEquipmentContext): WeaponAttackModifiers {
  const result: WeaponAttackModifiers = { armorPenetrationPercent: 0, armorPenetrationFlat: 0, secondaryTargetFraction: 0, secondaryTargetCount: 0 }
  if (!proficiencyId) return result
  for (const { effect, rank } of activeEffects(progression, proficiencyId, definitions)) {
    if (effect.type === 'weaponArmorPenetrationModifier') {
      if (effect.mode === 'percent') result.armorPenetrationPercent += effect.valuePerRank * rank
      else result.armorPenetrationFlat += effect.valuePerRank * rank
    }
    if (effect.type === 'weaponSecondaryTargetDamage') {
      result.secondaryTargetFraction += effect.fractionPerRank * rank
      result.secondaryTargetCount = Math.max(result.secondaryTargetCount, effect.maxAdditionalTargets)
    }
  }
  return result
}

export function getWeaponBlockEffectHooks(progression: ProgressionState, proficiencyId: WeaponProficiencyId | null, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  if (!proficiencyId) return [] as Array<{ effectId: string; durationSeconds?: number }>
  return activeEffects(progression, proficiencyId, definitions).flatMap(({ effect, rank }) => effect.type === 'onBlockApplyEffect' ? Array.from({ length: rank }, () => ({ effectId: effect.effectId, durationSeconds: effect.durationSeconds })) : [])
}

export function getTechniqueStaminaDrainMultiplier(progression: ProgressionState, proficiencyId: WeaponProficiencyId | null, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  if (!proficiencyId) return 1
  return Math.max(0, 1 + activeEffects(progression, proficiencyId, definitions).reduce((sum, { effect, rank }) => sum + (effect.type === 'techniqueStaminaDrainModifier' ? effect.valuePerRank * rank : 0), 0))
}

function matchesCondition(condition: { type: 'targetHpAbove' | 'targetHpBelow' | 'targetHasEffect' | 'targetHasEffectAndHpBelow' | 'manaAbove'; fraction?: number; effectId?: string }, targetHpFraction: number, targetEffectIds: string[]) {
  if (condition.type === 'manaAbove') return false
  if (condition.type === 'targetHpAbove') return targetHpFraction > (condition.fraction ?? 1)
  if (condition.type === 'targetHpBelow') return targetHpFraction < (condition.fraction ?? 0)
  if (condition.type === 'targetHasEffectAndHpBelow') return Boolean(condition.effectId && targetEffectIds.includes(condition.effectId)) && targetHpFraction < (condition.fraction ?? 0)
  return Boolean(condition.effectId && targetEffectIds.includes(condition.effectId))
}

export function getConditionalWeaponDamageMultiplier(
  progression: ProgressionState,
  proficiencyId: WeaponProficiencyId | null,
  targetHpFraction: number,
  definitions: Record<string, ProficiencyPerkDefinition> = perkById,
  targetEffectIds: string[] = [],
) {
  if (!proficiencyId) return 1
  const additive = { value: 0 }
  const multiplicative = { value: 1 }
  for (const { effect, rank } of activeEffects(progression, proficiencyId, definitions)) {
    if (effect.type === 'conditionalDamageModifier') {
      if (!matchesCondition(effect.condition, targetHpFraction, targetEffectIds)) continue
      if (effect.operation === 'increased') additive.value += effect.valuePerRank * rank
      else multiplicative.value *= Math.pow(1 + effect.valuePerRank, rank)
    }
    if (effect.type === 'weaponConditionalDamageModifier' && matchesCondition(effect.condition, targetHpFraction, targetEffectIds)) {
      if (effect.operation === 'increased') additive.value += effect.valuePerRank * rank
      else multiplicative.value *= Math.pow(1 + effect.valuePerRank, rank)
    }
  }
  return (1 + additive.value) * multiplicative.value
}

export function getWeaponDamageMultiplier(progression: ProgressionState, proficiencyId: WeaponProficiencyId | null, targetHpFraction: number, targetEffectIds: string[] = [], definitions: Record<string, ProficiencyPerkDefinition> = perkById, equipmentContext?: DefensiveEquipmentContext) {
  if (!proficiencyId) return 1
  let additive = 0
  let multiplicative = 1
  for (const { effect, rank } of activeEffects(progression, proficiencyId, definitions)) {
    if (effect.type === 'weaponDamageModifier') additive += effect.valuePerRank * rank
    if (effect.type === 'weaponConditionalDamageModifier' && matchesCondition(effect.condition, targetHpFraction, targetEffectIds)) {
      if (effect.operation === 'increased') additive += effect.valuePerRank * rank
      else multiplicative *= Math.pow(1 + effect.valuePerRank, rank)
    }
    if (effect.type === 'conditionalDamageModifier' && matchesCondition(effect.condition, targetHpFraction, targetEffectIds)) {
      if (effect.operation === 'increased') additive += effect.valuePerRank * rank
      else multiplicative *= Math.pow(1 + effect.valuePerRank, rank)
    }
  }
  if (equipmentContext) additive += getActiveDefensiveEquipmentModifiers(progression, equipmentContext, definitions).weaponModifiers.filter((modifier) => modifier.modifier === 'damage').reduce((sum, modifier) => sum + modifier.value, 0)
  return (1 + additive) * multiplicative
}

function activeMagicEffects(progression: ProgressionState, proficiencyId: MagicProficiencyId, definitions: Record<string, ProficiencyPerkDefinition>) {
  return activeEffects(progression, proficiencyId, definitions)
}

export function getActiveGlobalMagicStatModifiers(progression: ProgressionState, definitions: Record<string, ProficiencyPerkDefinition> = perkById): StatModifier[] {
  return (['fire-magic', 'water-magic', 'air-magic', 'earth-magic', 'darkness-magic'] as MagicProficiencyId[]).flatMap((id) => getActiveProficiencyStatModifiers(progression, id, definitions))
}

export function getConditionalMagicStatModifiers(progression: ProgressionState, barrierActive: boolean, definitions: Record<string, ProficiencyPerkDefinition> = perkById): StatModifier[] {
  return (['fire-magic', 'water-magic', 'air-magic', 'earth-magic', 'darkness-magic'] as MagicProficiencyId[]).flatMap((id) => getConditionalProficiencyStatModifiers(progression, id, { barrierActive }, definitions))
}

export interface EffectiveMagicModifiers {
  spellDamagePercent: number
  spellFlatDamage: number
  manaCostPercent: number
  cooldownPercent: number
  barrierAmountPercent: number
  barrierAmountFlat: number
  barrierDurationBonus: number
  barrierDurationPercent: number
  canCrit: boolean
  spellCriticalDamagePercent: number
  conditionalCriticalChance: number
  effectPeriodicPowerPercent: Record<string, number>
  effectDurationBonus: Record<string, number>
  effectMaxStacksBonus: Record<string, number>
  spellCriticalChance: number
  healingPercent: number
  healingOverTimePercent: number
  lifeDrainFraction: number
  damageBasedManaRestoreFraction: number
  spellArmorPenetrationPercent: number
  spellArmorPenetrationFlat: number
  spellSecondaryTargetFraction: number
  spellSecondaryTargetCount: number
}

export function getEffectiveMagicModifiers(progression: ProgressionState, proficiencyId: MagicProficiencyId, definitions: Record<string, ProficiencyPerkDefinition> = perkById, equipmentContext?: DefensiveEquipmentContext): EffectiveMagicModifiers {
  const result: EffectiveMagicModifiers = { spellDamagePercent: 0, spellFlatDamage: 0, manaCostPercent: 0, cooldownPercent: 0, barrierAmountPercent: 0, barrierAmountFlat: 0, barrierDurationBonus: 0, barrierDurationPercent: 0, canCrit: false, spellCriticalDamagePercent: 0, conditionalCriticalChance: 0, effectPeriodicPowerPercent: {}, effectDurationBonus: {}, effectMaxStacksBonus: {}, spellCriticalChance: 0, healingPercent: 0, healingOverTimePercent: 0, lifeDrainFraction: 0, damageBasedManaRestoreFraction: 0, spellArmorPenetrationPercent: 0, spellArmorPenetrationFlat: 0, spellSecondaryTargetFraction: 0, spellSecondaryTargetCount: 0 }
  for (const { effect, rank } of activeMagicEffects(progression, proficiencyId, definitions)) {
    if (effect.type === 'spellDamageModifier') result.spellDamagePercent += effect.valuePerRank * rank
    if (effect.type === 'spellFlatDamageModifier') result.spellFlatDamage += effect.valuePerRank * rank
    if (effect.type === 'spellManaCostModifier') result.manaCostPercent += effect.valuePerRank * rank
    if (effect.type === 'spellCooldownModifier') result.cooldownPercent += effect.valuePerRank * rank
    if (effect.type === 'barrierAmountModifier') result.barrierAmountPercent += effect.valuePerRank * rank
    if (effect.type === 'barrierFlatAmountModifier') result.barrierAmountFlat += effect.valuePerRank * rank
    if (effect.type === 'barrierDurationModifier') {
      if (Math.abs(effect.valuePerRank) < 1) result.barrierDurationPercent += effect.valuePerRank * rank
      else result.barrierDurationBonus += effect.valuePerRank * rank
    }
    if (effect.type === 'spellCanCrit' || effect.type === 'spellCritEligibility') result.canCrit = true
    if (effect.type === 'spellCriticalDamageModifier') result.spellCriticalDamagePercent += effect.valuePerRank * rank
    if (effect.type === 'spellCriticalChanceModifier') result.spellCriticalChance += effect.valuePerRank * rank
    if (effect.type === 'spellHealingModifier') result.healingPercent += effect.valuePerRank * rank
    if (effect.type === 'spellHealingOverTimeModifier') result.healingOverTimePercent += effect.valuePerRank * rank
    if (effect.type === 'spellLifeDrainModifier') result.lifeDrainFraction += effect.valuePerRank * rank
    if (effect.type === 'spellDamageBasedManaRestore') result.damageBasedManaRestoreFraction += effect.valuePerRank * rank
    if (effect.type === 'spellArmorPenetrationModifier') {
      if (effect.mode === 'percent') result.spellArmorPenetrationPercent += effect.valuePerRank * rank
      else result.spellArmorPenetrationFlat += effect.valuePerRank * rank
    }
    if (effect.type === 'spellSecondaryTargetDamage') {
      result.spellSecondaryTargetFraction += effect.fractionPerRank * rank
      result.spellSecondaryTargetCount = Math.max(result.spellSecondaryTargetCount, effect.maxAdditionalTargets)
    }
    if (effect.type === 'appliedEffectPeriodicPowerModifier' || effect.type === 'appliedEffectPeriodicDamageModifier') result.effectPeriodicPowerPercent[effect.effectId] = (result.effectPeriodicPowerPercent[effect.effectId] ?? 0) + effect.valuePerRank * rank
    if (effect.type === 'appliedEffectDurationModifier') result.effectDurationBonus[effect.effectId] = (result.effectDurationBonus[effect.effectId] ?? 0) + effect.valuePerRank * rank
    if (effect.type === 'appliedEffectMaxStacksModifier') result.effectMaxStacksBonus[effect.effectId] = (result.effectMaxStacksBonus[effect.effectId] ?? 0) + effect.valuePerRank * rank
  }
  if (equipmentContext) for (const modifier of getActiveDefensiveEquipmentModifiers(progression, equipmentContext, definitions).spellModifiers) {
    if (modifier.modifier === 'damage') result.spellDamagePercent += modifier.value
    if (modifier.modifier === 'manaCost') result.manaCostPercent += modifier.value
    if (modifier.modifier === 'cooldown') result.cooldownPercent += modifier.value
    if (modifier.modifier === 'barrierAmount') result.barrierAmountPercent += modifier.value
    if (modifier.modifier === 'barrierDuration') result.barrierDurationPercent += modifier.value
  }
  return result
}

export function getConditionalMagicDamageMultiplier(progression: ProgressionState, proficiencyId: MagicProficiencyId, targetHpFraction: number, targetEffectIds: string[], definitions: Record<string, ProficiencyPerkDefinition> = perkById, manaFraction = 1) {
  let additive = 0
  let multiplier = 1
  for (const { effect, rank } of activeMagicEffects(progression, proficiencyId, definitions)) {
    if (effect.type !== 'conditionalDamageModifier' && effect.type !== 'spellConditionalDamageModifier') continue
    const matches = effect.condition.type === 'manaAbove'
      ? manaFraction >= (effect.condition.fraction ?? 0)
      : matchesCondition(effect.condition, targetHpFraction, targetEffectIds)
    if (!matches) continue
    if (effect.operation === 'increased') additive += effect.valuePerRank * rank
    if (effect.operation === 'more') multiplier *= Math.pow(1 + effect.valuePerRank, rank)
  }
  return (1 + additive) * multiplier
}

export function getConditionalMagicManaCostMultiplier(progression: ProgressionState, proficiencyId: MagicProficiencyId, manaFraction: number, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  let additive = 0
  for (const { effect, rank } of activeMagicEffects(progression, proficiencyId, definitions)) if (effect.type === 'spellConditionalManaCostModifier' && manaFraction >= effect.condition.fraction) additive += effect.valuePerRank * rank
  return 1 + additive
}

export function getConditionalMagicCooldownMultiplier(progression: ProgressionState, proficiencyId: MagicProficiencyId, targetEffectIds: string[], definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  let additive = 0
  for (const { effect, rank } of activeMagicEffects(progression, proficiencyId, definitions)) if (effect.type === 'spellConditionalCooldownModifier' && targetEffectIds.includes(effect.condition.effectId)) additive += effect.valuePerRank * rank
  return 1 + additive
}

export function getConditionalMagicCritChance(progression: ProgressionState, proficiencyId: MagicProficiencyId, targetHpFraction: number, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  return activeMagicEffects(progression, proficiencyId, definitions).reduce((sum, { effect, rank }) => sum + (effect.type === 'spellConditionalCritModifier' && targetHpFraction < effect.condition.fraction ? effect.valuePerRank * rank : 0), 0)
}

export function getSpellHpDamageResourceHooks(progression: ProgressionState, proficiencyId: MagicProficiencyId, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  return activeMagicEffects(progression, proficiencyId, definitions).flatMap(({ effect, rank }) => effect.type === 'spellOnHpDamageResourceRestore' ? [{ resource: effect.resource, amount: effect.amountPerRank * rank, chance: Math.min(1, effect.chancePerRank === undefined ? 1 : effect.chancePerRank * rank) }] : [])
}

export function getSpellCastEffectHooks(progression: ProgressionState, proficiencyId: MagicProficiencyId, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  return activeMagicEffects(progression, proficiencyId, definitions).flatMap(({ effect }) => effect.type === 'onSpellCastApplyEffect' ? [{ effectId: effect.effectId, durationSeconds: effect.durationSeconds }] : [])
}

export function getSpellHitEffectHooks(progression: ProgressionState, proficiencyId: MagicProficiencyId, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  return activeMagicEffects(progression, proficiencyId, definitions).flatMap(({ effect, rank }) => effect.type === 'onSpellHitApplyEffect' ? [{ effectId: effect.effectId, chance: Math.min(1, effect.chancePerRank * rank), secondaryOnly: effect.secondaryOnly }] : [])
}

export function getMagicCleanseHooks(progression: ProgressionState, proficiencyId: MagicProficiencyId, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  return activeMagicEffects(progression, proficiencyId, definitions).flatMap(({ effect, rank }) => effect.type === 'onSuccessfulCleanseRestoreResource' ? [{ resource: effect.resource, amount: effect.amountPerRank * rank }] : [])
}

export function getMagicCleanseEffectHooks(progression: ProgressionState, proficiencyId: MagicProficiencyId, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  return activeMagicEffects(progression, proficiencyId, definitions).flatMap(({ effect, rank }) => effect.type === 'onSuccessfulCleanseApplyEffect' ? Array.from({ length: rank }, () => ({ effectId: effect.effectId, durationSeconds: effect.durationSeconds })) : [])
}

export function getSpellLifeDrainFraction(progression: ProgressionState, proficiencyId: MagicProficiencyId, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  return getEffectiveMagicModifiers(progression, proficiencyId, definitions).lifeDrainFraction
}


export function getBarrierAbsorbResourceRestore(progression: ProgressionState, resource: 'mana' | 'stamina', definitions: Record<string, ProficiencyPerkDefinition> = perkById, proficiencyId?: MagicProficiencyId) {
  const schools = proficiencyId ? [proficiencyId] : ['fire-magic', 'water-magic', 'air-magic', 'earth-magic', 'darkness-magic'] as MagicProficiencyId[]
  return schools.flatMap((id) => activeMagicEffects(progression, id, definitions)).reduce((sum, { effect, rank }) => sum + (effect.type === 'onBarrierAbsorbRestoreMana' && resource === 'mana' ? effect.amountPerRank * rank : effect.type === 'barrierAbsorbResourceRestore' && effect.resource === resource ? effect.amountPerRank * rank : 0), 0)
}

export function getBarrierAbsorbManaRestore(progression: ProgressionState, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  return getBarrierAbsorbResourceRestore(progression, 'mana', definitions)
}
