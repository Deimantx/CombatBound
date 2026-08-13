import { calculateEffectiveCombatStats } from './combatStats'
import type { EffectDefinition } from './combatEffectTypes'
import type { CombatState, CombatStats, CombatantRef, EnemyCombatInstance } from './combatTypes'

export function getCombatant(combat: CombatState, ref: CombatantRef) {
  if (ref.kind === 'player') return { kind: 'player' as const, playerHp: combat.playerHp, maxHealth: combat.maxPlayerHp, effects: combat.playerEffects }
  return combat.enemies.find((enemy) => enemy.instanceId === ref.instanceId) ?? null
}

export function updateCombatant(combat: CombatState, ref: CombatantRef, update: (combatant: EnemyCombatInstance | ReturnType<typeof getCombatant>) => EnemyCombatInstance | ReturnType<typeof getCombatant>) {
  if (ref.kind === 'player') return combat
  return { ...combat, enemies: combat.enemies.map((enemy) => enemy.instanceId === ref.instanceId ? update(enemy) as EnemyCombatInstance : enemy) }
}

export function isCombatantAlive(combat: CombatState, ref: CombatantRef) {
  if (ref.kind === 'player') return combat.playerHp > 0
  const enemy = combat.enemies.find((candidate) => candidate.instanceId === ref.instanceId)
  return Boolean(enemy && !enemy.defeated && enemy.currentHealth > 0)
}

export function getCombatantHealth(combat: CombatState, ref: CombatantRef) {
  if (ref.kind === 'player') return combat.playerHp
  return combat.enemies.find((enemy) => enemy.instanceId === ref.instanceId)?.currentHealth ?? 0
}

export function getEffectiveCombatStats(combat: CombatState, ref: CombatantRef, baseStats: CombatStats, definitions: Record<string, EffectDefinition>) {
  if (ref.kind === 'player') return calculateEffectiveCombatStats(baseStats, combat.playerEffects, definitions)
  const enemy = combat.enemies.find((candidate) => candidate.instanceId === ref.instanceId)
  return enemy ? calculateEffectiveCombatStats(baseStats, enemy.effects, definitions) : baseStats
}
