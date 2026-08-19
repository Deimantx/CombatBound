import type { ItemCategory } from "../data/items";
import type { EquipmentSlotKind } from "../equipment/equipmentTypes";
import type { ItemInstance, ItemStats } from "./itemTypes";

export type ItemAffixDefinitionId = string;
export type ItemAffixTierId = string;
export type ItemAffixKind = "prefix" | "suffix";

export type LocalItemModifierTarget =
  | "physicalDamage"
  | "attackSpeed"
  | "criticalChance"
  | "armour"
  | "evasion";

export type GlobalItemStatKey = Exclude<keyof ItemStats, "baseDamageMin" | "baseDamageMax" | "baseAttackTime" | "attackInterval" | "attacksPerSecond" | "castTime" | "castsPerSecond"> & string;
export type ItemModifierOperation = "flat" | "increased" | "more";

export interface ItemModifierRollRange {
  min: number;
  max: number;
  step?: number;
  valueType: "integer" | "decimal";
}

export interface ItemAffixApplicability {
  categories?: ItemCategory[];
  slotKinds?: EquipmentSlotKind[];
}

export interface LocalItemAffixModifierDefinition {
  id: string;
  scope: "local";
  target: LocalItemModifierTarget;
  operation: ItemModifierOperation;
  roll: ItemModifierRollRange;
}

export interface GlobalItemAffixModifierDefinition {
  id: string;
  scope: "global";
  stat: GlobalItemStatKey;
  operation: "flat";
  roll: ItemModifierRollRange;
}

export type ItemAffixModifierDefinition = LocalItemAffixModifierDefinition | GlobalItemAffixModifierDefinition;

export interface ItemAffixTierDefinition {
  id: ItemAffixTierId;
  tier: number;
  requiredHunterRank?: number;
  modifiers: ItemAffixModifierDefinition[];
}

export interface ItemAffixDefinition {
  id: ItemAffixDefinitionId;
  name: string;
  kind: ItemAffixKind;
  appliesTo: ItemAffixApplicability;
  tiers: ItemAffixTierDefinition[];
}

export interface ItemAffixInstance {
  affixId: ItemAffixDefinitionId;
  tierId: ItemAffixTierId;
  rolls: Record<string, number>;
}

export interface ItemStatContribution {
  sourceType: "quality" | "upgrade" | "affix";
  sourceId: string;
  sourceLabel: string;
  scope: "local" | "global";
  target: string;
  operation: ItemModifierOperation;
  value: number;
}

export interface ItemRollRng {
  next(): number;
}

export type ItemMutationFailureReason =
  | "unknown-instance"
  | "invalid-quality"
  | "invalid-upgrade-level"
  | "unknown-affix"
  | "unknown-tier"
  | "affix-not-applicable"
  | "duplicate-affix"
  | "prefix-limit"
  | "suffix-limit"
  | "invalid-roll-data";

export interface ItemMutationResult {
  inventory: import("../inventory/inventoryTypes").InventoryState;
  changed: boolean;
  reason?: ItemMutationFailureReason;
}

export interface ItemInstanceValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ResolvedEquippedItem {
  slotId: import("../equipment/equipmentTypes").EquipmentSlotId;
  instance: ItemInstance;
  definition: import("../data/items").ItemDefinition;
  effectiveStats: ItemStats;
  baseStats: ItemStats;
  contributions: ItemStatContribution[];
}

export function clampRoll(value: number, range: ItemModifierRollRange) {
  return Math.max(range.min, Math.min(range.max, value));
}

export function rollItemModifier(range: ItemModifierRollRange, rng: ItemRollRng) {
  const random = rng.next();
  const normalized = Math.max(0, Math.min(1, Number.isFinite(random) ? random : 0));
  if (range.valueType === "integer") {
    const count = Math.max(1, Math.floor(range.max - range.min + 1));
    const index = Math.min(count - 1, Math.floor(normalized * count));
    return clampRoll(Math.floor(range.min) + index, range);
  }
  const raw = range.min + (range.max - range.min) * normalized;
  if (range.step && range.step > 0) {
    const stepIndex = Math.round((raw - range.min) / range.step);
    return clampRoll(Number((range.min + stepIndex * range.step).toFixed(12)), range);
  }
  return clampRoll(raw, range);
}
