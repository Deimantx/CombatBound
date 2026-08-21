import type { InventoryFilters, InventoryPrimaryCategory, InventorySortState } from "../../../game/inventory/inventorySelectors";
import type { ActiveInventoryFilterChip } from "./InventoryCommandBar";

export const primaryCategories = ["all", "equipment", "consumables", "materials", "currency"] as const;
export const primaryLabels: Record<InventoryPrimaryCategory, string> = { all: "All", equipment: "Equipment", consumables: "Consumables", materials: "Materials", currency: "Currency" };
export const initialSortByCategory: Record<InventoryPrimaryCategory, InventorySortState> = {
  all: { key: "name", direction: "asc" }, equipment: { key: "name", direction: "asc" }, consumables: { key: "name", direction: "asc" }, materials: { key: "name", direction: "asc" }, currency: { key: "name", direction: "asc" },
};

export function effectiveFiltersForCategory(category: InventoryPrimaryCategory, storedFilters: InventoryFilters): InventoryFilters {
  if (category === "consumables" || category === "materials" || category === "currency") return { ...storedFilters, equipmentState: "all", modification: "all", availability: "all" };
  return storedFilters;
}

export function buildActiveInventoryFilterChips(category: InventoryPrimaryCategory, filters: InventoryFilters): ActiveInventoryFilterChip[] {
  const equipmentFiltersApply = category === "all" || category === "equipment";
  return [
    filters.rarity !== "all" ? { key: "rarity" as const, label: filters.rarity[0].toUpperCase() + filters.rarity.slice(1) } : undefined,
    equipmentFiltersApply && filters.equipmentState !== "all" ? { key: "equipmentState" as const, label: filters.equipmentState === "equipped" ? "Equipped" : "Unequipped" } : undefined,
    equipmentFiltersApply && filters.modification !== "all" ? { key: "modification" as const, label: ({ modified: "Modified", unmodified: "Unmodified", upgraded: "Has Upgrade Nodes" } as Record<string, string>)[filters.modification] ?? filters.modification } : undefined,
    equipmentFiltersApply && filters.availability !== "all" ? { key: "availability" as const, label: filters.availability === "usable" ? "Can Equip Now" : "Locked" } : undefined,
  ].filter((chip): chip is ActiveInventoryFilterChip => Boolean(chip));
}
