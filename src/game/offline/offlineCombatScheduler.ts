import { evaluateAutomation } from "../automation/automationLogic";
import { getActionById, getEffectivePlayerActionCost } from "../combat/playerActions";
import { getPlayerStats } from "../combat/combatRuntime";
import type { GameState } from "../gameState";
import type { CombatContext, EnemyCombatInstance } from "../combat/combatTypes";
import type { HunterCombatStats } from "../equipment/derivedStats";
import { getEnemyCombatAbilities, isEnemyCombatAbilityEligible } from "../enemyAbilities/enemyAbilityRuntime";
import type { AutomationCondition } from "../automation/automationTypes";

export const OFFLINE_COMBAT_TIME_QUANTUM_SECONDS = 0.1;
export const OFFLINE_COMBAT_TICKS_PER_SECOND = 10;
const QUANTUM_EPSILON = 1e-9;

function timerBoundary(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return Number.POSITIVE_INFINITY;
  return value <= 0 ? OFFLINE_COMBAT_TIME_QUANTUM_SECONDS : value;
}

function cooldownBoundary(value: number | null | undefined): number {
  return value !== null && value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : Number.POSITIVE_INFINITY;
}

function effectBoundary(effects: GameState["combat"]["playerEffects"]): number {
  let boundary = Number.POSITIVE_INFINITY;
  for (const effect of effects) {
    boundary = Math.min(boundary, timerBoundary(effect.remainingSeconds), timerBoundary(effect.nextTickRemaining));
  }
  return boundary;
}

function thresholdBoundary(
  current: number,
  maximum: number,
  fraction: number,
  rate: number,
  above: boolean,
): number {
  if (!(maximum > 0) || !Number.isFinite(rate) || rate === 0) return Number.POSITIVE_INFINITY;
  const threshold = Math.max(0, Math.min(1, fraction)) * maximum;
  const distance = above ? threshold - current : current - threshold;
  const movingTowardThreshold = above ? rate > 0 : rate < 0;
  const movingAwayFromThreshold = above ? rate < 0 : rate > 0;
  if (!movingTowardThreshold && !movingAwayFromThreshold) return Number.POSITIVE_INFINITY;
  if (distance === 0) return OFFLINE_COMBAT_TIME_QUANTUM_SECONDS;
  if ((distance > 0 && !movingTowardThreshold) || (distance < 0 && !movingAwayFromThreshold))
    return Number.POSITIVE_INFINITY;
  return Math.max(OFFLINE_COMBAT_TIME_QUANTUM_SECONDS, Math.abs(distance / rate));
}

/**
 * Returns the next continuous resource crossing that can change automation.
 * This intentionally contains no invented resource drain: mana and stamina
 * use the same rates as the canonical live combat step.
 */
export function getAutomationConditionBoundary(
  game: GameState,
  stats: HunterCombatStats,
  context: CombatContext,
): number {
  if (!game.combatAutomation.enabled || game.combat.phase !== "active") return Number.POSITIVE_INFINITY;
  const playerStats = getPlayerStats(game.combat, stats, context, game.progression);
  const staminaRate = playerStats.staminaRegen;
  const manaRate = playerStats.manaRegenFlat ?? 0;
  const lifeRate = Math.max(0, playerStats.lifeRegenFlat ?? 0);
  let boundary = Number.POSITIVE_INFINITY;
  const add = (condition: AutomationCondition) => {
    switch (condition.type) {
      case "player-hp-above":
        boundary = Math.min(boundary, thresholdBoundary(
          game.combat.playerHp,
          game.combat.maxPlayerHp,
          condition.fraction,
          lifeRate,
          true,
        ));
        break;
      case "mana-above":
        boundary = Math.min(boundary, thresholdBoundary(
          game.combat.mana,
          game.combat.maxMana,
          condition.fraction,
          manaRate,
          true,
        ));
        break;
      case "mana-below":
        boundary = Math.min(boundary, thresholdBoundary(
          game.combat.mana,
          game.combat.maxMana,
          condition.fraction,
          manaRate,
          false,
        ));
        break;
      case "stamina-above":
        boundary = Math.min(boundary, thresholdBoundary(
          game.combat.stamina,
          game.combat.maxStamina,
          condition.fraction,
          staminaRate,
          true,
        ));
        break;
      case "stamina-below":
        boundary = Math.min(boundary, thresholdBoundary(
          game.combat.stamina,
          game.combat.maxStamina,
          condition.fraction,
          staminaRate,
          false,
        ));
        break;
      default:
        break;
    }
  };
  for (const rule of game.combatAutomation.rules) {
    if (!rule.enabled) continue;
    for (const condition of rule.conditions) add(condition);
  }
  return boundary;
}

