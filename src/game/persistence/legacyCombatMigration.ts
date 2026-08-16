import type { DamageType } from "../combat/combatTypes";

/** Serialized combat values accepted only while importing historical data. */
export type LegacyDamageType =
  | "water"
  | "air"
  | "earth"
  | "light"
  | "darkness"
  | "nature"
  | "mystic"
  | "true";

export function migrateLegacyDamageType(value: unknown): DamageType | null {
  if (value === "physical" || value === "fire" || value === "cold" || value === "lightning" || value === "chaos") return value;
  if (value === "water") return "cold";
  if (value === "air") return "lightning";
  if (value === "darkness") return "chaos";
  // Earth/light/nature/mystic/true had no safe one-to-one canonical meaning.
  return null;
}

/**
 * Converts only semantically safe historical stat names. Retired defensive
 * concepts are deliberately dropped instead of being reinterpreted.
 */
export function migrateLegacyCombatStats(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = { ...input };
  const safeAliases: Record<string, string> = {
    maxHealth: "maxLife",
    attackPower: "attackDamage",
    accuracy: "accuracyRating",
    armor: "armour",
    evasion: "evasionRating",
    critDamage: "criticalStrikeMultiplier",
    healthRegen: "lifeRegenFlat",
    manaRegen: "manaRegenFlat",
  };
  for (const [legacyKey, canonicalKey] of Object.entries(safeAliases)) {
    if (output[canonicalKey] === undefined && output[legacyKey] !== undefined) output[canonicalKey] = output[legacyKey];
    delete output[legacyKey];
  }
  const legacyResistances = output.resistances;
  if (legacyResistances && typeof legacyResistances === "object" && !Array.isArray(legacyResistances)) {
    for (const damageType of ["fire", "cold", "lightning", "chaos"] as const) {
      const value = (legacyResistances as Record<string, unknown>)[damageType];
      const key = `${damageType}Resistance`;
      if (output[key] === undefined && typeof value === "number" && Number.isFinite(value)) output[key] = value;
    }
    delete output.resistances;
  }
  const legacyMaximums = output.maxResistances;
  if (legacyMaximums && typeof legacyMaximums === "object" && !Array.isArray(legacyMaximums)) {
    for (const damageType of ["fire", "cold", "lightning", "chaos"] as const) {
      const value = (legacyMaximums as Record<string, unknown>)[damageType];
      const key = `max${damageType[0].toUpperCase()}${damageType.slice(1)}Resistance`;
      if (output[key] === undefined && typeof value === "number" && Number.isFinite(value)) output[key] = value;
    }
    delete output.maxResistances;
  }
  for (const retiredKey of ["parryChance", "dodgeChance", "blockPower", "statusResistance", "defense", "attackInterval"]) delete output[retiredKey];
  return output;
}
