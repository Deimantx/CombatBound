import { combatBalance, clamp } from "./combatBalance";
import type { ActiveEffectInstance, EffectDefinition } from "./combatEffectTypes";
import type { CombatStats, DamageType, EnemyDefinition, LegacyDamageType } from "./combatTypes";

const finite = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const number = (value: unknown, fallback = 0) => finite(value, fallback);

/** Converts historical authored/save stat names at the data boundary. */
export function canonicalStatKey(stat: string): string {
  const aliases: Record<string, string> = {
    maxHealth: "maxLife", attackPower: "attackDamage", attack: "attackDamage",
    accuracy: "accuracyRating", armor: "armour", defense: "armour", evasion: "evasionRating",
    dodgeChance: "evasionRating", parryChance: "evasionRating", critChance: "baseCritChance",
    critDamage: "criticalStrikeMultiplier", blockChance: "attackBlockChance", blockPower: "attackBlockChance",
    statusResistance: "ailmentDurationReduction", healthRegen: "lifeRegenFlat", manaRegen: "manaRegenFlat",
    attackInterval: "baseAttackTime",
  };
  return aliases[stat] ?? stat;
}

const canonicalResistance = (raw: Record<string, unknown> = {}) => ({
  fire: number(raw.fire), cold: number(raw.cold ?? raw.water), lightning: number(raw.lightning ?? raw.air), chaos: number(raw.chaos ?? raw.darkness),
});