/** Pure readiness inspection. It deliberately does not call weighted selection or RNG. */
export function enemyAbilityReady(
  enemy: EnemyCombatInstance,
  game: GameState,
  context: CombatContext,
): boolean {
  if (enemy.defeated) return false;
  if (enemy.preparedAbility) return enemy.preparedAbility.remainingSeconds <= 0;
  const definition = context.enemies[enemy.enemyId];
  if (!definition) return false;
  return getEnemyCombatAbilities(definition, context).some((ability) => isEnemyCombatAbilityEligible(enemy, ability, game, context));
}

function enemyBoundary(enemy: EnemyCombatInstance): number {
  if (enemy.defeated) return Number.POSITIVE_INFINITY;
  let boundary = timerBoundary(enemy.attackTimer);
  if (enemy.preparedAbility) boundary = Math.min(boundary, timerBoundary(enemy.preparedAbility.remainingSeconds));
  for (const remaining of Object.values(enemy.abilityCooldowns ?? {})) boundary = Math.min(boundary, cooldownBoundary(remaining));
  return Math.min(boundary, effectBoundary(enemy.effects));
}

function automationResourceBoundary(game: GameState, stats: HunterCombatStats, context: CombatContext): number {
  if (!game.combatAutomation.enabled || game.combat.phase !== "active") return Number.POSITIVE_INFINITY;
  let boundary = Number.POSITIVE_INFINITY;
  const playerStats = getPlayerStats(game.combat, stats, context, game.progression);
  const staminaRate = playerStats.staminaRegen;
  const manaRate = playerStats.manaRegenFlat ?? 0;
  for (const rule of game.combatAutomation.rules) {
    if (!rule.enabled) continue;
    const action = getActionById(game, rule.actionId, context);
    if (!action) continue;
    const cost = getEffectivePlayerActionCost(game, action, stats, context);
    if (cost.mana > game.combat.mana && manaRate > 0)
      boundary = Math.min(boundary, (cost.mana - game.combat.mana) / manaRate);
    if (cost.stamina > game.combat.stamina && staminaRate > 0)
      boundary = Math.min(boundary, (cost.stamina - game.combat.stamina) / staminaRate);
  }
  return boundary;
}

export function getNextOfflineCombatBoundary(
  game: GameState,
  stats: HunterCombatStats,
  context: CombatContext,
  wakeAutomationNextQuantum = false,
): number {
  const combat = game.combat;
  let boundary = Number.POSITIVE_INFINITY;
  if (combat.phase === "recovery") {
    boundary = Math.min(boundary, timerBoundary(combat.recoveryRemaining), effectBoundary(combat.playerEffects));
    return boundary;
  }
  if (combat.phase !== "active") return boundary;

  if (wakeAutomationNextQuantum && game.combatAutomation.enabled)
    boundary = Math.min(boundary, OFFLINE_COMBAT_TIME_QUANTUM_SECONDS);

  boundary = Math.min(
    boundary,
    timerBoundary(combat.playerAttackTimer),
    cooldownBoundary(combat.globalCooldownRemaining),
    cooldownBoundary(combat.potionCooldownRemaining),
    effectBoundary(combat.playerEffects),
    automationResourceBoundary(game, stats, context),
    getAutomationConditionBoundary(game, stats, context),
  );
  const staminaRate = getPlayerStats(combat, stats, context, game.progression).staminaRegen;
  if (staminaRate < 0) boundary = Math.min(boundary, timerBoundary(combat.stamina / -staminaRate));
  const enemy = combat.enemy;
  if (enemy) {
    boundary = Math.min(boundary, enemyBoundary(enemy));
    if (enemyAbilityReady(enemy, game, context)) boundary = Math.min(boundary, OFFLINE_COMBAT_TIME_QUANTUM_SECONDS);
  }

  // Automation is checked by the canonical step at every live quantum. If it
  // is executable now, wake at the next live quantum; resource crossings are
  // handled above without polling the entire request.
  if (evaluateAutomation(game, stats, context).actionId)
    boundary = Math.min(boundary, OFFLINE_COMBAT_TIME_QUANTUM_SECONDS);
  return boundary;
}

export function quantizeOfflineCombatBoundary(rawSeconds: number): number {
  if (!Number.isFinite(rawSeconds)) return Number.POSITIVE_INFINITY;
  const ticks = Math.max(1, Math.ceil(rawSeconds * OFFLINE_COMBAT_TICKS_PER_SECOND - QUANTUM_EPSILON));
  return ticks / OFFLINE_COMBAT_TICKS_PER_SECOND;
}

export function secondsToOfflineCombatTicks(seconds: number): number {
  return Math.max(0, Math.floor(seconds * OFFLINE_COMBAT_TICKS_PER_SECOND + QUANTUM_EPSILON));
}
