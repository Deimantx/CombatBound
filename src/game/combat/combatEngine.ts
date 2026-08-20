import {
  calculateHunterCombatStats,
  type HunterCombatStats,
} from "../equipment/derivedStats";
import { magicArtById } from "../data/magicArts";
import { effectById } from "../data/effects";
import { enemyById } from "../data/enemies";
import { enemyTraitById } from "../data/enemyTraits";
import { enemyCombatAbilityById } from "../data/enemyCombatAbilities";
import { enemyAbilityEffectById } from "../data/enemyAbilityEffects";
import { combatLocationById } from "../data/world/combatLocations";
import { itemById } from "../data/items";
import { combatBalance, clamp } from "./combatBalance";
import {
  componentFromAttack,
  type DamagePacket,
} from "./combatDamage";
import {
  awardCombatXp,
  clearEndedHuntEffects,
  clearEndedEnemyEncounterEffects,
  clone,
  combatEvent as event,
  getEnemyStats,
  getPlayerStats,
  playerBaseStats,
  recoverOutOfCombatResources,
} from "./combatRuntime";
import { advanceCombatEffects as runPeriodicRuntime } from "./combatPeriodicRuntime";
import { advanceEnemyNormalAttacks as runEnemyNormalAttacks, advanceEnemyCombatAbilities as runEnemyRuntime } from "./combatEnemyRuntime";
import {
  castMagicArt as runPlayerCastMagicArt,
  damageEnemy as runPlayerDamageEnemy,
  executePlayerAction as runPlayerExecuteAction,
  useHealingPotion as runPlayerUseHealingPotion,
} from "./combatPlayerActionsRuntime";
export { applyEnemyHealthDamage, applyPlayerHealthDamage } from "./combatHealth";
import { instantiateCombatTarget } from "./combatState";
import { resolveEnemyKillRewards } from "./combatRewards";
import { calculateProficiencyXpAward, discoverProficiency } from "../progression/proficiencyProgression";
import { hunterRankForPoints } from "../progression/hunterRankProgression";
import {
  getBarrierAbsorbResourceRestore,
} from "../progression/perkProgression";
import { perkById } from "../data/proficiencyPerks";
import { proficiencyById } from "../data/proficiencies";
import {
  calculateDefensiveTrainingAwards,
  getDefensiveEquipmentContext,
  type DefensiveTrainingEvent,
} from "../equipment/defensiveEquipment";
import {
  evaluateAutomation,
} from "../automation/automationLogic";
import type { GameState } from "../gameState";
import type {
  ActiveEffectInstance,
  EffectDefinition,
} from "./combatEffectTypes";
import type {
  CombatContext,
  CombatState,
  CombatStats,
  CombatantRef,
  EnemyCombatInstance,
} from "./combatTypes";
import { advanceEnemyTraitRuntime, applyEnemyTraitCombatStart } from "../enemyTraits/enemyTraitRuntime";
import { getPlayerHealingReceivedMultiplier } from "./combatHealing";
import { isPlayerStunned } from "./combatCrowdControl";
import type {
  CombatProficiencyId,
  ProgressionCredit,
} from "../progression/progressionTypes";

export function createCombatContext(rng: CombatContext["rng"]): CombatContext {
  return {
    enemies: enemyById,
    locations: combatLocationById,
    magicArts: magicArtById,
    items: itemById,
    effects: { ...effectById, ...enemyAbilityEffectById },
    enemyCombatAbilities: enemyCombatAbilityById,
    enemyTraits: enemyTraitById,
    rng,
  };
}

/** Read-only domain context for previews and editors; it contains no UI-fabricated data. */
export function createCombatPreviewContext(): CombatContext {
  return createCombatContext({ next: () => 0.5 });
}

/** Canonical defensive progression hook: invoke once after a direct enemy combat event resolves. */
export function resolveDefensiveTrainingForCombatEvent(
  game: GameState,
  trainingEvent: DefensiveTrainingEvent,
  items = itemById,
) {
  if (!trainingEvent.resolved) return game;
  const awards = calculateDefensiveTrainingAwards(
    getDefensiveEquipmentContext(game.equipment, game.inventory, items),
  );
  let next = game;
  for (const [proficiencyId, amount] of Object.entries(awards) as Array<
    [CombatProficiencyId, number]
  >) {
    if (amount > 0) next = awardCombatXp(next, proficiencyId, amount).game;
  }
  return next;
}

