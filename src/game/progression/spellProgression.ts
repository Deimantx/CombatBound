import type { ActiveEffectInstance } from '../combat/combatEffectTypes'
import type { SpellDefinition } from '../data/spells'
import type { ProgressionState } from './progressionTypes'
import type { DefensiveEquipmentContext } from '../equipment/defensiveEquipment'
import { getConditionalMagicCooldownMultiplier, getConditionalMagicCritChance, getConditionalMagicDamageMultiplier, getConditionalMagicManaCostMultiplier, getEffectiveMagicModifiers } from './perkProgression'

export interface EffectiveSpellDefinition extends SpellDefinition {
  manaCost: number
  cooldownSeconds: number
  baseDamageMin: number
  baseDamageMax: number
  healing?: { flatAmount: number }
  barrierAmount?: number
  canCrit: boolean
  criticalStrikeChance: number
  criticalStrikeMultiplier: number
  effectDurationModifiers: Record<string, { durationBonusSeconds: number; durationMultiplier: number }>
  effectPeriodicPowerModifiers: Record<string, number>
  effectMaxStacksModifiers: Record<string, number>
}

export interface SpellCalculationContext {
  targetHpFraction?: number
  targetEffects?: ActiveEffectInstance[]
  manaFraction?: number
  equipmentContext?: DefensiveEquipmentContext
  /** Global player crit values supplied by the canonical combat stat build. */
  globalCriticalStrikeChance?: number
  globalCriticalStrikeMultiplier?: number
}

export function calculateEffectiveSpell(spell: SpellDefinition, progression: ProgressionState, context: SpellCalculationContext = {}): EffectiveSpellDefinition {
  const modifiers = getEffectiveMagicModifiers(progression, spell.magicProficiencyId, undefined, context.equipmentContext)
  const targetEffectIds = (context.targetEffects ?? []).map((effect) => effect.effectId)
  const manaFraction = context.manaFraction ?? 1
  const conditionalDamage = getConditionalMagicDamageMultiplier(progression, spell.magicProficiencyId, context.targetHpFraction ?? 1, targetEffectIds, undefined, manaFraction)
  const conditionalMana = getConditionalMagicManaCostMultiplier(progression, spell.magicProficiencyId, manaFraction)
  const conditionalCooldown = getConditionalMagicCooldownMultiplier(progression, spell.magicProficiencyId, targetEffectIds)
  const manaCost = Math.max(1, Math.round(spell.manaCost * (1 + modifiers.manaCostPercent) * conditionalMana))
  const cooldownSeconds = Math.max(0.1, spell.cooldownSeconds * (1 + modifiers.cooldownPercent) * conditionalCooldown)
  const baseDamageMin = Math.max(0, (spell.baseDamageMin * (1 + modifiers.spellDamagePercent) + modifiers.spellFlatDamage) * conditionalDamage)
  const baseDamageMax = Math.max(0, (spell.baseDamageMax * (1 + modifiers.spellDamagePercent) + modifiers.spellFlatDamage) * conditionalDamage)
  const effectDurationModifiers: Record<string, { durationBonusSeconds: number; durationMultiplier: number }> = {}
  for (const effectId of Object.keys(modifiers.effectDurationBonus)) effectDurationModifiers[effectId] = { durationBonusSeconds: modifiers.effectDurationBonus[effectId], durationMultiplier: 1 }
  if (spell.barrierEffectId && (modifiers.barrierDurationBonus !== 0 || modifiers.barrierDurationPercent !== 0)) effectDurationModifiers[spell.barrierEffectId] = { durationBonusSeconds: modifiers.barrierDurationBonus, durationMultiplier: 1 + modifiers.barrierDurationPercent }
  const effectPeriodicPowerModifiers = Object.fromEntries(Object.entries(modifiers.effectPeriodicPowerPercent).map(([effectId, value]) => [effectId, 1 + value]))
  const effectMaxStacksModifiers = Object.fromEntries(Object.entries(modifiers.effectMaxStacksBonus).map(([effectId, value]) => [effectId, value]))
  const healing = spell.healing === undefined ? undefined : { flatAmount: Math.max(0, spell.healing.flatAmount * (1 + modifiers.healingPercent)) }
  const canCrit = Boolean(baseDamageMin > 0 && modifiers.canCrit)
  const criticalStrikeChance = canCrit
    ? Math.max(0, (context.globalCriticalStrikeChance ?? 0) + (spell.criticalStrikeChance ?? 0) + modifiers.spellCriticalChance + getConditionalMagicCritChance(progression, spell.magicProficiencyId, context.targetHpFraction ?? 1))
    : 0
  const criticalStrikeMultiplier = canCrit
    ? Math.max(1, (context.globalCriticalStrikeMultiplier ?? 1) + modifiers.spellCriticalDamagePercent)
    : 1
  return { ...spell, manaCost, cooldownSeconds, baseDamageMin, baseDamageMax, healing, barrierAmount: spell.barrierAmount === undefined ? undefined : Math.max(0, spell.barrierAmount * (1 + modifiers.barrierAmountPercent) + modifiers.barrierAmountFlat), canCrit, criticalStrikeChance, criticalStrikeMultiplier, effectDurationModifiers, effectPeriodicPowerModifiers, effectMaxStacksModifiers }
}