/** Converts any input record into one stable canonical combat-stat object. */
export function normalizeCombatStats(input: Partial<CombatStats> & Record<string, unknown>): CombatStats {
  const maxLife = Math.max(1, number(input.maxLife ?? input.maxHealth, combatBalance.baseMaxLife));
  const attackDamage = Math.max(0, number(input.attackDamage ?? input.attackPower ?? input.attack, combatBalance.baseAttackDamage));
  const accuracyRating = number(input.accuracyRating ?? input.accuracy, combatBalance.baseAccuracy);
  const evasionRating = Math.max(0, number(input.evasionRating ?? input.evasion, combatBalance.baseEvasion));
  const armour = Math.max(0, number(input.armour ?? input.armor ?? input.defense, combatBalance.baseArmour));
  const baseAttackTime = Math.max(combatBalance.minimumAttackInterval, number(input.baseAttackTime ?? input.attackInterval, combatBalance.baseAttackInterval));
  const attackBlockChance = clamp(number(input.attackBlockChance ?? input.blockChance, combatBalance.baseAttackBlockChance), 0, combatBalance.hardMaximumBlockChance);
  const spellBlockChance = clamp(number(input.spellBlockChance, combatBalance.baseSpellBlockChance), 0, combatBalance.hardMaximumBlockChance);
  const maxAttackBlockChance = clamp(number(input.maxAttackBlockChance, combatBalance.maximumBlockChance), 0, combatBalance.hardMaximumBlockChance);
  const maxSpellBlockChance = clamp(number(input.maxSpellBlockChance, combatBalance.maximumBlockChance), 0, combatBalance.hardMaximumBlockChance);
  const baseCritChance = clamp(number(input.baseCritChance ?? input.critChance, combatBalance.baseCritChance), 0, combatBalance.maxCritChance);
  const criticalStrikeMultiplier = Math.max(1, number(input.criticalStrikeMultiplier ?? input.critDamage, combatBalance.baseCritDamage));
  const attackSpeed = Math.max(0.01, (1 + number(input.increasedAttackSpeed)) * Math.max(0.01, 1 + number(input.moreAttackSpeed)) * Math.max(0.01, number(input.actionSpeed, 1)));
  const castTime = Math.max(0.01, number(input.baseCastTime, 1) / attackSpeed);
  const resistances = canonicalResistance((input.resistances as Record<string, unknown> | undefined) ?? {});
  const attackInterval = Math.max(combatBalance.minimumAttackInterval, baseAttackTime / attackSpeed);

  return {
    maxLife,
    attackDamage,
    lifeRegenFlat: number(input.lifeRegenFlat ?? input.healthRegen),
    lifeRegenPercent: number(input.lifeRegenPercent),
    lifeRecoveryRate: number(input.lifeRecoveryRate, 1),
    maxMana: Math.max(0, number(input.maxMana, combatBalance.baseMaxMana)),
    manaRegenFlat: number(input.manaRegenFlat ?? input.manaRegen, combatBalance.baseManaRegen),
    manaRegenPercent: number(input.manaRegenPercent),
    manaRecoveryRate: number(input.manaRecoveryRate, 1),
    maxStamina: Math.max(0, number(input.maxStamina, combatBalance.baseMaxStamina)),
    staminaRegen: number(input.staminaRegen, combatBalance.baseStaminaRegen),
    accuracyRating,
    evasionRating,
    baseAttackTime,
    increasedAttackSpeed: number(input.increasedAttackSpeed),
    moreAttackSpeed: number(input.moreAttackSpeed),
    baseCastTime: number(input.baseCastTime, 1),
    increasedCastSpeed: number(input.increasedCastSpeed),
    moreCastSpeed: number(input.moreCastSpeed),
    actionSpeed: number(input.actionSpeed, 1),
    baseCritChance,
    additionalBaseCritChance: number(input.additionalBaseCritChance),
    increasedCritChance: number(input.increasedCritChance),
    moreCritChance: number(input.moreCritChance),
    criticalStrikeMultiplier,
    reducedExtraDamageTakenFromCriticalStrikes: number(input.reducedExtraDamageTakenFromCriticalStrikes),
    armour,
    additionalPhysicalDamageReduction: clamp(number(input.additionalPhysicalDamageReduction), 0, 0.9),
    maxPhysicalDamageReduction: clamp(number(input.maxPhysicalDamageReduction, 0.9), 0, 0.9),
    attackBlockChance,
    spellBlockChance,
    maxAttackBlockChance,
    maxSpellBlockChance,
    spellSuppressionChance: clamp(number(input.spellSuppressionChance), 0, 1),
    suppressedSpellDamagePrevented: clamp(number(input.suppressedSpellDamagePrevented, combatBalance.suppressedSpellDamagePrevented), 0, 1),
    fireResistance: clamp(resistances.fire, combatBalance.minimumResistance, combatBalance.hardMaximumResistance),
    coldResistance: clamp(resistances.cold, combatBalance.minimumResistance, combatBalance.hardMaximumResistance),
    lightningResistance: clamp(resistances.lightning, combatBalance.minimumResistance, combatBalance.hardMaximumResistance),
    chaosResistance: clamp(resistances.chaos, combatBalance.minimumResistance, combatBalance.hardMaximumResistance),
    maxFireResistance: clamp(number(input.maxFireResistance, combatBalance.defaultMaximumResistance), 0, combatBalance.hardMaximumResistance),
    maxColdResistance: clamp(number(input.maxColdResistance, combatBalance.defaultMaximumResistance), 0, combatBalance.hardMaximumResistance),
    maxLightningResistance: clamp(number(input.maxLightningResistance, combatBalance.defaultMaximumResistance), 0, combatBalance.hardMaximumResistance),
    maxChaosResistance: clamp(number(input.maxChaosResistance, combatBalance.defaultMaximumResistance), 0, combatBalance.hardMaximumResistance),
    elementalAilmentAvoidance: clamp(number(input.elementalAilmentAvoidance), 0, 1),
    physicalAilmentAvoidance: clamp(number(input.physicalAilmentAvoidance), 0, 1),
    ailmentDurationReduction: clamp(number(input.ailmentDurationReduction), 0, 1),
    nonDamagingAilmentEffectReduction: clamp(number(input.nonDamagingAilmentEffectReduction), 0, 1),
    stunAvoidance: clamp(number(input.stunAvoidance), 0, 1),
    stunRecovery: Math.max(0, number(input.stunRecovery)),
    attackInterval,
    castTime,
    attacksPerSecond: 1 / attackInterval,
    castsPerSecond: 1 / castTime,
    resistances,
  };
}

