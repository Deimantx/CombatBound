import type { ActiveEffectInstance, EffectDefinition } from './combatEffectTypes'
import type { CombatState } from './combatTypes'

/** Canonical tag-based hard Crowd Control query. */
export function hasHardCrowdControl(
  effects: readonly ActiveEffectInstance[],
  definitions: Record<string, EffectDefinition>,
) {
  return effects.some((effect) => definitions[effect.effectId]?.tags.includes('hard-cc'))
}

export function isCombatantStunned(
  effects: readonly ActiveEffectInstance[],
  definitions: Record<string, EffectDefinition>,
) {
  return effects.some((effect) => definitions[effect.effectId]?.tags.includes('stun'))
}

export function isPlayerStunned(
  combat: CombatState,
  definitions: Record<string, EffectDefinition>,
) {
  return isCombatantStunned(combat.playerEffects, definitions)
}
