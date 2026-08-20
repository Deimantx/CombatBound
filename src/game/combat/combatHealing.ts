import { calculateHealingReceivedMultiplier } from './combatEffects'
import { getEnemyTraitHealingReceivedMultiplier } from '../enemyTraits/enemyTraitRuntime'
import type { CombatContext, CombatState, EnemyCombatInstance } from './combatTypes'

/**
 * Canonical player healing multiplier. All direct and periodic combat heals
 * should use this accessor before applying the missing-health cap.
 */
export function getPlayerHealingReceivedMultiplier(
  combat: CombatState,
  context: CombatContext,
  sourceEnemy?: EnemyCombatInstance,
) {
  const enemy = sourceEnemy ?? combat.enemies.find((candidate) => candidate.instanceId === combat.selectedEnemyInstanceId && !candidate.defeated)
  const traitMultiplier = enemy
    ? getEnemyTraitHealingReceivedMultiplier(enemy, context.enemies, context.enemyTraits)
    : 1
  return calculateHealingReceivedMultiplier(combat.playerEffects, context.effects, traitMultiplier)
}