function applyEffectiveHealing(
  game: GameState,
  proficiencyId: CombatProficiencyId,
  requestedAmount: number,
  source: CombatantRef,
  label: string,
  awardProgression = true,
) {
  const selectedEnemy = game.combat.enemy && !game.combat.enemy.defeated ? game.combat.enemy : undefined;
  const healingMultiplier = getPlayerHealingReceivedMultiplier(game.combat, {
    enemies: enemyById,
    locations: combatLocationById,
    items: itemById,
    effects: effectById,
    enemyCombatAbilities: enemyCombatAbilityById,
    enemyTraits: enemyTraitById,
    rng: { next: () => 0.5 },
  }, selectedEnemy);
  requestedAmount *= healingMultiplier;
  const effective = Math.min(
    Math.max(0, game.combat.maxPlayerHp - game.combat.playerHp),
    Math.max(0, requestedAmount),
  );
  if (effective <= 0) return game;
  let next = {
    ...game,
    combat: event(
      {
        ...game.combat,
        playerHp: game.combat.playerHp + effective,
        session: {
          ...game.combat.session,
          healing: game.combat.session.healing + effective,
        },
      },
      {
        text: `${label} restores ${effective} HP.`,
        type: "player",
        eventType: "healingDone",
        source,
        target: { kind: "player" },
        data: { amount: effective },
      },
    ),
  };
  if (awardProgression)
    next = awardCombatXp(
      next,
      proficiencyId,
      calculateProficiencyXpAward({
        type: "effective-healing",
        amount: effective,
      }),
    ).game;
  return next;
}

function discoverCombatProficiency(
  game: GameState,
  proficiencyId: CombatProficiencyId,
) {
  return game.progression.proficiencies[proficiencyId]
    ? game
    : {
        ...game,
        progression: discoverProficiency(game.progression, proficiencyId),
      };
}

function restoreBarrierResource(
  game: GameState,
  proficiencyId: CombatProficiencyId,
  absorbedAmount: number,
) {
  const resource = proficiencyId === "earth-magic" ? "stamina" : null;
  const magicProficiencyId =
    proficiencyId === "earth-magic"
      ? proficiencyId
      : undefined;
  if (!resource || !magicProficiencyId) return game;
  const restored =
    getBarrierAbsorbResourceRestore(
      game.progression,
      resource,
      perkById,
      magicProficiencyId,
    ) * absorbedAmount;
  if (restored <= 0) return game;
  return {
    ...game,
    combat: {
      ...game.combat,
      stamina: Math.min(game.combat.maxStamina, game.combat.stamina + restored),
    },
  };
}

function awardBarrierCredits(
  game: GameState,
  absorptions: Array<{
    effectId: string;
    amount: number;
    progressionCredit?: ProgressionCredit;
  }>,
) {
  let next = game;
  for (const absorption of absorptions) {
    const credit = absorption.progressionCredit;
    if (credit?.mode !== "barrier-absorb") continue;
    next = awardCombatXp(
      next,
      credit.proficiencyId,
      calculateProficiencyXpAward({
        type: "barrier-absorption",
        amount: absorption.amount,
      }),
    ).game;
    next = restoreBarrierResource(
      next,
      credit.proficiencyId,
      absorption.amount,
    );
  }
  return next;
}

const playerDamageRuntimeDependencies = {
  awardBarrierCredits,
  restoreBarrierResource,
  resolveDefeatedEnemies,
};

const playerActionRuntimeDependencies = {
  ...playerDamageRuntimeDependencies,
  applyEffectiveHealing,
  discoverCombatProficiency,
};

/** Extension point for future inventory-capacity and other continuation rules. */
export function canCombatContinue(_game: GameState): boolean {
  return true;
}

export function startHunt(
  game: GameState,
  locationId: string,
  stats: HunterCombatStats,
  context: CombatContext,
  enemyId?: string,
): GameState {
  return enemyId ? startCombatTarget(game, locationId, enemyId, stats, context) : game;
}

