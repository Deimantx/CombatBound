import type { CombatStatKey, DamageType } from "../combat/combatTypes";

export type ResistanceDamageType = Exclude<DamageType, "physical">;
export type DebugStatInspectionId = CombatStatKey | `resistance:${ResistanceDamageType}`;
export type DebugStatCategory = "offense" | "defense" | "resources" | "resistances";
export type DebugStatFormat = "number" | "percent" | "seconds" | "per-second";

export interface DebugStatDefinition {
  id: DebugStatInspectionId;
  label: string;
  category: DebugStatCategory;
  format: DebugStatFormat;
  description: string;
}

export const COMBAT_STAT_KEYS: CombatStatKey[] = [
  "maxLife", "attackDamage", "accuracyRating", "evasionRating", "baseAttackTime", "attackInterval", "attacksPerSecond",
  "baseCastTime", "castTime", "castsPerSecond", "baseCritChance", "criticalStrikeMultiplier", "armour",
  "additionalPhysicalDamageReduction", "attackBlockChance", "spellBlockChance", "spellSuppressionChance",
  "maxFireResistance", "maxColdResistance", "maxLightningResistance", "maxChaosResistance",
  "suppressedSpellDamagePrevented", "maxStamina", "staminaRegen", "maxMana", "manaRegenFlat", "lifeRegenFlat",
];
export const RESISTANCE_DAMAGE_TYPES: ResistanceDamageType[] = ["fire", "cold", "lightning", "chaos"];

const descriptions: Record<string, string> = {
  accuracyRating: "Accuracy Rating determines Attack hit chance against target Evasion.",
  evasionRating: "Evasion Rating is opposed by Attack Accuracy.",
  armour: "Armour mitigates Physical hit damage based on hit size.",
  attackBlockChance: "Chance to fully prevent an eligible Attack hit.",
  spellBlockChance: "Chance to fully prevent an eligible Spell hit.",
  spellSuppressionChance: "Chance to prevent a portion of eligible Spell hit damage.",
};
const stat = (id: CombatStatKey, label: string, category: DebugStatCategory, format: DebugStatFormat): DebugStatDefinition => ({ id, label, category, format, description: descriptions[id] ?? `Current ${label.toLowerCase()} from the active build and combat effects.` });
const resistance = (id: ResistanceDamageType): DebugStatDefinition => ({ id: `resistance:${id}`, label: `${id[0].toUpperCase()}${id.slice(1)} Resistance`, category: "resistances", format: "percent", description: `Current ${id} damage resistance from the active build and combat effects.` });

export const DEBUG_STAT_DEFINITIONS: DebugStatDefinition[] = [
  stat("maxLife", "Maximum Life", "resources", "number"),
  stat("attackDamage", "Attack Damage", "offense", "number"),
  stat("accuracyRating", "Accuracy Rating", "offense", "number"),
  stat("evasionRating", "Evasion Rating", "defense", "number"),
  stat("baseAttackTime", "Base Attack Time", "offense", "seconds"),
  stat("armour", "Armour", "defense", "number"),
  stat("attackInterval", "Attack Interval", "offense", "seconds"),
  stat("attacksPerSecond", "Attacks per Second", "offense", "number"),
  stat("castTime", "Cast Time", "offense", "seconds"),
  stat("castsPerSecond", "Casts per Second", "offense", "number"),
  stat("baseCastTime", "Base Cast Time", "offense", "seconds"),
  stat("baseCritChance", "Base Critical Chance", "offense", "percent"),
  stat("criticalStrikeMultiplier", "Critical Strike Multiplier", "offense", "percent"),
  stat("attackBlockChance", "Attack Block Chance", "defense", "percent"),
  stat("spellBlockChance", "Spell Block Chance", "defense", "percent"),
  stat("spellSuppressionChance", "Spell Suppression Chance", "defense", "percent"),
  stat("additionalPhysicalDamageReduction", "Additional Physical Damage Reduction", "defense", "percent"),
  stat("suppressedSpellDamagePrevented", "Suppressed Spell Damage Prevented", "defense", "percent"),
  stat("maxFireResistance", "Maximum Fire Resistance", "resistances", "percent"),
  stat("maxColdResistance", "Maximum Cold Resistance", "resistances", "percent"),
  stat("maxLightningResistance", "Maximum Lightning Resistance", "resistances", "percent"),
  stat("maxChaosResistance", "Maximum Chaos Resistance", "resistances", "percent"),
  stat("maxStamina", "Maximum Stamina", "resources", "number"),
  stat("staminaRegen", "Stamina Regen", "resources", "per-second"),
  stat("maxMana", "Maximum Mana", "resources", "number"),
  stat("manaRegenFlat", "Mana Regen", "resources", "per-second"),
  stat("lifeRegenFlat", "Life Regen", "resources", "per-second"),
  ...RESISTANCE_DAMAGE_TYPES.map(resistance),
];

export const DEBUG_STAT_DEFINITION_BY_ID = Object.fromEntries(DEBUG_STAT_DEFINITIONS.map((definition) => [definition.id, definition])) as Record<DebugStatInspectionId, DebugStatDefinition>;
