import { itemDefinitions, type ItemDefinition, type ItemRarity } from "../data/items";
import { equippedSlotForInstance } from "../equipment/equipmentRules";
import { EQUIPMENT_SLOT_DEFINITIONS } from "../equipment/equipmentTypes";
import { getItemInstances, getStackableQuantity } from "../items/itemOwnership";
import { resolveItemInstance } from "../items/itemResolver";
import { itemInstanceSequence, type InventoryEntryRef, type ItemInstance, type ResolvedItemInstance } from "../items/itemTypes";
import { buildItemInstanceSearchText, itemInstanceIsModified } from "../presentation/itemPresentation";
import { buildItemTaxonomy, getDefinitionIdsUnderNode, itemDefinitionSearchText } from "../presentation/itemTaxonomy";
import type { EquipmentSlotDefinition, EquipmentSlotId, EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "./inventoryTypes";
import { sortInventoryEntries, type InventorySortState } from "./inventorySorting";

export type { InventorySortDirection, InventorySortKey, InventorySortState } from "./inventorySorting";

export type InventoryPrimaryCategory = "all" | "equipment" | "consumables" | "materials" | "currency";
export type InventoryEquipmentStateFilter = "all" | "equipped" | "unequipped";
export type InventoryModificationFilter = "all" | "modified" | "unmodified" | "upgraded" | (string & {});
export type InventoryAvailabilityFilter = "all" | "usable" | "locked";

export interface InventoryFilters {
  category: InventoryPrimaryCategory;
  rarity: ItemRarity | "all";
  equipmentState: InventoryEquipmentStateFilter;
  modification: InventoryModificationFilter;
  availability?: InventoryAvailabilityFilter;
  nodeId?: string;
}

export interface InventoryViewEntry {
  ref: InventoryEntryRef;
  definition: ItemDefinition;
  quantity: number;
  instanceId?: string;
  resolved?: ResolvedItemInstance;
  equipped: boolean;
  equippedSlot?: EquipmentSlotId;
  modified: boolean;
  sequence: number;
  searchText: string;
}

export const defaultInventoryFilters: InventoryFilters = {
  category: "all",
  rarity: "all",
  equipmentState: "all",
  modification: "all",
  availability: "all",
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

export interface InventorySelectionContext {
  hunterRank?: number;
}

export interface InventorySelectionOptions extends InventorySelectionContext {
  instanceSource?: (inventory: InventoryState) => readonly ItemInstance[];
}

function matchesAvailability(definition: ItemDefinition, required: InventoryAvailabilityFilter, hunterRank: number) {
  if (required === "all") return true;
  const hasValidEquipmentTarget = Boolean(definition.equipmentSlotKind)
    && EQUIPMENT_SLOT_DEFINITIONS.some((slot) => slot.kind === definition.equipmentSlotKind);
  if (!hasValidEquipmentTarget) return false;
  const locked = (definition.requiredHunterRank ?? 0) > hunterRank;
  return required === "locked" ? locked : !locked;
}

export function selectInventoryEntries(
  inventory: InventoryState,
  equipment: EquipmentState,
  filters: InventoryFilters = defaultInventoryFilters,
  query = "",
  sort: InventorySortState = { key: "name", direction: "asc" },
  options: InventorySelectionOptions = {},
) {
  const normalizedQuery = query.trim().toLowerCase();
  const availability = filters.availability ?? "all";
  const instanceSource = options.instanceSource ?? getItemInstances;
  const hunterRank = options.hunterRank ?? 0;
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
  for (const definition of itemDefinitions) {
    if (!matchesDefinition(definition, filters, allowedDefinitionIds)) continue;
    if (definition.inventoryMode === "stackable") {
      if (filters.equipmentState !== "all" || filters.modification !== "all" || availability !== "all") continue;
      const quantity = getStackableQuantity(inventory, definition.id);
      if (quantity <= 0) continue;
      const searchText = itemDefinitionSearchText(definition);
      if (normalizedQuery && !searchText.includes(normalizedQuery)) continue;
      entries.push({ ref: { kind: "stack", definitionId: definition.id }, definition, quantity, equipped: false, modified: false, sequence: 0, searchText });
      continue;
    }
    for (const instance of instancesByDefinition.get(definition.id) ?? []) {
      const resolved = resolveItemInstance(inventory, instance.id);
      if (!resolved) continue;
      const equipped = equippedIds.has(instance.id);
      const modified = itemInstanceIsModified(instance);
      if (filters.equipmentState === "equipped" && !equipped || filters.equipmentState === "unequipped" && equipped) continue;
      if (filters.modification === "modified" && !modified || filters.modification === "unmodified" && modified) continue;
      if (filters.modification === "upgraded" && (instance.unlockedUpgradeNodeIds?.length ?? 0) === 0) continue;
      if (!matchesAvailability(definition, availability, hunterRank)) continue;
      const searchText = buildItemInstanceSearchText(resolved);
      if (normalizedQuery && !searchText.includes(normalizedQuery)) continue;
      entries.push({ ref: { kind: "instance", instanceId: instance.id }, definition, quantity: 1, instanceId: instance.id, resolved, equipped, equippedSlot: equippedSlotForInstance(equipment, instance.id), modified, sequence: itemInstanceSequence(instance.id), searchText });
    }
  }
  const effectiveSort = sort.key === "acquired" && filters.category !== "equipment" || sort.key === "manual"
    ? { key: "name" as const, direction: "asc" as const }
    : sort;
  return sortInventoryEntries(entries, effectiveSort);
}
