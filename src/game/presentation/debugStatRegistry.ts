import type { CombatStatKey, DamageType } from "../combat/combatTypes";

export type ResistanceDamageType = Exclude<DamageType, "true">;
export type DebugStatInspectionId = CombatStatKey | `resistance:${ResistanceDamageType}`;
export type DebugStatCategory = "offense" | "defense" | "resources" | "resistances";
export type DebugStatFormat = "number" | "percent" | "seconds" | "per-second";

export interface DebugStatDefinition {
  id: DebugStatInspectionId;
  label: string;
  category: DebugStatCategory;
  format: DebugStatFormat;
}

export const COMBAT_STAT_KEYS: CombatStatKey[] = ["maxHealth", "attackPower", "accuracy", "attackInterval", "armor", "evasion", "critChance", "critDamage", "dodgeChance", "parryChance", "blockChance", "blockPower", "maxStamina", "staminaRegen", "maxMana", "manaRegen", "statusResistance", "healthRegen"];
export const RESISTANCE_DAMAGE_TYPES: ResistanceDamageType[] = ["physical", "fire", "water", "air", "earth", "light", "darkness", "nature", "mystic"];

const stat = (id: CombatStatKey, label: string, category: DebugStatCategory, format: DebugStatFormat): DebugStatDefinition => ({ id, label, category, format });
const resistance = (id: ResistanceDamageType): DebugStatDefinition => ({ id: `resistance:${id}`, label: `${id[0].toUpperCase()}${id.slice(1)} Resistance`, category: "resistances", format: "percent" });

export const DEBUG_STAT_DEFINITIONS: DebugStatDefinition[] = [
  stat("attackPower", "Attack Power", "offense", "number"), stat("accuracy", "Accuracy", "offense", "number"), stat("attackInterval", "Attack Interval", "offense", "seconds"), stat("critChance", "Critical Chance", "offense", "percent"), stat("critDamage", "Critical Damage", "offense", "percent"),
  stat("armor", "Armor", "defense", "number"), stat("evasion", "Evasion", "defense", "number"), stat("dodgeChance", "Dodge Chance", "defense", "percent"), stat("parryChance", "Parry Chance", "defense", "percent"), stat("blockChance", "Block Chance", "defense", "percent"), stat("blockPower", "Block Power", "defense", "percent"), stat("statusResistance", "Status Resistance", "defense", "percent"),
  stat("maxHealth", "Maximum Health", "resources", "number"), stat("healthRegen", "Health Regen", "resources", "per-second"), stat("maxStamina", "Maximum Stamina", "resources", "number"), stat("staminaRegen", "Stamina Regen", "resources", "per-second"), stat("maxMana", "Maximum Mana", "resources", "number"), stat("manaRegen", "Mana Regen", "resources", "per-second"),
  ...RESISTANCE_DAMAGE_TYPES.map(resistance),
];

export const DEBUG_STAT_DEFINITION_BY_ID = Object.fromEntries(DEBUG_STAT_DEFINITIONS.map((definition) => [definition.id, definition])) as Record<DebugStatInspectionId, DebugStatDefinition>;

