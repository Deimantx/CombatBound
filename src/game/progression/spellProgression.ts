import type { ActiveEffectInstance } from '../combat/combatEffectTypes'
import type { SpellDefinition } from '../data/spells'
import type { ProgressionState } from './progressionTypes'
import { getConditionalMagicCooldownMultiplier, getConditionalMagicCritChance, getConditionalMagicDamageMultiplier, getConditionalMagicManaCostMultiplier, getEffectiveMagicModifiers } from './perkProgression'

export interface EffectiveSpellDefinition extends SpellDefinition {
  manaCost: number
  cooldownSeconds: number
  damage: number
  healing?: { flatAmount: number }
  accuracyModifier: number
  barrierAmount?: number
  canCrit: boolean
  criticalChanceBonus: number
  criticalDamageMultiplier: number
  effectDurationModifiers: Record<string, { durationBonusSeconds: number; durationMultiplier: number }>
  effectPeriodicPowerModifiers: Record<string, number>
  effectMaxStacksModifiers: Record<string, number>
}

export interface SpellCalculationContext {
  targetHpFraction?: number
  targetEffects?: ActiveEffectInstance[]
  manaFraction?: number
}

export function calculateEffectiveSpell(spell: SpellDefinition, progression: ProgressionState, context: SpellCalculationContext = {}): EffectiveSpellDefinition {
  const modifiers = getEffectiveMagicModifiers(progression, spell.magicProficiencyId)
  const targetEffectIds = (context.targetEffects ?? []).map((effect) => effect.effectId)
  const manaFraction = context.manaFraction ?? 1
  const conditionalDamage = getConditionalMagicDamageMultiplier(progression, spell.magicProficiencyId, context.targetHpFraction ?? 1, targetEffectIds, undefined, manaFraction)
  const conditionalMana = getConditionalMagicManaCostMultiplier(progression, spell.magicProficiencyId, manaFraction)
  const conditionalCooldown = getConditionalMagicCooldownMultiplier(progression, spell.magicProficiencyId, targetEffectIds)
  const manaCost = Math.max(1, Math.round(spell.manaCost * (1 + modifiers.manaCostPercent) * conditionalMana))
  const cooldownSeconds = Math.max(0.1, spell.cooldownSeconds * (1 + modifiers.cooldownPercent) * conditionalCooldown)
  const damage = Math.max(0, (spell.damage * (1 + modifiers.spellDamagePercent) + modifiers.spellFlatDamage) * conditionalDamage)
  const effectDurationModifiers: Record<string, { durationBonusSeconds: number; durationMultiplier: number }> = {}
  for (const effectId of Object.keys(modifiers.effectDurationBonus)) effectDurationModifiers[effectId] = { durationBonusSeconds: modifiers.effectDurationBonus[effectId], durationMultiplier: 1 }
  if (spell.barrierEffectId && (modifiers.barrierDurationBonus !== 0 || modifiers.barrierDurationPercent !== 0)) effectDurationModifiers[spell.barrierEffectId] = { durationBonusSeconds: modifiers.barrierDurationBonus, durationMultiplier: 1 + modifiers.barrierDurationPercent }
  const effectPeriodicPowerModifiers = Object.fromEntries(Object.entries(modifiers.effectPeriodicPowerPercent).map(([effectId, value]) => [effectId, 1 + value]))
  const effectMaxStacksModifiers = Object.fromEntries(Object.entries(modifiers.effectMaxStacksBonus).map(([effectId, value]) => [effectId, value]))
  const healing = spell.healing === undefined ? undefined : { flatAmount: Math.max(0, spell.healing.flatAmount * (1 + modifiers.healingPercent)) }
  return { ...spell, manaCost, cooldownSeconds, damage, healing, accuracyModifier: modifiers.accuracy, barrierAmount: spell.barrierAmount === undefined ? undefined : Math.max(0, spell.barrierAmount * (1 + modifiers.barrierAmountPercent) + modifiers.barrierAmountFlat), canCrit: Boolean(spell.damage > 0 && modifiers.canCrit), criticalChanceBonus: modifiers.spellCriticalChance + getConditionalMagicCritChance(progression, spell.magicProficiencyId, context.targetHpFraction ?? 1), criticalDamageMultiplier: 1 + modifiers.spellCriticalDamagePercent, effectDurationModifiers, effectPeriodicPowerModifiers, effectMaxStacksModifiers }
}
