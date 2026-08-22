import { useEffect, useMemo, useState } from "react";
import { PackagePlus, Trash2 } from "lucide-react";
import { itemById, itemDefinitions, type ItemDefinition } from "../../../../game/data/items";
import { weaponArchetypeById, weaponFamilyLabels } from "../../../../game/data/gear/weaponArchetypes";
import { equippedSlotForInstance } from "../../../../game/equipment/equipmentRules";
import { equipmentSlotKindLabel, getEquipmentSlotDefinition } from "../../../../game/equipment/equipmentTypes";
import { getInstancesByDefinitionId, getOwnedItemCount } from "../../../../game/items/itemOwnership";
import { resolveItemInstance } from "../../../../game/items/itemResolver";
import { itemRarityArtVariant } from "../../../../game/presentation/itemRarity";
import { buildItemTaxonomy, filterItemTaxonomy, type ItemTaxonomyNode } from "../../../../game/presentation/itemTaxonomy";
import { formatItemStats } from "../../../../game/presentation/statFormatting";
import { useGameStore } from "../../../../state/gameStore";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { DisclosureChevron } from "../../../components/DisclosureChevron";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { SearchField } from "../../../components/SearchField";
import { DebugButton } from "../components/DebugButton";
import { DebugFilterBar } from "../components/DebugFilterBar";
import { DebugSection } from "../components/DebugSection";
import { ItemUpgradeTreePanel } from "../../../components/gear/ItemUpgradeTreePanel";
import { buildItemDefinitionSearchText, buildItemPresentation } from "../../../../game/presentation/itemPresentation";
import { equippedWeaponMechanic } from "../../../../game/weapons/weaponMechanicRuntime";
import type { DebugGameState, DebugTabProps } from "../debugTypes";

const filters = ["all", "equipment", "consumables", "materials", "currency"] as const;
type ItemFilter = (typeof filters)[number];
const ironMeleeRoster = ["item.iron-sword", "item.iron-axe", "item.iron-mace", "item.iron-dagger", "item.iron-greatsword", "item.iron-great-axe", "item.iron-warhammer", "item.iron-spear"];
const ironDefensiveRoster = ["item.iron-helmet", "item.iron-armor", "item.iron-gloves", "item.iron-boots", "item.iron-shield"];
function itemMatches(item: ItemDefinition, query: string) { return !query || buildItemDefinitionSearchText(item).includes(query); }

export function DebugItemsTab({ run, debug }: DebugTabProps) {
  const game = useGameStore((state) => state.game);
  const purchaseItemUpgradeNode = useGameStore((state) => state.purchaseItemUpgradeNode);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [selectedId, setSelectedId] = useState("item.iron-sword");
  const normalized = query.trim().toLowerCase();
  const items = useMemo(() => itemDefinitions.filter((item) => (filter === "all" || filter === "equipment" && Boolean(item.equipmentSlotKind) || filter === "consumables" && item.category === "consumable" || filter === "materials" && item.category === "material" || filter === "currency" && item.category === "currency") && itemMatches(item, normalized)), [filter, normalized]);
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0];
  const taxonomy = useMemo(() => filterItemTaxonomy(buildItemTaxonomy(itemDefinitions), new Set(items.map((item) => item.id))), [items]);
  return <div className="debug-tab-content debug-column debug-items-tab" data-debug-kind="debug-items-workspace">
    <DebugSection title="Item browser" subtitle={`${items.length} matching canonical definitions`} actions={<SearchField value={query} onChange={setQuery} placeholder="Search by name, type, rarity, or material" label="Search items" debugKind="debug-item-search" />}>
      <DebugFilterBar values={filters} value={filter} onChange={setFilter} labels={{ all: "ALL", equipment: "EQUIPMENT", consumables: "CONSUMABLES", materials: "MATERIALS", currency: "CURRENCY" }} />
      <div className="debug-items-workspace-grid"><div className="debug-item-browser" data-debug-kind="debug-item-browser">{taxonomy ? <DebugItemTree taxonomy={taxonomy} game={game} selectedId={selectedItem?.id} onSelect={setSelectedId} /> : <p className="debug-item-empty">No definitions match this search.</p>}</div>{selectedItem ? <DebugItemInspector item={selectedItem} game={game} debug={debug} run={run} purchaseItemUpgradeNode={purchaseItemUpgradeNode} /> : <div className="debug-item-inspector" data-debug-kind="debug-item-inspector"><p className="debug-item-empty">No item definition matches the search.</p></div>}</div>
    </DebugSection>
    <IronMeleeRoster game={game} selectedId={selectedId} onSelect={setSelectedId} run={run} debug={debug} />
    <IronHeavyArmorRoster game={game} selectedId={selectedId} onSelect={setSelectedId} run={run} debug={debug} />
    <EquippedWeaponTelemetry game={game} />
    <DebugSection title="Gear validation shortcuts" subtitle="Use the real upgrade purchase path after granting materials."><div className="debug-button-grid"><DebugButton action="grant-iron-melee-roster" onClick={() => run("Granted the Iron melee roster.", () => debug.grantIronMeleeRoster())}>GRANT IRON MELEE ROSTER</DebugButton><DebugButton action="grant-iron-defensive-set" onClick={() => run("Granted the Iron defensive set.", () => debug.grantIronDefensiveSet())}>GRANT IRON DEFENSIVE SET</DebugButton><DebugButton action="grant-selected-gear-materials" disabled={!selectedItem?.upgradeTreeId} onClick={() => run(`Granted materials for ${selectedItem?.name ?? "selected gear"}.`, () => debug.grantSelectedGearMaterials(selectedItem?.id ?? ""))}>GRANT SELECTED GEAR MATERIALS</DebugButton><DebugButton action="grant-iron-sword" onClick={() => run("Granted Iron Sword.", () => debug.grantItem("item.iron-sword", 1))}>GRANT IRON SWORD</DebugButton><DebugButton action="grant-iron-swords-2" onClick={() => run("Granted two Iron Swords.", () => debug.grantItem("item.iron-sword", 2))}>GRANT IRON SWORD x2</DebugButton><DebugButton action="grant-iron-bar" onClick={() => run("Granted Iron Bars.", () => debug.grantItem("item.iron-bar", 100))}>GRANT IRON BARS</DebugButton></div></DebugSection>
  </div>;
}

