import { enemyById } from "../data/enemies";
import { effectById } from "../data/effects";
import { perkById } from "../data/proficiencyPerks";
import type { HunterCombatStats } from "../equipment/derivedStats";
import {
  applyProficiencyStatModifiers,
  getConditionalMagicStatModifiers,
  getConditionalProficiencyStatModifiers,
} from "../progression/perkProgression";
import type {
  CombatProficiencyId,
  ProgressionState,
} from "../progression/progressionTypes";
import { calculateHitChance } from "./combatMath";
import {
  calculateEffectiveCombatStats,
  calculateEnemyBaseCombatStats,
  normalizeCombatStats,
} from "./combatStats";
import { getBarrierAmount } from "./combatEffects";
import type {
  CombatState,
  CombatStats,
  EnemyCombatInstance,
} from "./combatTypes";

export const MIN_RATE_SAMPLE_SECONDS = 10;

export interface CombatMatchupView {
  targetName: string;
  playerAccuracy: number;
  targetEvasion: number;
  playerHitChance: number;
  targetBlockChance: number;
  targetBlockEffect: number;
  enemyAccuracy: number;
  playerEvasion: number;
  enemyHitChance: number;
  playerCritChance: number;
  playerStats: CombatStats;
  enemyStats: CombatStats;
}

export interface HuntSessionRates {
  dps: number;
  damageTakenPerSecond: number;
  healingPerSecond: number;
  killsPerHour: number;
  groupsPerHour: number;
  masteryXpPerHour: number;
  proficiencyXpPerHour: number;
  goldPerHour: number;
  itemsPerHour: number;
  averageKillSeconds: number | null;
  totalProficiencyXp: number;
  proficiencyXpPerHourById: Partial<Record<CombatProficiencyId, number>>;
  rateSampleReady: boolean;
}

export function getPlayerEffectiveCombatStats(
  combat: CombatState,
  stats: HunterCombatStats,
  progression?: ProgressionState,
  effectDefinitions = effectById,
): CombatStats {
  const base = calculateEffectiveCombatStats(
    normalizeCombatStats(stats as HunterCombatStats & Record<string, unknown>),
    combat.playerEffects,
    effectDefinitions,
  );
  if (!progression) return base;
  const barrierActive =
    getBarrierAmount(combat.playerEffects, effectDefinitions) > 0;
  const activeTechniqueCount = Object.values(combat.techniques).filter(
    Boolean,
  ).length;
  const weapon = stats.weaponProficiencyId ?? null;
  const dynamicWeapon = getConditionalProficiencyStatModifiers(
    progression,
    weapon,
    {
      activeTechniqueCount,
      staminaFraction:
        combat.maxStamina > 0 ? combat.stamina / combat.maxStamina : 0,
      playerHpFraction:
        combat.maxPlayerHp > 0 ? combat.playerHp / combat.maxPlayerHp : 1,
      barrierActive,
    },
    perkById,
  );
  return applyProficiencyStatModifiers(base, [
    ...dynamicWeapon,
    ...getConditionalMagicStatModifiers(progression, barrierActive, perkById),
  ]);
}

export function getEnemyEffectiveCombatStats(
  enemy: EnemyCombatInstance,
  effectDefinitions = effectById,
  enemyDefinitions = enemyById,
): CombatStats {
  const definition = enemyDefinitions[enemy.enemyId];
  const base = calculateEffectiveCombatStats(
    calculateEnemyBaseCombatStats(definition),
    enemy.effects,
    effectDefinitions,
  );
  return enemy.phaseStatModifiers?.length
    ? applyProficiencyStatModifiers(base, enemy.phaseStatModifiers)
    : base;
}

export function getPlayerBarrierAmount(
  combat: CombatState,
  effectDefinitions = effectById,
) {
  return getBarrierAmount(combat.playerEffects, effectDefinitions);
}

export function getSelectedTargetMatchup(
  combat: CombatState,
  stats: HunterCombatStats,
  progression: ProgressionState,
  selectedEnemy?: EnemyCombatInstance,
): CombatMatchupView | null {
  if (!selectedEnemy || selectedEnemy.defeated) return null;
  const playerStats = getPlayerEffectiveCombatStats(combat, stats, progression);
  const enemyStats = getEnemyEffectiveCombatStats(selectedEnemy);
  return {
    targetName: selectedEnemy.displayName,
    playerAccuracy: playerStats.accuracyRating ?? 0,
    targetEvasion: enemyStats.evasionRating ?? 0,
    playerHitChance: calculateHitChance(
      playerStats.accuracyRating ?? 0,
      enemyStats.evasionRating ?? 0,
    ),
    targetBlockChance: enemyStats.blockChance ?? 0,
    targetBlockEffect: enemyStats.blockEffect ?? 0,
    enemyAccuracy: enemyStats.accuracyRating ?? 0,
    playerEvasion: playerStats.evasionRating ?? 0,
    enemyHitChance: calculateHitChance(
      enemyStats.accuracyRating ?? 0,
      playerStats.evasionRating ?? 0,
    ),
    playerCritChance: playerStats.criticalStrikeChance ?? 0,
    playerStats,
    enemyStats,
  };
}

export function getHuntSessionRates(
  session: CombatState["session"],
): HuntSessionRates {
  const seconds = Math.max(
    0,
    Number.isFinite(session.elapsedSeconds) ? session.elapsedSeconds : 0,
  );
  const safeAmount = (value: number | undefined) =>
    value !== undefined && Number.isFinite(value) ? Math.max(0, value) : 0;
  const perSecond = (value: number) =>
    seconds > 0 ? safeAmount(value) / seconds : 0;
  const perHour = (value: number) =>
    seconds >= MIN_RATE_SAMPLE_SECONDS ? perSecond(value) * 3600 : 0;
  const kills = safeAmount(session.enemiesDefeated);
  const totalProficiencyXp = Object.values(session.proficiencyXpGained).reduce(
    (sum, value) => sum + safeAmount(value),
    0,
  );
  const proficiencyXpPerHourById = Object.fromEntries(
    Object.entries(session.proficiencyXpGained).map(([id, value]) => [
      id,
      perHour(value ?? 0),
    ]),
  ) as Partial<Record<CombatProficiencyId, number>>;
  return {
    dps: perSecond(session.damageDealt),
    damageTakenPerSecond: perSecond(session.damageTaken),
    healingPerSecond: perSecond(session.healing),
    killsPerHour: perHour(session.enemiesDefeated),
    groupsPerHour: perHour(session.groupClears),
    masteryXpPerHour: perHour(session.masteryXpGained),
    proficiencyXpPerHour: perHour(totalProficiencyXp),
    goldPerHour: perHour(session.goldGained),
    itemsPerHour: perHour(session.itemsGained),
    averageKillSeconds: kills > 0 ? seconds / kills : null,
    totalProficiencyXp,
    proficiencyXpPerHourById,
    rateSampleReady: seconds >= MIN_RATE_SAMPLE_SECONDS,
  };
}
