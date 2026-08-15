import { useMemo, useState } from "react";
import { itemDefinitions } from "../../../../game/data/items";
import { getDefensiveEquipmentContext } from "../../../../game/equipment/defensiveEquipment";
import { getMasteryLevelProgress } from "../../../../game/progression/masteryProgression";
import { buildItemTooltip } from "../../../../game/presentation/tooltipBuilders";
import { buildItemCatalogue, itemSearchText, nodeItemCount, type ItemCatalogueNode } from "../../../../game/presentation/itemCatalogue";
import { equipmentSlotKindLabel } from "../../../../game/equipment/equipmentTypes";
import { SearchField } from "../../../components/SearchField";
import { DebugButton } from "../components/DebugButton";
import { DebugCatalogueGroup } from "../components/DebugCatalogueGroup";
import { DebugCatalogueIdentity } from "../components/DebugCatalogueIdentity";
import { DebugFilterBar } from "../components/DebugFilterBar";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";
import type { DebugGameState } from "../debugTypes";
import { useGameStore } from "../../../../state/gameStore";

const filters = ["all", "equipment", "consumables", "materials", "currency"] as const;
type ItemFilter = (typeof filters)[number];

export function DebugItemsTab({ run, debug }: DebugTabProps) {
  const game = useGameStore((state) => state.game);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["debug.items.equipment", "debug.items.equipment.weapons", "debug.items.equipment.weapons.one-handed"]));
  const normalized = query.trim().toLowerCase();
  const items = useMemo(() => itemDefinitions.filter((item) => (filter === "all" || (filter === "equipment" ? Boolean(item.equipmentSlotKind) : item.category === filter.slice(0, -1) || item.category === filter)) && (!normalized || itemSearchText(item).includes(normalized))), [filter, normalized]);
  const nodes = useMemo(() => buildItemCatalogue(items), [items]);
  const defensiveContext = getDefensiveEquipmentContext(game.equipment);
  const masteryLevel = getMasteryLevelProgress(game.progression.masteryXp).level;
  return <div className="debug-tab-content debug-column"><DebugSection title="Item browser" subtitle={`${items.length} matching canonical definitions`} actions={<SearchField value={query} onChange={setQuery} placeholder="Search items..." label="Search items" debugKind="debug-item-search" />}><DebugFilterBar values={filters} value={filter} onChange={setFilter} labels={{ all: "ALL", equipment: "EQUIPMENT", consumables: "CONSUMABLES", materials: "MATERIALS", currency: "CURRENCY" }} /><div className="debug-catalogue debug-catalogue-tree">{nodes.map((node) => <ItemNode key={node.id} node={node} depth={0} expanded={expanded} query={normalized} onToggle={(id) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} game={game} run={run} debug={debug} defensiveContext={defensiveContext} masteryLevel={masteryLevel} />)}</div></DebugSection><DebugSection title="Prototype gear shortcuts" subtitle="Tier grants use two copies for shared Ring and Earring slots."><div className="debug-button-grid"><DebugButton action="grant-all-equipment-1" onClick={() => run("Granted all equipment x1.", () => debug.grantAllEquipment(1))}>GRANT ALL EQUIPMENT x1</DebugButton><DebugButton action="grant-all-equipment-2" onClick={() => run("Granted all equipment x2.", () => debug.grantAllEquipment(2))}>GRANT ALL EQUIPMENT x2</DebugButton><DebugButton action="grant-tier-1" onClick={() => run("Granted all level 1 gear.", () => debug.grantEquipmentTier(1))}>GRANT ALL LV 1 GEAR</DebugButton><DebugButton action="grant-tier-5" onClick={() => run("Granted all level 5 gear.", () => debug.grantEquipmentTier(5))}>GRANT ALL LV 5 GEAR</DebugButton><DebugButton action="grant-tier-10" onClick={() => run("Granted all level 10 gear.", () => debug.grantEquipmentTier(10))}>GRANT ALL LV 10 GEAR</DebugButton></div></DebugSection></div>;
}

function ItemNode({ node, depth, expanded, query, onToggle, game, run, debug, defensiveContext, masteryLevel }: { node: ItemCatalogueNode; depth: number; expanded: Set<string>; query: string; onToggle: (id: string) => void; game: DebugGameState; run: DebugTabProps["run"]; debug: DebugTabProps["debug"]; defensiveContext: ReturnType<typeof getDefensiveEquipmentContext>; masteryLevel: number }) {
  const open = query ? true : expanded.has(node.id);
  return <DebugCatalogueGroup id={node.id} label={node.label} count={nodeItemCount(node)} icon={node.icon} depth={depth} expanded={open} onToggle={() => onToggle(node.id)} debugGroupType="items">{node.children.map((child) => <ItemNode key={child.id} node={child} depth={depth + 1} expanded={expanded} query={query} onToggle={onToggle} game={game} run={run} debug={debug} defensiveContext={defensiveContext} masteryLevel={masteryLevel} />)}{node.items.map((item) => <DebugItemRow key={item.id} item={item} quantity={game.inventory.quantities[item.id] ?? 0} equipped={Object.values(game.equipment.slots).includes(item.id)} run={run} debug={debug} defensiveContext={defensiveContext} masteryLevel={masteryLevel} />)}</DebugCatalogueGroup>;
}

function DebugItemRow({ item, quantity, equipped, run, debug, defensiveContext, masteryLevel }: { item: (typeof itemDefinitions)[number]; quantity: number; equipped: boolean; run: DebugTabProps["run"]; debug: DebugTabProps["debug"]; defensiveContext: ReturnType<typeof getDefensiveEquipmentContext>; masteryLevel: number }) {
  const [amount, setAmount] = useState(String(quantity));
  const variant = item.rarity === "rare" ? "gold" : item.rarity === "uncommon" ? "blue" : "muted";
  const family = item.weaponProficiencyId ?? item.defensiveProficiencyId ?? (item.equipmentSlotKind ? equipmentSlotKindLabel(item.equipmentSlotKind) : item.category);
  return <div className="debug-catalogue-row debug-item-row" data-debug-kind="debug-item" data-debug-item-id={item.id}><DebugCatalogueIdentity tooltip={buildItemTooltip(item, { quantity, masteryLevel, defensiveContext, equipped })} icon={item.icon} variant={variant} kind="debug-item-identity" targetId={item.id} label={item.name}><strong>{item.name}</strong><small>{item.rarity} - {family}{item.requiredMasteryLevel ? ` - Requires Lv ${item.requiredMasteryLevel}` : ""}</small><em>{quantity} owned{equipped ? " - EQUIPPED" : ""}</em></DebugCatalogueIdentity><button type="button" onClick={() => run(`Granted 1 x ${item.name}.`, () => debug.grantItem(item.id, 1))} data-debug-kind="debug-action" data-debug-action="grant-item" data-debug-item-id={item.id}>+1</button><button type="button" onClick={() => run(`Granted 10 x ${item.name}.`, () => debug.grantItem(item.id, 10))} data-debug-kind="debug-action" data-debug-action="grant-item" data-debug-item-id={item.id}>+10</button><input value={amount} onChange={(event) => setAmount(event.target.value)} aria-label={`Set ${item.name} quantity`} inputMode="numeric" /><button type="button" onClick={() => run(`Set ${item.name} quantity to ${amount}.`, () => debug.setItemQuantity(item.id, Number(amount)))} data-debug-kind="debug-action" data-debug-action="set-item-quantity" data-debug-item-id={item.id}>SET</button></div>;
}