function IronMeleeRoster({ game, selectedId, onSelect, run, debug }: { game: DebugGameState; selectedId: string; onSelect: (id: string) => void; run: DebugTabProps["run"]; debug: DebugTabProps["debug"] }) {
  return <DebugSection title="IRON MELEE ROSTER" subtitle="The eight canonical Iron weapon definitions and their live ownership state."><div className="debug-copy-list" data-debug-kind="iron-melee-roster">{ironMeleeRoster.map((itemId) => { const item = itemById[itemId]; const archetype = item?.weaponArchetypeId ? weaponArchetypeById[item.weaponArchetypeId] : undefined; if (!item || !archetype) return null; return <div className={`debug-copy-row ${selectedId === itemId ? "is-selected" : ""}`} key={itemId} data-debug-item-id={itemId}><span><strong>{item.name}</strong><small>{weaponFamilyLabels[archetype.familyId]} - {archetype.name} - {archetype.handedness}</small></span><em>owned {getOwnedItemCount(game.inventory, itemId)}</em><DebugButton action={`grant-${itemId}`} onClick={() => run(`Granted ${item.name}.`, () => debug.grantItem(itemId, 1))}>GRANT +1</DebugButton><DebugButton action={`inspect-${itemId}`} onClick={() => onSelect(itemId)}>INSPECT</DebugButton></div>; })}</div></DebugSection>;
}

function IronHeavyArmorRoster({ game, selectedId, onSelect, run, debug }: { game: DebugGameState; selectedId: string; onSelect: (id: string) => void; run: DebugTabProps["run"]; debug: DebugTabProps["debug"] }) {
  return <DebugSection title="IRON HEAVY ARMOR + SHIELD ROSTER" subtitle="The five canonical defensive definitions and their live ownership state."><div className="debug-copy-list" data-debug-kind="iron-heavy-armor-roster">{ironDefensiveRoster.map((itemId) => { const item = itemById[itemId]; if (!item) return null; return <div className={`debug-copy-row ${selectedId === itemId ? "is-selected" : ""}`} key={itemId} data-debug-item-id={itemId}><span><strong>{item.name}</strong><small>{item.equipmentSlotKind ? equipmentSlotKindLabel(item.equipmentSlotKind) : "Equipment"} - {item.defensiveProficiencyId ?? "Defense"}</small></span><em>owned {getOwnedItemCount(game.inventory, itemId)}</em><DebugButton action={`grant-${itemId}`} onClick={() => run(`Granted ${item.name}.`, () => debug.grantItem(itemId, 1))}>GRANT +1</DebugButton><DebugButton action={`inspect-${itemId}`} onClick={() => onSelect(itemId)}>INSPECT</DebugButton></div>; })}</div></DebugSection>;
}

