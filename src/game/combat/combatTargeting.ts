import type { EnemyCombatInstance } from './combatTypes'
export function livingEnemies(enemies: EnemyCombatInstance[]) { return enemies.filter((enemy) => !enemy.defeated && enemy.currentHealth > 0) }
export function firstLivingEnemy(enemies: EnemyCombatInstance[]) { return livingEnemies(enemies)[0] ?? null }
export function selectNextTarget(enemies: EnemyCombatInstance[]) { return firstLivingEnemy(enemies)?.instanceId ?? null }
