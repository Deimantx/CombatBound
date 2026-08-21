export type InventorySortKey =
  | "manual"
  | "name"
  | "rarity"
  | "hunter-rank"
  | "upgrade"
  | "acquired"
  | "quantity"
  | "category"
  | (string & {});

export type InventorySortDirection = "asc" | "desc";

export interface InventorySortState {
  key: InventorySortKey;
  direction: InventorySortDirection;
}

export interface InventorySortOption {
  value: InventorySortKey;
  label: string;
}

interface SortableInventoryEntry {
  ref?: import("../items/itemTypes").InventoryEntryRef;
  definition: { id: string; name: string; category: string; rarity: "common" | "uncommon" | "rare"; requiredHunterRank?: number };
  quantity: number;
  resolved?: { instance: { unlockedUpgradeNodeIds?: readonly string[] } };
  sequence: number;
  instanceId?: string;
}

const rarityRank: Record<SortableInventoryEntry["definition"]["rarity"], number> = { common: 1, uncommon: 2, rare: 3 };
const categoryRank: Record<string, number> = { weapon: 1, armor: 1, accessory: 1, consumable: 2, material: 3, currency: 4 };

export function inventorySortOptions(category: "all" | "equipment" | "consumables" | "materials" | "currency"): readonly InventorySortOption[] {
  if (category === "all") return [
    { value: "manual", label: "Manual" },
    { value: "name", label: "Name" },
    { value: "rarity", label: "Rarity" },
    { value: "category", label: "Category" },
  ];
  if (category === "equipment") return [
    { value: "manual", label: "Manual" },
    { value: "name", label: "Name" },
    { value: "rarity", label: "Rarity" },
    { value: "hunter-rank", label: "Hunter Rank" },
    { value: "upgrade", label: "Upgrade Nodes" },
    { value: "acquired", label: "Acquired" },
  ];
  return [
    { value: "manual", label: "Manual" },
    { value: "name", label: "Name" },
    { value: "rarity", label: "Rarity" },
    { value: "quantity", label: "Quantity" },
  ];
}

export function defaultInventorySortDirection(key: InventorySortKey): InventorySortDirection {
  return key === "manual" || key === "name" || key === "category" ? "asc" : "desc";
}

export function sortDirectionLabel(state: InventorySortState) {
  if (state.key === "manual") return "Manual order";
  if (state.key === "name") return state.direction === "asc" ? "A→Z" : "Z→A";
  if (state.key === "acquired") return state.direction === "desc" ? "Newest first" : "Oldest first";
  if (state.key === "category") return state.direction === "asc" ? "A→Z" : "Z→A";
  return state.direction === "desc" ? "Highest first" : "Lowest first";
}

function primaryValue(entry: SortableInventoryEntry, key: InventorySortKey): number | string {
  if (key === "manual") return 0;
  if (key === "name") return entry.definition.name;
  if (key === "category") return categoryRank[entry.definition.category] ?? 99;
  if (key === "rarity") return rarityRank[entry.definition.rarity];
  if (key === "hunter-rank") return entry.definition.requiredHunterRank ?? 0;
  if (key === "upgrade") return entry.resolved?.instance.unlockedUpgradeNodeIds?.length ?? 0;
  if (key === "acquired") return entry.sequence;
  return entry.quantity;
}

function compareValues(left: number | string, right: number | string) {
  return typeof left === "string" && typeof right === "string"
    ? left.localeCompare(right)
    : Number(left) - Number(right);
}

export function sortInventoryEntries<T extends SortableInventoryEntry>(entries: readonly T[], state: InventorySortState = { key: "name", direction: "asc" }) {
  return [...entries].sort((left, right) => {
    const primary = compareValues(primaryValue(left, state.key), primaryValue(right, state.key));
    if (primary) return state.direction === "asc" ? primary : -primary;
    return left.definition.name.localeCompare(right.definition.name)
      || left.sequence - right.sequence
      || left.definition.id.localeCompare(right.definition.id)
      || (left.instanceId ?? "").localeCompare(right.instanceId ?? "");
  });
}
