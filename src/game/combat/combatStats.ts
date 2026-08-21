import { calculateArmorMitigation } from "./combatMath";
import { combatBalance, clamp } from "./combatBalance";
import type { ActiveEffectInstance, EffectDefinition } from "./combatEffectTypes";
import type { CombatStats, DamageType, EnemyDefinition, StatModifier } from "./combatTypes";

const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const number = (value: unknown, fallback = 0) => finite(value, fallback);

/** Normalizes authored and derived values into the current Combat 2.0 runtime surface. */
export function normalizeCombatStats(input: Partial<CombatStats> & Record<string, unknown>): CombatStats {
  const authoredAttackDamage = finite(input.attackDamage, NaN);
  const authoredMin = finite(input.attackDamageMin, NaN);
  const authoredMax = finite(input.attackDamageMax, NaN);
  const rangeAverage = Number.isFinite(authoredMin) && Number.isFinite(authoredMax) ? (authoredMin + authoredMax) / 2 : NaN;
  const attackDamage = Math.max(0, Number.isFinite(rangeAverage) ? rangeAverage : Number.isFinite(authoredAttackDamage) ? authoredAttackDamage : combatBalance.baseAttackDamage);
  const attackDamageMin = Math.max(0, Number.isFinite(authoredMin) ? authoredMin : attackDamage);
  const attackDamageMax = Math.max(attackDamageMin, Number.isFinite(authoredMax) ? authoredMax : attackDamage);
  const maxLife = Math.max(1, number(input.maxLife, combatBalance.baseMaxLife));
  const accuracyRating = number(input.accuracyRating, combatBalance.baseAccuracy);
  const evasionRating = Math.max(0, number(input.evasionRating, combatBalance.baseEvasion));
  const armour = Math.max(0, number(input.armour, combatBalance.baseArmour));
  const baseAttackTime = Math.max(combatBalance.minimumAttackInterval, number(input.baseAttackTime, combatBalance.baseAttackInterval));
  const attackSpeed = Math.max(0.01, 1 + number(input.increasedAttackSpeed)) * Math.max(0.01, 1 + number(input.moreAttackSpeed));
  const castSpeed = Math.max(0.01, 1 + number(input.increasedCastSpeed)) * Math.max(0.01, 1 + number(input.moreCastSpeed));
  const baseCastTime = Math.max(0.01, number(input.baseCastTime, 1));
  const attackInterval = Math.max(combatBalance.minimumAttackInterval, baseAttackTime / attackSpeed);
  const castTime = Math.max(combatBalance.minimumAttackInterval, baseCastTime / castSpeed);

  return {
    maxLife,
    attackDamage,
    attackDamageMin,
    attackDamageMax,
    lifeRegenFlat: number(input.lifeRegenFlat),
    maxMana: Math.max(0, number(input.maxMana, combatBalance.baseMaxMana)),
    manaRegenFlat: number(input.manaRegenFlat, combatBalance.baseManaRegen),
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
    criticalStrikeChance: clamp(number(input.criticalStrikeChance, combatBalance.baseCriticalStrikeChance), 0, combatBalance.maximumCriticalStrikeChance),
    criticalStrikeMultiplier: Math.max(1, number(input.criticalStrikeMultiplier, combatBalance.baseCriticalStrikeMultiplier)),
    armour,
    physicalDamageReduction: calculateArmorMitigation(armour),
    blockChance: clamp(number(input.blockChance, combatBalance.baseBlockChance), 0, combatBalance.maximumBlockChance),
    blockEffect: clamp(number(input.blockEffect, combatBalance.baseBlockEffect), 0, combatBalance.maximumBlockEffect),
    fireResistance: Math.max(combatBalance.minimumResistance, number(input.fireResistance)),
    coldResistance: Math.max(combatBalance.minimumResistance, number(input.coldResistance)),
    lightningResistance: Math.max(combatBalance.minimumResistance, number(input.lightningResistance)),
    chaosResistance: Math.max(combatBalance.minimumResistance, number(input.chaosResistance)),
    attackInterval,
    castTime,
    attacksPerSecond: 1 / attackInterval,
    castsPerSecond: 1 / castTime,
  };
}

export function calculateEffectiveCombatStats(baseStats: CombatStats, activeEffects: ActiveEffectInstance[], effectDefinitions: Record<string, EffectDefinition>): CombatStats {
  const result = normalizeCombatStats(baseStats as CombatStats & Record<string, unknown>);
  const modifiers: StatModifier[] = [];
  for (const instance of activeEffects) {
    const definition = effectDefinitions[instance.effectId];
    const magnitude = instance.snapshot?.effectMagnitudeMultiplier ?? 1;
    for (const modifier of definition?.statModifiers ?? []) {
      modifiers.push({ ...modifier, value: finite(modifier.value) * Math.max(1, instance.stacks) * magnitude });
    }
    for (const modifier of definition?.resistanceModifiers ?? []) {
      const stat = resistanceStatKey(modifier.damageType);
      if (stat) modifiers.push({ stat, operation: modifier.operation, value: finite(modifier.value) * Math.max(1, instance.stacks) * magnitude });
    }
  }
  return applyCombatStatModifiers(result, modifiers);
}

