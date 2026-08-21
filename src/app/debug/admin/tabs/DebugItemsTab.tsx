import { useMemo, useState } from "react";
import { PackagePlus, Trash2 } from "lucide-react";
import { itemById, itemDefinitions, type ItemDefinition } from "../../../../game/data/items";
import { equippedSlotForInstance } from "../../../../game/equipment/equipmentRules";
import { getEquipmentSlotDefinition } from "../../../../game/equipment/equipmentTypes";
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
import type { DebugGameState, DebugTabProps } from "../debugTypes";

const filters = ["all", "equipment", "consumables", "materials", "currency"] as const;
type ItemFilter = (typeof filters)[number];
function itemMatches(item: ItemDefinition, query: string) { return !query || [item.name, item.category, item.rarity, item.weaponFamilyId ?? "", item.weaponArchetypeId ?? "", item.materialTierId ?? "", item.weaponProficiencyId ?? ""].join(" ").toLowerCase().includes(query); }

export function DebugItemsTab({ run, debug }: DebugTabProps) {
  const game = useGameStore((state) => state.game);
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
      <div className="debug-items-workspace-grid"><div className="debug-item-browser">{taxonomy ? <DebugItemTree taxonomy={taxonomy} game={game} selectedId={selectedItem?.id} onSelect={setSelectedId} /> : <p className="debug-item-empty">No definitions match this search.</p>}</div>{selectedItem ? <DebugItemInspector item={selectedItem} game={game} debug={debug} run={run} /> : <div className="debug-item-inspector"><p className="debug-item-empty">No item definition matches this search.</p></div>}</div>
    </DebugSection>
    <DebugSection title="Gear validation shortcuts" subtitle="Use the real upgrade purchase path after granting materials."><div className="debug-button-grid"><DebugButton action="grant-iron-sword" onClick={() => run("Granted Iron Sword.", () => debug.grantItem("item.iron-sword", 1))}>GRANT IRON SWORD</DebugButton><DebugButton action="grant-iron-swords-2" onClick={() => run("Granted two Iron Swords.", () => debug.grantItem("item.iron-sword", 2))}>GRANT IRON SWORD x2</DebugButton><DebugButton action="grant-iron-bar" onClick={() => run("Granted Iron Bars.", () => debug.grantItem("item.iron-bar", 100))}>GRANT IRON BARS</DebugButton><DebugButton action="grant-iron-materials" onClick={() => run("Granted Iron Sword materials.", () => debug.grantIronSwordMaterials())}>GRANT SWORD MATERIALS</DebugButton></div></DebugSection>
  </div>;
}

