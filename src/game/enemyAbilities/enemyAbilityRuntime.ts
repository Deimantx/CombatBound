import type { GameState } from "../gameState";
import type { CombatContext, EnemyCombatInstance } from "../combat/combatTypes";
import type {
  EnemyCombatAbilityCondition,
  EnemyCombatAbilityDefinition,
  EnemyAbilityRuntimeState,
} from "./enemyAbilityTypes";
import { nextCombatRandom } from "../combat/combatRng";

export function createEnemyAbilityRuntimeState(): EnemyAbilityRuntimeState {
  return { usedThisFight: {} };
}

export function normalizeEnemyAbilityRuntimeState(value: unknown): EnemyAbilityRuntimeState {
  if (!value || typeof value !== "object") return createEnemyAbilityRuntimeState();
  const used = (value as { usedThisFight?: unknown }).usedThisFight;
  return { usedThisFight: used && typeof used === "object" ? { ...(used as Record<string, number>) } : {} };
}

function conditionMatches(condition: EnemyCombatAbilityCondition, enemy: EnemyCombatInstance, game: GameState, context: CombatContext): boolean {
  const playerFraction = game.combat.maxPlayerHp > 0 ? game.combat.playerHp / game.combat.maxPlayerHp : 0;
  const enemyFraction = enemy.maxHealth > 0 ? enemy.currentHealth / enemy.maxHealth : 0;
  switch (condition.type) {
    case "self-hp-below": return enemyFraction < condition.fraction;
    case "player-hp-below": return playerFraction < condition.fraction;
    case "player-has-effect-tag": return game.combat.playerEffects.some((effect) => context.effects[effect.effectId]?.tags?.includes(condition.tag));
    case "player-has-effect-id": return game.combat.playerEffects.some((effect) => effect.effectId === condition.effectId);
    case "self-has-effect-id": return enemy.effects.some((effect) => effect.effectId === condition.effectId);
    case "self-missing-effect-id": return !enemy.effects.some((effect) => effect.effectId === condition.effectId);
    case "phase": return enemy.phaseId === condition.phaseId;
    case "once-per-fight-not-used": return true;
  }
}

export function enemyCombatAbilityConditionMatches(condition: EnemyCombatAbilityCondition, enemy: EnemyCombatInstance, game: GameState, context: CombatContext): boolean {
  return conditionMatches(condition, enemy, game, context);
}

export function getEnemyCombatAbilities(definition: { combatAbilityIds?: readonly string[]; enemyTier: string }, context: CombatContext): EnemyCombatAbilityDefinition[] {
  const catalogue = context.enemyCombatAbilities;
  return (definition.combatAbilityIds ?? []).flatMap((id) => {
    const ability = catalogue?.[id as keyof NonNullable<CombatContext["enemyCombatAbilities"]>];
    return ability && !ability.draft && ability.allowedEnemyTiers.includes(definition.enemyTier as never) ? [ability] : [];
  });
}

export function selectNextEnemyCombatAbility(enemy: EnemyCombatInstance, definition: { combatAbilityIds?: readonly string[]; enemyTier: string }, game: GameState, context: CombatContext): EnemyCombatAbilityDefinition | null {
  const cooldowns = enemy.abilityCooldowns ?? {};
  const usedThisFight = enemy.abilityRuntime?.usedThisFight ?? {};
  const available = getEnemyCombatAbilities(definition, context).filter((ability) =>
    (cooldowns[ability.id] ?? 0) <= 0 &&
    (ability.usageLimitPerFight === undefined || (usedThisFight[ability.id] ?? 0) < ability.usageLimitPerFight) &&
    (ability.conditions ?? []).every((condition) => conditionMatches(condition, enemy, game, context)),
  );
  if (available.length === 0) return null;
  const totalWeight = available.reduce((sum, ability) => sum + Math.max(0, ability.weight ?? 1), 0);
  if (totalWeight <= 0) return available[0];
  let cursor = nextCombatRandom(context.rng, "enemyAbility") * totalWeight;
  for (const ability of available) {
    cursor -= Math.max(0, ability.weight ?? 1);
    if (cursor < 0) return ability;
  }
  return available[available.length - 1];
}

export function tickEnemyCombatAbilityCooldowns(game: GameState, step: number): GameState {
  return {
    ...game,
    combat: {
      ...game.combat,
      enemies: game.combat.enemies.map((enemy) => ({
        ...enemy,
        abilityCooldowns: Object.fromEntries(Object.entries(enemy.abilityCooldowns ?? {}).map(([id, remaining]) => [id, Math.max(0, remaining - step)])),
      })),
    },
  };
}