/** DEV-only entry point that still uses the canonical combat instance/session setup. */
export function startDebugEncounter(
  game: GameState,
  locationId: string,
  enemyIds: string[],
  stats: HunterCombatStats,
  context: CombatContext,
): GameState {
  const enemyId = enemyIds.find((candidate) => context.enemies[candidate]);
  return enemyId ? startCombatTarget(game, locationId, enemyId, stats, context) : game;
}

function createActiveCombat(previous: CombatState, locationId: string, enemyId: string, stats: HunterCombatStats): CombatState {
  const enemy = instantiateCombatTarget(enemyId, previous.encounterSequence + 1);
  if (!enemy) return previous;
  const base = playerBaseStats(stats);
  return {
    ...previous,
    phase: "active",
    combatLocationId: locationId,
    targetEnemyId: enemyId,
    enemy,
    encounterSequence: previous.encounterSequence + 1,
    maxPlayerHp: base.maxLife ?? 0,
    playerHp: Math.min(previous.playerHp, base.maxLife ?? 0),
    playerAttackInterval: base.attackInterval,
    playerAttackTimer: base.attackInterval,
    stamina: clamp(previous.stamina, 0, base.maxStamina),
    maxStamina: base.maxStamina,
    mana: clamp(previous.mana, 0, base.maxMana),
    maxMana: base.maxMana,
    recoveryRemaining: 0,
    stopReason: null,
    lastDamageSource: null,
  };
}

function createFreshEncounter(previous: CombatState, locationId: string, enemyId: string, stats: HunterCombatStats, context: CombatContext): CombatState {
  const started = createActiveCombat(previous, locationId, enemyId, stats);
  if (!started.enemy) return started;
  const withTraits = applyEnemyTraitCombatStart(started, context);
  const playerStats = getPlayerStats(withTraits, stats, context);
  const enemy = withTraits.enemy;
  if (!enemy) return withTraits;
  const enemyStats = getEnemyStats(withTraits, enemy, context);
  return {
    ...withTraits,
    playerAttackInterval: playerStats.attackInterval,
    playerAttackTimer: playerStats.attackInterval,
    enemy: {
      ...enemy,
      attackInterval: enemyStats.attackInterval,
      attackTimer: enemyStats.attackInterval,
    },
  };
}

export function startCombatTarget(game: GameState, locationId: string, enemyId: string, stats: HunterCombatStats, context: CombatContext): GameState {
  const location = context.locations[locationId];
  const target = location?.targets.find((entry) => entry.enemyId === enemyId);
  const hunterRank = hunterRankForPoints(game.progression.hunterRankPoints);
  if (!location || !target || !context.enemies[enemyId] || (target.minHunterRank ?? 0) > hunterRank) return game;
  const clean = clearEndedHuntEffects({ ...game.combat, session: { ...game.combat.session, elapsedSeconds: 0, enemiesDefeated: 0, damageDealt: 0, damageTaken: 0, healing: 0, proficiencyXpGained: {}, itemsGained: 0, lootGained: {}, itemInstanceIdsGained: [], goldGained: 0, highestHit: 0 }, enemy: null }, context.effects);
  const started = createFreshEncounter(clean, locationId, enemyId, stats, context);
  return started.enemy ? { ...game, combat: started } : game;
}

export function switchCombatTarget(game: GameState, locationId: string, enemyId: string, stats: HunterCombatStats, context: CombatContext): GameState {
  const location = context.locations[locationId];
  const target = location?.targets.find((entry) => entry.enemyId === enemyId);
  const hunterRank = hunterRankForPoints(game.progression.hunterRankPoints);
  if (!location || !target || !context.enemies[enemyId] || (target.minHunterRank ?? 0) > hunterRank) return game;
  const ended = clearEndedHuntEffects({ ...game.combat, enemy: null }, context.effects);
  const started = createFreshEncounter(ended, locationId, enemyId, stats, context);
  return started.enemy ? { ...game, combat: started } : game;
}

export function executePlayerAction(
  game: GameState,
  actionId: string,
  stats: HunterCombatStats,
  context: CombatContext,
  source: "manual" | "automation" = "manual",
): GameState {
  return runPlayerExecuteAction(game, actionId, stats, context, playerActionRuntimeDependencies, source);
}

/** @deprecated Retired Spell actions are no longer part of the current combat dispatcher. */
export function castSpell(game: GameState, ..._legacyArguments: unknown[]): GameState {
  return game;
}