/** Applies the generic modifier pipeline and recomputes all derived timing/mitigation values. */
export function applyCombatStatModifiers(baseStats: CombatStats, modifiers: StatModifier[]) {
  const next = normalizeCombatStats(baseStats as CombatStats & Record<string, unknown>);
  const flat: Record<string, number> = {};
  const increased: Record<string, number> = {};
  const reduced: Record<string, number> = {};
  const more: Record<string, number> = {};
  const less: Record<string, number> = {};
  const overrides: Record<string, number> = {};
  const minimums: Record<string, number> = {};
  const maximums: Record<string, number> = {};
  for (const modifier of modifiers) {
    const stat = modifier.stat;
    const value = finite(modifier.value);
    if (modifier.operation === "flat") flat[stat] = (flat[stat] ?? 0) + value;
    else if (modifier.operation === "increased") increased[stat] = (increased[stat] ?? 0) + value;
    else if (modifier.operation === "reduced") reduced[stat] = (reduced[stat] ?? 0) + value;
    else if (modifier.operation === "more") more[stat] = (more[stat] ?? 1) * (1 + value);
    else if (modifier.operation === "less") less[stat] = (less[stat] ?? 1) * (1 - value);
    else if (modifier.operation === "override") overrides[stat] = value;
    else if (modifier.operation === "set-minimum") minimums[stat] = Math.max(minimums[stat] ?? -Infinity, value);
    else if (modifier.operation === "set-maximum") maximums[stat] = Math.min(maximums[stat] ?? Infinity, value);
  }
  const applyValue = (value: number, stat: string) => {
    // `moreAttackSpeed` and `moreCastSpeed` are stored as additive offsets
    // from the neutral multiplier (0 means 1.0x). A generic "more" operation
    // must therefore compose against 1.0, not against the stored zero value.
    if (stat === "moreAttackSpeed" || stat === "moreCastSpeed") {
      const calculated = (1 + value + (flat[stat] ?? 0))
        * (1 + (increased[stat] ?? 0) - (reduced[stat] ?? 0))
        * (more[stat] ?? 1)
        * (less[stat] ?? 1) - 1;
      return Math.min(maximums[stat] ?? Infinity, Math.max(minimums[stat] ?? -Infinity, overrides[stat] ?? calculated));
    }
    const calculated = (value + (flat[stat] ?? 0)) * (1 + (increased[stat] ?? 0) - (reduced[stat] ?? 0)) * (more[stat] ?? 1) * (less[stat] ?? 1);
    return Math.min(maximums[stat] ?? Infinity, Math.max(minimums[stat] ?? -Infinity, overrides[stat] ?? calculated));
  };
  const keys = new Set(Object.keys(flat).concat(Object.keys(increased), Object.keys(reduced), Object.keys(more), Object.keys(less), Object.keys(overrides), Object.keys(minimums), Object.keys(maximums)));
  const hasAttackRangeModifier = keys.has("attackDamage") || keys.has("attackDamageMin") || keys.has("attackDamageMax");
  if (hasAttackRangeModifier) {
    const minimum = Math.max(0, applyValue(applyValue(next.attackDamageMin ?? next.attackDamage, "attackDamage"), "attackDamageMin"));
    const maximum = Math.max(minimum, applyValue(applyValue(next.attackDamageMax ?? next.attackDamage, "attackDamage"), "attackDamageMax"));
    next.attackDamageMin = minimum;
    next.attackDamageMax = maximum;
    next.attackDamage = (minimum + maximum) / 2;
  }
  for (const key of keys) {
    if (key === "attackDamage" || key === "attackDamageMin" || key === "attackDamageMax") continue;
    const current = (next as unknown as Record<string, unknown>)[key];
    if (typeof current !== "number") continue;
    (next as unknown as Record<string, unknown>)[key] = applyValue(current, key);
  }
  return normalizeCombatStats(next as CombatStats & Record<string, unknown>);
}

function resistanceStatKey(damageType: DamageType): StatModifier["stat"] | null {
  if (damageType === "fire") return "fireResistance";
  if (damageType === "cold") return "coldResistance";
  if (damageType === "lightning") return "lightningResistance";
  if (damageType === "chaos") return "chaosResistance";
  return null;
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
    blockChance: definition.blockChance,
    blockEffect: definition.blockEffect,
    fireResistance: definition.resistances.fire,
    coldResistance: definition.resistances.cold,
    lightningResistance: definition.resistances.lightning,
    chaosResistance: definition.resistances.chaos,
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

export function getUncappedResistance(stats: CombatStats, damageType: DamageType) {
  const field = resistanceField(damageType);
  return field ? finite(stats[field], 0) : 0;
}

export function getResistance(stats: CombatStats, damageType: DamageType) {
  return clamp(getUncappedResistance(stats, damageType), combatBalance.minimumResistance, combatBalance.defaultMaximumResistance);
}

export function calculateEffectiveResistance(stats: CombatStats, damageType: DamageType, penetration = 0) {
  if (damageType === "physical") return 0;
  return clamp(getResistance(stats, damageType) - Math.max(0, finite(penetration)), combatBalance.minimumResistance, combatBalance.defaultMaximumResistance);
}
