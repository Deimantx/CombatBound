import { combatBalance, clamp } from "./combatBalance";
import type { ActiveEffectInstance, EffectDefinition } from "./combatEffectTypes";
import type { CombatStats, DamageType, EnemyDefinition } from "./combatTypes";

const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const number = (value: unknown, fallback = 0) => finite(value, fallback);

/** Normalizes already-migrated canonical stats. */
export function normalizeCombatStats(input: Partial<CombatStats> & Record<string, unknown>): CombatStats {
  const authoredAttackDamage = finite(input.attackDamage, NaN);
  const authoredMin = finite(input.attackDamageMin, NaN);
  const authoredMax = finite(input.attackDamageMax, NaN);
  const rangeAverage = Number.isFinite(authoredMin) && Number.isFinite(authoredMax) ? (authoredMin + authoredMax) / 2 : NaN;
  const attackDamage = Math.max(0, Number.isFinite(authoredAttackDamage) ? authoredAttackDamage : Number.isFinite(rangeAverage) ? rangeAverage : combatBalance.baseAttackDamage);
  const attackDamageMin = Math.max(0, Number.isFinite(authoredMin) ? authoredMin : attackDamage);
  const attackDamageMax = Math.max(attackDamageMin, Number.isFinite(authoredMax) ? authoredMax : attackDamage);
  const maxLife = Math.max(1, number(input.maxLife, combatBalance.baseMaxLife));
  const accuracyRating = number(input.accuracyRating, combatBalance.baseAccuracy);
  const evasionRating = Math.max(0, number(input.evasionRating, combatBalance.baseEvasion));
  const armour = Math.max(0, number(input.armour, combatBalance.baseArmour));
  const baseAttackTime = Math.max(combatBalance.minimumAttackInterval, number(input.baseAttackTime, combatBalance.baseAttackInterval));
  const actionSpeed = Math.max(0.01, number(input.actionSpeed, 1));
  const attackSpeed = Math.max(0.01, 1 + number(input.increasedAttackSpeed)) * Math.max(0.01, 1 + number(input.moreAttackSpeed)) * actionSpeed;
  const castSpeed = Math.max(0.01, 1 + number(input.increasedCastSpeed)) * Math.max(0.01, 1 + number(input.moreCastSpeed)) * actionSpeed;
  const baseCastTime = Math.max(0.01, number(input.baseCastTime, 1));
  const attackInterval = Math.max(combatBalance.minimumAttackInterval, baseAttackTime / attackSpeed);
  const castTime = Math.max(0.01, baseCastTime / castSpeed);
  const maxAttackBlockChance = clamp(number(input.maxAttackBlockChance, combatBalance.maximumBlockChance), 0, combatBalance.hardMaximumBlockChance);
  const maxSpellBlockChance = clamp(number(input.maxSpellBlockChance, combatBalance.maximumBlockChance), 0, combatBalance.hardMaximumBlockChance);
  const baseCritChance = clamp(number(input.baseCritChance, combatBalance.baseCritChance), 0, combatBalance.maxCritChance);
  const criticalStrikeMultiplier = Math.max(1, number(input.criticalStrikeMultiplier, combatBalance.baseCritDamage));

  return {
    maxLife,
    attackDamage,
    attackDamageMin,
    attackDamageMax,
    lifeRegenFlat: number(input.lifeRegenFlat),
    lifeRegenPercent: number(input.lifeRegenPercent),
    lifeRecoveryRate: number(input.lifeRecoveryRate, 1),
    maxMana: Math.max(0, number(input.maxMana, combatBalance.baseMaxMana)),
    manaRegenFlat: number(input.manaRegenFlat, combatBalance.baseManaRegen),
    manaRegenPercent: number(input.manaRegenPercent),
    manaRecoveryRate: number(input.manaRecoveryRate, 1),
    maxStamina: Math.max(0, number(input.maxStamina, combatBalance.baseMaxStamina)),
    staminaRegen: number(input.staminaRegen, combatBalance.baseStaminaRegen),
    accuracyRating,
    evasionRating,
    baseAttackTime,
    increasedAttackSpeed: number(input.increasedAttackSpeed),
    moreAttackSpeed: number(input.moreAttackSpeed),
    baseCastTime,
    increasedCastSpeed: number(input.increasedCastSpeed),
    moreCastSpeed: number(input.moreCastSpeed),
    actionSpeed,
    baseCritChance,
    additionalBaseCritChance: number(input.additionalBaseCritChance),
    increasedCritChance: number(input.increasedCritChance),
    moreCritChance: number(input.moreCritChance),
    criticalStrikeMultiplier,
    reducedExtraDamageTakenFromCriticalStrikes: clamp(number(input.reducedExtraDamageTakenFromCriticalStrikes), 0, 1),
    armour,
    additionalPhysicalDamageReduction: clamp(number(input.additionalPhysicalDamageReduction), 0, 0.9),
    maxPhysicalDamageReduction: clamp(number(input.maxPhysicalDamageReduction, 0.9), 0, 0.9),
    attackBlockChance: Math.max(0, number(input.attackBlockChance, combatBalance.baseAttackBlockChance)),
    spellBlockChance: Math.max(0, number(input.spellBlockChance, combatBalance.baseSpellBlockChance)),
    maxAttackBlockChance,
    maxSpellBlockChance,
    spellSuppressionChance: clamp(number(input.spellSuppressionChance), 0, 1),
    suppressedSpellDamagePrevented: clamp(number(input.suppressedSpellDamagePrevented, combatBalance.suppressedSpellDamagePrevented), 0, 1),
    fireResistance: Math.max(combatBalance.minimumResistance, number(input.fireResistance)),
    coldResistance: Math.max(combatBalance.minimumResistance, number(input.coldResistance)),
    lightningResistance: Math.max(combatBalance.minimumResistance, number(input.lightningResistance)),
    chaosResistance: Math.max(combatBalance.minimumResistance, number(input.chaosResistance)),
    maxFireResistance: clamp(number(input.maxFireResistance, combatBalance.defaultMaximumResistance), 0, combatBalance.hardMaximumResistance),
    maxColdResistance: clamp(number(input.maxColdResistance, combatBalance.defaultMaximumResistance), 0, combatBalance.hardMaximumResistance),
    maxLightningResistance: clamp(number(input.maxLightningResistance, combatBalance.defaultMaximumResistance), 0, combatBalance.hardMaximumResistance),
    maxChaosResistance: clamp(number(input.maxChaosResistance, combatBalance.defaultMaximumResistance), 0, combatBalance.hardMaximumResistance),
    elementalAilmentAvoidance: clamp(number(input.elementalAilmentAvoidance), 0, 1),
    physicalAilmentAvoidance: clamp(number(input.physicalAilmentAvoidance), 0, 1),
    ailmentDurationReduction: clamp(number(input.ailmentDurationReduction), 0, 1),
    nonDamagingAilmentEffectReduction: clamp(number(input.nonDamagingAilmentEffectReduction), 0, 1),
    increasedDamageTaken: Math.max(-1, number(input.increasedDamageTaken)),
    attackInterval,
    castTime,
    attacksPerSecond: 1 / attackInterval,
    castsPerSecond: 1 / castTime,
  };
}

