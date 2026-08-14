import type { HunterCombatStats } from "../equipment/derivedStats";
import type { GameState } from "../gameState";
import type { CombatContext, EnemyCombatInstance } from "../combat/combatTypes";
import { validatePlayerAction, actionBarrier } from "../combat/playerActions";
import { getEnemyEffectiveCombatStats } from "../combat/combatSelectors";
import { effectById } from "../data/effects";
import type {
  AutomationCondition,
  AutomationRule,
  CombatAutomationState,
  TargetPriorityCriterion,
  TargetPriorityRule,
} from "./automationTypes";
import { createInitialCombatAutomation } from "./automationTypes";

const targetCriteria: TargetPriorityCriterion[] = [
  "interruptible-casting",
  "highest-danger-casting",
  "elite",
  "lowest-health-percent",
  "lowest-health",
  "lowest-evasion",
  "first-living",
];
const dangerLevels = ["low", "medium", "high", "critical"] as const;

function clampFraction(value: unknown, fallback = 0.5) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}

function normalizeCondition(value: unknown): AutomationCondition | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const type = raw.type;
  if (type === "always") return { type };
  if (
    type === "player-hp-below" ||
    type === "player-hp-above" ||
    type === "mana-below" ||
    type === "mana-above" ||
    type === "stamina-below" ||
    type === "stamina-above" ||
    type === "target-hp-below" ||
    type === "target-hp-above"
  )
    return {
      type,
      fraction: clampFraction(raw.fraction ?? raw.value),
    };
  if (
    type === "target-has-effect" ||
    type === "target-missing-effect" ||
    type === "player-has-effect" ||
    type === "player-missing-effect"
  )
    return typeof raw.effectId === "string"
      ? { type, effectId: raw.effectId }
      : null;
  if (type === "barrier-below")
    return { type, fraction: clampFraction(raw.fraction ?? raw.value) };
  if (type === "barrier-missing") return { type };
  if (type === "target-casting" || type === "target-interruptible")
    return { type };
  if (type === "target-danger-at-least") {
    const danger = raw.danger ?? raw.value;
    return typeof danger === "string" && dangerLevels.includes(danger as never)
      ? { type, danger: danger as (typeof dangerLevels)[number] }
      : null;
  }
  if (type === "alive-enemies-at-least") {
    const count = Number(raw.count ?? raw.value);
    return Number.isFinite(count)
      ? { type, count: Math.max(1, Math.floor(count)) }
      : null;
  }
  return null;
}

function normalizeRule(value: unknown, index: number, usedIds: Set<string>) {
  const raw = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  let id = typeof raw.id === "string" && raw.id.trim() ? raw.id : `automation-rule.imported-${index + 1}`;
  while (usedIds.has(id)) id = `${id}-${index + 1}`;
  usedIds.add(id);
  const conditions = Array.isArray(raw.conditions)
    ? raw.conditions.map(normalizeCondition).filter((condition): condition is AutomationCondition => Boolean(condition))
    : [];
  const priority = Number(raw.priority);
  return {
    id,
    actionId: typeof raw.actionId === "string" ? raw.actionId : "",
    priority: Number.isFinite(priority) ? Math.max(1, Math.round(priority)) : (index + 1) * 10,
    enabled: raw.enabled !== false,
    conditions: conditions.length ? conditions : [{ type: "always" }],
  } satisfies AutomationRule;
}

function normalizeTargetPriority(value: unknown, index: number, usedIds: Set<string>): TargetPriorityRule | null {
  const raw = typeof value === "string"
    ? { criterion: value }
    : value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  if (!raw || !targetCriteria.includes(raw.criterion as TargetPriorityCriterion)) return null;
  const criterion = raw.criterion as TargetPriorityCriterion;
  let id = typeof raw.id === "string" && raw.id.trim() ? raw.id : `target-priority.${criterion}`;
  while (usedIds.has(id)) id = `${id}-${index + 1}`;
  usedIds.add(id);
  const priority = Number(raw.priority);
  return {
    id,
    criterion,
    enabled: raw.enabled !== false,
    priority: Number.isFinite(priority) ? Math.max(1, Math.round(priority)) : (index + 1) * 10,
  };
}

