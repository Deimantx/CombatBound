import { Filter, RotateCcw, X } from "lucide-react";
import { GameTooltip } from "../../components/tooltip/GameTooltip";
import { SearchField } from "../../components/SearchField";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { InventoryCategoryNavigator } from "./InventoryCategoryNavigator";
import { InventoryFiltersPopover } from "./InventoryFiltersPopover";
import type { InventoryFilters, InventoryPrimaryCategory, InventorySortState } from "../../../game/inventory/inventorySelectors";
import { defaultInventorySortDirection, inventorySortOptions, sortDirectionLabel } from "../../../game/inventory/inventorySorting";
import { primaryCategories, primaryLabels } from "./inventoryViewState";

export interface ActiveInventoryFilterChip {
  key: "rarity" | "equipmentState" | "modification" | "availability";
  label: string;
}

interface InventoryCommandBarProps {
  category: InventoryPrimaryCategory;
  equipmentNodeId: string;
  ownedCounts: ReadonlyMap<string, number>;
  query: string;
  sort: InventorySortState;
  filters: InventoryFilters;
  filtersOpen: boolean;
  activeFilterCount: number;
  activeFilterChips: ActiveInventoryFilterChip[];
  onCategoryChange: (category: InventoryPrimaryCategory) => void;
  onEquipmentNodeChange: (nodeId: string) => void;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: InventorySortState) => void;
  onToggleFilters: () => void;
  onSetFilters: (filters: InventoryFilters) => void;
  onRemoveFilter: (key: ActiveInventoryFilterChip["key"]) => void;
  onClearFilters: () => void;
  onResetManualOrder: () => void;
}

export function InventoryCommandBar(props: InventoryCommandBarProps) {
  const options = inventorySortOptions(props.category);
  const directionDescription = props.sort.key === "name" || props.sort.key === "category"
    ? `Sort ${props.sort.direction === "asc" ? "ascending" : "descending"}.`
    : `Sort ${sortDirectionLabel(props.sort)}.`;
  return <div className="inventory-commandbar" data-debug-kind="inventory-commandbar">
    <div className="inventory-toolbar-row"><SearchField value={props.query} onChange={props.onQueryChange} placeholder="Search names, types, rarity, proficiency, or upgrades" label="Search inventory" /><div className="inventory-toolbar-actions">
      <label className="inventory-sort-control"><span>Sort:</span><select className="inventory-sort-select" value={props.sort.key} onChange={(event) => { const key = event.target.value as InventorySortState["key"]; props.onSortChange({ key, direction: defaultInventorySortDirection(key) }); }} aria-label="Sort inventory">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      {props.sort.key === "manual" ? <GameTooltip content={{ id: "inventory-manual-order", title: "Manual order", description: "Drag items to arrange them. Your layout is remembered. Only visible items move; hidden items keep their relative order." }}><button type="button" className="button button-ghost button-small inventory-reset-order" onClick={props.onResetManualOrder} title="Reset manual order"><RotateCcw size={13} />Reset Order</button></GameTooltip> : <GameTooltip content={{ id: "inventory-sort-direction", title: "Sort direction", description: directionDescription }}><button type="button" className="button button-ghost button-small inventory-sort-direction" onClick={() => props.onSortChange({ ...props.sort, direction: props.sort.direction === "asc" ? "desc" : "asc" })} title={`Sort ${props.sort.direction === "asc" ? "descending" : "ascending"}`} aria-label={`Sort ${props.sort.direction === "asc" ? "descending" : "ascending"}`}>{sortDirectionLabel(props.sort)}</button></GameTooltip>}
      <button type="button" className="button button-ghost button-small" onClick={props.onToggleFilters} aria-expanded={props.filtersOpen} aria-controls="inventory-filters"><Filter size={14} />Filters{props.activeFilterCount > 0 && <span className="inventory-active-filter-count">{props.activeFilterCount}</span>}</button>
      {props.query && <button type="button" className="button button-ghost button-small" onClick={() => props.onQueryChange("")} aria-label="Clear inventory search"><X size={13} />Clear Search</button>}
      {props.activeFilterCount > 0 && <button type="button" className="button button-ghost button-small" onClick={props.onClearFilters}><X size={13} />Clear Filters</button>}
    </div></div>
    <SegmentedTabs items={primaryCategories.map((value) => primaryLabels[value])} active={primaryLabels[props.category]} onChange={(value) => props.onCategoryChange(primaryCategories.find((candidate) => primaryLabels[candidate] === value) ?? "all")} label="Inventory categories" />
    {props.category === "equipment" && <InventoryCategoryNavigator nodeId={props.equipmentNodeId} ownedCounts={props.ownedCounts} onChange={props.onEquipmentNodeChange} />}
    {props.filtersOpen && <InventoryFiltersPopover id="inventory-filters" category={props.category} filters={props.filters} setFilters={props.onSetFilters} />}
    {props.activeFilterChips.length > 0 && <div className="inventory-active-filter-chips" aria-label="Active inventory filters">{props.activeFilterChips.map((chip) => <button type="button" key={chip.key} className="inventory-filter-chip" onClick={() => props.onRemoveFilter(chip.key)} aria-label={`Remove ${chip.label} filter`}>{chip.label} <span aria-hidden="true">x</span></button>)}{props.activeFilterChips.length >= 2 && <button type="button" className="inventory-filter-chip is-clear" onClick={props.onClearFilters}>Clear All</button>}</div>}
  </div>;
}
