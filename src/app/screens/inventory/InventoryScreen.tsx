import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { buildOwnedItemTaxonomyCounts } from "../../../game/presentation/itemTaxonomy";
import { hunterRankForPoints } from "../../../game/progression/hunterRankProgression";
import {
  defaultInventoryFilters,
  inventoryItemTaxonomy,
  inventoryRefsEqual,
  paginateInventoryEntries,
  selectInventoryEntries,
  type InventoryFilters,
  type InventoryPrimaryCategory,
  type InventorySortState,
} from "../../../game/inventory/inventorySelectors";
import {
  loadInventoryManualOrder,
  manualOrderStorageKey,
  normalizeInventoryManualOrder,
  orderInventoryEntriesByManual,
  reorderVisibleInventoryEntries,
  saveInventoryManualOrder,
  serializeInventoryEntryRef,
} from "../../../game/inventory/inventoryManualOrder";
import { useGameStore } from "../../../state/gameStore";
import { ScreenHeading } from "../../shell/ScreenHeading";
import { InventoryCommandBar } from "./InventoryCommandBar";
import { InventoryDetails } from "./InventoryDetails";
import { InventoryGrid } from "./InventoryGrid";
import {
  buildActiveInventoryFilterChips,
  effectiveFiltersForCategory,
  initialSortByCategory,
} from "./inventoryViewState";

const INVENTORY_PAGE_SIZE = 120;