export function normalizeCombatAutomation(value: unknown): CombatAutomationState {
  const defaults = createInitialCombatAutomation();
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const usedRuleIds = new Set<string>();
  const rules = Array.isArray(raw.rules)
    ? raw.rules.map((rule, index) => normalizeRule(rule, index, usedRuleIds))
    : defaults.rules;
  const usedTargetIds = new Set<string>();
  const targetPriorityRules = Array.isArray(raw.targetPriorityRules)
    ? raw.targetPriorityRules
        .map((priority, index) => normalizeTargetPriority(priority, index, usedTargetIds))
        .filter((priority): priority is TargetPriorityRule => Boolean(priority))
    : defaults.targetPriorityRules;
  return {
    enabled: raw.enabled !== false,
    rules,
    targetPriorityRules: targetPriorityRules.length ? targetPriorityRules : defaults.targetPriorityRules,
    overrideManualTarget: raw.overrideManualTarget === true,
  };
}

export function getAutomationSummary(
  automation: CombatAutomationState,
  knownActionIds: Set<string> = new Set(),
) {
  const invalidRuleCount = automation.rules.filter((rule) =>
    !rule.actionId || (knownActionIds.size > 0 && !knownActionIds.has(rule.actionId)),
  ).length;
  const enabledRules = automation.rules.filter((rule) => rule.enabled);
  const highest = [...enabledRules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))[0];
  return {
    enabledRuleCount: enabledRules.length,
    totalRuleCount: automation.rules.length,
    invalidRuleCount,
    missingActionRuleCount: automation.rules.filter((rule) => !rule.actionId || (knownActionIds.size > 0 && !knownActionIds.has(rule.actionId))).length,
    overrideManualTarget: automation.overrideManualTarget,
    highestPriorityActionId: highest?.actionId,
  };
}

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
  const targetEffects = target?.effects ?? [];
  const playerEffects = game.combat.playerEffects;
  const hasEffect = (effects: typeof targetEffects, effectId: string) =>
    effects.some(
      (effect) =>
        effect.effectId === effectId ||
        effectById[effect.effectId]?.tags.includes(effectId),
    );
  switch (condition.type) {
    case "always":
      return true;
    case "player-hp-below":
      return hp < condition.fraction;
    case "player-hp-above":
      return hp > condition.fraction;
    case "mana-below":
      return mana < condition.fraction;
    case "mana-above":
      return mana > condition.fraction;
    case "stamina-below":
      return stamina < condition.fraction;
    case "stamina-above":
      return stamina > condition.fraction;
    case "target-hp-below":
      return Boolean(target && target.currentHealth / Math.max(1, target.maxHealth) < condition.fraction);
    case "target-hp-above":
      return Boolean(target && target.currentHealth / Math.max(1, target.maxHealth) > condition.fraction);
    case "barrier-below":
      return actionBarrier(game, context) / Math.max(1, game.combat.maxPlayerHp || stats.maxHealth) < condition.fraction;
    case "barrier-missing":
      return actionBarrier(game, context) <= 0;
    case "player-has-effect":
      return hasEffect(playerEffects, condition.effectId);
    case "player-missing-effect":
      return !hasEffect(playerEffects, condition.effectId);
    case "target-has-effect":
      return hasEffect(targetEffects, condition.effectId);
    case "target-missing-effect":
      return !hasEffect(targetEffects, condition.effectId);
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
      const threshold = levels[condition.danger];
      return (
        danger !== undefined && danger in levels && levels[danger] >= threshold
      );
    }
    case "alive-enemies-at-least":
      return (
        game.combat.enemies.filter((enemy) => !enemy.defeated).length >= condition.count
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
  const priorities = [...game.combatAutomation.targetPriorityRules]
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  for (const priority of priorities) {
    const criterion = priority.criterion;
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

function newStableId(prefix: string) {
  const uuid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}.${uuid}`;
}

function reorderWithPriorities<T extends { priority: number }>(items: T[]) {
  return items.map((item, index) => ({ ...item, priority: (index + 1) * 10 }));
}

export function addAutomationRule(
  automation: CombatAutomationState,
  rule: Partial<AutomationRule> & Pick<AutomationRule, "actionId">,
): CombatAutomationState {
  const nextRule: AutomationRule = {
    id: rule.id ?? newStableId("automation-rule"),
    actionId: rule.actionId,
    priority: rule.priority ?? (automation.rules.length + 1) * 10,
    enabled: rule.enabled ?? true,
    conditions: rule.conditions?.length ? rule.conditions : [{ type: "always" }],
  };
  return normalizeCombatAutomation({
    ...automation,
    rules: reorderWithPriorities([...automation.rules, nextRule]),
  });
}

export function updateAutomationRule(
  automation: CombatAutomationState,
  ruleId: string,
  patch: Partial<Omit<AutomationRule, "id">>,
) {
  return normalizeCombatAutomation({
    ...automation,
    rules: automation.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, ...patch } : rule,
    ),
  });
}

export function deleteAutomationRule(automation: CombatAutomationState, ruleId: string) {
  return normalizeCombatAutomation({
    ...automation,
    rules: reorderWithPriorities(automation.rules.filter((rule) => rule.id !== ruleId)),
  });
}

export function setAutomationRuleEnabled(
  automation: CombatAutomationState,
  ruleId: string,
  enabled: boolean,
) {
  return updateAutomationRule(automation, ruleId, { enabled });
}

export function moveAutomationRule(
  automation: CombatAutomationState,
  ruleId: string,
  direction: "up" | "down",
) {
  const rules = [...automation.rules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const index = rules.findIndex((rule) => rule.id === ruleId);
  const destination = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || destination < 0 || destination >= rules.length) return automation;
  [rules[index], rules[destination]] = [rules[destination], rules[index]];
  return normalizeCombatAutomation({ ...automation, rules: reorderWithPriorities(rules) });
}

export function addAutomationCondition(
  automation: CombatAutomationState,
  ruleId: string,
  condition: AutomationCondition,
) {
  return updateAutomationRule(automation, ruleId, {
    conditions: [
      ...(automation.rules.find((rule) => rule.id === ruleId)?.conditions ?? []),
      condition,
    ],
  });
}

export function updateAutomationCondition(
  automation: CombatAutomationState,
  ruleId: string,
  index: number,
  condition: AutomationCondition,
) {
  const rule = automation.rules.find((candidate) => candidate.id === ruleId);
  if (!rule || index < 0 || index >= rule.conditions.length) return automation;
  return updateAutomationRule(automation, ruleId, {
    conditions: rule.conditions.map((current, currentIndex) => currentIndex === index ? condition : current),
  });
}

export function removeAutomationCondition(
  automation: CombatAutomationState,
  ruleId: string,
  index: number,
) {
  const rule = automation.rules.find((candidate) => candidate.id === ruleId);
  if (!rule || index < 0 || index >= rule.conditions.length) return automation;
  return updateAutomationRule(automation, ruleId, {
    conditions: rule.conditions.filter((_, currentIndex) => currentIndex !== index),
  });
}

export function setAutomationEnabled(automation: CombatAutomationState, enabled: boolean) {
  return { ...automation, enabled };
}

export function setAutomationOverrideManualTarget(automation: CombatAutomationState, enabled: boolean) {
  return { ...automation, overrideManualTarget: enabled };
}

export function setTargetPriorityEnabled(
  automation: CombatAutomationState,
  priorityId: string,
  enabled: boolean,
) {
  return {
    ...automation,
    targetPriorityRules: automation.targetPriorityRules.map((rule) =>
      rule.id === priorityId ? { ...rule, enabled } : rule,
    ),
  };
}

export function moveTargetPriority(
  automation: CombatAutomationState,
  priorityId: string,
  direction: "up" | "down",
) {
  const priorities = [...automation.targetPriorityRules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const index = priorities.findIndex((rule) => rule.id === priorityId);
  const destination = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || destination < 0 || destination >= priorities.length) return automation;
  [priorities[index], priorities[destination]] = [priorities[destination], priorities[index]];
  return { ...automation, targetPriorityRules: reorderWithPriorities(priorities) };
}