export function castMagicArt(
  game: GameState,
  artId: string,
  stats: HunterCombatStats,
  context: CombatContext,
  actionSource: "manual" | "automation" = "manual",
): GameState {
  return runPlayerCastMagicArt(game, artId, stats, context, playerActionRuntimeDependencies, actionSource);
}

function damageEnemy(
  game: GameState,
  target: EnemyCombatInstance,
  packet: DamagePacket,
  attackerStats: CombatStats,
  context: CombatContext,
  prefix: string,
  effectsToApply: Parameters<typeof runPlayerDamageEnemy>[6] = [],
) {
  return runPlayerDamageEnemy(
    game,
    target,
    packet,
    attackerStats,
    context,
    prefix,
    effectsToApply,
    playerDamageRuntimeDependencies,
  );
}

export function useHealingPotion(
  game: GameState,
  stats: HunterCombatStats,
  context: CombatContext = createCombatContext({ next: () => Math.random() }),
  source: "manual" | "automation" = "manual",
) {
  return runPlayerUseHealingPotion(game, stats, context, source);
}

export function advanceCombat(
  input: GameState,
  deltaSeconds: number,
  context: CombatContext,
  stats: HunterCombatStats,
): GameState {
  let game = clone(input);
  let remaining = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0);
  while (remaining > 0) {
    const step = Math.min(remaining, combatBalance.maxSimulationStepSeconds);
    game = advanceCombatStep(game, step, context, stats);
    remaining -= step;
  }
  return game;
}

/**
 * Resolve one canonical Combat step. Live play slices into 0.1 second
 * quanta; Offline Combat may call this with a larger, scheduler-proven safe
 * interval so every damage/action implementation remains shared.
 */
