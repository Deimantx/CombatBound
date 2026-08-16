import { itemDefinitions, type ItemDefinition, type ItemRarity } from "../data/items";
import { equippedSlotForInstance } from "../equipment/equipmentRules";
import { getItemInstances, getStackableQuantity } from "../items/itemOwnership";
import { resolveItemInstance } from "../items/itemResolver";
import { itemInstanceSequence, type InventoryEntryRef, type ResolvedItemInstance } from "../items/itemTypes";
import { buildItemInstanceSearchText, itemInstanceIsModified } from "../presentation/itemPresentation";
import { buildItemTaxonomy, getDefinitionIdsUnderNode, itemDefinitionSearchText } from "../presentation/itemTaxonomy";
import type { EquipmentSlotDefinition, EquipmentSlotId, EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "./inventoryTypes";

export type InventoryPrimaryCategory = "all" | "equipment" | "consumables" | "materials" | "currency";
export type InventorySort = "name" | "rarity" | "mastery" | "quality" | "upgrade" | "recent" | "quantity";
export type InventoryEquipmentStateFilter = "all" | "equipped" | "unequipped";
export type InventoryModificationFilter = "all" | "modified" | "unmodified";

export interface InventoryFilters {
  category: InventoryPrimaryCategory;
  rarity: ItemRarity | "all";
  equipmentState: InventoryEquipmentStateFilter;
  modification: InventoryModificationFilter;
  nodeId?: string;
}

export interface InventoryViewEntry {
  ref: InventoryEntryRef;
  definition: ItemDefinition;
  quantity: number;
  instanceId?: string;
  resolved?: ResolvedItemInstance;
  equipped: boolean;
  equippedSlot?: string;
  modified: boolean;
  sequence: number;
  searchText: string;
}

export const defaultInventoryFilters: InventoryFilters = {
  category: "all",
  rarity: "all",
  equipmentState: "all",
  modification: "all",
};

export function chooseEquipmentTargetSlot(
  slotTargets: readonly Pick<EquipmentSlotDefinition, "id">[],
  equipment: EquipmentState,
  instanceId: string,
): EquipmentSlotId | undefined {
  return slotTargets.find((slot) => equipment.slots[slot.id] === instanceId)?.id
    ?? slotTargets.find((slot) => !equipment.slots[slot.id])?.id
    ?? slotTargets[0]?.id;
}

export const inventoryItemTaxonomy = buildItemTaxonomy(itemDefinitions);

export function inventoryRefsEqual(left: InventoryEntryRef | null | undefined, right: InventoryEntryRef | null | undefined) {
  if (!left || !right || left.kind !== right.kind) return false;
  return left.kind === "stack" && right.kind === "stack"
    ? left.definitionId === right.definitionId
    : left.kind === "instance" && right.kind === "instance" ? left.instanceId === right.instanceId : false;
}

export function paginateInventoryEntries(entries: readonly InventoryViewEntry[], visibleLimit: number) {
  return entries.slice(0, Math.max(0, Math.floor(visibleLimit)));
}

function matchesDefinition(definition: ItemDefinition, filters: InventoryFilters, allowedDefinitionIds?: ReadonlySet<string>) {
  if (allowedDefinitionIds && !allowedDefinitionIds.has(definition.id)) return false;
  if (filters.category === "equipment" && !definition.equipmentSlotKind) return false;
  if (filters.category === "consumables" && definition.category !== "consumable") return false;
  if (filters.category === "materials" && definition.category !== "material") return false;
  if (filters.category === "currency" && definition.category !== "currency") return false;
  if (filters.rarity !== "all" && definition.rarity !== filters.rarity) return false;
  return true;
}

function sortEntries(entries: InventoryViewEntry[], sort: InventorySort) {
  const rarityRank: Record<ItemRarity, number> = { common: 1, uncommon: 2, rare: 3 };
  return [...entries].sort((left, right) => {
    const value = sort === "name" ? left.definition.name.localeCompare(right.definition.name)
      : sort === "rarity" ? rarityRank[right.definition.rarity] - rarityRank[left.definition.rarity]
        : sort === "mastery" ? (right.definition.requiredMasteryLevel ?? 0) - (left.definition.requiredMasteryLevel ?? 0)
          : sort === "quality" ? (right.resolved?.instance.quality ?? 0) - (left.resolved?.instance.quality ?? 0)
            : sort === "upgrade" ? (right.resolved?.instance.upgradeLevel ?? 0) - (left.resolved?.instance.upgradeLevel ?? 0)
              : sort === "recent" ? right.sequence - left.sequence
                : right.quantity - left.quantity;
    return value || left.definition.name.localeCompare(right.definition.name) || left.sequence - right.sequence;
  });
}

export function selectInventoryEntries(
  inventory: InventoryState,
  equipment: EquipmentState,
  filters: InventoryFilters = defaultInventoryFilters,
  query = "",
  sort: InventorySort = "name",
  instanceSource: (source: InventoryState) => ReturnType<typeof getItemInstances> = getItemInstances,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const equippedIds = new Set(Object.values(equipment.slots).filter((value): value is string => Boolean(value)));
  const instancesByDefinition = new Map<string, ReturnType<typeof getItemInstances>[number][]>();
  for (const instance of instanceSource(inventory)) {
    const instances = instancesByDefinition.get(instance.definitionId) ?? [];
    instances.push(instance);
    instancesByDefinition.set(instance.definitionId, instances);
  }
  const allowedDefinitionIds = filters.nodeId && filters.nodeId !== "items"
    ? getDefinitionIdsUnderNode(inventoryItemTaxonomy, filters.nodeId)
    : undefined;
  const entries: InventoryViewEntry[] = [];
  for (const [index, definition] of itemDefinitions.entries()) {
    if (!matchesDefinition(definition, filters, allowedDefinitionIds)) continue;
    if (definition.inventoryMode === "stackable") {
      if (filters.equipmentState !== "all" || filters.modification !== "all") continue;
      const quantity = getStackableQuantity(inventory, definition.id);
      if (quantity <= 0) continue;
      const searchText = itemDefinitionSearchText(definition);
      if (normalizedQuery && !searchText.includes(normalizedQuery)) continue;
      entries.push({ ref: { kind: "stack", definitionId: definition.id }, definition, quantity, equipped: false, modified: false, sequence: index, searchText });
      continue;
    }
    for (const instance of instancesByDefinition.get(definition.id) ?? []) {
      const resolved = resolveItemInstance(inventory, instance.id);
      if (!resolved) continue;
      const equipped = equippedIds.has(instance.id);
      const modified = itemInstanceIsModified(instance);
      if (filters.equipmentState === "equipped" && !equipped || filters.equipmentState === "unequipped" && equipped) continue;
      if (filters.modification === "modified" && !modified || filters.modification === "unmodified" && modified) continue;
      const searchText = buildItemInstanceSearchText(resolved);
      if (normalizedQuery && !searchText.includes(normalizedQuery)) continue;
      entries.push({ ref: { kind: "instance", instanceId: instance.id }, definition, quantity: 1, instanceId: instance.id, resolved, equipped, equippedSlot: equippedSlotForInstance(equipment, instance.id), modified, sequence: itemInstanceSequence(instance.id), searchText });
    }
  }
  return sortEntries(entries, sort);
}