export function calculateEffectiveCombatStats(baseStats: CombatStats, activeEffects: ActiveEffectInstance[], effectDefinitions: Record<string, EffectDefinition>): CombatStats {
  const result = normalizeCombatStats(baseStats as CombatStats & Record<string, unknown>);
  const flat: Record<string, number> = {};
  const increased: Record<string, number> = {};
  const reduced: Record<string, number> = {};
  const more: Record<string, number> = {};
  const less: Record<string, number> = {};
  const overrides: Record<string, number> = {};
  const minimums: Record<string, number> = {};
  const maximums: Record<string, number> = {};
  for (const instance of activeEffects) {
    const definition = effectDefinitions[instance.effectId];
    const magnitude = instance.snapshot?.effectMagnitudeMultiplier ?? 1;
    for (const modifier of definition?.statModifiers ?? []) {
      const value = finite(modifier.value) * Math.max(1, instance.stacks) * magnitude;
      const stat = modifier.stat;
      if (modifier.operation === "override") overrides[stat] = value;
      else if (modifier.operation === "set-minimum") minimums[stat] = Math.max(minimums[stat] ?? -Infinity, value);
      else if (modifier.operation === "set-maximum") maximums[stat] = Math.min(maximums[stat] ?? Infinity, value);
      else if (modifier.operation === "flat") flat[stat] = (flat[stat] ?? 0) + value;
      else if (modifier.operation === "increased") increased[stat] = (increased[stat] ?? 0) + value;
      else if (modifier.operation === "reduced") reduced[stat] = (reduced[stat] ?? 0) + value;
      else if (modifier.operation === "more") more[stat] = (more[stat] ?? 1) * (1 + value);
      else if (modifier.operation === "less") less[stat] = (less[stat] ?? 1) * (1 - value);
    }
    for (const modifier of definition?.resistanceModifiers ?? []) {
      const field = `${modifier.damageType}Resistance`;
      const value = modifier.value * Math.max(1, instance.stacks) * magnitude;
      flat[field] = (flat[field] ?? 0) + value;
    }
  }
  const keys = Object.keys(flat).concat(Object.keys(increased), Object.keys(reduced), Object.keys(more), Object.keys(less), Object.keys(overrides), Object.keys(minimums), Object.keys(maximums));
  for (const key of new Set(keys)) {
    const value = number((result as unknown as Record<string, unknown>)[key]);
    const calculated = (value + (flat[key] ?? 0)) * (1 + (increased[key] ?? 0) - (reduced[key] ?? 0)) * (more[key] ?? 1) * (less[key] ?? 1);
    (result as unknown as Record<string, unknown>)[key] = Math.min(maximums[key] ?? Infinity, Math.max(minimums[key] ?? -Infinity, overrides[key] ?? calculated));
  }
  return normalizeCombatStats(result as CombatStats & Record<string, unknown>);
}

