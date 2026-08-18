import { evaluateAutomation } from "../automation/automationLogic";
import { getActionById, getEffectivePlayerActionCost } from "../combat/playerActions";
import { calculateStaminaDelta } from "../combat/combatResourceRuntime";
import { getPlayerStats } from "../combat/combatRuntime";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import type { GameState } from "../gameState";
import type { CombatContext, EnemyCombatInstance } from "../combat/combatTypes";
import type { HunterCombatStats } from "../equipment/derivedStats";

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

function enemyActionConditionValid(
  action: NonNullable<CombatContext["enemies"][string]>["actions"][number],
  enemy: EnemyCombatInstance,
  game: GameState,
  context: CombatContext,
): boolean {
  return (action.conditions ?? []).every((condition) => {
    const value = condition.value;
    switch (condition.type) {
      case "player-hp-below":
        return game.combat.maxPlayerHp > 0 && game.combat.playerHp / game.combat.maxPlayerHp < Number(value);
      case "self-hp-below":
        return enemy.maxHealth > 0 && enemy.currentHealth / enemy.maxHealth < Number(value);
      case "has-effect":
        return enemy.effects.some((effect) => effect.effectId === value);
      case "missing-effect":
        return !enemy.effects.some((effect) => effect.effectId === value);
      case "allies-at-least":
        return game.combat.enemies.filter((candidate) => !candidate.defeated).length >= Number(value);
      case "phase":
        return enemy.phaseId === value;
      default:
        return true;
    }
  }) && Boolean(context.enemies[enemy.enemyId]);
}

/** Pure readiness inspection. It deliberately does not call weighted selection or RNG. */
export function enemyActionReady(
  enemy: EnemyCombatInstance,
  game: GameState,
  context: CombatContext,
): boolean {
  if (enemy.defeated || enemy.currentAction) return false;
  const definition = context.enemies[enemy.enemyId];
  if (!definition) return false;
  const activePhase = definition.phases?.find((phase) => phase.phaseId === enemy.phaseId);
  const actions = activePhase?.actionIds
    ? definition.actions.filter((action) => activePhase.actionIds?.includes(action.id))
    : definition.actions;
  return actions.some((action) =>
    action.preparationSeconds >= 0 &&
    action.cooldownSeconds >= 0 &&
    (enemy.actionCooldowns[action.id] ?? 0) <= 0 &&
    enemyActionConditionValid(action, enemy, game, context),
  );
}

function enemyBoundary(enemy: EnemyCombatInstance): number {
  let boundary = timerBoundary(enemy.attackTimer);
  if (enemy.currentAction) boundary = Math.min(boundary, timerBoundary(enemy.currentAction.remainingSeconds));
  for (const remaining of Object.values(enemy.actionCooldowns)) boundary = Math.min(boundary, cooldownBoundary(remaining));
  return Math.min(boundary, effectBoundary(enemy.effects));
}

function automationResourceBoundary(game: GameState, stats: HunterCombatStats, context: CombatContext): number {
  if (!game.combatAutomation.enabled || game.combat.phase !== "active") return Number.POSITIVE_INFINITY;
  let boundary = Number.POSITIVE_INFINITY;
  const playerStats = getPlayerStats(game.combat, stats, context, game.progression);
  const staminaRate = calculateStaminaDelta(
    game.combat,
    stats,
    context,
    game.progression,
    getEquippedWeaponProficiency(game.equipment, game.inventory),
  );
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
    for (const enemy of combat.enemies) boundary = Math.min(boundary, effectBoundary(enemy.effects));
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
  );
  for (const remaining of Object.values(combat.actionCooldowns)) boundary = Math.min(boundary, cooldownBoundary(remaining));
  const staminaRate = calculateStaminaDelta(
    combat,
    stats,
    context,
    game.progression,
    getEquippedWeaponProficiency(game.equipment, game.inventory),
  );
  if (staminaRate < 0) boundary = Math.min(boundary, timerBoundary(combat.stamina / -staminaRate));
  for (const enemy of combat.enemies) {
    boundary = Math.min(boundary, enemyBoundary(enemy));
    if (enemyActionReady(enemy, game, context)) boundary = Math.min(boundary, OFFLINE_COMBAT_TIME_QUANTUM_SECONDS);
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
