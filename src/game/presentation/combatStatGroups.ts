import type { CombatReferenceCategory } from "../data/combatGlossary";

/**
 * The single presentation catalogue for the combat stats shown by Hero and
 * the standalone Equipment screen.  The values themselves still come from
 * the canonical combat stat pipeline.
 */
export const combatStatGroups = [
  {
    id: "offense",
    title: "OFFENSE",
    keys: ["attackDamage", "accuracyRating", "attackInterval", "attacksPerSecond", "baseCritChance", "criticalStrikeMultiplier"],
  },
  {
    id: "defense",
    title: "DEFENSE",
    keys: ["armour", "additionalPhysicalDamageReduction", "evasionRating", "attackBlockChance", "spellBlockChance", "spellSuppressionChance", "suppressedSpellDamagePrevented"],
  },
  {
    id: "resources",
    title: "RESOURCES & REGEN",
    keys: ["maxLife", "lifeRegenFlat", "maxStamina", "staminaRegen", "maxMana", "manaRegenFlat"],
  },
  {
    id: "resistances",
    title: "RESISTANCES",
    keys: ["fireResistance", "coldResistance", "lightningResistance", "chaosResistance"],
  },
] as const satisfies ReadonlyArray<{
  id: CombatReferenceCategory;
  title: string;
  keys: readonly string[];
}>;

export type CombatStatGroup = (typeof combatStatGroups)[number];
export type CombatStatGroupId = CombatStatGroup["id"];
