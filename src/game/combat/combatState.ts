import { combatBalance } from "./combatBalance";
import type { CombatState, EnemyCombatInstance } from "./combatTypes";
import { enemyById } from "../data/enemies";
import { createEnemyAbilityRuntimeState } from "../enemyAbilities/enemyAbilityRuntime";
import { createEnemyTraitRuntimeState } from "../enemyTraits/enemyTraitRuntime";

export function instantiateCombatTarget(
  enemyId: string,
  encounterSequence: number,
): EnemyCombatInstance | null {
  const definition = enemyById[enemyId];
  if (!definition) return null;
  return {
    instanceId: `${enemyId}#encounter-${encounterSequence}`,
    enemyId,
    displayName: definition.name,
    currentHealth: definition.maxLife,
    maxHealth: definition.maxLife,
    attackTimer: definition.baseAttackTime,
    attackInterval: definition.baseAttackTime,
    abilityCooldowns: {},
    abilityRuntime: createEnemyAbilityRuntimeState(),
    preparedAbility: null,
    phaseId: null,
    phaseStatModifiers: [],
    effects: [],
    defeated: false,
    rewardResolved: false,
    traitRuntime: createEnemyTraitRuntimeState(definition.traits),
  };
}

export function createCombatState(): CombatState {
  return {
    phase: "inactive",
    combatLocationId: null,
    targetEnemyId: null,
    enemy: null,
    encounterSequence: 0,
    playerHp: combatBalance.baseMaxLife,
    maxPlayerHp: combatBalance.baseMaxLife,
    playerAttackTimer: combatBalance.baseAttackInterval,
    playerAttackInterval: combatBalance.baseAttackInterval,
    stamina: combatBalance.baseMaxStamina,
    maxStamina: combatBalance.baseMaxStamina,
    mana: combatBalance.baseMaxMana,
    maxMana: combatBalance.baseMaxMana,
    actionCooldowns: {},
    globalCooldownRemaining: 0,
    playerEffects: [],
    potionCooldownRemaining: 0,
    recoveryRemaining: 0,
    stopReason: null,
    lastDamageSource: null,
    log: [],
    events: [],
    session: {
      elapsedSeconds: 0,
      enemiesDefeated: 0,
      damageDealt: 0,
      damageTaken: 0,
      healing: 0,
      proficiencyXpGained: {},
      itemsGained: 0,
      lootGained: {},
      itemInstanceIdsGained: [],
      goldGained: 0,
      highestHit: 0,
    },
    eventSequence: 0,
    effectSequence: 0,
  };
}
