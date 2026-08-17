import type { ItemDefinition } from "../data/items";
import type { ItemAffixInstance } from "./itemModifierTypes";

/** IDs are intentionally named separately so a definition can never be mistaken for an owned copy. */
export type ItemDefinitionId = string;
export type ItemInstanceId = string;

export type ItemInventoryMode = "stackable" | "instance";

export interface ItemStats {
  maxLife?: number;
  lifeRegenFlat?: number;
  accuracyRating?: number;
  evasionRating?: number;
  armour?: number;
  blockChance?: number;
  blockEffect?: number;
  manaRegenFlat?: number;
  increasedAttackSpeed?: number;
  increasedCastSpeed?: number;
  criticalStrikeChance?: number;
  criticalStrikeMultiplier?: number;
  baseDamageMin?: number;
  baseDamageMax?: number;
  baseAttackTime?: number;
  maxStamina?: number;
  staminaRegen?: number;
  maxMana?: number;
  fireResistance?: number;
  coldResistance?: number;
  lightningResistance?: number;
  chaosResistance?: number;
}

export interface ItemInstance {
  id: ItemInstanceId;
  definitionId: ItemDefinitionId;
  version: 2;
  quality: number;
  upgradeLevel: number;
  affixes: ItemAffixInstance[];
}

export interface ResolvedItemInstance {
  instance: ItemInstance;
  definition: ItemDefinition;
  baseStats: ItemStats;
  effectiveStats: ItemStats;
  contributions: import("./itemModifierTypes").ItemStatContribution[];
}

export type InventoryEntryRef =
  | { kind: "stack"; definitionId: ItemDefinitionId }
  | { kind: "instance"; instanceId: ItemInstanceId };

export function isItemInstanceId(value: unknown): value is ItemInstanceId {
  return typeof value === "string" && /^item-instance-\d+$/.test(value);
}

export function itemInstanceSequence(id: ItemInstanceId): number {
  const match = /^item-instance-(\d+)$/.exec(id);
  return match ? Number(match[1]) : 0;
}