export function calculateEnemyBaseCombatStats(definition: EnemyDefinition): CombatStats {
  return normalizeCombatStats({
    maxLife: definition.maxLife,
    attackDamageMin: definition.baseAttackDamageMin,
    attackDamageMax: definition.baseAttackDamageMax,
    accuracyRating: definition.accuracyRating,
    baseAttackTime: definition.baseAttackTime,
    armour: definition.armour,
    evasionRating: definition.evasionRating,
    additionalPhysicalDamageReduction: definition.additionalPhysicalDamageReduction,
    attackBlockChance: definition.attackBlockChance,
    spellBlockChance: definition.spellBlockChance,
    spellSuppressionChance: definition.spellSuppressionChance,
    fireResistance: definition.resistances.fire,
    coldResistance: definition.resistances.cold,
    lightningResistance: definition.resistances.lightning,
    chaosResistance: definition.resistances.chaos,
    maxFireResistance: definition.maxResistances?.fire,
    maxColdResistance: definition.maxResistances?.cold,
    maxLightningResistance: definition.maxResistances?.lightning,
    maxChaosResistance: definition.maxResistances?.chaos,
    maxStamina: 0,
    staminaRegen: 0,
    maxMana: 0,
    manaRegenFlat: 0,
  });
}

function resistanceField(damageType: DamageType): keyof Pick<CombatStats, "fireResistance" | "coldResistance" | "lightningResistance" | "chaosResistance"> | null {
  if (damageType === "fire") return "fireResistance";
  if (damageType === "cold") return "coldResistance";
  if (damageType === "lightning") return "lightningResistance";
  if (damageType === "chaos") return "chaosResistance";
  return null;
}

function maximumResistanceField(damageType: DamageType): keyof Pick<CombatStats, "maxFireResistance" | "maxColdResistance" | "maxLightningResistance" | "maxChaosResistance"> | null {
  if (damageType === "fire") return "maxFireResistance";
  if (damageType === "cold") return "maxColdResistance";
  if (damageType === "lightning") return "maxLightningResistance";
  if (damageType === "chaos") return "maxChaosResistance";
  return null;
}

export function getUncappedResistance(stats: CombatStats, damageType: DamageType) {
  const field = resistanceField(damageType);
  return field ? finite(stats[field], 0) : 0;
}

export function getResistance(stats: CombatStats, damageType: DamageType) {
  const maximumField = maximumResistanceField(damageType);
  if (!maximumField) return 0;
  return clamp(getUncappedResistance(stats, damageType), combatBalance.minimumResistance, Math.min(combatBalance.hardMaximumResistance, finite(stats[maximumField], combatBalance.defaultMaximumResistance)));
}

export function calculateEffectiveResistance(stats: CombatStats, damageType: DamageType, penetration = 0, exposure = 0) {
  const maximum = getResistance(stats, damageType);
  const exposed = clamp(getUncappedResistance(stats, damageType) + Math.min(0, finite(exposure)), combatBalance.minimumResistance, maximum);
  return clamp(exposed - Math.max(0, finite(penetration)), combatBalance.minimumResistance, combatBalance.hardMaximumResistance);
}
