import { itemById, type ItemDefinition } from "../data/items";
import type { InventoryState } from "../inventory/inventoryTypes";
import { isItemInstanceId, type ItemDefinitionId, type ItemInstanceId, type ResolvedItemInstance } from "./itemTypes";
import { validateItemInstance } from "./itemInstanceValidation";
import { resolveItemStats } from "./itemStatResolver";
import { itemAffixById } from "../data/itemAffixes";

export function resolveItemInstance(
  inventory: InventoryState,
  instanceId: ItemInstanceId,
  items: Record<ItemDefinitionId, ItemDefinition> = itemById,
): ResolvedItemInstance | null {
  const instance = inventory.instances[instanceId];
  if (!instance || instance.id !== instanceId || !isItemInstanceId(instanceId) || instance.version !== 2) return null;
  const definition = items[instance.definitionId];
  if (!definition || definition.inventoryMode !== "instance") return null;
  if (!validateItemInstance(instance, items, itemAffixById).valid) return null;
  const resolved = resolveItemStats(definition, instance, itemAffixById);
  return { instance, definition, ...resolved };
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