function EquippedWeaponTelemetry({ game }: { game: DebugGameState }) {
  const instanceId = game.equipment.slots.weapon;
  const resolved = instanceId ? resolveItemInstance(game.inventory, instanceId) : undefined;
  const mechanic = equippedWeaponMechanic(game);
  if (!resolved || !mechanic) return <DebugSection title="EQUIPPED WEAPON TELEMETRY" subtitle="DEV only"><p className="debug-item-empty">No weapon is equipped.</p></DebugSection>;
  const archetype = resolved.definition.weaponArchetypeId ? weaponArchetypeById[resolved.definition.weaponArchetypeId] : undefined;
  return <DebugSection title="EQUIPPED WEAPON TELEMETRY" subtitle="DEV only - live mechanic state"><div className="debug-effective-stats" data-debug-kind="equipped-weapon-telemetry"><div><span>Item</span><strong>{resolved.definition.name} - {resolved.instance.id}</strong></div><div><span>Archetype</span><strong>{archetype?.name ?? "Unknown"}</strong></div><div><span>Specialization</span><strong>{buildItemPresentation(resolved).specialization?.label ?? "Unspecialized"}</strong></div><div><span>Mechanics</span><strong>{archetype?.mechanicIds.join(", ") ?? "None"}</strong></div><div><span>Counters</span><strong>{JSON.stringify(game.combat.weaponRuntime.counters)}</strong></div><div><span>Timers</span><strong>{JSON.stringify(game.combat.weaponRuntime.timers)}</strong></div><div><span>Attack profile</span><strong>{JSON.stringify(mechanic.parameters.attackProfile)}</strong></div></div></DebugSection>;
}

