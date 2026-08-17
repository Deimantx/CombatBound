import { combatBalance } from "../combat/combatBalance";
import type { CombatStatKey, DamageType } from "../combat/combatTypes";

export type CombatReferenceCategory = "offense" | "defense" | "resources" | "resistances" | "character";
export type CombatStatDisplayKey = CombatStatKey | "currentHealth" | "stamina" | "mana" | "barrier" | "hitChance" | `${DamageType}Resistance`;
export type CombatStatFormat = "number" | "percent" | "seconds" | "multiplier" | "resistance";
export interface CombatStatReference { id: CombatStatDisplayKey; statKey?: CombatStatKey; label: string; shortDescription: string; fullDescription: string; category: CombatReferenceCategory; format: CombatStatFormat; formula?: string; notes?: string[]; }

const stat = (id: CombatStatKey, label: string, category: CombatReferenceCategory, format: CombatStatFormat, description: string): CombatStatReference => ({ id, statKey: id, label, category, format, shortDescription: description, fullDescription: description });
const display = (id: Exclude<CombatStatDisplayKey, CombatStatKey>, label: string, category: CombatReferenceCategory, format: CombatStatFormat, description: string): CombatStatReference => ({ id, label, category, format, shortDescription: description, fullDescription: description });
export const combatStatReferences: CombatStatReference[] = [
  stat("attackDamage", "Attack Damage", "offense", "number", "Damage used by weapon Attacks."),
  stat("accuracyRating", "Accuracy Rating", "offense", "number", "Accuracy Rating is opposed by target Evasion Rating for Attacks."),
  { ...display("hitChance", "Hit Chance", "offense", "percent", "Final chance for an Attack to hit after Accuracy versus Evasion."), formula: "1.25 × Accuracy / (Accuracy + (Evasion / 5)^0.9), clamped to 5%–100%." },
  stat("attackInterval", "Attack Interval", "offense", "seconds", "Seconds between automatic weapon Attacks."),
  stat("attacksPerSecond", "Attacks per Second", "offense", "number", "Derived Attack speed."),
  stat("criticalStrikeChance", "Critical Strike Chance", "offense", "percent", "Final chance for an eligible hit to Critically Strike."),
  stat("criticalStrikeMultiplier", "Critical Strike Multiplier", "offense", "multiplier", "Damage multiplier applied by a Critical Strike."),
  stat("armour", "Armour", "defense", "number", "Mitigates Physical hit damage with a stable defender-only curve."),
  stat("physicalDamageReduction", "Physical Damage Reduction", "defense", "percent", "Derived Physical hit reduction from Armour."),
  stat("evasionRating", "Evasion Rating", "defense", "number", "Evasion Rating opposes Accuracy for incoming Attacks."),
  stat("blockChance", "Block Chance", "defense", "percent", "Chance to partially reduce an eligible hit."),
  stat("blockEffect", "Block Effect", "defense", "percent", "Fraction of pre-mitigation hit damage prevented by Block."),
  stat("maxLife", "Max Life", "resources", "number", "Maximum Life before damage defeats the combatant."),
  stat("lifeRegenFlat", "Life Regen", "resources", "number", "Life recovered per second."),
  stat("maxStamina", "Max Stamina", "resources", "number", "Maximum Stamina for active combat actions."),
  stat("staminaRegen", "Stamina Regen", "resources", "number", "Stamina recovered per second."),
  stat("maxMana", "Max Mana", "resources", "number", "Maximum Mana for Spells."),
  stat("manaRegenFlat", "Mana Regen", "resources", "number", "Mana recovered per second."),
  stat("fireResistance", "Fire Resistance", "resistances", "resistance", "Reduces Fire damage."),
  stat("coldResistance", "Cold Resistance", "resistances", "resistance", "Reduces Cold damage."),
  stat("lightningResistance", "Lightning Resistance", "resistances", "resistance", "Reduces Lightning damage."),
  stat("chaosResistance", "Chaos Resistance", "resistances", "resistance", "Reduces Chaos damage."),
  display("barrier", "Barrier", "defense", "number", "Temporary absorb that applies after normal mitigation."),
];

export const combatStatReferenceById = Object.fromEntries(combatStatReferences.map((reference) => [reference.id, reference])) as Record<CombatStatDisplayKey, CombatStatReference>;
export const combatReferenceGroups: Array<{ id: CombatReferenceCategory; label: string }> = [
  { id: "offense", label: "Offense" }, { id: "defense", label: "Defense" }, { id: "resources", label: "Resources" }, { id: "resistances", label: "Resistances" },
];
export const damageTypeReferences: Array<{ id: DamageType; label: string; description: string }> = [
  { id: "physical", label: "Physical", description: "Mitigated by Armour based on hit size." },
  { id: "fire", label: "Fire", description: "Mitigated by Fire Resistance." },
  { id: "cold", label: "Cold", description: "Mitigated by Cold Resistance." },
  { id: "lightning", label: "Lightning", description: "Mitigated by Lightning Resistance." },
  { id: "chaos", label: "Chaos", description: "Mitigated by Chaos Resistance." },
];
export { combatBalance };
