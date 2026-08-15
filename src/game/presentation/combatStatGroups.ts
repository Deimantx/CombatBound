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
    keys: ["attackPower", "accuracy", "attackInterval", "critChance", "critDamage"],
  },
  {
    id: "defense",
    title: "DEFENSE",
    keys: ["armor", "physicalDirectMitigation", "evasion", "dodgeChance", "parryChance", "blockChance", "blockPower", "statusResistance"],
  },
  {
    id: "resources",
    title: "RESOURCES & REGEN",
    keys: ["maxHealth", "healthRegen", "maxStamina", "staminaRegen", "maxMana", "manaRegen"],
  },
  {
    id: "resistances",
    title: "RESISTANCES",
    keys: ["physicalResistance", "fireResistance", "waterResistance", "airResistance", "earthResistance", "lightResistance", "darknessResistance", "natureResistance", "mysticResistance"],
  },
] as const satisfies ReadonlyArray<{
  id: CombatReferenceCategory;
  title: string;
  keys: readonly string[];
}>;

export type CombatStatGroup = (typeof combatStatGroups)[number];
export type CombatStatGroupId = CombatStatGroup["id"];
