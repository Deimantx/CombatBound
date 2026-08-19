import {
  calculateHunterCombatStats,
  type HunterCombatStats,
} from "../equipment/derivedStats";
import { spellById } from "../data/spells";
import { effectById } from "../data/effects";
import { enemyById } from "../data/enemies";
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
  clone,
  combatEvent as event,
  getPlayerStats,
  playerBaseStats,
  recoverOutOfCombatResources,
} from "./combatRuntime";
import { advanceCombatEffects as runPeriodicRuntime } from "./combatPeriodicRuntime";
import { calculateStaminaDelta } from "./combatResourceRuntime";
import { advanceEnemyNormalAttacks as runEnemyNormalAttacks, advanceEnemySpecials as runEnemyRuntime } from "./combatEnemyRuntime";
import {
  castSpell as runPlayerCastSpell,
  damageEnemy as runPlayerDamageEnemy,
  executePlayerAction as runPlayerExecuteAction,
  useHealingPotion as runPlayerUseHealingPotion,
} from "./combatPlayerActionsRuntime";
export { applyEnemyHealthDamage, applyPlayerHealthDamage } from "./combatHealth";
import { instantiateEnemies } from "./combatState";
import { generateCombatGroup } from "./combatGroupGenerator";
import {
  firstLivingEnemy,
  livingEnemies,
  selectNextTarget,
} from "./combatTargeting";
import {
  resolveEnemyReward,
  resolveLocationClearReward,
} from "./combatRewards";
import { calculateProficiencyXpAward, discoverProficiency } from "../progression/proficiencyProgression";
import { hunterRankForPoints } from "../progression/hunterRankProgression";
import {
  getBarrierAbsorbResourceRestore,
} from "../progression/perkProgression";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import { perkById } from "../data/proficiencyPerks";
import {
  calculateDefensiveTrainingAwards,
  getDefensiveEquipmentContext,
  type DefensiveTrainingEvent,
} from "../equipment/defensiveEquipment";
import { canToggleTechnique } from "../combatAbilities/combatAbilitySelectors";
import {
  evaluateAutomation,
  selectAutomationTarget,
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
  TechniqueId,
} from "./combatTypes";
import type {
  CombatProficiencyId,
  ProgressionCredit,
} from "../progression/progressionTypes";

export function createCombatContext(rng: CombatContext["rng"]): CombatContext {
  return {
    enemies: enemyById,
    locations: combatLocationById,
    spells: Object.fromEntries(
      Object.values(spellById).map((spell) => [spell.id, spell]),
    ),
    items: itemById,
    effects: effectById,
    rng,
  };
}

/** Read-only domain context for previews and editors; it contains no UI-fabricated data. */
export function createCombatPreviewContext(): CombatContext {
  return createCombatContext({ next: () => 0.5 });
}

