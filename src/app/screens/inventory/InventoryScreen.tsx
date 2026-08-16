import { Backpack, Filter, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { previewInventoryEquipmentChange } from "../../../game/inventory/inventoryPreview";
import { EQUIPMENT_SLOT_DEFINITIONS, getEquipmentSlotDefinition, type EquipmentSlotId } from "../../../game/equipment/equipmentTypes";
import { masteryLevelForXp } from "../../../game/progression/masteryProgression";
import { buildItemPresentation, buildStackableItemPresentation } from "../../../game/presentation/itemPresentation";
import { buildOwnedItemTaxonomyCounts } from "../../../game/presentation/itemTaxonomy";
import { formatItemStats } from "../../../game/presentation/statFormatting";
import { buildItemTooltip, buildPlayerItemInstanceTooltip } from "../../../game/presentation/tooltipBuilders";
import { chooseEquipmentTargetSlot, defaultInventoryFilters, inventoryItemTaxonomy, inventoryRefsEqual, paginateInventoryEntries, selectInventoryEntries, type InventoryFilters, type InventoryPrimaryCategory, type InventorySort, type InventoryViewEntry } from "../../../game/inventory/inventorySelectors";
import { useGameStore } from "../../../state/gameStore";
import { DisclosureChevron } from "../../components/DisclosureChevron";
import { GameTooltip } from "../../components/tooltip/GameTooltip";
import { Panel } from "../../components/Panel";
import { PlaceholderArt } from "../../components/PlaceholderArt";
import { SearchField } from "../../components/SearchField";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { ScreenHeading } from "../../shell/ScreenHeading";
import { InventoryBrowseControl } from "./InventoryBrowseControl";
import { InventoryCard } from "./InventoryCard";

const INVENTORY_PAGE_SIZE = 120;
const primaryCategories = ["all", "equipment", "consumables", "materials", "currency"] as const;
const primaryLabels: Record<InventoryPrimaryCategory, string> = { all: "All", equipment: "Equipment", consumables: "Consumables", materials: "Materials", currency: "Currency" };
const allSortOptions: Array<{ value: InventorySort; label: string }> = [
  { value: "name", label: "Name" }, { value: "rarity", label: "Rarity" }, { value: "mastery", label: "Mastery Requirement" },
  { value: "quality", label: "Quality" }, { value: "upgrade", label: "Upgrade Level" }, { value: "recent", label: "Recently Acquired" }, { value: "quantity", label: "Quantity" },
];
const equipmentSortOptions = allSortOptions.filter((option) => option.value !== "quantity");
const stackableSortOptions = allSortOptions.filter((option) => !["mastery", "quality", "upgrade"].includes(option.value));

export function InventoryScreen() {
  const game = useGameStore((state) => state.game);
  const selectedRef = useGameStore((state) => state.selectedInventoryEntry);
  const selectEntry = useGameStore((state) => state.selectInventoryEntry);
  const [category, setCategory] = useState<InventoryPrimaryCategory>("all");
  const [browseNodeId, setBrowseNodeId] = useState("items.equipment");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<InventorySort>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>(defaultInventoryFilters);
  const [visibleLimit, setVisibleLimit] = useState(INVENTORY_PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);
  const sortOptions = category === "equipment" ? equipmentSortOptions : category === "consumables" || category === "materials" || category === "currency" ? stackableSortOptions : allSortOptions;
  const effectiveFilters = useMemo(() => ({ ...filters, category, nodeId: category === "equipment" ? browseNodeId : undefined }), [browseNodeId, category, filters]);
  const entries = useMemo(() => selectInventoryEntries(game.inventory, game.equipment, effectiveFilters, deferredQuery, sort), [deferredQuery, effectiveFilters, game.equipment, game.inventory, sort]);
  const ownedCounts = useMemo(() => buildOwnedItemTaxonomyCounts(game.inventory, inventoryItemTaxonomy), [game.inventory]);
  const visibleEntries = paginateInventoryEntries(entries, visibleLimit);
  const selected = entries.find((entry) => inventoryRefsEqual(entry.ref, selectedRef)) ?? entries[0];
  const activeFilterCount = [filters.rarity !== "all", filters.equipmentState !== "all", filters.modification !== "all"].filter(Boolean).length;
  const hasResultContext = Boolean(query.trim() || activeFilterCount);

  useEffect(() => {
    setVisibleLimit(INVENTORY_PAGE_SIZE);
  }, [browseNodeId, category, filters.equipmentState, filters.modification, filters.rarity, query, sort]);

  useEffect(() => {
    if (!sortOptions.some((option) => option.value === sort)) setSort("name");
  }, [sort, sortOptions]);

  useEffect(() => {
    if (!selected || inventoryRefsEqual(selected.ref, selectedRef)) return;
    selectEntry(selected.ref);
  }, [selected, selectedRef, selectEntry]);

  const clearAdvancedFilters = () => setFilters(defaultInventoryFilters);
  const changeCategory = (next: InventoryPrimaryCategory) => {
    setCategory(next);
    if (next === "equipment") setBrowseNodeId("items.equipment");
  };

  return <div className="screen inventory-screen" data-debug-screen="inventory">
    <ScreenHeading screen="inventory" />
    <Panel title="Browse Items" icon={Backpack} panelId="inventoryToolbar" screen="inventory" className="inventory-toolbar">
      <div className="inventory-toolbar-row"><SearchField value={query} onChange={setQuery} placeholder="Search names, types, rarity, proficiency, or affixes" label="Search inventory" /><div className="inventory-toolbar-actions"><select className="inventory-sort-select" value={sort} onChange={(event) => setSort(event.target.value as InventorySort)} aria-label="Sort inventory"><option value="">Sort by...</option>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" className="button button-ghost button-small" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen} aria-controls="inventory-filters"><Filter size={14} />Filters{activeFilterCount > 0 && <span className="inventory-active-filter-count">{activeFilterCount}</span>}</button>{query && <button type="button" className="button button-ghost button-small" onClick={() => setQuery("")} aria-label="Clear inventory search"><X size={13} />Clear Search</button>}{activeFilterCount > 0 && <button type="button" className="button button-ghost button-small" onClick={clearAdvancedFilters}><X size={13} />Clear Filters</button>}</div></div>
      <SegmentedTabs items={primaryCategories.map((value) => primaryLabels[value])} active={primaryLabels[category]} onChange={(value) => changeCategory(primaryCategories.find((candidate) => primaryLabels[candidate] === value) ?? "all")} label="Inventory categories" />
      {category === "equipment" && <InventoryBrowseControl nodeId={browseNodeId} inventory={game.inventory} ownedCounts={ownedCounts} onChange={setBrowseNodeId} />}
      {filtersOpen && <InventoryFiltersPopover id="inventory-filters" category={category} filters={filters} setFilters={setFilters} />}
    </Panel>
    <div className="inventory-layout">
      <Panel title="Carried Items" icon={Backpack} panelId="inventoryBank" screen="inventory" className="inventory-bank">
        {hasResultContext && <div className="inventory-summary"><span><strong>{entries.length}</strong> results</span>{visibleLimit < entries.length && <span>Showing {visibleEntries.length} of {entries.length}</span>}</div>}
        {entries.length ? <><div className="inventory-grid">{visibleEntries.map((entry) => <InventoryCard key={entry.instanceId ?? entry.definition.id} entry={entry} selected={Boolean(selected && inventoryRefsEqual(selected.ref, entry.ref))} onSelect={() => selectEntry(entry.ref)} />)}</div>{visibleLimit < entries.length && <div className="inventory-list-footer"><span>Showing {visibleEntries.length} of {entries.length}</span><button type="button" className="button button-ghost button-small" onClick={() => setVisibleLimit((limit) => Math.min(entries.length, limit + INVENTORY_PAGE_SIZE))}>Show More</button></div>}</> : <InventoryEmptyState query={query} activeFilterCount={activeFilterCount} onClear={clearAdvancedFilters} />}
      </Panel>
      <InventoryDetails entry={selected} game={game} />
    </div>
  </div>;
}

function InventoryFiltersPopover({ id, category, filters, setFilters }: { id: string; category: InventoryPrimaryCategory; filters: InventoryFilters; setFilters: (filters: InventoryFilters) => void }) {
  const showEquipmentState = category === "all" || category === "equipment";
  return <div id={id} className="inventory-filter-popover" data-debug-kind="inventory-filter-popover"><label>Rarity<select value={filters.rarity} onChange={(event) => setFilters({ ...filters, rarity: event.target.value as InventoryFilters["rarity"] })}><option value="all">All rarities</option><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option></select></label>{showEquipmentState && <label>Equipment state<select value={filters.equipmentState} onChange={(event) => setFilters({ ...filters, equipmentState: event.target.value as InventoryFilters["equipmentState"] })}><option value="all">All equipment</option><option value="equipped">Equipped</option><option value="unequipped">Unequipped</option></select></label>}{showEquipmentState && <label>Modification<select value={filters.modification} onChange={(event) => setFilters({ ...filters, modification: event.target.value as InventoryFilters["modification"] })}><option value="all">Modified or unmodified</option><option value="modified">Modified only</option><option value="unmodified">Unmodified only</option></select></label>}</div>;
}

function InventoryEmptyState({ query, activeFilterCount, onClear }: { query: string; activeFilterCount: number; onClear: () => void }) {
  const filtered = Boolean(query || activeFilterCount);
  return <div className="inventory-empty-state"><strong>{filtered ? "No items match these filters" : "Your inventory is empty"}</strong><span>{filtered ? "Try a different search or clear the active filters." : "Rewards and owned items will appear here."}</span>{activeFilterCount > 0 && <button type="button" className="button button-ghost button-small" onClick={onClear}>Clear Filters</button>}</div>;
}

function InventoryDetails({ entry, game }: { entry?: InventoryViewEntry; game: ReturnType<typeof useGameStore.getState>["game"] }) {
  const equipItem = useGameStore((state) => state.equipItemInstance);
  const [baseOpen, setBaseOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<EquipmentSlotId | undefined>();
  if (!entry) return <Panel title="Item Details" icon={SlidersHorizontal} panelId="inventoryDetails" screen="inventory" className="inventory-details"><div className="inventory-empty-state"><strong>Select an item</strong><span>Choose an item card to inspect it.</span></div></Panel>;

  const resolved = entry.resolved;
  const presentation = resolved ? buildItemPresentation(resolved, { equipped: entry.equipped, includeBaseStats: baseOpen }) : buildStackableItemPresentation(entry.definition, entry.quantity);
  const tooltip = resolved ? buildPlayerItemInstanceTooltip(resolved, { equipped: entry.equipped }) : buildItemTooltip(entry.definition, { quantity: entry.quantity });
  const masteryLevel = masteryLevelForXp(game.progression.masteryXp);
  const combatLocked = game.combat.phase === "active" || game.combat.phase === "recovery";
  const slotTargets = resolved?.definition.equipmentSlotKind ? EQUIPMENT_SLOT_DEFINITIONS.filter((slot) => slot.kind === resolved.definition.equipmentSlotKind) : [];
  const automaticSlot = resolved ? chooseEquipmentTargetSlot(slotTargets, game.equipment, resolved.instance.id) : undefined;
  const chosenSlot = targetSlot && slotTargets.some((slot) => slot.id === targetSlot) ? targetSlot : automaticSlot;
  const equipmentPreview = resolved && chosenSlot ? previewInventoryEquipmentChange(game, resolved.instance.id, chosenSlot) : undefined;
  const validation = equipmentPreview?.validation;
  const currentSlot = entry.equipped ? entry.equippedSlot as EquipmentSlotId | undefined : undefined;
  const isCurrent = Boolean(currentSlot && chosenSlot === currentSlot);
  const isMoving = Boolean(currentSlot && chosenSlot && chosenSlot !== currentSlot);
  const meaningfulComparison = equipmentPreview?.comparison ?? [];
  const equip = () => { if (!resolved || !chosenSlot || !validation?.valid || combatLocked || isCurrent) return; equipItem(resolved.instance.id, chosenSlot); };

  return <Panel title="Item Details" icon={SlidersHorizontal} panelId="inventoryDetails" screen="inventory" className="inventory-details">
    <GameTooltip content={tooltip}><div className="detail-item-head" data-debug-kind="tooltip-trigger" data-debug-item-id={entry.definition.id} data-debug-instance-id={entry.instanceId}><PlaceholderArt icon={entry.definition.icon} label={entry.definition.name} size="large" variant={entry.definition.rarity === "rare" ? "gold" : entry.definition.rarity === "uncommon" ? "blue" : "muted"} /><div><span className="tiny-label">{(presentation.slotLabel ?? presentation.typeLabel).toUpperCase()}</span><h3>{presentation.name}</h3><p>{presentation.rarity}</p></div></div></GameTooltip>
    <div className="detail-badge-row">{entry.equipped && <span className="detail-badge is-equipped">Equipped · {currentSlot ? getEquipmentSlotDefinition(currentSlot).label : ""}</span>}{presentation.masteryRequirement !== undefined && <span className={`detail-badge ${masteryLevel >= presentation.masteryRequirement ? "is-equipped" : ""}`}>Mastery {presentation.masteryRequirement}</span>}</div>
    <p className="detail-description">{entry.definition.description}</p>
    {resolved ? <>
      <div className="detail-summary-grid">{presentation.modified ? <><span className="detail-badge">Quality {resolved.instance.quality}%</span><span className="detail-badge">Upgrade +{resolved.instance.upgradeLevel}</span><span className="detail-badge">{resolved.instance.affixes.length} modifier{resolved.instance.affixes.length === 1 ? "" : "s"}</span></> : <span className="detail-badge">Unmodified</span>}</div>
      <DetailSection title="Modifiers">{presentation.modifiers.length ? <div className="detail-modifier-list">{presentation.modifiers.map((modifier) => <div key={modifier.id}><span>{modifier.kind ? `${modifier.kind === "prefix" ? "Prefix" : "Suffix"} · ` : ""}{modifier.label}{modifier.tier ? ` (T${modifier.tier})` : ""}</span><strong>{modifier.value}</strong></div>)}</div> : <span className="detail-muted">No modifications.</span>}</DetailSection>
      <DetailSection title="Item stats"><div className="detail-stat-list">{formatItemStats(resolved.effectiveStats).map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div></DetailSection>
      <button type="button" className="inventory-disclosure-toggle" onClick={() => setBaseOpen((value) => !value)} aria-expanded={baseOpen}><DisclosureChevron open={baseOpen} />{baseOpen ? "Hide base stats" : "Show base stats"}</button>
      {baseOpen && <div className="detail-stat-list">{formatItemStats(resolved.baseStats).map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>}
      {slotTargets.length > 0 && <>
        <DetailSection title="Equip"><div className="detail-action-row">{slotTargets.length === 1 ? <span className="detail-badge">Target: {slotTargets[0].label}{currentSlot === slotTargets[0].id ? " ✓" : ""}</span> : <div className="inventory-equip-targets" aria-label="Choose equipment target">{slotTargets.map((slot) => <button type="button" key={slot.id} className={chosenSlot === slot.id ? "is-selected" : ""} onClick={() => setTargetSlot(slot.id)}>{slot.label}{currentSlot === slot.id ? " ✓" : ""}</button>)}</div>}<button type="button" className="button button-primary" disabled={!validation?.valid || combatLocked || isCurrent} onClick={equip}>{isCurrent ? "Equipped" : isMoving && chosenSlot ? `Move to ${getEquipmentSlotDefinition(chosenSlot).label}` : "Equip"}</button></div>{combatLocked && <p className="inventory-lock-note">Stop combat to change equipment.</p>}{validation?.reason === "mastery-level" && <p className="inventory-lock-note">Mastery {entry.definition.requiredMasteryLevel} is required to equip this item.</p>}</DetailSection>
        {meaningfulComparison.length > 0 && <div className="inventory-comparison"><header>BUILD CHANGES · {chosenSlot ? getEquipmentSlotDefinition(chosenSlot).label : ""}</header>{meaningfulComparison.map((row) => <div key={row.key} className={`inventory-comparison-row ${row.tone}`}><span>{row.label}</span><strong><span>{row.before} → {row.after}</span>{row.delta && <em>{row.delta}</em>}</strong></div>)}</div>}
      </>}
    </> : <DetailSection title="Quantity"><div className="detail-stat-list"><div><span>In one stack</span><strong>{entry.quantity.toLocaleString()}</strong></div></div></DetailSection>}
  </Panel>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) { return <section className="detail-section"><header>{title.toUpperCase()}</header>{children}</section>; }
