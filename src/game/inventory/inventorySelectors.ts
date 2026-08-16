import { itemAffixById } from "../data/itemAffixes";
import { itemDefinitions, type ItemDefinition, type ItemRarity } from "../data/items";
import { equippedSlotForInstance } from "../equipment/equipmentRules";
import { getItemInstances, getStackableQuantity } from "../items/itemOwnership";
import { resolveItemInstance } from "../items/itemResolver";
import { itemInstanceSequence, type InventoryEntryRef, type ResolvedItemInstance } from "../items/itemTypes";
import { buildItemPresentation, itemInstanceIsModified } from "../presentation/itemPresentation";
import type { EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "./inventoryTypes";

export type InventoryPrimaryCategory = "all" | "equipment" | "consumables" | "materials" | "currency";
export type InventoryEquipmentFilter = "all-gear" | "weapons" | "offhands" | "armor" | "accessories";
export type InventorySort = "name" | "rarity" | "mastery" | "quality" | "upgrade" | "recent" | "quantity";
export type InventoryEquipmentStateFilter = "all" | "equipped" | "unequipped";
export type InventoryModificationFilter = "all" | "modified" | "unmodified";

export interface InventoryFilters {
  category: InventoryPrimaryCategory;
  equipment: InventoryEquipmentFilter;
  rarity: ItemRarity | "all";
  equipmentState: InventoryEquipmentStateFilter;
  modification: InventoryModificationFilter;
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
  equipment: "all-gear",
  rarity: "all",
  equipmentState: "all",
  modification: "all",
};

export function inventoryRefsEqual(left: InventoryEntryRef | null | undefined, right: InventoryEntryRef | null | undefined) {
  if (!left || !right || left.kind !== right.kind) return false;
  return left.kind === "stack" && right.kind === "stack"
    ? left.definitionId === right.definitionId
    : left.kind === "instance" && right.kind === "instance" ? left.instanceId === right.instanceId : false;
}

function equipmentFilterMatches(definition: ItemDefinition, filter: InventoryEquipmentFilter) {
  if (filter === "all-gear") return true;
  if (!definition.equipmentSlotKind) return false;
  if (filter === "weapons") return definition.equipmentSlotKind === "weapon";
  if (filter === "offhands") return definition.equipmentSlotKind === "offhand";
  if (filter === "armor") return ["head", "armor", "gloves", "boots"].includes(definition.equipmentSlotKind);
  return ["belt", "cape", "necklace", "ring", "earring"].includes(definition.equipmentSlotKind);
}

function definitionSearchText(definition: ItemDefinition) {
  const proficiency = definition.weaponProficiencyId ?? definition.defensiveProficiencyId ?? "";
  return [definition.name, definition.category, definition.rarity, proficiency, definition.equipmentSlotKind ?? ""].join(" ").toLowerCase();
}

function resolvedSearchText(resolved: ResolvedItemInstance) {
  const affixText = resolved.instance.affixes.flatMap((entry) => {
    const affix = itemAffixById[entry.affixId];
    return [affix?.name ?? ""];
  });
  return [definitionSearchText(resolved.definition), ...affixText, ...buildItemPresentation(resolved).modifiers.map((modifier) => modifier.label)].join(" ").toLowerCase();
}

function matchesDefinition(definition: ItemDefinition, filters: InventoryFilters) {
  if (filters.category === "equipment" && !definition.equipmentSlotKind) return false;
  if (filters.category === "consumables" && definition.category !== "consumable") return false;
  if (filters.category === "materials" && definition.category !== "material") return false;
  if (filters.category === "currency" && definition.category !== "currency") return false;
  if (filters.category === "equipment" && !equipmentFilterMatches(definition, filters.equipment)) return false;
  if (filters.category !== "equipment" && filters.equipment !== "all-gear") return false;
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
) {
  const normalizedQuery = query.trim().toLowerCase();
  const equippedIds = new Set(Object.values(equipment.slots).filter((value): value is string => Boolean(value)));
  const entries: InventoryViewEntry[] = [];
  for (const [index, definition] of itemDefinitions.entries()) {
    if (!matchesDefinition(definition, filters)) continue;
    if (definition.inventoryMode === "stackable") {
      if (filters.equipmentState !== "all" || filters.modification !== "all") continue;
      const quantity = getStackableQuantity(inventory, definition.id);
      if (quantity <= 0) continue;
      const searchText = definitionSearchText(definition);
      if (normalizedQuery && !searchText.includes(normalizedQuery)) continue;
      entries.push({ ref: { kind: "stack", definitionId: definition.id }, definition, quantity, equipped: false, modified: false, sequence: index, searchText });
      continue;
    }
    for (const instance of getItemInstances(inventory).filter((candidate) => candidate.definitionId === definition.id)) {
      const resolved = resolveItemInstance(inventory, instance.id);
      if (!resolved) continue;
      const equipped = equippedIds.has(instance.id);
      const modified = itemInstanceIsModified(instance);
      if (filters.equipmentState === "equipped" && !equipped || filters.equipmentState === "unequipped" && equipped) continue;
      if (filters.modification === "modified" && !modified || filters.modification === "unmodified" && modified) continue;
      const searchText = resolvedSearchText(resolved);
      if (normalizedQuery && !searchText.includes(normalizedQuery)) continue;
      entries.push({ ref: { kind: "instance", instanceId: instance.id }, definition, quantity: 1, instanceId: instance.id, resolved, equipped, equippedSlot: equippedSlotForInstance(equipment, instance.id), modified, sequence: itemInstanceSequence(instance.id), searchText });
    }
  }
  return sortEntries(entries, sort);
}