export function advanceCombatStep(
  game: GameState,
  step: number,
  context: CombatContext,
  stats: HunterCombatStats,
): GameState {
  let combat = game.combat;
  if (combat.phase === "recovery") {
    game = advanceCombatEffects(game, step, context, stats);
    combat = game.combat;
    const effective = getPlayerStats(combat, stats, context, game.progression);
    combat = {
      ...recoverOutOfCombatResources(combat, effective, step),
      recoveryRemaining: combat.recoveryRemaining - step,
      session: {
        ...combat.session,
        elapsedSeconds: combat.session.elapsedSeconds + step,
      },
    };
    if (combat.recoveryRemaining <= 0 && combat.combatLocationId) {
      const location = context.locations[combat.combatLocationId];
      combat = location && combat.targetEnemyId
        ? createFreshEncounter(combat, location.id, combat.targetEnemyId, stats, context)
        : { ...combat, phase: "stopped", stopReason: "completed", enemy: null };
    } else if (combat.recoveryRemaining <= 0)
      combat = { ...combat, phase: "stopped", stopReason: "completed" };
    return { ...game, combat };
  }
  if (combat.phase === "inactive" || combat.phase === "stopped") {
    const effective = getPlayerStats(combat, stats, context, game.progression);
    return {
      ...game,
      combat: recoverOutOfCombatResources(combat, effective, step),
    };
  }
  if (combat.phase !== "active") return game;
  combat = {
    ...combat,
    session: {
      ...combat.session,
      elapsedSeconds: combat.session.elapsedSeconds + step,
    },
    potionCooldownRemaining: Math.max(0, combat.potionCooldownRemaining - step),
    globalCooldownRemaining: Math.max(0, combat.globalCooldownRemaining - step),
    playerAttackTimer: combat.playerAttackTimer - step,
    stamina: clamp(
      combat.stamina +
        getPlayerStats(combat, stats, context, game.progression).staminaRegen *
          step,
      0,
      combat.maxStamina,
    ),
    mana: clamp(
      combat.mana +
        (getPlayerStats(combat, stats, context, game.progression).manaRegenFlat ?? 0) *
          step,
      0,
      combat.maxMana,
    ),
    actionCooldowns: Object.fromEntries(
      Object.entries(combat.actionCooldowns).map(([id, remaining]) => [
        id,
        Math.max(0, remaining - step),
      ]),
    ),
  };
  game = { ...game, combat };
  game = advanceEnemyTraitRuntime(game, step, context);
  combat = game.combat;
  game = advanceCombatEffects(game, step, context, stats);
  combat = game.combat;
  if (combat.phase !== "active") return game;
  const effective = getPlayerStats(combat, stats, context, game.progression);
  const engagedEnemy = combat.enemy && !combat.enemy.defeated ? combat.enemy : undefined;
  const healingMultiplier = getPlayerHealingReceivedMultiplier(combat, context, engagedEnemy);
  const requestedRegen = Math.max(0, effective.lifeRegenFlat ?? 0) * step * healingMultiplier;
  const effectiveHealing = Math.min(
    Math.max(0, (effective.maxLife ?? 0) - combat.playerHp),
    requestedRegen,
  );
  combat = {
    ...combat,
    maxPlayerHp: effective.maxLife ?? 0,
    playerHp: combat.playerHp + effectiveHealing,
    session:
      effectiveHealing > 0
        ? {
            ...combat.session,
            healing: combat.session.healing + effectiveHealing,
          }
        : combat.session,
  };
  game = { ...game, combat };
  game = runEnemyRuntime(
    { ...game, combat },
    step,
    context,
    stats,
    {
      applyEffectiveHealing,
      awardBarrierCredits,
      resolveDefensiveTrainingForCombatEvent,
    },
  );
  combat = game.combat;
  if (combat.phase !== "active") return game;
  const decision = evaluateAutomation(game, stats, context, context.debugHooks?.onAutomationTrace);
  if (decision.actionId) {
    const beforeGame = game;
    const executed = executePlayerAction(
      game,
      decision.actionId,
      stats,
      context,
      "automation",
    );
    const actionExecuted =
      executed !== beforeGame || executed.combat !== beforeGame.combat;
    game = executed;
    combat = game.combat;
    if (actionExecuted) {
      game = {
        ...game,
        combat: {
          ...game.combat,
          lastAutomationAction: {
            actionId: decision.actionId,
            elapsedSeconds: game.combat.session.elapsedSeconds,
          },
          lastAutomationFailure: undefined,
        },
      };
      combat = game.combat;
    }
  } else if (decision.invalid) {
    game = {
      ...game,
      combat: {
        ...game.combat,
        lastAutomationFailure: decision.invalid.reason,
      },
    };
  }
  if (combat.playerAttackTimer <= 0 && !isPlayerStunned(combat, context.effects)) {
    const target = combat.enemy && !combat.enemy.defeated ? combat.enemy : undefined;
    if (target) {
      combat = {
        ...combat,
        playerAttackTimer: Math.max(
          combatBalance.minimumAttackInterval,
          effective.attackInterval,
        ),
      };
      const packet: DamagePacket = {
        ...componentFromAttack("physical", 1, true),
        sourceCategory: proficiencyById[stats.weaponProficiencyId ?? ""]?.category === "ranged" ? "ranged" : "melee",
        source: { kind: "player" },
        target: { kind: "enemy", instanceId: target.instanceId },
        defensiveEligibility: {
          canMiss: true,
          canBeEvaded: true,
          blockable: true,
        },
        progressionSource: {
          type: "equippedWeapon",
          proficiencyEligible: true,
        },
      };
      game = damageEnemy(
        { ...game, combat },
        target,
        packet,
        effective,
        context,
        `You hit ${target.displayName}`,
      );
      combat = game.combat;
    }
  }
  game = resolveDefeatedEnemies({ ...game, combat }, context);
  combat = game.combat;
  if (combat.phase !== "active") return game;
  return runEnemyNormalAttacks(game, step, context, stats, {
    applyEffectiveHealing,
    awardBarrierCredits,
    resolveDefensiveTrainingForCombatEvent,
  });
}

function advanceCombatEffects(
  game: GameState,
  step: number,
  context: CombatContext,
  stats: HunterCombatStats,
) {
  return runPeriodicRuntime(game, step, context, stats, {
    applyEffectiveHealing,
    restoreBarrierResource,
    resolveDefeatedEnemies,
  });
}