function DebugItemTree({ taxonomy, game, selectedId, onSelect }: { taxonomy: ItemTaxonomyNode; game: DebugGameState; selectedId?: string; onSelect: (id: string) => void }) {
  const owned = useMemo(() => new Map(Object.values(game.inventory.instances).map((instance) => [instance.definitionId, getOwnedItemCount(game.inventory, instance.definitionId)])), [game.inventory]);
  const rosterReady = ironMeleeRoster.every((itemId) => (owned.get(itemId) ?? 0) > 0);
  const defensiveRosterReady = ironDefensiveRoster.every((itemId) => (owned.get(itemId) ?? 0) > 0);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["items", "items.equipment", "items.equipment.weapons", ...(rosterReady ? ["items.equipment.weapons.one-handed", "items.equipment.weapons.two-handed"] : []), ...(defensiveRosterReady ? ["items.equipment.armor", "items.equipment.armor.heavy-armor", "items.equipment.offhands", "items.equipment.offhands.shields"] : [])]));
  useEffect(() => { if (rosterReady) setExpanded((current) => new Set([...current, "items.equipment.weapons.one-handed", "items.equipment.weapons.two-handed"])); }, [rosterReady]);
  useEffect(() => { if (defensiveRosterReady) setExpanded((current) => new Set([...current, "items.equipment.armor", "items.equipment.armor.heavy-armor", "items.equipment.offhands", "items.equipment.offhands.shields"])); }, [defensiveRosterReady]);
  const toggle = (id: string) => setExpanded((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  return <div className="debug-item-taxonomy-tree">{taxonomy.children.map((node) => <DebugTaxonomyNode key={node.id} node={node} expanded={expanded} onToggle={toggle} selectedId={selectedId} onSelect={onSelect} owned={owned} />)}</div>;
}
function DebugTaxonomyNode({ node, expanded, onToggle, selectedId, onSelect, owned }: { node: ItemTaxonomyNode; expanded: Set<string>; onToggle: (id: string) => void; selectedId?: string; onSelect: (id: string) => void; owned: Map<string, number> }) {
  const open = expanded.has(node.id);
  if (node.children.length) return <section className="debug-item-tree-branch"><button type="button" className="debug-item-tree-branch-header" onClick={() => onToggle(node.id)} aria-expanded={open}><DisclosureChevron open={open} /><strong>{node.label}</strong><span>{node.definitionIds.length}</span></button>{open && <div className="debug-item-tree-children">{node.children.map((child) => <DebugTaxonomyNode key={child.id} node={child} expanded={expanded} onToggle={onToggle} selectedId={selectedId} onSelect={onSelect} owned={owned} />)}</div>}</section>;
  return <>{node.definitionIds.map((definitionId) => { const item = itemById[definitionId]; return item ? <button type="button" key={item.id} className={`debug-item-browser-row ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => onSelect(item.id)}><PlaceholderArt icon={item.icon} size="small" variant={itemRarityArtVariant(item.rarity)} /><span><strong>{item.name}</strong><small>{item.category}</small></span><em>{owned.get(item.id) ?? 0}</em></button> : null; })}</>;
}

function DebugItemInspector({ item, game, debug, run, purchaseItemUpgradeNode }: { item: ItemDefinition; game: DebugGameState; debug: DebugTabProps["debug"]; run: DebugTabProps["run"]; purchaseItemUpgradeNode: (instanceId: string, nodeId: string) => void }) {
  const instances = getInstancesByDefinitionId(game.inventory, item.id);
  const equippedIds = new Set(Object.values(game.equipment.slots).filter((value): value is string => Boolean(value)));
  const [selectedCopy, setSelectedCopy] = useState(instances[0]?.id);
  const currentId = selectedCopy && instances.some((instance) => instance.id === selectedCopy) ? selectedCopy : instances[0]?.id;
  const resolved = currentId ? resolveItemInstance(game.inventory, currentId) : undefined;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteCopy = () => { if (!currentId) return; run(`Deleted ${item.name}.`, () => debug.deleteItemInstance(currentId)); setDeleteOpen(false); };
  const presentation = resolved ? buildItemPresentation(resolved) : undefined;
  return <aside className="debug-item-inspector" data-debug-kind="debug-item-inspector"><header className="debug-item-inspector-header"><PlaceholderArt icon={item.icon} size="large" variant={itemRarityArtVariant(item.rarity)} /><div><span className="tiny-label">{item.category.toUpperCase()}</span><h3>{item.name}</h3><p>{getOwnedItemCount(game.inventory, item.id)} owned{item.upgradeTreeId ? " - DEV Upgrade Tree" : ""}</p></div></header><div className="debug-item-ownership-actions"><DebugButton action="grant-item" onClick={() => run(`Granted ${item.name}.`, () => debug.grantItem(item.id, 1))}><PackagePlus size={13} />COPY +1</DebugButton><DebugButton action="grant-item-10" onClick={() => run(`Granted ${item.name} x10.`, () => debug.grantItem(item.id, 10))}>+10</DebugButton></div>{item.inventoryMode === "stackable" ? <p className="debug-item-empty">{getOwnedItemCount(game.inventory, item.id)} in one stack.</p> : <><div className="debug-copy-list">{instances.map((instance, index) => { const copy = resolveItemInstance(game.inventory, instance.id); const copyPresentation = copy ? buildItemPresentation(copy) : undefined; return <button type="button" key={instance.id} className={`debug-copy-row ${currentId === instance.id ? "is-selected" : ""}`} onClick={() => setSelectedCopy(instance.id)}><span><strong>Copy {index + 1}</strong><small>{copyPresentation?.specialization?.label ?? "Unspecialized"} - {copyPresentation?.upgradeProgress?.unlocked ?? 0} / {copyPresentation?.upgradeProgress?.total ?? 4}{equippedIds.has(instance.id) ? ` - Equipped${equippedSlotForInstance(game.equipment, instance.id) ? ` - ${getEquipmentSlotDefinition(equippedSlotForInstance(game.equipment, instance.id)!).label}` : ""}` : ""}</small></span><em>{instance.unlockedUpgradeNodeIds.length} nodes</em></button>; })}</div>{resolved && <section className="debug-copy-inspector"><div className="debug-copy-heading"><strong>Selected copy</strong><small>{resolved.instance.id}</small></div><div className="debug-item-metadata" data-debug-kind="debug-item-metadata"><span>Definition<strong>{item.id}</strong></span><span>Instance<strong>{resolved.instance.id}</strong></span><span>Slot<strong>{item.equipmentSlotKind ? equipmentSlotKindLabel(item.equipmentSlotKind) : "-"}</strong></span><span>Proficiency<strong>{item.defensiveProficiencyId ?? item.weaponProficiencyId ?? "-"}</strong></span><span>Material Tier<strong>{item.materialTierId ?? "-"}</strong></span></div>{presentation && <div className="debug-specialization-summary"><strong>{presentation.specialization?.label ?? "Unspecialized"}</strong><span>{presentation.upgradeProgress?.unlocked ?? 0} / {presentation.upgradeProgress?.total ?? 4} upgrades</span></div>}<div className="debug-effective-stats">{formatItemStats(resolved.effectiveStats).map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>{item.upgradeTreeId && <ItemUpgradeTreePanel inventory={game.inventory} instanceId={resolved.instance.id} combatLocked={game.combat.phase === "active" || game.combat.phase === "recovery"} onUnlock={(instanceId, nodeId) => purchaseItemUpgradeNode(instanceId, nodeId)} />}<div className="debug-copy-actions"><header>DEV-ONLY ITEM CONTROLS</header><button type="button" className="button button-ghost" onClick={() => debug.resetItemUpgrades(resolved.instance.id)}>DEBUG RESET ITEM UPGRADES</button><button type="button" className="button button-danger" disabled={equippedIds.has(resolved.instance.id)} onClick={() => setDeleteOpen(true)}><Trash2 size={13} />Delete this copy</button></div><ConfirmDialog open={deleteOpen} title="Delete copy?" message="This exact item instance will be removed." confirmLabel="Delete Copy" onCancel={() => setDeleteOpen(false)} onConfirm={deleteCopy} /></section>}</>}</aside>;
}
