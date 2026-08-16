import { Backpack, ChevronRight, Filter, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { itemDefinitions } from "../../../game/data/items";
import { previewInventoryEquipmentChange } from "../../../game/inventory/inventoryPreview";
import { EQUIPMENT_SLOT_DEFINITIONS, getEquipmentSlotDefinition, type EquipmentSlotId } from "../../../game/equipment/equipmentTypes";
import { masteryLevelForXp } from "../../../game/progression/masteryProgression";
import { buildItemPresentation, buildStackableItemPresentation, itemInstanceIsModified } from "../../../game/presentation/itemPresentation";
import { buildItemTaxonomy, countOwnedEntriesUnderNode, findItemTaxonomyNode, getItemTaxonomyPath } from "../../../game/presentation/itemTaxonomy";
import { formatItemStats } from "../../../game/presentation/statFormatting";
import { buildItemTooltip, buildPlayerItemInstanceTooltip } from "../../../game/presentation/tooltipBuilders";
import { chooseEquipmentTargetSlot, defaultInventoryFilters, inventoryRefsEqual, paginateInventoryEntries, selectInventoryEntries, type InventoryFilters, type InventoryPrimaryCategory, type InventorySort, type InventoryViewEntry } from "../../../game/inventory/inventorySelectors";
import { useGameStore } from "../../../state/gameStore";
import { DisclosureChevron } from "../../components/DisclosureChevron";
import { GameTooltip } from "../../components/tooltip/GameTooltip";
import { Panel } from "../../components/Panel";
import { PlaceholderArt } from "../../components/PlaceholderArt";
import { SearchField } from "../../components/SearchField";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { ScreenHeading } from "../../shell/ScreenHeading";

const INVENTORY_PAGE_SIZE = 120;
const primaryCategories = ["all", "equipment", "consumables", "materials", "currency"] as const;
const primaryLabels: Record<InventoryPrimaryCategory, string> = { all: "All", equipment: "Equipment", consumables: "Consumables", materials: "Materials", currency: "Currency" };
const sortOptions: Array<{ value: InventorySort; label: string }> = [
  { value: "name", label: "Name" }, { value: "rarity", label: "Rarity" }, { value: "mastery", label: "Mastery Requirement" },
  { value: "quality", label: "Quality" }, { value: "upgrade", label: "Upgrade Level" }, { value: "recent", label: "Recently Acquired" }, { value: "quantity", label: "Quantity" },
];
const inventoryTaxonomy = buildItemTaxonomy(itemDefinitions);

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
  const effectiveFilters = useMemo(() => ({ ...filters, category, nodeId: category === "equipment" ? browseNodeId : undefined }), [browseNodeId, category, filters]);
  const entries = useMemo(() => selectInventoryEntries(game.inventory, game.equipment, effectiveFilters, deferredQuery, sort), [deferredQuery, effectiveFilters, game.equipment, game.inventory, sort]);
  const visibleEntries = paginateInventoryEntries(entries, visibleLimit);
  const selected = entries.find((entry) => inventoryRefsEqual(entry.ref, selectedRef)) ?? entries[0];
  const activeFilterCount = [filters.rarity !== "all", filters.equipmentState !== "all", filters.modification !== "all"].filter(Boolean).length;
  const hasBrowseContext = category === "equipment" && browseNodeId !== "items.equipment";
  const hasResultContext = Boolean(query.trim() || activeFilterCount || category !== "all" || hasBrowseContext);

  useEffect(() => {
    setVisibleLimit(INVENTORY_PAGE_SIZE);
  }, [browseNodeId, category, filters.equipmentState, filters.modification, filters.rarity, query, sort]);

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
      {category === "equipment" && <InventoryBrowseControl nodeId={browseNodeId} onChange={setBrowseNodeId} />}
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

function InventoryBrowseControl({ nodeId, onChange }: { nodeId: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const node = findItemTaxonomyNode(inventoryTaxonomy, nodeId) ?? inventoryTaxonomy;
  const path = getItemTaxonomyPath(inventoryTaxonomy, node.id).slice(1);
  return <div className="inventory-browse-control"><div className="inventory-breadcrumb" aria-label="Equipment browse path">{path.map((part, index) => <span key={part.id}><button type="button" onClick={() => onChange(part.id)}>{part.label}</button>{index < path.length - 1 && <ChevronRight size={12} aria-hidden="true" />}</span>)}</div><button type="button" className="button button-ghost button-small inventory-browse-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="inventory-browse-menu">Browse<ChevronRight size={13} className={open ? "is-open" : ""} /></button>{open && <div id="inventory-browse-menu" className="inventory-browse-menu"><strong>Browse equipment</strong>{node.children.length ? node.children.map((child) => <button type="button" key={child.id} onClick={() => { onChange(child.id); if (!child.children.length) setOpen(false); }}><span>{child.label}</span><em>{countOwnedEntriesUnderNode(useGameStore.getState().game.inventory, child)}</em>{child.children.length > 0 && <ChevronRight size={12} aria-hidden="true" />}</button>) : <span className="inventory-browse-empty">No deeper categories yet.</span>}</div>}</div>;
}

function InventoryFiltersPopover({ id, category, filters, setFilters }: { id: string; category: InventoryPrimaryCategory; filters: InventoryFilters; setFilters: (filters: InventoryFilters) => void }) {
  const showEquipmentState = category === "all" || category === "equipment";
  return <div id={id} className="inventory-filter-popover" data-debug-kind="inventory-filter-popover"><label>Rarity<select value={filters.rarity} onChange={(event) => setFilters({ ...filters, rarity: event.target.value as InventoryFilters["rarity"] })}><option value="all">All rarities</option><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option></select></label>{showEquipmentState && <label>Equipment state<select value={filters.equipmentState} onChange={(event) => setFilters({ ...filters, equipmentState: event.target.value as InventoryFilters["equipmentState"] })}><option value="all">All equipment</option><option value="equipped">Equipped</option><option value="unequipped">Unequipped</option></select></label>}{showEquipmentState && <label>Modification<select value={filters.modification} onChange={(event) => setFilters({ ...filters, modification: event.target.value as InventoryFilters["modification"] })}><option value="all">Modified or unmodified</option><option value="modified">Modified only</option><option value="unmodified">Unmodified only</option></select></label>}</div>;
}

function InventoryCard({ entry, selected, onSelect }: { entry: InventoryViewEntry; selected: boolean; onSelect: () => void }) {
  const presentation = entry.resolved ? buildItemPresentation(entry.resolved, { equipped: entry.equipped }) : buildStackableItemPresentation(entry.definition, entry.quantity);
  const tooltip = entry.resolved ? buildPlayerItemInstanceTooltip(entry.resolved, { equipped: entry.equipped }) : buildItemTooltip(entry.definition, { quantity: entry.quantity });
  const instance = entry.resolved?.instance;
  return <GameTooltip content={tooltip}><button type="button" className={`inventory-card rarity-${entry.definition.rarity} ${selected ? "is-selected" : ""}`} onClick={onSelect} data-debug-kind="inventory-item" data-debug-target-id={entry.instanceId ?? entry.definition.id} data-debug-item-id={entry.definition.id} data-debug-instance-id={entry.instanceId} data-debug-label={entry.definition.name} aria-label={`Select ${entry.definition.name}${entry.equipped ? ", equipped" : ""}`}>
    {!entry.instanceId && <span className="item-quantity">×{entry.quantity.toLocaleString()}</span>}<PlaceholderArt icon={entry.definition.icon} size="small" variant={entry.definition.rarity === "rare" ? "gold" : entry.definition.rarity === "uncommon" ? "blue" : "muted"} /><strong>{presentation.name}</strong>{entry.equipped && <span className="item-equipped-marker" title={`Equipped${entry.equippedSlot ? ` · ${getEquipmentSlotDefinition(entry.equippedSlot as EquipmentSlotId).label}` : ""}`} aria-label="Equipped">●</span>}{instance && itemInstanceIsModified(instance) && <span className="item-modifier-badges" data-debug-kind="item-modifier-badges" data-debug-instance-id={instance.id}>{instance.quality > 0 && <em>Q{instance.quality}</em>}{instance.upgradeLevel > 0 && <em>+{instance.upgradeLevel}</em>}{instance.affixes.length > 0 && <em>{instance.affixes.length} Mods</em>}</span>}
  </button></GameTooltip>;
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
  const isCurrent = Boolean(entry.equipped && chosenSlot && game.equipment.slots[chosenSlot] === resolved?.instance.id);
  const meaningfulComparison = equipmentPreview?.comparison ?? [];
  const equip = () => { if (!resolved || !chosenSlot || !validation?.valid || combatLocked || isCurrent) return; equipItem(resolved.instance.id, chosenSlot); };

  return <Panel title="Item Details" icon={SlidersHorizontal} panelId="inventoryDetails" screen="inventory" className="inventory-details">
    <GameTooltip content={tooltip}><div className="detail-item-head" data-debug-kind="tooltip-trigger" data-debug-item-id={entry.definition.id} data-debug-instance-id={entry.instanceId}><PlaceholderArt icon={entry.definition.icon} label={entry.definition.name} size="large" variant={entry.definition.rarity === "rare" ? "gold" : entry.definition.rarity === "uncommon" ? "blue" : "muted"} /><div><span className="tiny-label">{presentation.typeLabel.toUpperCase()}</span><h3>{presentation.name}</h3><p>{presentation.rarity} · {presentation.slotLabel ?? "Stackable item"}</p></div></div></GameTooltip>
    <div className="detail-badge-row">{presentation.slotLabel && <span className="detail-badge">{presentation.slotLabel}</span>}{entry.equipped && <span className="detail-badge is-equipped">Equipped</span>}{presentation.masteryRequirement !== undefined && <span className={`detail-badge ${masteryLevel >= presentation.masteryRequirement ? "is-equipped" : ""}`}>Mastery {presentation.masteryRequirement}</span>}</div>
    <p className="detail-description">{entry.definition.description}</p>
    {resolved ? <><div className="detail-summary-grid">{presentation.modified ? <><span className="detail-badge">Quality {resolved.instance.quality}%</span><span className="detail-badge">Upgrade +{resolved.instance.upgradeLevel}</span><span className="detail-badge">{resolved.instance.affixes.length} modifier{resolved.instance.affixes.length === 1 ? "" : "s"}</span></> : <span className="detail-badge">Unmodified</span>}</div><DetailSection title="Modifiers">{presentation.modifiers.length ? <div className="detail-modifier-list">{presentation.modifiers.map((modifier) => <div key={modifier.id}><span>{modifier.label}{modifier.tier ? ` (T${modifier.tier})` : ""}</span><strong>{modifier.value}</strong></div>)}</div> : <span className="detail-muted">No modifications.</span>}</DetailSection><DetailSection title="Effective stats"><div className="detail-stat-list">{formatItemStats(resolved.effectiveStats).map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div></DetailSection><button type="button" className="inventory-disclosure-toggle" onClick={() => setBaseOpen((value) => !value)} aria-expanded={baseOpen}><DisclosureChevron open={baseOpen} />{baseOpen ? "Hide base stats" : "Show base stats"}</button>{baseOpen && <div className="detail-stat-list">{formatItemStats(resolved.baseStats).map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>}{slotTargets.length > 0 && <><DetailSection title="Equip"><div className="detail-action-row">{slotTargets.length === 1 ? <span className="detail-badge">Target: {slotTargets[0].label}</span> : <div className="inventory-equip-targets" aria-label="Choose equipment target">{slotTargets.map((slot) => <button type="button" key={slot.id} className={chosenSlot === slot.id ? "is-selected" : ""} onClick={() => setTargetSlot(slot.id)}>{slot.label}{game.equipment.slots[slot.id] === resolved.instance.id ? " · Current" : ""}</button>)}</div>}<button type="button" className="button button-primary" disabled={!validation?.valid || combatLocked || isCurrent} onClick={equip}>{isCurrent ? "Equipped" : "Equip"}</button></div>{combatLocked && <p className="inventory-lock-note">Stop combat to change equipment.</p>}{validation?.reason === "mastery-level" && <p className="inventory-lock-note">Mastery {entry.definition.requiredMasteryLevel} is required to equip this item.</p>}</DetailSection>{meaningfulComparison.length > 0 && <div className="inventory-comparison"><header>COMPARISON · {chosenSlot ? getEquipmentSlotDefinition(chosenSlot).label : ""}</header>{meaningfulComparison.map((row) => <div key={row.key} className={`inventory-comparison-row ${row.tone}`}><span>{row.label}</span><strong><span>{row.before} → {row.after}</span>{row.delta && <em>{row.delta}</em>}</strong></div>)}</div>}</>}{!slotTargets.length && <DetailSection title="Quantity"><div className="detail-stat-list"><div><span>In one stack</span><strong>{entry.quantity.toLocaleString()}</strong></div></div></DetailSection>}</> : null}
  </Panel>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) { return <section className="detail-section"><header>{title.toUpperCase()}</header>{children}</section>; }
