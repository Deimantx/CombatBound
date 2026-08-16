import { itemById, type ItemDefinition } from "../data/items";
import type { InventoryState } from "../inventory/inventoryTypes";
import { isItemInstanceId, type ItemDefinitionId, type ItemInstanceId, type ResolvedItemInstance } from "./itemTypes";

export function resolveItemInstance(
  inventory: InventoryState,
  instanceId: ItemInstanceId,
  items: Record<ItemDefinitionId, ItemDefinition> = itemById,
): ResolvedItemInstance | null {
  const instance = inventory.instances[instanceId];
  if (!instance || instance.id !== instanceId || !isItemInstanceId(instanceId) || instance.version !== 1) return null;
  const definition = items[instance.definitionId];
  if (!definition || (definition.inventoryMode ?? (definition.equipmentSlotKind ? "instance" : "stackable")) !== "instance") return null;
  return { instance, definition, effectiveStats: { ...(definition.stats ?? {}) } };
}

export function resolveItemInstanceStats(
  inventory: InventoryState,
  instanceId: ItemInstanceId,
  items: Record<ItemDefinitionId, ItemDefinition> = itemById,
) {
  return resolveItemInstance(inventory, instanceId, items)?.effectiveStats ?? null;
}

export function getItemDefinitionForInstance(
  inventory: InventoryState,
  instanceId: ItemInstanceId,
  items: Record<ItemDefinitionId, ItemDefinition> = itemById,
) {
  return resolveItemInstance(inventory, instanceId, items)?.definition;
}
