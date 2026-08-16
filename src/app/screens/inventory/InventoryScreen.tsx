import { Backpack, Filter, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { previewEquipmentChange, validateEquipmentChange } from "../../../game/equipment/equipmentRules";
import { EQUIPMENT_SLOT_DEFINITIONS, type EquipmentSlotId } from "../../../game/equipment/equipmentTypes";
import { calculateHunterCombatStats } from "../../../game/equipment/derivedStats";
import { masteryLevelForXp } from "../../../game/progression/masteryProgression";
import { getCombatStatDisplaySpec, formatCombatStatDelta, formatItemStats } from "../../../game/presentation/statFormatting";
import { buildItemPresentation, buildStackableItemPresentation, itemInstanceIsModified } from "../../../game/presentation/itemPresentation";
import { buildItemTooltip, buildPlayerItemInstanceTooltip } from "../../../game/presentation/tooltipBuilders";
import { defaultInventoryFilters, inventoryRefsEqual, selectInventoryEntries, type InventoryEquipmentFilter, type InventoryFilters, type InventoryPrimaryCategory, type InventorySort, type InventoryViewEntry } from "../../../game/inventory/inventorySelectors";
import { useGameStore } from "../../../state/gameStore";
import { DisclosureChevron } from "../../components/DisclosureChevron";
import { GameTooltip } from "../../components/tooltip/GameTooltip";
import { Panel } from "../../components/Panel";
import { PlaceholderArt } from "../../components/PlaceholderArt";
import { SearchField } from "../../components/SearchField";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { ScreenHeading } from "../../shell/ScreenHeading";

const primaryCategories = ["all", "equipment", "consumables", "materials", "currency"] as const;
const primaryLabels: Record<InventoryPrimaryCategory, string> = { all: "All", equipment: "Equipment", consumables: "Consumables", materials: "Materials", currency: "Currency" };
const equipmentFilters = ["all-gear", "weapons", "offhands", "armor", "accessories"] as const;
const equipmentLabels: Record<InventoryEquipmentFilter, string> = { "all-gear": "All Gear", weapons: "Weapons", offhands: "Offhands", armor: "Armor", accessories: "Accessories" };
const sortOptions: Array<{ value: InventorySort; label: string }> = [
  { value: "name", label: "Name" }, { value: "rarity", label: "Rarity" }, { value: "mastery", label: "Mastery Requirement" },
  { value: "quality", label: "Quality" }, { value: "upgrade", label: "Upgrade Level" }, { value: "recent", label: "Recently Acquired" }, { value: "quantity", label: "Quantity" },
];

export function InventoryScreen() {
  const game = useGameStore((state) => state.game);
  const selectedRef = useGameStore((state) => state.selectedInventoryEntry);
  const selectEntry = useGameStore((state) => state.selectInventoryEntry);
  const [category, setCategory] = useState<InventoryPrimaryCategory>("all");
  const [equipment, setEquipment] = useState<InventoryEquipmentFilter>("all-gear");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<InventorySort>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>(defaultInventoryFilters);
  const categoryTabs = primaryCategories.map((value) => primaryLabels[value]);
  const equipmentTabs = equipmentFilters.map((value) => equipmentLabels[value]);
  const effectiveFilters = { ...filters, category, equipment };
  const entries = useMemo(() => selectInventoryEntries(game.inventory, game.equipment, effectiveFilters, query, sort), [game.inventory, game.equipment, effectiveFilters, query, sort]);
  const selected = entries.find((entry) => inventoryRefsEqual(entry.ref, selectedRef)) ?? entries[0];

  useEffect(() => {
    if (!selected || inventoryRefsEqual(selected.ref, selectedRef)) return;
    selectEntry(selected.ref);
  }, [selected, selectedRef, selectEntry]);

  const activeFilterCount = [filters.rarity !== "all", filters.equipmentState !== "all", filters.modification !== "all", category !== "all", category === "equipment" && equipment !== "all-gear"].filter(Boolean).length;
  const clearFilters = () => { setCategory("all"); setEquipment("all-gear"); setFilters(defaultInventoryFilters); setQuery(""); };
  const inventoryCount = Object.keys(game.inventory.instances).length;
  const stackCount = Object.values(game.inventory.stackables).filter((quantity) => quantity > 0).length;

  return <div className="screen inventory-screen" data-debug-screen="inventory">
    <ScreenHeading screen="inventory" />
    <Panel title="Inventory toolbar" subtitle="Owned equipment and carried resources" icon={Backpack} panelId="inventoryToolbar" screen="inventory" className="inventory-toolbar">
      <div className="inventory-toolbar-row"><SearchField value={query} onChange={setQuery} placeholder="Search names, types, rarity, proficiency, or affixes" label="Search inventory" /><div className="inventory-toolbar-actions"><select className="inventory-sort-select" value={sort} onChange={(event) => setSort(event.target.value as InventorySort)} aria-label="Sort inventory"><option value="">Sort by...</option>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" className="button button-ghost button-small" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen} aria-controls="inventory-filters"><Filter size={14} />Filters{activeFilterCount > 0 && <span className="inventory-active-filter-count">{activeFilterCount}</span>}</button>{activeFilterCount > 0 && <button type="button" className="button button-ghost button-small" onClick={clearFilters}><X size={13} />Clear</button>}</div></div>
      <SegmentedTabs items={categoryTabs} active={primaryLabels[category]} onChange={(value) => { const next = primaryCategories.find((candidate) => primaryLabels[candidate] === value) ?? "all"; setCategory(next); if (next !== "equipment") setEquipment("all-gear"); }} label="Inventory categories" />
      {category === "equipment" && <div className="inventory-secondary-tabs"><SegmentedTabs items={equipmentTabs} active={equipmentLabels[equipment]} onChange={(value) => setEquipment(equipmentFilters.find((candidate) => equipmentLabels[candidate] === value) ?? "all-gear")} label="Equipment filters" /></div>}
      {filtersOpen && <InventoryFiltersPopover id="inventory-filters" filters={filters} setFilters={setFilters} />}
    </Panel>
    <div className="inventory-layout">
      <Panel title="Carried items" subtitle={`${entries.length} visible entries · ${inventoryCount} equipment instances · ${stackCount} stack types`} icon={Backpack} panelId="inventoryBank" screen="inventory" className="inventory-bank">
        <div className="inventory-summary"><span><strong>{entries.length}</strong> matching</span><span>Each gear copy is shown separately</span></div>
        {entries.length ? <div className="inventory-grid">{entries.map((entry) => <InventoryCard key={entry.instanceId ?? entry.definition.id} entry={entry} selected={Boolean(selected && inventoryRefsEqual(selected.ref, entry.ref))} onSelect={() => selectEntry(entry.ref)} />)}</div> : <InventoryEmptyState query={query} activeFilterCount={activeFilterCount} onClear={clearFilters} />}
      </Panel>
      <InventoryDetails entry={selected} game={game} />
    </div>
  </div>;
}

function InventoryFiltersPopover({ id, filters, setFilters }: { id: string; filters: InventoryFilters; setFilters: (filters: InventoryFilters) => void }) {
  return <div id={id} className="inventory-filter-popover" data-debug-kind="inventory-filter-popover"><label>Rarity<select value={filters.rarity} onChange={(event) => setFilters({ ...filters, rarity: event.target.value as InventoryFilters["rarity"] })}><option value="all">All rarities</option><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option></select></label><label>Equipment state<select value={filters.equipmentState} onChange={(event) => setFilters({ ...filters, equipmentState: event.target.value as InventoryFilters["equipmentState"] })}><option value="all">All equipment</option><option value="equipped">Equipped</option><option value="unequipped">Unequipped</option></select></label><label>Modification<select value={filters.modification} onChange={(event) => setFilters({ ...filters, modification: event.target.value as InventoryFilters["modification"] })}><option value="all">Modified or unmodified</option><option value="modified">Modified only</option><option value="unmodified">Unmodified only</option></select></label></div>;
}

function InventoryCard({ entry, selected, onSelect }: { entry: InventoryViewEntry; selected: boolean; onSelect: () => void }) {
  const presentation = entry.resolved ? buildItemPresentation(entry.resolved, { equipped: entry.equipped }) : buildStackableItemPresentation(entry.definition, entry.quantity);
  const tooltip = entry.resolved ? buildPlayerItemInstanceTooltip(entry.resolved, { equipped: entry.equipped }) : buildItemTooltip(entry.definition, { quantity: entry.quantity });
  const instance = entry.resolved?.instance;
  return <GameTooltip content={tooltip}><button type="button" className={`inventory-card rarity-${entry.definition.rarity} ${selected ? "is-selected" : ""}`} onClick={onSelect} data-debug-kind="inventory-item" data-debug-target-id={entry.instanceId ?? entry.definition.id} data-debug-item-id={entry.definition.id} data-debug-instance-id={entry.instanceId} data-debug-label={entry.definition.name} aria-label={`Select ${entry.definition.name}${entry.equipped ? ", equipped" : ""}`}>
    {!entry.instanceId && <span className="item-quantity">{entry.quantity.toLocaleString()}</span>}<PlaceholderArt icon={entry.definition.icon} size="medium" variant={entry.definition.rarity === "rare" ? "gold" : entry.definition.rarity === "uncommon" ? "blue" : "muted"} /><strong>{presentation.name}</strong><small>{presentation.slotLabel ?? presentation.typeLabel} · {presentation.rarity}</small>{entry.equipped && <span className="item-status">Equipped · {entry.equippedSlot}</span>}{instance && itemInstanceIsModified(instance) && <span className="item-modifier-badges" data-debug-kind="item-modifier-badges" data-debug-instance-id={instance.id}>{instance.quality > 0 && <em>Q{instance.quality}</em>}{instance.upgradeLevel > 0 && <em>+{instance.upgradeLevel}</em>}{instance.affixes.length > 0 && <em>{instance.affixes.length} Mods</em>}</span>}
  </button></GameTooltip>;
}

function InventoryEmptyState({ query, activeFilterCount, onClear }: { query: string; activeFilterCount: number; onClear: () => void }) {
  const filtered = Boolean(query || activeFilterCount);
  return <div className="inventory-empty-state"><strong>{filtered ? "No items match these filters" : "Your inventory is empty"}</strong><span>{filtered ? "Try a different search or clear the active filters." : "Rewards and owned items will appear here."}</span>{filtered && <button type="button" className="button button-ghost button-small" onClick={onClear}>Clear filters</button>}</div>;
}

function InventoryDetails({ entry, game }: { entry?: InventoryViewEntry; game: ReturnType<typeof useGameStore.getState>["game"] }) {
  const equipItem = useGameStore((state) => state.equipItemInstance);
  const [baseOpen, setBaseOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<EquipmentSlotId | undefined>();
  if (!entry) return <Panel title="Item details" subtitle="Selected item inspection" icon={SlidersHorizontal} panelId="inventoryDetails" screen="inventory" className="inventory-details"><div className="inventory-empty-state"><strong>Select an item</strong><span>Choose an item card to inspect it.</span></div></Panel>;
  const resolved = entry.resolved;
  const presentation = resolved ? buildItemPresentation(resolved, { equipped: entry.equipped, includeBaseStats: baseOpen }) : buildStackableItemPresentation(entry.definition, entry.quantity);
  const tooltip = resolved ? buildPlayerItemInstanceTooltip(resolved, { equipped: entry.equipped }) : buildItemTooltip(entry.definition, { quantity: entry.quantity });
  const masteryLevel = masteryLevelForXp(game.progression.masteryXp);
  const combatLocked = game.combat.phase === "active" || game.combat.phase === "recovery";
  const slotTargets = resolved?.definition.equipmentSlotKind ? EQUIPMENT_SLOT_DEFINITIONS.filter((slot) => slot.kind === resolved.definition.equipmentSlotKind) : [];
  const chosenSlot = targetSlot && slotTargets.some((slot) => slot.id === targetSlot) ? targetSlot : slotTargets[0]?.id;
  const validation = resolved && chosenSlot ? validateEquipmentChange({ instanceId: resolved.instance.id, slotId: chosenSlot, inventory: game.inventory, equipment: game.equipment, masteryLevel }) : undefined;
  const preview = resolved && chosenSlot && validation?.valid ? previewEquipmentChange({ instanceId: resolved.instance.id, slotId: chosenSlot, inventory: game.inventory, equipment: game.equipment, masteryLevel }) : undefined;
  const currentStats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression, game.combat.stance, game.combat.techniques);
  const previewStats = preview ? calculateHunterCombatStats(preview.equipment, game.inventory, game.progression, game.combat.stance, game.combat.techniques) : undefined;
  const isCurrent = Boolean(entry.equipped && chosenSlot && game.equipment.slots[chosenSlot] === resolved?.instance.id);
  const meaningfulComparison = previewStats ? comparisonRows(currentStats, previewStats) : [];
  const equip = () => { if (!resolved || !chosenSlot || !validation?.valid || combatLocked || isCurrent) return; equipItem(resolved.instance.id, chosenSlot); };

  return <Panel title="Item details" subtitle="Human-readable item inspection" icon={SlidersHorizontal} panelId="inventoryDetails" screen="inventory" className="inventory-details">
    <GameTooltip content={tooltip}><div className="detail-item-head" data-debug-kind="tooltip-trigger" data-debug-item-id={entry.definition.id} data-debug-instance-id={entry.instanceId}><PlaceholderArt icon={entry.definition.icon} label={entry.definition.name} size="large" variant={entry.definition.rarity === "rare" ? "gold" : entry.definition.rarity === "uncommon" ? "blue" : "muted"} /><div><span className="tiny-label">{presentation.typeLabel.toUpperCase()}</span><h3>{presentation.name}</h3><p>{presentation.rarity} · {presentation.slotLabel ?? "Stackable item"}</p></div></div></GameTooltip>
    <div className="detail-badge-row"><span className="detail-badge">{entry.quantity.toLocaleString()} {entry.quantity === 1 ? "owned" : "owned"}</span>{presentation.slotLabel && <span className="detail-badge">{presentation.slotLabel}</span>}{entry.equipped && <span className="detail-badge is-equipped">Equipped</span>}{presentation.masteryRequirement !== undefined && <span className={`detail-badge ${masteryLevel >= presentation.masteryRequirement ? "is-equipped" : ""}`}>Mastery {presentation.masteryRequirement}</span>}</div>
    <p className="detail-description">{entry.definition.description}</p>
    {resolved ? <><div className="detail-summary-grid"><span className="detail-badge">Quality {resolved.instance.quality}%</span><span className="detail-badge">Upgrade +{resolved.instance.upgradeLevel}</span><span className="detail-badge">{resolved.instance.affixes.length} modifier{resolved.instance.affixes.length === 1 ? "" : "s"}</span></div><DetailSection title="Modifiers">{presentation.modifiers.length ? <div className="detail-modifier-list">{presentation.modifiers.map((modifier) => <div key={modifier.id}><span>{modifier.label}{modifier.tier ? ` (T${modifier.tier})` : ""}</span><strong>{modifier.value}</strong></div>)}</div> : <span className="detail-muted">No modifications on this copy.</span>}</DetailSection><DetailSection title="Effective stats"><div className="detail-stat-list">{formatItemStats(resolved.effectiveStats).map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div></DetailSection><button type="button" className="debug-advanced-toggle" onClick={() => setBaseOpen((value) => !value)} aria-expanded={baseOpen}><DisclosureChevron open={baseOpen} />{baseOpen ? "Hide base stats" : "Show base stats"}</button>{baseOpen && <div className="detail-stat-list">{formatItemStats(resolved.baseStats).map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>}{slotTargets.length > 0 && <><DetailSection title="Equip"><div className="detail-action-row">{slotTargets.length === 1 ? <span className="detail-badge">Target: {slotTargets[0].label}</span> : <div className="inventory-equip-targets" aria-label="Choose equipment target">{slotTargets.map((slot) => <button type="button" key={slot.id} className={chosenSlot === slot.id ? "is-selected" : ""} onClick={() => setTargetSlot(slot.id)}>{slot.label}{game.equipment.slots[slot.id] === resolved.instance.id ? " · Current" : ""}</button>)}</div>}<button type="button" className="button button-primary" disabled={!validation?.valid || combatLocked || isCurrent} onClick={equip}>{isCurrent ? "Equipped" : "Equip"}</button></div>{combatLocked && <p className="inventory-lock-note">Stop combat to change equipment.</p>}{validation?.reason === "mastery-level" && <p className="inventory-lock-note">Mastery {entry.definition.requiredMasteryLevel} is required to equip this item.</p>}</DetailSection>{meaningfulComparison.length > 0 && <div className="inventory-comparison"><header>COMPARISON · {chosenSlot}</header>{meaningfulComparison.map((row) => <div key={row.key} className={`inventory-comparison-row ${row.tone}`}><span>{row.label}</span><strong>{row.delta}</strong></div>)}</div>}</>}{!slotTargets.length && <DetailSection title="Quantity"><div className="detail-stat-list"><div><span>In one stack</span><strong>{entry.quantity.toLocaleString()}</strong></div></div></DetailSection>}</> : null}
  </Panel>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) { return <section className="detail-section"><header>{title.toUpperCase()}</header>{children}</section>; }

function comparisonRows(current: ReturnType<typeof calculateHunterCombatStats>, preview: ReturnType<typeof calculateHunterCombatStats>) {
  const keys = ["attackDamage", "attackDamageMin", "attackDamageMax", "accuracyRating", "baseAttackTime", "armour", "evasionRating", "maxLife", "maxStamina", "maxMana", "manaRegenFlat", "staminaRegen", "fireResistance", "coldResistance", "lightningResistance", "chaosResistance"];
  return keys.flatMap((key) => {
    const before = Number((current as unknown as Record<string, unknown>)[key] ?? 0);
    const after = Number((preview as unknown as Record<string, unknown>)[key] ?? 0);
    const delta = after - before;
    const spec = getCombatStatDisplaySpec(key);
    if (Math.abs(delta) < 1e-9 || !spec) return [];
    const tone = spec.comparisonDirection === "neutral" ? "" : spec.comparisonDirection === "higher-is-better" ? delta > 0 ? "is-positive" : "is-negative" : delta < 0 ? "is-positive" : "is-negative";
    return [{ key, label: spec.key === "baseAttackTime" ? "Weapon Base Attack Time" : spec.key === "attackDamageMin" ? "Attack Damage (min)" : spec.key === "attackDamageMax" ? "Attack Damage (max)" : spec.key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase()), delta: formatCombatStatDelta(key, delta), tone }];
  });
}
