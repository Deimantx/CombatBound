import type {
  CombatRng,
  EnemyActionDefinition,
  EnemyDefinition,
} from "./combatTypes";

export function selectNextEnemyAction(
  definition: EnemyDefinition,
  cooldowns: number | Record<string, number>,
  rng: CombatRng,
): EnemyActionDefinition | null {
  if (definition.actions.length === 0) return null;
  const available = definition.actions.filter(
    (action) =>
      action.preparationSeconds >= 0 &&
      action.cooldownSeconds >= 0 &&
      (typeof cooldowns === "number"
        ? cooldowns
        : (cooldowns[action.id] ?? 0)) <= 0,
  );
  if (available.length === 0) return null;
  const totalWeight = available.reduce(
    (sum, action) => sum + Math.max(0, action.weight ?? 1),
    0,
  );
  if (totalWeight <= 0) return available[0];
  let cursor = Math.max(0, Math.min(0.999999, rng.next())) * totalWeight;
  for (const action of available) {
    cursor -= Math.max(0, action.weight ?? 1);
    if (cursor < 0) return action;
  }
  return available[available.length - 1];
}

export function interruptAction(
  currentAction: { actionId: string } | null,
  definition: EnemyActionDefinition | undefined,
) {
  if (!currentAction || !definition?.interruptible)
    return { interrupted: false, cooldownSeconds: 0 };
  return {
    interrupted: true,
    cooldownSeconds: Math.max(0, definition.cooldownSeconds),
  };
}

export function selectWeightedAction(
  definition: EnemyDefinition,
  cooldowns: number | Record<string, number>,
  rng: CombatRng,
) {
  return selectNextEnemyAction(definition, cooldowns, rng);
}