function DebugItemTree({ taxonomy, game, selectedId, onSelect }: { taxonomy: ItemTaxonomyNode; game: DebugGameState; selectedId?: string; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["items", "items.equipment", "items.equipment.weapons"]));
  const owned = useMemo(() => new Map(Object.values(game.inventory.instances).map((instance) => [instance.definitionId, getOwnedItemCount(game.inventory, instance.definitionId)])), [game.inventory]);
  const toggle = (id: string) => setExpanded((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  return <div className="debug-item-taxonomy-tree">{taxonomy.children.map((node) => <DebugTaxonomyNode key={node.id} node={node} expanded={expanded} onToggle={toggle} selectedId={selectedId} onSelect={onSelect} owned={owned} />)}</div>;
}
function DebugTaxonomyNode({ node, expanded, onToggle, selectedId, onSelect, owned }: { node: ItemTaxonomyNode; expanded: Set<string>; onToggle: (id: string) => void; selectedId?: string; onSelect: (id: string) => void; owned: Map<string, number> }) {
  const open = expanded.has(node.id);
  if (node.children.length) return <section className="debug-item-tree-branch"><button type="button" className="debug-item-tree-branch-header" onClick={() => onToggle(node.id)} aria-expanded={open}><DisclosureChevron open={open} /><strong>{node.label}</strong><span>{node.definitionIds.length}</span></button>{open && <div className="debug-item-tree-children">{node.children.map((child) => <DebugTaxonomyNode key={child.id} node={child} expanded={expanded} onToggle={onToggle} selectedId={selectedId} onSelect={onSelect} owned={owned} />)}</div>}</section>;
  return <>{node.definitionIds.map((definitionId) => { const item = itemById[definitionId]; return item ? <button type="button" key={item.id} className={`debug-item-browser-row ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => onSelect(item.id)}><PlaceholderArt icon={item.icon} size="small" variant={itemRarityArtVariant(item.rarity)} /><span><strong>{item.name}</strong><small>{item.category}</small></span><em>{owned.get(item.id) ?? 0}</em></button> : null; })}</>;
}

function DebugItemInspector({ item, game, debug, run }: { item: ItemDefinition; game: DebugGameState; debug: DebugTabProps["debug"]; run: DebugTabProps["run"] }) {
  const instances = getInstancesByDefinitionId(game.inventory, item.id);
  const equippedIds = new Set(Object.values(game.equipment.slots).filter((value): value is string => Boolean(value)));
  const [selectedCopy, setSelectedCopy] = useState(instances[0]?.id);
  const currentId = selectedCopy && instances.some((instance) => instance.id === selectedCopy) ? selectedCopy : instances[0]?.id;
  const resolved = currentId ? resolveItemInstance(game.inventory, currentId) : undefined;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteCopy = () => { if (!currentId) return; run(`Deleted ${item.name}.`, () => debug.deleteItemInstance(currentId)); setDeleteOpen(false); };
  return <aside className="debug-item-inspector"><header className="debug-item-inspector-header"><PlaceholderArt icon={item.icon} size="large" variant={itemRarityArtVariant(item.rarity)} /><div><span className="tiny-label">{item.category.toUpperCase()}</span><h3>{item.name}</h3><p>{getOwnedItemCount(game.inventory, item.id)} owned{item.upgradeTreeId ? " - Upgrade Tree" : ""}</p></div></header><div className="debug-item-ownership-actions"><DebugButton action="grant-item" onClick={() => run(`Granted ${item.name}.`, () => debug.grantItem(item.id, 1))}><PackagePlus size={13} />COPY +1</DebugButton><DebugButton action="grant-item-10" onClick={() => run(`Granted ${item.name} x10.`, () => debug.grantItem(item.id, 10))}>+10</DebugButton></div>{item.inventoryMode === "stackable" ? <p className="debug-item-empty">{getOwnedItemCount(game.inventory, item.id)} in one stack.</p> : <><div className="debug-copy-list">{instances.map((instance, index) => <button type="button" key={instance.id} className={`debug-copy-row ${currentId === instance.id ? "is-selected" : ""}`} onClick={() => setSelectedCopy(instance.id)}><span><strong>Copy {index + 1}</strong><small>{equippedIds.has(instance.id) ? `Equipped - ${getEquipmentSlotDefinition(equippedSlotForInstance(game.equipment, instance.id)!).label}` : "Unequipped"}</small></span><em>{instance.unlockedUpgradeNodeIds?.length ?? 0} nodes</em></button>)}</div>{resolved && <section className="debug-copy-inspector"><div className="debug-copy-heading"><strong>Selected copy</strong><small>{resolved.instance.id}</small></div><div className="debug-effective-stats">{formatItemStats(resolved.effectiveStats).map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div><button type="button" className="button button-danger" disabled={equippedIds.has(resolved.instance.id)} onClick={() => setDeleteOpen(true)}><Trash2 size={13} />Delete this copy</button><ConfirmDialog open={deleteOpen} title="Delete copy?" message="This exact item instance will be removed." confirmLabel="Delete Copy" onCancel={() => setDeleteOpen(false)} onConfirm={deleteCopy} /></section>}</>}</aside>;
}
