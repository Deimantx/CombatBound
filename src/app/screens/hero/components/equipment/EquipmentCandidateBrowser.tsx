import { ArrowDownAZ, ArrowUpAZ, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { buildItemInstanceSearchText, itemInstanceIsModified } from "../../../../../game/presentation/itemPresentation";
import { itemInstanceSequence, type InventoryEntryRef } from "../../../../../game/items/itemTypes";
import { inventorySortOptions, sortDirectionLabel, sortInventoryEntries, type InventorySortState } from "../../../../../game/inventory/inventorySorting";
import { loadInventoryManualOrder, manualOrderStorageKey, orderInventoryEntriesByManual, serializeInventoryEntryRef } from "../../../../../game/inventory/inventoryManualOrder";
import { SearchField } from "../../../../components/SearchField";
import { EquipmentCandidateCard, type EquipmentCandidateModel } from "./EquipmentCandidateCard";
import type { EquipmentSlotId } from "../../../../../game/equipment/equipmentTypes";

type CandidateFilters = {
  rarity: "all" | "common" | "uncommon" | "rare";
  availability: "all" | "usable" | "locked";
  modification: "all" | "modified" | "unmodified" | "affixed" | "upgraded" | "quality";
};

const defaultFilters: CandidateFilters = { rarity: "all", availability: "all", modification: "all" };
const defaultSort: InventorySortState = { key: "name", direction: "asc" };

export function EquipmentCandidateBrowser({ models, slotId, masteryLevel, activeProfileId, pinned, hovered, onSelect, onHover, onLeave }: {
  models: readonly EquipmentCandidateModel[];
  slotId: EquipmentSlotId;
  masteryLevel: number;
  activeProfileId: string | null;
  pinned: { slotId: EquipmentSlotId; instanceId: string } | null;
  hovered: { slotId: EquipmentSlotId; instanceId: string } | null;
  onSelect: (instanceId: string) => void;
  onHover: (instanceId: string) => void;
  onLeave: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<InventorySortState>(defaultSort);
  const [filters, setFilters] = useState<CandidateFilters>(defaultFilters);
  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = models.filter((model) => {
      const { entry } = model;
      if (filters.rarity !== "all" && entry.definition.rarity !== filters.rarity) return false;
      if (filters.availability === "usable" && model.masteryLocked) return false;
      if (filters.availability === "locked" && !model.masteryLocked) return false;
      const modified = itemInstanceIsModified(entry.instance);
      if (filters.modification === "modified" && !modified) return false;
      if (filters.modification === "unmodified" && modified) return false;
      if (filters.modification === "affixed" && entry.instance.affixes.length === 0) return false;
      if (filters.modification === "upgraded" && entry.instance.upgradeLevel <= 0) return false;
      if (filters.modification === "quality" && entry.instance.quality <= 0) return false;
      return !normalizedQuery || buildItemInstanceSearchText(entry).includes(normalizedQuery);
    });
    const sortable = filtered.map((model) => ({
      model,
      ref: { kind: "instance", instanceId: model.entry.instance.id } as InventoryEntryRef,
      definition: model.entry.definition,
      quantity: 1,
      resolved: model.entry,
      sequence: itemInstanceSequence(model.entry.instance.id),
      instanceId: model.entry.instance.id,
    }));
    if (sort.key === "manual") {
      const storageKey = manualOrderStorageKey(activeProfileId ?? "profile-1");
      const ownedKeys = models.map((model) => serializeInventoryEntryRef({ kind: "instance", instanceId: model.entry.instance.id }));
      const order = loadInventoryManualOrder(storageKey, ownedKeys);
      return orderInventoryEntriesByManual(sortable, order).map((entry) => entry.model);
    }
    return sortInventoryEntries(sortable, sort).map((entry) => entry.model);
  }, [activeProfileId, filters, models, query, sort]);

  const updateFilter = <K extends keyof CandidateFilters>(key: K, value: CandidateFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const changeSort = (key: InventorySortState["key"]) => setSort({ key, direction: key === "manual" || key === "name" ? "asc" : "desc" });
  return (
    <section className="equipment-candidate-browser" data-debug-kind="equipment-candidate-browser" data-debug-visible-count={filteredModels.length}>
      <div className="equipment-candidate-browser-header"><div><span className="tiny-label">COMPATIBLE CANDIDATES</span><strong>{filteredModels.length} / {models.length} owned instances</strong></div><SlidersHorizontal size={15} aria-hidden="true" /></div>
      <div className="equipment-candidate-controls">
        <SearchField value={query} onChange={setQuery} placeholder="Search compatible items" label="Search compatible equipment" debugKind="equipment-candidate-search" />
        <label className="equipment-sort-control"><span className="sr-only">Sort candidates</span><select value={sort.key} onChange={(event) => changeSort(event.target.value as InventorySortState["key"])} data-debug-kind="equipment-candidate-sort" title="Sort compatible equipment">{inventorySortOptions("equipment").map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <button type="button" className="equipment-sort-direction" onClick={() => setSort((current) => ({ ...current, direction: current.direction === "asc" ? "desc" : "asc" }))} aria-label={`Change candidate sort direction (${sortDirectionLabel(sort)})`} title={sortDirectionLabel(sort)} data-debug-kind="equipment-candidate-sort-direction">{sort.direction === "asc" ? <ArrowDownAZ size={15} /> : <ArrowUpAZ size={15} />}</button>
        <label className="equipment-filter-control"><span className="sr-only">Rarity filter</span><select value={filters.rarity} onChange={(event) => updateFilter("rarity", event.target.value as CandidateFilters["rarity"])} title="Filter by rarity" data-debug-filter="rarity"><option value="all">All rarities</option><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option></select></label>
        <label className="equipment-filter-control"><span className="sr-only">Availability filter</span><select value={filters.availability} onChange={(event) => updateFilter("availability", event.target.value as CandidateFilters["availability"])} title="Filter by mastery availability" data-debug-filter="availability"><option value="all">All mastery</option><option value="usable">Usable now</option><option value="locked">Mastery locked</option></select></label>
        <label className="equipment-filter-control"><span className="sr-only">Modification filter</span><select value={filters.modification} onChange={(event) => updateFilter("modification", event.target.value as CandidateFilters["modification"])} title="Filter by item modification" data-debug-filter="modification"><option value="all">All modifications</option><option value="modified">Modified</option><option value="unmodified">Unmodified</option><option value="affixed">Affixed</option><option value="upgraded">Upgraded</option><option value="quality">Quality</option></select></label>
      </div>
      <div className="hero-equipment-candidate-grid" data-debug-kind="equipment-candidate-grid">
        {filteredModels.length ? filteredModels.map((model) => <EquipmentCandidateCard key={model.entry.instance.id} model={model} slotId={slotId} selected={pinned?.slotId === slotId && pinned.instanceId === model.entry.instance.id} hovered={hovered?.slotId === slotId && hovered.instanceId === model.entry.instance.id} masteryLevel={masteryLevel} onSelect={() => onSelect(model.entry.instance.id)} onHover={() => onHover(model.entry.instance.id)} onLeave={onLeave} />) : <p className="hero-equipment-empty-copy">No compatible owned items match these controls.</p>}
      </div>
    </section>
  );
}
