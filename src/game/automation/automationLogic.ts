import type { HunterCombatStats } from "../equipment/derivedStats";
import type { GameState } from "../gameState";
import type { CombatContext, EnemyCombatInstance } from "../combat/combatTypes";
import { validatePlayerAction, actionBarrier } from "../combat/playerActions";
import { getEnemyEffectiveCombatStats } from "../combat/combatSelectors";
import { effectById } from "../data/effects";
import type {
  AutomationCondition,
  TargetPriorityCriterion,
} from "./automationTypes";

function conditionMatches(
  condition: AutomationCondition,
  game: GameState,
  target: EnemyCombatInstance | undefined,
  context: CombatContext,
  stats: HunterCombatStats,
) {
  const hp =
    game.combat.maxPlayerHp > 0
      ? game.combat.playerHp / game.combat.maxPlayerHp
      : 0;
  const mana =
    game.combat.maxMana > 0 ? game.combat.mana / game.combat.maxMana : 0;
  const stamina =
    game.combat.maxStamina > 0
      ? game.combat.stamina / game.combat.maxStamina
      : 0;
  const conditionValue = "value" in condition ? condition.value : undefined;
  const value = typeof conditionValue === "number" ? conditionValue : 0;
  const targetEffects = target?.effects ?? [];
  switch (condition.type) {
    case "always":
      return true;
    case "player-hp-below":
      return hp < value;
    case "player-hp-above":
      return hp > value;
    case "mana-below":
      return mana < value;
    case "mana-above":
      return mana > value;
    case "stamina-below":
      return stamina < value;
    case "stamina-above":
      return stamina > value;
    case "barrier-below":
      return actionBarrier(game, context) < value;
    case "barrier-missing":
      return actionBarrier(game, context) <= 0;
    case "target-has-effect":
      return targetEffects.some(
        (effect) =>
          effect.effectId === conditionValue ||
          effectById[effect.effectId]?.tags.includes(String(conditionValue)),
      );
    case "target-missing-effect":
      return !targetEffects.some(
        (effect) =>
          effect.effectId === conditionValue ||
          effectById[effect.effectId]?.tags.includes(String(conditionValue)),
      );
    case "target-casting":
      return Boolean(target?.currentAction);
    case "target-interruptible": {
      const definition = target ? context.enemies[target.enemyId] : undefined;
      return Boolean(
        target?.currentAction &&
        definition?.actions.find(
          (action) => action.id === target.currentAction?.actionId,
        )?.interruptible,
      );
    }
    case "target-danger-at-least": {
      const levels = { low: 0, medium: 1, high: 2, critical: 3 };
      const definition = target ? context.enemies[target.enemyId] : undefined;
      const danger = definition?.actions.find(
        (action) => action.id === target?.currentAction?.actionId,
      )?.danger;
      const threshold =
        typeof conditionValue === "number"
          ? conditionValue
          : (levels[String(conditionValue) as keyof typeof levels] ?? 0);
      return (
        danger !== undefined && danger in levels && levels[danger] >= threshold
      );
    }
    case "alive-enemies-at-least":
      return (
        game.combat.enemies.filter((enemy) => !enemy.defeated).length >= value
      );
    default:
      return false;
  }
}

function criterionScore(
  enemy: EnemyCombatInstance,
  criterion: TargetPriorityCriterion,
  context: CombatContext,
): number {
  if (enemy.defeated) return -Infinity;
  const definition = context.enemies[enemy.enemyId];
  const action = enemy.currentAction
    ? definition?.actions.find(
        (candidate) => candidate.id === enemy.currentAction?.actionId,
      )
    : undefined;
  if (criterion === "interruptible-casting")
    return action?.interruptible ? 100 : 0;
  if (criterion === "highest-danger-casting")
    return action
      ? ({ low: 1, medium: 2, high: 3, critical: 4 }[action.danger] ?? 0)
      : 0;
  if (criterion === "elite") return definition?.accent === "gold" ? 1 : 0;
  if (criterion === "lowest-health-percent")
    return 1 - enemy.currentHealth / Math.max(1, enemy.maxHealth);
  if (criterion === "lowest-health")
    return 1 / Math.max(1, enemy.currentHealth);
  if (criterion === "lowest-evasion")
    return (
      1 /
      Math.max(
        1,
        getEnemyEffectiveCombatStats(enemy, context.effects, context.enemies)
          .evasion,
      )
    );
  return 0;
}

export function selectAutomationTarget(
  game: GameState,
  context: CombatContext,
) {
  const alive = game.combat.enemies.filter((enemy) => !enemy.defeated);
  if (!alive.length) return undefined;
  let best = alive[0];
  for (const criterion of game.combatAutomation.targetPriorityRules) {
    const candidate = [...alive].sort(
      (a, b) =>
        criterionScore(b, criterion, context) -
          criterionScore(a, criterion, context) ||
        a.instanceId.localeCompare(b.instanceId),
    )[0];
    if (
      criterionScore(candidate, criterion, context) > 0 ||
      criterion === "first-living"
    ) {
      best = candidate;
      break;
    }
  }
  return best;
}

export interface AutomationDecision {
  actionId?: string;
  targetId?: string;
  invalid?: { ruleId: string; reason: string };
}

export function evaluateAutomation(
  game: GameState,
  stats: HunterCombatStats,
  context: CombatContext,
): AutomationDecision {
  if (!game.combatAutomation.enabled || game.combat.phase !== "active")
    return {};
  const target = game.combatAutomation.overrideManualTarget
    ? selectAutomationTarget(game, context)
    : game.combat.enemies.find(
        (enemy) =>
          enemy.instanceId === game.combat.selectedEnemyInstanceId &&
          !enemy.defeated,
      );
  const rules = [...game.combatAutomation.rules]
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  let invalid: AutomationDecision["invalid"];
  for (const rule of rules) {
    if (
      !rule.conditions.every((condition) =>
        conditionMatches(condition, game, target, context, stats),
      )
    )
      continue;
    const validation = validatePlayerAction(
      {
        ...game,
        combat:
          target && game.combat.selectedEnemyInstanceId !== target.instanceId
            ? { ...game.combat, selectedEnemyInstanceId: target.instanceId }
            : game.combat,
      },
      rule.actionId,
      stats,
      context,
    );
    if (validation.valid)
      return { actionId: rule.actionId, targetId: target?.instanceId };
    invalid = { ruleId: rule.id, reason: validation.reason ?? "invalid" };
  }
  return { invalid };
}
