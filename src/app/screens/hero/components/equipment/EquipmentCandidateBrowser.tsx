import { ArrowDownAZ, ArrowUpAZ, Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import { buildItemInstanceSearchText, itemInstanceIsModified } from "../../../../../game/presentation/itemPresentation";
import { itemInstanceSequence, type InventoryEntryRef } from "../../../../../game/items/itemTypes";
import { inventorySortOptions, sortDirectionLabel, sortInventoryEntries, type InventorySortState } from "../../../../../game/inventory/inventorySorting";
import { SearchField } from "../../../../components/SearchField";
import { InventoryFiltersPopover } from "../../../inventory/InventoryFiltersPopover";
import type { InventoryFilters } from "../../../../../game/inventory/inventorySelectors";
import { EquipmentCandidateCard, type EquipmentCandidateModel } from "./EquipmentCandidateCard";
import type { EquipmentSlotId } from "../../../../../game/equipment/equipmentTypes";

const defaultFilters: InventoryFilters = { category: "equipment", rarity: "all", equipmentState: "all", availability: "all", modification: "all" };
const defaultSort: InventorySortState = { key: "name", direction: "asc" };
const candidateSortOptions = inventorySortOptions("equipment").filter((option) => option.value !== "manual");

export function EquipmentCandidateBrowser({ models, slotId, hunterRank, totalCount, pinned, hovered, onSelect, onHover, onLeave }: {
  models: readonly EquipmentCandidateModel[];
  slotId: EquipmentSlotId;
  hunterRank: number;
  totalCount: number;
  pinned: { slotId: EquipmentSlotId; instanceId: string } | null;
  hovered: { slotId: EquipmentSlotId; instanceId: string } | null;
  onSelect: (instanceId: string) => void;
  onHover: (instanceId: string) => void;
  onLeave: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<InventorySortState>(defaultSort);
  const [filters, setFilters] = useState<InventoryFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = models.filter((model) => {
      const { entry } = model;
      if (filters.rarity !== "all" && entry.definition.rarity !== filters.rarity) return false;
      if (filters.availability === "usable" && (model.hunterRankLocked || model.proficiencyLocked)) return false;
      if (filters.availability === "locked" && !model.hunterRankLocked && !model.proficiencyLocked) return false;
      const modified = itemInstanceIsModified(entry.instance);
      if (filters.modification === "modified" && !modified) return false;
      if (filters.modification === "unmodified" && modified) return false;
      if (filters.modification === "upgraded" && (entry.instance.unlockedUpgradeNodeIds?.length ?? 0) === 0) return false;
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
    return sortInventoryEntries(sortable, sort).map((entry) => entry.model);
  }, [filters, models, query, sort]);

  const activeFilterChips = [
    filters.rarity !== "all" ? { key: "rarity", label: filters.rarity[0].toUpperCase() + filters.rarity.slice(1) } : undefined,
    filters.availability !== "all" ? { key: "availability", label: filters.availability === "usable" ? "Can Equip Now" : "Locked" } : undefined,
    filters.modification !== "all" ? { key: "modification", label: ({ modified: "Modified", unmodified: "Unmodified", upgraded: "Has Upgrade Nodes" } as Record<string, string>)[filters.modification] ?? filters.modification } : undefined,
  ].filter((chip): chip is { key: "rarity" | "availability" | "modification"; label: string } => Boolean(chip));
  const clearFilters = () => setFilters(defaultFilters);
  const removeFilter = (key: "rarity" | "availability" | "modification") => setFilters((current) => ({ ...current, [key]: "all" }));
  const changeSort = (key: InventorySortState["key"]) => setSort({ key, direction: key === "name" ? "asc" : "desc" });
  return (
    <section className="equipment-candidate-browser" data-debug-kind="equipment-candidate-browser" data-debug-visible-count={filteredModels.length}>
      <div className="equipment-candidate-browser-header"><div><span className="tiny-label">AVAILABLE</span><strong>{filteredModels.length} available</strong></div><span className="equipment-available-total">{totalCount} compatible</span></div>
      <div className="equipment-candidate-controls">
        <SearchField value={query} onChange={setQuery} placeholder="Search available items" label="Search compatible equipment" debugKind="equipment-candidate-search" />
        <div className="equipment-candidate-secondary-controls">
          <label className="equipment-sort-control"><span>Sort</span><select value={sort.key} onChange={(event) => changeSort(event.target.value as InventorySortState["key"])} data-debug-kind="equipment-candidate-sort" title="Sort available equipment">{candidateSortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <button type="button" className="equipment-sort-direction" onClick={() => setSort((current) => ({ ...current, direction: current.direction === "asc" ? "desc" : "asc" }))} aria-label={`Change candidate sort direction (${sortDirectionLabel(sort)})`} title={sortDirectionLabel(sort)} data-debug-kind="equipment-candidate-sort-direction">{sort.direction === "asc" ? <ArrowDownAZ size={15} /> : <ArrowUpAZ size={15} />}</button>
          <button type="button" className="button button-ghost button-small equipment-filter-button" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen} aria-controls="equipment-candidate-filters" data-debug-kind="equipment-candidate-filters"><Filter size={14} />Filters{activeFilterChips.length > 0 && <span className="equipment-active-filter-count">{activeFilterChips.length}</span>}</button>
        </div>
      </div>
      {filtersOpen && <InventoryFiltersPopover id="equipment-candidate-filters" category="equipment" filters={filters} setFilters={setFilters} showEquipmentState={false} />}
      {activeFilterChips.length > 0 && <div className="equipment-active-filter-chips" aria-label="Active equipment filters">{activeFilterChips.map((chip) => <button type="button" key={chip.key} className="equipment-filter-chip" onClick={() => removeFilter(chip.key)} aria-label={`Remove ${chip.label} filter`}>{chip.label} <span aria-hidden="true">x</span></button>)}<button type="button" className="equipment-filter-chip is-clear" onClick={clearFilters}><X size={12} />Clear</button></div>}
      <div className="hero-equipment-candidate-grid" data-debug-kind="equipment-candidate-grid">
        {filteredModels.length ? filteredModels.map((model) => <EquipmentCandidateCard key={model.entry.instance.id} model={model} slotId={slotId} selected={pinned?.slotId === slotId && pinned.instanceId === model.entry.instance.id} hovered={hovered?.slotId === slotId && hovered.instanceId === model.entry.instance.id} hunterRank={hunterRank} onSelect={() => onSelect(model.entry.instance.id)} onHover={() => onHover(model.entry.instance.id)} onLeave={onLeave} />) : <p className="hero-equipment-empty-copy">{models.length ? "No alternatives match current filters." : "No compatible alternatives."}</p>}
      </div>
    </section>
  );
}
