import { combatBalance } from './combatBalance'
import type { CombatState, EnemyCombatInstance, SpellRuntime } from './combatTypes'
import { enemyById } from '../data/enemies'
import { spellDefinitions } from '../data/spells'

export function instantiateEnemies(enemyIds: string[], groupNumber: number): EnemyCombatInstance[] {
  const counts = new Map<string, number>()
  return enemyIds.map((enemyId, index) => {
    const definition = enemyById[enemyId]
    const duplicateNumber = (counts.get(enemyId) ?? 0) + 1
    counts.set(enemyId, duplicateNumber)
    const suffix = duplicateNumber > 1 ? ` ${String.fromCharCode(64 + duplicateNumber)}` : ''
    return { instanceId: `${enemyId}#group-${groupNumber}-${index + 1}`, enemyId, displayName: `${definition.name}${suffix}`, currentHealth: definition.maxHealth, maxHealth: definition.maxHealth, attackTimer: definition.attackInterval, attackInterval: definition.attackInterval, specialCooldownRemaining: 0, currentAction: null, effects: [], defeated: false, rewardResolved: false }
  })
}

export function createCombatState(): CombatState {
  const spells: SpellRuntime[] = spellDefinitions.map((spell) => ({ spellId: spell.id, cooldownRemaining: 0, autoEnabled: spell.id === 'spell.protective-sign' }))
  return {
    phase: 'inactive', combatLocationId: null, groupNumber: 0, enemies: [], selectedEnemyInstanceId: null,
    playerHp: combatBalance.baseMaxHealth, maxPlayerHp: combatBalance.baseMaxHealth, playerAttackTimer: combatBalance.baseAttackInterval, playerAttackInterval: combatBalance.baseAttackInterval,
    energy: combatBalance.baseEnergy, maxEnergy: combatBalance.baseEnergy, adrenaline: 0, maxAdrenaline: combatBalance.baseAdrenaline,
    stance: 'mid', stanceCooldownRemaining: 0, techniques: { 'careful-positioning': false, 'heightened-reflexes': false }, spells, playerEffects: [], potionCooldownRemaining: 0, recoveryRemaining: 0, stopReason: null, lastDamageSource: null,
    log: [], events: [], session: { elapsedSeconds: 0, groupClears: 0, enemiesDefeated: 0, damageDealt: 0, damageTaken: 0, healing: 0, xpGained: 0, itemsGained: 0, lootGained: {}, goldGained: 0, highestHit: 0 }, eventSequence: 0, effectSequence: 0,
  }
}
