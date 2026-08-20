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
  const usedThisFight: Record<string, number> = {};
  if (used && typeof used === "object" && !Array.isArray(used)) {
    for (const [id, count] of Object.entries(used as Record<string, unknown>))
      if (typeof count === "number" && Number.isFinite(count) && count >= 0)
        usedThisFight[id] = Math.floor(count);
  }
  return { usedThisFight };
}

export function getEnemyPhaseSequence<T extends { phaseId: string; hpThreshold: number }>(definition: { phases?: readonly T[] }) {
  // HP thresholds are authored from shallow to deep phase transitions: the
  // highest threshold is entered first as health falls.
  return [...(definition.phases ?? [])].sort((a, b) => b.hpThreshold - a.hpThreshold);
}

function conditionMatches(condition: EnemyCombatAbilityCondition, enemy: EnemyCombatInstance, game: GameState, context: CombatContext, abilityId?: string): boolean {
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
    case "has-next-phase": {
      const phases = getEnemyPhaseSequence(context.enemies[enemy.enemyId] ?? {});
      const index = enemy.phaseId ? phases.findIndex((phase) => phase.phaseId === enemy.phaseId) : -1;
      return index >= -1 && index + 1 < phases.length;
    }
    case "once-per-fight-not-used": return abilityId ? (enemy.abilityRuntime?.usedThisFight?.[abilityId as keyof typeof enemy.abilityRuntime.usedThisFight] ?? 0) <= 0 : condition.abilityId ? (enemy.abilityRuntime?.usedThisFight?.[condition.abilityId] ?? 0) <= 0 : true;
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

export function isEnemyCombatAbilityEligible(
  enemy: EnemyCombatInstance,
  ability: EnemyCombatAbilityDefinition,
  game: GameState,
  context: CombatContext,
) {
  const definition = context.enemies[enemy.enemyId];
  if (enemy.defeated || !definition || ability.draft || !ability.allowedEnemyTiers.includes(definition.enemyTier)) return false;
  if ((enemy.abilityCooldowns?.[ability.id] ?? 0) > 0) return false;
  const used = enemy.abilityRuntime?.usedThisFight?.[ability.id] ?? 0;
  if (ability.usageLimitPerFight !== undefined && used >= ability.usageLimitPerFight) return false;
  if ((ability.conditions ?? []).some((condition) => condition.type === "once-per-fight-not-used" && used > 0)) return false;
  return (ability.conditions ?? []).every((condition) => conditionMatches(condition, enemy, game, context, ability.id));
}

export function selectNextEnemyCombatAbility(enemy: EnemyCombatInstance, definition: { combatAbilityIds?: readonly string[]; enemyTier: string }, game: GameState, context: CombatContext): EnemyCombatAbilityDefinition | null {
  const available = getEnemyCombatAbilities(definition, context).filter((ability) => isEnemyCombatAbilityEligible(enemy, ability, game, context));
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
  const enemy = game.combat.enemy;
  if (!enemy) return game;
  return {
    ...game,
    combat: {
      ...game.combat,
      enemy: {
        ...enemy,
        abilityCooldowns: Object.fromEntries(Object.entries(enemy.abilityCooldowns ?? {}).map(([id, remaining]) => [id, Math.max(0, remaining - step)])),
      },
    },
  };
}
