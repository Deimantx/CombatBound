import type { WeaponArchetypeDefinition } from "../data/gear/weaponArchetypes";

export interface WeaponMechanicSchema {
  id: string;
  parameterKeys: readonly string[];
  defaults: Readonly<Record<string, number>>;
}

const schema = (id: string, defaults: Record<string, number>): WeaponMechanicSchema => ({ id, defaults, parameterKeys: Object.keys(defaults) });

export const weaponMechanicSchemas: readonly WeaponMechanicSchema[] = [
  schema("weapon-mechanic.duelist-rhythm", { maxStacks: 3, accuracyPerStack: 3, attackSpeedPerStack: 0.02, maxStackDamageBonus: 0.05 }),
  schema("weapon-mechanic.riposte", { durationSeconds: 5, damageMore: 0.15, critChanceFlat: 0.10, grantsRhythmOnHit: 0 }),
  schema("weapon-mechanic.axe-wounds", { maxStacks: 3, damagePerStack: 0.03, criticalExtraStacks: 0 }),
  schema("weapon-mechanic.axe-momentum", { maxStacks: 4, attackSpeedPerStack: 0.02, maxStackDamageBonus: 0.05, missFloor: 0 }),
  schema("weapon-mechanic.axe-execution", { threshold: 0.30, damageMore: 0.10, criticalChanceInsideThreshold: 0 }),
  schema("weapon-mechanic.mace-crushed", { maxStacks: 3, armorPenetrationPerStack: 0.04 }),
  schema("weapon-mechanic.mace-impact", { requiredHits: 2, heavyDamageMore: 0.20, heavyArmorPenetrationPercent: 0.10, heavyBlockEffectMultiplier: 0.75, baseBlockEffectMultiplier: 0, barrierDamageMore: 0, heavyCritChance: 0 }),
  schema("weapon-mechanic.dagger-combo", { maxStacks: 5, critChancePerStack: 0.015 }),
  schema("weapon-mechanic.dagger-flurry", { threshold: 5, hitCount: 2, hitDamageMultiplier: 0.65 }),
  schema("weapon-mechanic.dagger-opportunist", { durationSeconds: 4, damageMore: 0.10, critChanceFlat: 0.10, harmfulEffectDamageMore: 0, lowHealthDamageMore: 0, lowHealthCritChance: 0, additionalCombo: 0 }),
  schema("weapon-mechanic.greatsword-heavy-rhythm", { maxStacks: 3, damagePerStack: 0.03, perfectSwingThreshold: 3, perfectSwingDamageMore: 0.25, perfectSwingCritChance: 0.10, perfectSwingAccuracy: 5, perfectSwingNextStacks: 1 }),
  schema("weapon-mechanic.great-axe-execution", { midThreshold: 0.50, highThreshold: 0.25, midDamageMore: 0.08, highDamageMore: 0.18, highCritChance: 0 }),
  schema("weapon-mechanic.great-axe-bloodlust", { durationSeconds: 5, attackSpeedBonus: 0.10, damageMore: 0 }),
  schema("weapon-mechanic.warhammer-shatter", { maxStacks: 3, armorPenetrationPerStack: 0.05, baseArmorPenetrationPercent: 0 }),
  schema("weapon-mechanic.warhammer-charged-impact", { threshold: 3, damageMore: 0.30, armorPenetrationPercent: 0.20, blockEffectMultiplier: 0.50, nextStacks: 1, baseBlockEffectMultiplier: 0, barrierDamageMore: 0, barrierChargedDamageMore: 0 }),
  schema("weapon-mechanic.spear-mark", { maxStacks: 3, accuracyPerStack: 2, armorPenetrationPerStack: 0.03, baseArmorPenetrationPercent: 0, maxStackDamageBonus: 0, maxStackCritChance: 0 }),
  schema("weapon-mechanic.spear-precision-chain", { maxStacks: 3, critChancePerStack: 0.015 }),
  schema("weapon-mechanic.spear-counter-thrust", { durationSeconds: 4, timerAdvanceFraction: 0.20, damageMore: 0.10, critChanceFlat: 0.10, armorPenetrationPercent: 0, additionalMark: 0, additionalPrecisionChain: 0 }),
];

export const weaponMechanicSchemaById = Object.fromEntries(weaponMechanicSchemas.map((entry) => [entry.id, entry])) as Record<string, WeaponMechanicSchema>;

export function isKnownWeaponMechanicModifier(mechanicId: string, modifier: string) {
  return Boolean(weaponMechanicSchemaById[mechanicId]?.parameterKeys.includes(modifier));
}

export interface WeaponAttackProfile {
  armorPenetrationPercent: number;
  armorPenetrationFlat: number;
  targetBlockEffectMultiplier?: number;
}

export function weaponAttackProfile(archetype: WeaponArchetypeDefinition): WeaponAttackProfile {
  return {
    armorPenetrationPercent: archetype.attackProfile?.armorPenetrationPercent ?? 0,
    armorPenetrationFlat: archetype.attackProfile?.armorPenetrationFlat ?? 0,
    targetBlockEffectMultiplier: archetype.attackProfile?.targetBlockEffectMultiplier,
  };
}
