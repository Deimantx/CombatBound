import { itemById } from "../data/items";
import { grantItem, getStackableQuantity, removeStackableItem } from "../items/itemOwnership";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { LootContainerDefinition } from "./lootTypes";

export interface LootContainerOpenResult {
  inventory: InventoryState;
  containerId: string;
  openedQuantity: number;
  rewards: Record<string, number>;
  createdInstanceIds: string[];
}

function safeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function rollIndex(totalWeight: number, random: number) {
  const normalized = Math.max(0, Math.min(0.999999999, Number.isFinite(random) ? random : 0));
  return normalized * totalWeight;
}

export function openLootContainer(
  inventory: InventoryState,
  itemId: string,
  quantityToOpen: number,
  definitions: Record<string, LootContainerDefinition>,
  rng: () => number,
): LootContainerOpenResult {
  const item = itemById[itemId];
  const definition = item?.lootContainerId ? definitions[item.lootContainerId] : undefined;
  const requested = safeInteger(quantityToOpen);
  const owned = item?.inventoryMode === "stackable" ? getStackableQuantity(inventory, itemId) : 0;
  const openedQuantity = Math.min(requested, owned);
  const empty = { inventory, containerId: definition?.id ?? "", openedQuantity: 0, rewards: {}, createdInstanceIds: [] };
  if (!definition || openedQuantity <= 0 || !item?.lootContainerId) return empty;

  let nextInventory = removeStackableItem(inventory, itemId, openedQuantity);
  const rewards: Record<string, number> = {};
  const createdInstanceIds: string[] = [];
  const totalWeight = definition.entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (!(totalWeight > 0)) return empty;

  for (let box = 0; box < openedQuantity; box += 1) {
    for (let roll = 0; roll < definition.rolls; roll += 1) {
      let cursor = rollIndex(totalWeight, rng());
      const selected = definition.entries.find((entry) => {
        cursor -= Math.max(0, entry.weight);
        return cursor < 0;
      }) ?? definition.entries[definition.entries.length - 1];
      const quantity = selected.minQuantity + Math.floor(Math.max(0, Math.min(0.999999999, rng())) * (selected.maxQuantity - selected.minQuantity + 1));
      const grant = grantItem(nextInventory, selected.itemId, quantity);
      nextInventory = grant.inventory;
      rewards[selected.itemId] = (rewards[selected.itemId] ?? 0) + grant.quantityGranted;
      createdInstanceIds.push(...grant.createdInstanceIds);
    }
  }
  return { inventory: nextInventory, containerId: definition.id, openedQuantity, rewards, createdInstanceIds };
}
