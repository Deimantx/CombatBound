import { combatBalance } from "./combatBalance";
import type { CombatState, EnemyCombatInstance } from "./combatTypes";
import { enemyById } from "../data/enemies";
import { createEnemyTraitRuntimeState } from "../enemyTraits/enemyTraitRuntime";

export function instantiateEnemies(
  enemyIds: string[],
  groupNumber: number,
): EnemyCombatInstance[] {
  const counts = new Map<string, number>();
  return enemyIds.map((enemyId, index) => {
    const definition = enemyById[enemyId];
    const duplicateNumber = (counts.get(enemyId) ?? 0) + 1;
    counts.set(enemyId, duplicateNumber);
    const suffix =
      duplicateNumber > 1
        ? ` ${String.fromCharCode(64 + duplicateNumber)}`
        : "";
    return {
      instanceId: `${enemyId}#group-${groupNumber}-${index + 1}`,
      enemyId,
      displayName: `${definition.name}${suffix}`,
      currentHealth: definition.maxLife,
      maxHealth: definition.maxLife,
      attackTimer: definition.baseAttackTime,
      attackInterval: definition.baseAttackTime,
      actionCooldowns: {},
      abilityCooldowns: {},
      abilityRuntime: { usedThisFight: {} },
      phaseId: null,
      currentAction: null,
      effects: [],
      defeated: false,
      rewardResolved: false,
      traitRuntime: createEnemyTraitRuntimeState(definition.traits),
    };
  });
}

export function createCombatState(): CombatState {
  return {
    phase: "inactive",
    combatLocationId: null,
    groupNumber: 0,
    enemies: [],
    selectedEnemyInstanceId: null,
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
      groupClears: 0,
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
