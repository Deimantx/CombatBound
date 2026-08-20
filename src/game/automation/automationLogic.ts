import type { HunterCombatStats } from "../equipment/derivedStats";
import type { GameState } from "../gameState";
import type { CombatContext, EnemyCombatInstance } from "../combat/combatTypes";
import { validatePlayerAction, actionBarrier } from "../combat/playerActions";
import { effectById } from "../data/effects";
import type {
  AutomationCondition,
  AutomationConditionTrace,
  AutomationEvaluationTrace,
  AutomationRule,
  CombatAutomationState,
} from "./automationTypes";
import { createInitialCombatAutomation } from "./automationTypes";

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
  return null;
}

function normalizeRule(value: unknown, index: number, usedIds: Set<string>) {
  const raw = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  let id = typeof raw.id === "string" && raw.id.trim() ? raw.id : `automation-rule.imported-${index + 1}`;
  while (usedIds.has(id)) id = `${id}-${index + 1}`;
  usedIds.add(id);
  const rawConditions = Array.isArray(raw.conditions) ? raw.conditions : [];
  const removedInterruptCondition = rawConditions.some((condition) => condition && typeof condition === "object" && (condition as Record<string, unknown>).type === "target-interruptible");
  const removedEnemyTelegraphCondition = rawConditions.some((condition) => condition && typeof condition === "object" && ["target-casting", "target-danger-at-least"].includes(String((condition as Record<string, unknown>).type)));
  const conditions = rawConditions.map(normalizeCondition).filter((condition): condition is AutomationCondition => Boolean(condition));
  const priority = Number(raw.priority);
  let actionId = typeof raw.actionId === "string" ? raw.actionId : "";
  if (removedInterruptCondition || removedEnemyTelegraphCondition) return null;
  if (actionId === "spell.disrupting-pulse") actionId = "spell.lightning-pulse";
  if (actionId === "spell.protective-sign" || actionId.includes("light-magic")) return null;
  return {
    id,
    actionId,
    priority: Number.isFinite(priority) ? Math.max(1, Math.round(priority)) : (index + 1) * 10,
    enabled: raw.enabled !== false,
    conditions: conditions.length ? conditions : [{ type: "always" }],
  } satisfies AutomationRule;
}

export function normalizeCombatAutomation(value: unknown): CombatAutomationState {
  const defaults = createInitialCombatAutomation();
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const usedRuleIds = new Set<string>();
  const rules = Array.isArray(raw.rules)
    ? raw.rules.map((rule, index) => normalizeRule(rule, index, usedRuleIds)).filter((rule): rule is AutomationRule => Boolean(rule))
    : defaults.rules;
  return {
    enabled: raw.enabled !== false,
    rules,
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
      return actionBarrier(game, context) / Math.max(1, game.combat.maxPlayerHp || stats.maxLife || 1) < condition.fraction;
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
    default:
      return false;
  }
}

export interface AutomationDecision {
  actionId?: string;
  targetId?: string;
  invalid?: { ruleId: string; reason: string };
}

function describeCondition(condition: AutomationCondition, game: GameState, target: EnemyCombatInstance | undefined): Pick<AutomationConditionTrace, "actual" | "expected"> {
  if (condition.type === "player-hp-below" || condition.type === "player-hp-above") return { actual: game.combat.maxPlayerHp > 0 ? game.combat.playerHp / game.combat.maxPlayerHp : 0, expected: condition.fraction };
  if (condition.type === "mana-below" || condition.type === "mana-above") return { actual: game.combat.maxMana > 0 ? game.combat.mana / game.combat.maxMana : 0, expected: condition.fraction };
  if (condition.type === "stamina-below" || condition.type === "stamina-above") return { actual: game.combat.maxStamina > 0 ? game.combat.stamina / game.combat.maxStamina : 0, expected: condition.fraction };
  if (condition.type === "target-hp-below" || condition.type === "target-hp-above") return { actual: target ? target.currentHealth / Math.max(1, target.maxHealth) : "no target", expected: condition.fraction };
  return { actual: condition.type === "always" ? true : "state", expected: condition.type };
}

export function evaluateAutomation(
  game: GameState,
  stats: HunterCombatStats,
  context: CombatContext,
  onTrace?: (trace: AutomationEvaluationTrace) => void,
): AutomationDecision {
  if (!game.combatAutomation.enabled || game.combat.phase !== "active")
    return {};
  const target = game.combat.enemy && !game.combat.enemy.defeated ? game.combat.enemy : undefined;
  const rules = [...game.combatAutomation.rules]
    .filter((rule) => rule.enabled)
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  let invalid: AutomationDecision["invalid"];
  for (const rule of rules) {
    const conditionTraces = rule.conditions.map((condition): AutomationConditionTrace => ({ type: condition.type, passed: conditionMatches(condition, game, target, context, stats), ...describeCondition(condition, game, target) }));
    if (!conditionTraces.every((condition) => condition.passed)) {
      onTrace?.({ ruleId: rule.id, priority: rule.priority, actionId: rule.actionId, enabled: rule.enabled, conditions: conditionTraces, result: "skipped" });
      continue;
    }
    const validation = validatePlayerAction(
      game,
      rule.actionId,
      stats,
      context,
    );
    if (validation.valid) {
      onTrace?.({ ruleId: rule.id, priority: rule.priority, actionId: rule.actionId, enabled: rule.enabled, conditions: conditionTraces, result: "executed" });
      return { actionId: rule.actionId, targetId: target?.instanceId };
    }
    onTrace?.({ ruleId: rule.id, priority: rule.priority, actionId: rule.actionId, enabled: rule.enabled, conditions: conditionTraces, validationReason: validation.reason, result: "invalid" });
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
