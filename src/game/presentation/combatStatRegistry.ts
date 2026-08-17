import type { CombatStatKey } from "../combat/combatTypes";

export type CombatStatRegistryCategory = "offense" | "defense" | "resources" | "resistances";
export type CombatStatRegistryFormat = "number" | "percent" | "seconds" | "per-second";
export type CombatStatSummaryGroup = CombatStatRegistryCategory;
export type EquipmentComparisonGroup = CombatStatRegistryCategory | "utility";

export interface CombatStatRegistryEntry {
  id: CombatStatKey;
  label: string;
  category: CombatStatRegistryCategory;
  format: CombatStatRegistryFormat;
  comparisonDirection: "higher-is-better" | "lower-is-better" | "neutral";
  description: string;
  summaryGroup?: CombatStatSummaryGroup;
  equipmentComparison?: { visible: boolean; priority: number; group: EquipmentComparisonGroup };
}

const stat = (id: CombatStatKey, label: string, category: CombatStatRegistryCategory, format: CombatStatRegistryFormat, description: string, comparisonDirection: CombatStatRegistryEntry["comparisonDirection"] = "higher-is-better", summaryGroup?: CombatStatSummaryGroup): CombatStatRegistryEntry => ({ id, label, category, format, description, comparisonDirection, summaryGroup });

const rawCombatStatRegistry: readonly CombatStatRegistryEntry[] = [
  stat("maxLife", "Maximum Life", "resources", "number", "Maximum Life before damage defeats the combatant.", "higher-is-better", "resources"),
  stat("lifeRegenFlat", "Life Regen", "resources", "per-second", "Life recovered per second.", "higher-is-better", "resources"),
  stat("maxMana", "Maximum Mana", "resources", "number", "Maximum Mana available for Spells.", "higher-is-better", "resources"),
  stat("manaRegenFlat", "Mana Regen", "resources", "per-second", "Mana recovered per second.", "higher-is-better", "resources"),
  stat("maxStamina", "Maximum Stamina", "resources", "number", "Maximum Stamina available for combat actions.", "higher-is-better", "resources"),
  stat("staminaRegen", "Stamina Regen", "resources", "per-second", "Stamina recovered per second.", "higher-is-better", "resources"),
  stat("accuracyRating", "Accuracy Rating", "offense", "number", "Accuracy Rating determines Attack hit chance against target Evasion.", "higher-is-better", "offense"),
  stat("evasionRating", "Evasion Rating", "defense", "number", "Evasion Rating is opposed by incoming Attack Accuracy.", "higher-is-better", "defense"),
  stat("baseAttackTime", "Base Attack Time", "offense", "seconds", "Weapon base time before Attack Speed modifiers.", "lower-is-better"),
  stat("increasedAttackSpeed", "Increased Attack Speed", "offense", "percent", "Additive Attack Speed modifier."),
  stat("moreAttackSpeed", "More Attack Speed", "offense", "percent", "Multiplicative Attack Speed modifier."),
  stat("baseCastTime", "Base Cast Time", "offense", "seconds", "Spell base time before Cast Speed modifiers.", "lower-is-better"),
  stat("increasedCastSpeed", "Increased Cast Speed", "offense", "percent", "Additive Cast Speed modifier."),
  stat("moreCastSpeed", "More Cast Speed", "offense", "percent", "Multiplicative Cast Speed modifier."),
  stat("attackInterval", "Attack Interval", "offense", "seconds", "Seconds between automatic weapon Attacks.", "lower-is-better", "offense"),
  stat("attacksPerSecond", "Attacks per Second", "offense", "number", "Derived automatic Attack rate.", "higher-is-better", "offense"),
  stat("castTime", "Cast Time", "offense", "seconds", "Derived Spell cast time.", "lower-is-better"),
  stat("castsPerSecond", "Casts per Second", "offense", "number", "Derived Spell cast rate.", "higher-is-better"),
  stat("attackDamage", "Attack Damage", "offense", "number", "Average effective weapon Attack damage.", "higher-is-better", "offense"),
  stat("attackDamageMin", "Minimum Attack Damage", "offense", "number", "Minimum damage in the weapon Attack range."),
  stat("attackDamageMax", "Maximum Attack Damage", "offense", "number", "Maximum damage in the weapon Attack range."),
  stat("criticalStrikeChance", "Critical Strike Chance", "offense", "percent", "Final chance for an eligible hit to Critically Strike.", "higher-is-better", "offense"),
  stat("criticalStrikeMultiplier", "Critical Strike Multiplier", "offense", "percent", "Damage multiplier applied by a Critical Strike.", "higher-is-better", "offense"),
  stat("armour", "Armour", "defense", "number", "Armour mitigates Physical hit damage with the stable Armour curve.", "higher-is-better", "defense"),
  stat("physicalDamageReduction", "Physical Damage Reduction", "defense", "percent", "Derived Physical hit reduction from Armour.", "higher-is-better", "defense"),
  stat("blockChance", "Block Chance", "defense", "percent", "Chance to partially reduce an eligible hit.", "higher-is-better", "defense"),
  stat("blockEffect", "Block Effect", "defense", "percent", "Fraction of pre-mitigation hit damage prevented by Block.", "higher-is-better", "defense"),
  stat("fireResistance", "Fire Resistance", "resistances", "percent", "Reduces Fire damage.", "higher-is-better", "resistances"),
  stat("coldResistance", "Cold Resistance", "resistances", "percent", "Reduces Cold damage.", "higher-is-better", "resistances"),
  stat("lightningResistance", "Lightning Resistance", "resistances", "percent", "Reduces Lightning damage.", "higher-is-better", "resistances"),
  stat("chaosResistance", "Chaos Resistance", "resistances", "percent", "Reduces Chaos damage.", "higher-is-better", "resistances"),
];

const hiddenEquipmentComparisonStats = new Set<CombatStatKey>(["attackDamage", "attackDamageMin", "attackDamageMax", "baseAttackTime", "attacksPerSecond", "castTime", "castsPerSecond"]);
export const COMBAT_STAT_REGISTRY: readonly CombatStatRegistryEntry[] = rawCombatStatRegistry.map((entry, priority) => ({ ...entry, equipmentComparison: { visible: !hiddenEquipmentComparisonStats.has(entry.id), priority, group: entry.category } }));
export const COMBAT_STAT_DEFINITION_BY_ID = Object.fromEntries(COMBAT_STAT_REGISTRY.map((entry) => [entry.id, entry])) as Record<CombatStatKey, CombatStatRegistryEntry>;