/** Canonical defensive progression hook: invoke once after a direct enemy action resolves. */
export function resolveDefensiveTrainingForEnemyAction(
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

export function startHunt(
  game: GameState,
  locationId: string,
  stats: HunterCombatStats,
  context: CombatContext,
): GameState {
  const location = context.locations[locationId];
  if (!location) return game;
  const group = generateCombatGroup(
    location,
    context.rng,
    hunterRankForPoints(game.progression.hunterRankPoints),
  );
  const session = {
    ...game.combat.session,
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
  };
  const clean = clearEndedHuntEffects(
    { ...game.combat, session },
    context.effects,
  );
  const combat = createActiveCombat(clean, locationId, group, stats, 1, false);
  return { ...game, combat };
}

/** DEV-only entry point that still uses the canonical combat instance/session setup. */
export function startDebugEncounter(
  game: GameState,
  locationId: string,
  enemyIds: string[],
  stats: HunterCombatStats,
  context: CombatContext,
): GameState {
  if (!context.locations[locationId]) return game;
  const validEnemyIds = enemyIds.filter((enemyId) => Boolean(context.enemies[enemyId])).slice(0, 12);
  if (validEnemyIds.length === 0) return game;
  const session = { ...game.combat.session, elapsedSeconds: 0, groupClears: 0, enemiesDefeated: 0, damageDealt: 0, damageTaken: 0, healing: 0, proficiencyXpGained: {}, itemsGained: 0, lootGained: {}, itemInstanceIdsGained: [], goldGained: 0, highestHit: 0 };
  const clean = clearEndedHuntEffects({ ...game.combat, session }, context.effects);
  return { ...game, combat: createActiveCombat(clean, locationId, validEnemyIds, stats, Math.max(1, game.combat.groupNumber + 1), false) };
}

function createActiveCombat(
  previous: CombatState,
  locationId: string,
  enemyIds: string[],
  stats: HunterCombatStats,
  groupNumber: number,
  resetResources = false,
): CombatState {
  const enemies = instantiateEnemies(enemyIds, groupNumber);
  const base = playerBaseStats(stats);
  return {
    ...previous,
    phase: "active",
    combatLocationId: locationId,
    groupNumber,
    enemies,
    selectedEnemyInstanceId: enemies[0]?.instanceId ?? null,
    maxPlayerHp: base.maxLife ?? 0,
    playerHp: resetResources
      ? base.maxLife ?? 0
      : Math.min(previous.playerHp, base.maxLife ?? 0),
    playerAttackInterval: base.attackInterval,
    playerAttackTimer: Math.min(
      previous.playerAttackTimer,
      base.attackInterval,
    ),
    stamina: resetResources
      ? base.maxStamina
      : clamp(previous.stamina, 0, base.maxStamina),
    maxStamina: base.maxStamina,
    mana: resetResources ? base.maxMana : clamp(previous.mana, 0, base.maxMana),
    maxMana: base.maxMana,
    actionCooldowns: {},
    globalCooldownRemaining: 0,
    recoveryRemaining: 0,
    stopReason: null,
    lastDamageSource: null,
  };
}

export function selectEnemy(combat: CombatState, instanceId: string) {
  return combat.enemies.some(
    (enemy) => enemy.instanceId === instanceId && !enemy.defeated,
  )
    ? { ...combat, selectedEnemyInstanceId: instanceId }
    : combat;
}

export function toggleTechnique(game: GameState, technique: TechniqueId) {
  if (!canToggleTechnique(game, technique)) return game;
  return {
    ...game,
    combat: {
      ...game.combat,
      techniques: {
        ...game.combat.techniques,
        [technique]: !game.combat.techniques[technique],
      },
    },
  };
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

export function castSpell(
  game: GameState,
  spellId: string,
  stats: HunterCombatStats,
  context: CombatContext,
  actionSource: "manual" | "automation" = "manual",
): GameState {
  return runPlayerCastSpell(game, spellId, stats, context, playerActionRuntimeDependencies, actionSource);
}

function damageEnemy(
  game: GameState,
  target: EnemyCombatInstance,
  packet: DamagePacket,
  attackerStats: CombatStats,
  context: CombatContext,
  prefix: string,
  effectsToApply: Parameters<typeof runPlayerDamageEnemy>[6] = [],
  allowSecondary = true,
  isSecondary = false,
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
    allowSecondary,
    isSecondary,
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
      const group = location
        ? generateCombatGroup(
            location,
            context.rng,
            hunterRankForPoints(game.progression.hunterRankPoints),
          )
        : [];
      combat =
        location && group.length > 0
          ? createActiveCombat(
              combat,
              location.id,
              group,
              stats,
              combat.groupNumber + 1,
            )
          : { ...combat, phase: "stopped", stopReason: "completed" };
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
        calculateStaminaDelta(
          combat,
          stats,
          context,
          game.progression,
          getEquippedWeaponProficiency(game.equipment, game.inventory),
        ) *
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
  game = advanceCombatEffects(game, step, context, stats);
  combat = game.combat;
  if (combat.phase !== "active") return game;
  const effective = getPlayerStats(combat, stats, context, game.progression);
  const requestedRegen = Math.max(0, effective.lifeRegenFlat ?? 0) * step;
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
  if (
    combat.stamina <= 0 &&
    (combat.techniques["careful-positioning"] ||
      combat.techniques["heightened-reflexes"])
  ) {
    combat = event(
      {
        ...combat,
        stamina: 0,
        techniques: {
          "careful-positioning": false,
          "heightened-reflexes": false,
        },
      },
      { text: "Techniques deactivated: Stamina depleted.", type: "system" },
    );
  }
  game = advanceEnemySpecials(
    { ...game, combat },
    step,
    context,
    stats,
    "start",
  );
  combat = game.combat;
  if (combat.phase !== "active") return game;
  const automationTarget = game.combatAutomation.overrideManualTarget
    ? selectAutomationTarget(game, context)
    : undefined;
  if (
    automationTarget &&
    automationTarget.instanceId !== combat.selectedEnemyInstanceId
  ) {
    combat = {
      ...combat,
      selectedEnemyInstanceId: automationTarget.instanceId,
    };
    game = { ...game, combat };
  }
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
  game = advanceEnemySpecials(game, step, context, stats, "advance");
  combat = game.combat;
  if (combat.phase !== "active") return game;
  if (combat.playerAttackTimer <= 0) {
    const target =
      combat.enemies.find(
        (enemy) =>
          enemy.instanceId === combat.selectedEnemyInstanceId &&
          !enemy.defeated,
      ) ?? firstLivingEnemy(combat.enemies);
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
    resolveDefensiveTrainingForEnemyAction,
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

function advanceEnemySpecials(
  game: GameState,
  step: number,
  context: CombatContext,
  stats: HunterCombatStats,
  mode: "both" | "start" | "advance" = "both",
): GameState {
  return runEnemyRuntime(game, step, context, stats, {
    applyEffectiveHealing,
    awardBarrierCredits,
    resolveDefensiveTrainingForEnemyAction,
  }, mode);
}

function resolveDefeatedEnemies(
  game: GameState,
  context: CombatContext,
): GameState {
  let next = game;
  for (const enemy of next.combat.enemies) {
    if (!enemy.defeated || enemy.rewardResolved) continue;
    const reward = resolveEnemyReward(next, next.combat, enemy, context);
    next = reward.game;
    next.combat = {
      ...reward.combat,
      enemies: next.combat.enemies.map((candidate) =>
        candidate.instanceId === enemy.instanceId
          ? {
              ...candidate,
              currentHealth: 0,
              defeated: true,
              rewardResolved: true,
              currentAction: null,
              effects: [],
            }
          : candidate,
      ),
    };
    next.combat = event(next.combat, {
      text: `${enemy.displayName} was defeated.`,
      type: "system",
      eventType: "enemyDefeated",
      target: { kind: "enemy", instanceId: enemy.instanceId },
      data: { enemyId: enemy.enemyId },
    });
    for (const itemId of reward.droppedItemIds)
      next.combat = event(next.combat, {
        text: `Received ${context.items[itemId]?.name ?? itemId}.`,
        type: "system",
      });
  }
  const alive = livingEnemies(next.combat.enemies);
  if (
    next.combat.phase === "active" &&
    alive.length === 0 &&
    next.combat.enemies.length > 0
  ) {
    const location = next.combat.combatLocationId
      ? context.locations[next.combat.combatLocationId]
      : undefined;
    if (location) {
      const locationReward = resolveLocationClearReward(
        next,
        next.combat,
        location,
        context,
      );
      next = locationReward.game;
      next.combat = locationReward.combat;
      for (const itemId of locationReward.droppedItemIds)
        next.combat = event(next.combat, {
          text: `Location bonus: ${context.items[itemId]?.name ?? itemId}.`,
          type: "system",
        });
    }
    const cleared = {
      ...next.combat,
      selectedEnemyInstanceId: null,
      session: {
        ...next.combat.session,
        groupClears: next.combat.session.groupClears + 1,
      },
    };
    next.combat = event(
      {
        ...cleared,
        phase: "recovery",
        recoveryRemaining: combatBalance.recoverySeconds,
      },
      {
        text: `Group ${cleared.groupNumber} cleared. Recovery begins.`,
        type: "system",
        eventType: "recoveryStarted",
      },
    );
  } else if (
    next.combat.phase === "active" &&
    (!next.combat.selectedEnemyInstanceId ||
      !alive.some(
        (enemy) => enemy.instanceId === next.combat.selectedEnemyInstanceId,
      ))
  )
    next.combat = {
      ...next.combat,
      selectedEnemyInstanceId: selectNextTarget(next.combat.enemies),
    };
  return next;
}

/** Debug-only entry point that still resolves rewards and group state canonically. */
export function forceDefeatEnemiesForDebug(
  game: GameState,
  instanceIds: string[],
  context: CombatContext,
): GameState {
  const ids = new Set(instanceIds);
  if (!ids.size) return game;
  const marked = {
    ...game,
    combat: {
      ...game.combat,
      enemies: game.combat.enemies.map((enemy) =>
        ids.has(enemy.instanceId) && !enemy.defeated
          ? {
              ...enemy,
              currentHealth: 0,
              defeated: true,
              currentAction: null,
            }
          : enemy,
      ),
    },
  };
  return resolveDefeatedEnemies(marked, context);
}

/** Debug-only player defeat that emits the same canonical defeat event as combat. */
export function forceDefeatPlayerForDebug(game: GameState): GameState {
  if (game.combat.phase === "defeat") return game;
  return {
    ...game,
    combat: event(
      {
        ...game.combat,
        playerHp: 0,
        phase: "defeat",
        stopReason: "defeat",
        recoveryRemaining: 0,
        enemies: game.combat.enemies.map((enemy) => ({
          ...enemy,
          currentAction: null,
        })),
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
    definitions[effect.effectId]?.persistence !== "between-enemies";
  return {
    ...combat,
    phase: "stopped" as const,
    stopReason: "manual" as const,
    recoveryRemaining: 0,
    playerEffects: combat.playerEffects.filter(shouldKeep),
    enemies: combat.enemies.map((enemy) => ({
      ...enemy,
      currentAction: null,
      effects: [],
    })),
  };
}

export function syncCombatStats(game: GameState): GameState {
  const stats = calculateHunterCombatStats(
    game.equipment,
    game.inventory,
    game.progression,
    game.combat.techniques,
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