export function calculateEffectiveCombatStats(baseStats: CombatStats, activeEffects: ActiveEffectInstance[], effectDefinitions: Record<string, EffectDefinition>): CombatStats {
  const result = normalizeCombatStats(baseStats as CombatStats & Record<string, unknown>);
  const flat: Record<string, number> = {}, increased: Record<string, number> = {}, reduced: Record<string, number> = {}, more: Record<string, number> = {}, less: Record<string, number> = {}, overrides: Record<string, number> = {}, minimums: Record<string, number> = {}, maximums: Record<string, number> = {}, resistanceFlat: Record<string, number> = {};
  for (const instance of activeEffects) {
    const definition = effectDefinitions[instance.effectId];
    for (const modifier of definition?.statModifiers ?? []) {
      const value = finite(modifier.value) * Math.max(1, instance.stacks);
      const stat = canonicalStatKey(modifier.stat);
      if (modifier.operation === "override") overrides[stat] = value;
      else if (modifier.operation === "set-minimum") minimums[stat] = Math.max(minimums[stat] ?? -Infinity, value);
      else if (modifier.operation === "set-maximum") maximums[stat] = Math.min(maximums[stat] ?? Infinity, value);
      else if (modifier.operation === "flat") flat[stat] = (flat[stat] ?? 0) + value;
      else if (modifier.operation === "increased") increased[stat] = (increased[stat] ?? 0) + value;
      else if (modifier.operation === "reduced") reduced[stat] = (reduced[stat] ?? 0) + value;
      else if (modifier.operation === "more") more[stat] = (more[stat] ?? 1) * (1 + value);
      else if (modifier.operation === "less") less[stat] = (less[stat] ?? 1) * (1 - value);
    }
    for (const modifier of definition?.resistanceModifiers ?? []) resistanceFlat[modifier.damageType] = (resistanceFlat[modifier.damageType] ?? 0) + modifier.value * Math.max(1, instance.stacks);
  }
  const keys = Object.keys(flat).concat(Object.keys(increased), Object.keys(reduced), Object.keys(more), Object.keys(less), Object.keys(overrides), Object.keys(minimums), Object.keys(maximums));
  for (const key of new Set(keys)) {
    const value = number((result as unknown as Record<string, unknown>)[key]);
    const calculated = (value + (flat[key] ?? 0)) * (1 + (increased[key] ?? 0) - (reduced[key] ?? 0)) * (more[key] ?? 1) * (less[key] ?? 1);
    (result as unknown as Record<string, unknown>)[key] = Math.min(maximums[key] ?? Infinity, Math.max(minimums[key] ?? -Infinity, overrides[key] ?? calculated));
  }
  for (const [key, value] of Object.entries(overrides)) if (key in result && !keys.includes(key)) (result as unknown as Record<string, unknown>)[key] = Math.min(maximums[key] ?? Infinity, Math.max(minimums[key] ?? -Infinity, value));
  for (const [key, value] of Object.entries(resistanceFlat)) {
    const mapped = key === "water" ? "cold" : key === "air" ? "lightning" : key === "darkness" ? "chaos" : key;
    if (mapped in result.resistances) result.resistances[mapped as keyof typeof result.resistances] = clamp(number(result.resistances[mapped as keyof typeof result.resistances]) + value, combatBalance.minimumResistance, combatBalance.hardMaximumResistance);
  }
  return normalizeCombatStats(result as CombatStats & Record<string, unknown>);
}

export function calculateEnemyBaseCombatStats(definition: EnemyDefinition): CombatStats {
  return normalizeCombatStats({
    maxLife: definition.maxLife,
    attackDamage: (definition.baseAttackDamageMin + definition.baseAttackDamageMax) / 2,
    accuracyRating: definition.accuracyRating,
    baseAttackTime: definition.baseAttackTime,
    armour: definition.armour,
    evasionRating: definition.evasionRating,
    additionalPhysicalDamageReduction: definition.additionalPhysicalDamageReduction,
    attackBlockChance: definition.attackBlockChance,
    spellBlockChance: definition.spellBlockChance,
    spellSuppressionChance: definition.spellSuppressionChance,
    resistances: definition.resistances,
    maxStamina: 0,
    staminaRegen: 0,
    maxMana: 0,
    manaRegenFlat: 0,
  });
}

export function getResistance(stats: CombatStats, damageType: DamageType | LegacyDamageType) {
  const mapped = damageType === "water" ? "cold" : damageType === "air" ? "lightning" : damageType === "darkness" ? "chaos" : damageType;
  if (mapped === "physical" || mapped === "earth" || mapped === "light" || mapped === "nature" || mapped === "mystic" || mapped === "true") return 0;
  const resistance = mapped === "fire" ? stats.fireResistance ?? stats.resistances.fire : mapped === "cold" ? stats.coldResistance ?? stats.resistances.cold : mapped === "lightning" ? stats.lightningResistance ?? stats.resistances.lightning : stats.chaosResistance ?? stats.resistances.chaos;
  const maximum = mapped === "fire" ? stats.maxFireResistance : mapped === "cold" ? stats.maxColdResistance : mapped === "lightning" ? stats.maxLightningResistance : stats.maxChaosResistance;
  return clamp(number(resistance), combatBalance.minimumResistance, Math.min(combatBalance.hardMaximumResistance, number(maximum, combatBalance.defaultMaximumResistance)));
}

export function calculateEffectiveResistance(stats: CombatStats, damageType: DamageType, penetration = 0, exposure = 0) {
  return getResistance(stats, damageType) - Math.max(0, Number.isFinite(penetration) ? penetration : 0) + Math.min(0, Number.isFinite(exposure) ? exposure : 0);
}
