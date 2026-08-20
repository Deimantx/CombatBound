import { getEnemyEffectiveCombatStats, getPlayerEffectiveCombatStats } from "./combatSelectors";
import { combatBalance, clamp } from "./combatBalance";
import { normalizeCombatStats } from "./combatStats";
import type { ActiveEffectInstance, EffectDefinition } from "./combatEffectTypes";
import type { CombatContext, CombatEvent, CombatEventType, CombatLogEntry, CombatState, CombatStats, EnemyCombatInstance } from "./combatTypes";
import type { CombatProficiencyId, ProgressionState } from "../progression/progressionTypes";
import type { GameState } from "../gameState";
import type { HunterCombatStats } from "../equipment/derivedStats";
import { awardProficiencyXp } from "../progression/proficiencyProgression";

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function combatEvent(state: CombatState, item: CombatEvent) {
  const nextSequence = state.eventSequence + 1;
  const log: CombatLogEntry = { id: nextSequence, text: item.text, type: item.type, time: `T+${Math.floor(state.session.elapsedSeconds)}s` };
  const record = { id: nextSequence, type: item.eventType ?? ("actionResolved" as CombatEventType), source: item.source, target: item.target, data: item.data };
  return { ...state, eventSequence: nextSequence, log: [log, ...state.log].slice(0, 30), events: [...state.events, record].slice(-100) };
}

export function playerBaseStats(stats: HunterCombatStats): CombatStats {
  return normalizeCombatStats(stats as HunterCombatStats & Record<string, unknown>);
}

export function getPlayerStats(combat: CombatState, stats: HunterCombatStats, context: CombatContext, progression?: ProgressionState) {
  return getPlayerEffectiveCombatStats(combat, stats, progression, context.effects);
}

export function getEnemyStats(combat: CombatState, enemy: EnemyCombatInstance, context: CombatContext) {
  return getEnemyEffectiveCombatStats(
    enemy,
    context.effects,
    context.enemies,
    context.enemyTraits,
    combat.maxPlayerHp > 0 ? combat.playerHp / combat.maxPlayerHp : 1,
  );
}

export function recoverOutOfCombatResources(combat: CombatState, effective: ReturnType<typeof getPlayerStats>, step: number): CombatState {
  const maxHealth = effective.maxLife ?? 0;
  const maxStamina = effective.maxStamina;
  const maxMana = effective.maxMana;
  const healthRegen = maxHealth * combatBalance.recoveryHealthFractionPerSecond * step;
  const resourceMultiplier = combatBalance.recoveryResourceRegenMultiplier;
  return {
    ...combat,
    maxPlayerHp: maxHealth,
    playerHp: Math.min(maxHealth, combat.playerHp + healthRegen),
    maxStamina,
    stamina: clamp(combat.stamina + effective.staminaRegen * resourceMultiplier * step, 0, maxStamina),
    maxMana,
    mana: clamp(combat.mana + (effective.manaRegenFlat ?? 0) * resourceMultiplier * step, 0, maxMana),
  };
}

export function awardCombatXp(game: GameState, proficiencyId: CombatProficiencyId, amount: number) {
  if (!(amount > 0)) return { game, result: null };
  const result = awardProficiencyXp(game.progression, proficiencyId, amount);
  const current = game.combat.session.proficiencyXpGained[proficiencyId] ?? 0;
  return {
    game: {
      ...game,
      progression: result.progression,
      combat: {
        ...game.combat,
        session: {
          ...game.combat.session,
          proficiencyXpGained: { ...game.combat.session.proficiencyXpGained, [proficiencyId]: current + result.proficiencyXpGained },
        },
      },
    },
    result,
  };
}

export function clearEndedHuntEffects(combat: CombatState, definitions: Record<string, EffectDefinition>) {
  const shouldKeep = (effect: ActiveEffectInstance) => {
    const persistence = definitions[effect.effectId]?.persistence;
    return persistence !== "hunt" && persistence !== "between-enemies";
  };
  return { ...combat, playerEffects: combat.playerEffects.filter(shouldKeep), enemies: combat.enemies.map((enemy) => ({ ...enemy, effects: [] })) };
}
