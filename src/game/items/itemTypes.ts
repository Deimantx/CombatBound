import type { ItemDefinition } from "../data/items";

/** IDs are intentionally named separately so a definition can never be mistaken for an owned copy. */
export type ItemDefinitionId = string;
export type ItemInstanceId = string;

export type ItemInventoryMode = "stackable" | "instance";

export interface ItemInstance {
  id: ItemInstanceId;
  definitionId: ItemDefinitionId;
  version: 1;
}

export interface ResolvedItemInstance {
  instance: ItemInstance;
  definition: ItemDefinition;
  effectiveStats: NonNullable<ItemDefinition["stats"]>;
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