export function InventoryScreen() {
  const game = useGameStore((state) => state.game);
  const selectedRef = useGameStore((state) => state.selectedInventoryEntry);
  const selectEntry = useGameStore((state) => state.selectInventoryEntry);
  const activeProfileId = useGameStore((state) => state.activeProfileId);
  const [category, setCategory] = useState<InventoryPrimaryCategory>("all");
  const [equipmentNodeId, setEquipmentNodeId] = useState("items.equipment");
  const [query, setQuery] = useState("");
  const [sortByCategory, setSortByCategory] = useState(initialSortByCategory);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>(defaultInventoryFilters);
  const [visibleLimit, setVisibleLimit] = useState(INVENTORY_PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);
  const hunterRank = hunterRankForPoints(game.progression.hunterRankPoints);
  const profileId = activeProfileId ?? "profile-1";
  const storageKey = manualOrderStorageKey(profileId);
  const sort = sortByCategory[category];

  const allOwnedEntries = useMemo(
    () => selectInventoryEntries(game.inventory, game.equipment, defaultInventoryFilters, "", { key: "name", direction: "asc" }, { hunterRank }),
    [game.equipment, game.inventory, hunterRank],
  );
  const allOwnedKeys = useMemo(() => allOwnedEntries.map((entry) => serializeInventoryEntryRef(entry.ref)), [allOwnedEntries]);
  const allOwnedKeysToken = allOwnedKeys.join("\0");
  const [manualOrderState, setManualOrderState] = useState(() => ({
    storageKey,
    keys: loadInventoryManualOrder(storageKey, allOwnedKeys),
  }));

  useEffect(() => {
    setManualOrderState({ storageKey, keys: loadInventoryManualOrder(storageKey, allOwnedKeys) });
  }, [storageKey]);

  useEffect(() => {
    setManualOrderState((current) => {
      if (current.storageKey !== storageKey) return current;
      const keys = normalizeInventoryManualOrder({ version: 1, keys: current.keys }, allOwnedKeys);
      return keys.join("\0") === current.keys.join("\0") ? current : { storageKey, keys };
    });
  }, [allOwnedKeysToken, storageKey]);

  useEffect(() => {
    if (manualOrderState.storageKey === storageKey) saveInventoryManualOrder(storageKey, manualOrderState.keys);
  }, [manualOrderState, storageKey]);

  const effectiveFilters = useMemo(
    () => ({ ...effectiveFiltersForCategory(category, filters), category, nodeId: category === "equipment" ? equipmentNodeId : undefined }),
    [category, equipmentNodeId, filters],
  );
  const filteredEntries = useMemo(
    () => selectInventoryEntries(game.inventory, game.equipment, effectiveFilters, deferredQuery, sort, { hunterRank }),
    [deferredQuery, effectiveFilters, game.equipment, game.inventory, hunterRank, sort],
  );
  const entries = useMemo(
    () => sort.key === "manual" && manualOrderState.storageKey === storageKey
      ? orderInventoryEntriesByManual(filteredEntries, manualOrderState.keys)
      : filteredEntries,
    [filteredEntries, manualOrderState, sort.key, storageKey],
  );
  const visibleEntries = paginateInventoryEntries(entries, visibleLimit);
  const selected = entries.find((entry) => inventoryRefsEqual(entry.ref, selectedRef)) ?? entries[0];
  const ownedCounts = useMemo(() => buildOwnedItemTaxonomyCounts(game.inventory, inventoryItemTaxonomy), [game.inventory]);
  const equipmentFiltersApply = category === "all" || category === "equipment";
  const activeFilterCount = [
    filters.rarity !== "all",
    equipmentFiltersApply && filters.equipmentState !== "all",
    equipmentFiltersApply && filters.modification !== "all",
    equipmentFiltersApply && filters.availability !== "all",
  ].filter(Boolean).length;
  const activeFilterChips = buildActiveInventoryFilterChips(category, filters);

  useEffect(() => {
    setVisibleLimit(INVENTORY_PAGE_SIZE);
  }, [category, equipmentNodeId, filters.availability, filters.equipmentState, filters.modification, filters.rarity, query, sort.key, sort.direction]);

  useEffect(() => {
    if (!selected || inventoryRefsEqual(selected.ref, selectedRef)) return;
    selectEntry(selected.ref);
  }, [selected, selectedRef, selectEntry]);

  const clearFilters = () => setFilters(defaultInventoryFilters);
  const removeFilter = (key: keyof Pick<InventoryFilters, "rarity" | "equipmentState" | "modification" | "availability">) => setFilters({ ...filters, [key]: "all" });
  const changeSort = (next: InventorySortState) => setSortByCategory((current) => ({ ...current, [category]: next }));
  const resetManualOrder = () => setManualOrderState({ storageKey, keys: [...allOwnedKeys] });
  const reorder = (draggedKey: string, targetKey: string, placement: "before" | "after") => {
    setManualOrderState((current) => current.storageKey !== storageKey ? current : {
      storageKey,
      keys: reorderVisibleInventoryEntries(current.keys, visibleEntries.map((entry) => serializeInventoryEntryRef(entry.ref)), draggedKey, targetKey, placement),
    });
  };

  return <div className="screen inventory-screen" data-debug-screen="inventory">
    <ScreenHeading screen="inventory" />
    <div className="inventory-workspace" data-debug-kind="inventory-workspace">
      <InventoryCommandBar
        category={category}
        equipmentNodeId={equipmentNodeId}
        ownedCounts={ownedCounts}
        query={query}
        sort={sort}
        filters={filters}
        filtersOpen={filtersOpen}
        activeFilterCount={activeFilterCount}
        activeFilterChips={activeFilterChips}
        onCategoryChange={setCategory}
        onEquipmentNodeChange={setEquipmentNodeId}
        onQueryChange={setQuery}
        onSortChange={changeSort}
        onToggleFilters={() => setFiltersOpen((value) => !value)}
        onSetFilters={setFilters}
        onRemoveFilter={removeFilter}
        onClearFilters={clearFilters}
        onResetManualOrder={resetManualOrder}
      />
      <div className="inventory-workspace-body">
        <div data-ui-panel="inventoryBank">
          <InventoryGrid
            entries={entries}
            visibleEntries={visibleEntries}
            visibleLimit={visibleLimit}
            query={query}
            activeFilterCount={activeFilterCount}
            showSummary={Boolean(query.trim() || activeFilterCount)}
            hunterRank={hunterRank}
            manualMode={sort.key === "manual"}
            selectedRef={selectedRef}
            onSelect={(entry) => selectEntry(entry.ref)}
            onReorder={reorder}
            onShowMore={() => setVisibleLimit((limit) => Math.min(entries.length, limit + INVENTORY_PAGE_SIZE))}
            onClearFilters={clearFilters}
          />
        </div>
        <InventoryDetails entry={selected} game={game} />
      </div>
    </div>
  </div>;
}