function resolveDefeatedEnemies(
  game: GameState,
  context: CombatContext,
): GameState {
  const enemy = game.combat.enemy;
  if (!enemy || !enemy.defeated || enemy.rewardResolved) return game;
  const location = game.combat.combatLocationId ? context.locations[game.combat.combatLocationId] : undefined;
  const reward = resolveEnemyKillRewards(game, game.combat, enemy, location, context);
  let next = reward.game;
  const encounterEnded = clearEndedEnemyEncounterEffects({ ...reward.combat, enemy: { ...enemy, currentHealth: 0, defeated: true, rewardResolved: true, preparedAbility: null, effects: [] } }, context.effects);
  next.combat = event(encounterEnded, { text: `${enemy.displayName} was defeated.`, type: "system", eventType: "enemyDefeated", target: { kind: "enemy", instanceId: enemy.instanceId }, data: { enemyId: enemy.enemyId } });
  for (const roll of reward.rolls) next.combat = event(next.combat, { text: `${roll.source === "location" ? "Zone shared loot" : "Target loot"}: ${context.items[roll.itemId]?.name ?? roll.itemId}.`, type: "system" });
  if (!canCombatContinue(next)) {
    return { ...next, combat: event({ ...next.combat, phase: "stopped", stopReason: "inventoryFull", enemy: null, recoveryRemaining: 0 }, { text: "Combat stopped because the inventory is full.", type: "system", eventType: "huntStopped" }) };
  }
  next.combat = event({ ...next.combat, phase: "recovery", enemy: null, recoveryRemaining: combatBalance.recoverySeconds }, { text: `Recovery begins. ${combatBalance.recoverySeconds}s until ${enemy.displayName} returns.`, type: "system", eventType: "recoveryStarted" });
  return next;
}

/** Debug-only entry point that still uses the canonical target encounter path. */
export function forceDefeatEnemiesForDebug(
  game: GameState,
  instanceIds: string[],
  context: CombatContext,
): GameState {
  const enemy = game.combat.enemy;
  if (!enemy || !instanceIds.includes(enemy.instanceId) || enemy.defeated) return game;
  return resolveDefeatedEnemies({ ...game, combat: { ...game.combat, enemy: { ...enemy, currentHealth: 0, defeated: true, preparedAbility: null } } }, context);
}

/** Debug-only player defeat that emits the same canonical defeat event as combat. */
export function forceDefeatPlayerForDebug(game: GameState): GameState {
  if (game.combat.phase === "defeat") return game;
  const defeated = clearEndedHuntEffects({ ...game.combat, playerHp: 0, phase: "defeat", stopReason: "defeat", recoveryRemaining: 0, enemy: game.combat.enemy ? { ...game.combat.enemy, preparedAbility: null } : null }, effectById);
  return {
    ...game,
    combat: event(
      {
        ...defeated,
        enemy: null,
      },
      {
        text: "The Hunter was defeated by a debug action.",
        type: "system",
        eventType: "combatantDefeated",
        target: { kind: "player" },
      },
    ),
  };
}

export function stopHunt(
  combat: CombatState,
  definitions: Record<string, EffectDefinition> = effectById,
) {
  const shouldKeep = (effect: ActiveEffectInstance) =>
    definitions[effect.effectId]?.persistence !== "hunt" &&
    definitions[effect.effectId]?.persistence !== "between-enemies" &&
    definitions[effect.effectId]?.persistence !== "enemy-life";
  return {
    ...combat,
    phase: "stopped" as const,
    stopReason: "manual" as const,
    recoveryRemaining: 0,
    playerEffects: combat.playerEffects.filter(shouldKeep),
    enemy: null,
  };
}

export function syncCombatStats(game: GameState): GameState {
  const stats = calculateHunterCombatStats(
    game.equipment,
    game.inventory,
    game.progression,
  );
  const canonical = playerBaseStats(stats);
  const fraction = (value: number, maximum: number) =>
    maximum > 0 ? clamp(value / maximum, 0, 1) : 0;
  const healthFraction = fraction(game.combat.playerHp, game.combat.maxPlayerHp);
  const staminaFraction = fraction(game.combat.stamina, game.combat.maxStamina);
  const manaFraction = fraction(game.combat.mana, game.combat.maxMana);
  return {
    ...game,
    combat: {
      ...game.combat,
      maxPlayerHp: canonical.maxLife ?? 0,
      playerHp: (canonical.maxLife ?? 0) * healthFraction,
      playerAttackInterval: canonical.attackInterval,
      maxStamina: canonical.maxStamina,
      stamina: canonical.maxStamina * staminaFraction,
      maxMana: canonical.maxMana,
      mana: canonical.maxMana * manaFraction,
    },
  };
}
