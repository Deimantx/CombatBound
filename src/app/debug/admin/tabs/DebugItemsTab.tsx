import { useEffect, useMemo, useState } from "react";
import { ChevronRight, PackagePlus, RotateCcw, Trash2 } from "lucide-react";
import { itemAffixDefinitions } from "../../../../game/data/itemAffixes";
import { itemById, itemDefinitions, type ItemDefinition } from "../../../../game/data/items";
import { proficiencyById } from "../../../../game/data/proficiencies";
import { equippedSlotForInstance } from "../../../../game/equipment/equipmentRules";
import { equipmentSlotKindLabel, getEquipmentSlotDefinition } from "../../../../game/equipment/equipmentTypes";
import { getInstancesByDefinitionId, getOwnedItemCount } from "../../../../game/items/itemOwnership";
import { isAffixTierApplicable } from "../../../../game/items/itemInstanceValidation";
import { resolveItemInstance } from "../../../../game/items/itemResolver";
import { itemModifierDisplays } from "../../../../game/presentation/itemPresentation";
import { itemRarityArtVariant } from "../../../../game/presentation/itemRarity";
import { buildItemTaxonomy, filterItemTaxonomy, type ItemTaxonomyNode } from "../../../../game/presentation/itemTaxonomy";
import { formatItemStats } from "../../../../game/presentation/statFormatting";
import { hunterRankForPoints } from "../../../../game/progression/hunterRankProgression";
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
const treeStorageKey = "combatbound-debug-item-tree-v1";
const defaultExpandedTreeIds = ["items.equipment", "items.equipment.weapons", "items.equipment.weapons.one-handed"];

function itemTypeLabel(item: ItemDefinition) {
  return item.equipmentSlotKind ? equipmentSlotKindLabel(item.equipmentSlotKind) : item.category[0].toUpperCase() + item.category.slice(1);
}

function itemFamilyLabel(item: ItemDefinition) {
  const proficiencyId = item.weaponProficiencyId ?? item.defensiveProficiencyId;
  return proficiencyId ? proficiencyById[proficiencyId]?.name ?? itemTypeLabel(item) : itemTypeLabel(item);
}

function itemMatches(item: ItemDefinition, query: string) {
  if (!query) return true;
  const affixText = itemAffixDefinitions.filter((affix) => affix.tiers.some((tier) => isAffixTierApplicable(item, affix, tier))).map((affix) => affix.name).join(" ");
  return [item.name, item.category, item.rarity, itemTypeLabel(item), item.weaponProficiencyId ?? "", item.defensiveProficiencyId ?? "", affixText].join(" ").toLowerCase().includes(query);
}

export function DebugItemsTab({ run, debug }: DebugTabProps) {
  const game = useGameStore((state) => state.game);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [selectedId, setSelectedId] = useState("item.training-sword");
  const normalized = query.trim().toLowerCase();
  const items = useMemo(() => itemDefinitions.filter((item) => {
    const categoryMatch = filter === "all" || filter === "equipment" && Boolean(item.equipmentSlotKind) || filter === "consumables" && item.category === "consumable" || filter === "materials" && item.category === "material" || filter === "currency" && item.category === "currency";
    return categoryMatch && itemMatches(item, normalized);
  }), [filter, normalized]);
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0];
  const taxonomy = useMemo(() => filterItemTaxonomy(buildItemTaxonomy(itemDefinitions), new Set(items.map((item) => item.id))), [items]);

  return <div className="debug-tab-content debug-column debug-items-tab" data-debug-kind="debug-items-workspace">
    <DebugSection title="Item browser" subtitle={`${items.length} matching canonical definitions`} actions={<SearchField value={query} onChange={setQuery} placeholder="Search by name, type, rarity, affix..." label="Search items" debugKind="debug-item-search" />}>
      <DebugFilterBar values={filters} value={filter} onChange={setFilter} labels={{ all: "ALL", equipment: "EQUIPMENT", consumables: "CONSUMABLES", materials: "MATERIALS", currency: "CURRENCY" }} />
      <div className="debug-items-workspace-grid">
        <div className="debug-item-browser" data-debug-kind="debug-item-browser">{taxonomy ? <DebugItemTree taxonomy={taxonomy} game={game} selectedId={selectedItem?.id} onSelect={setSelectedId} searching={Boolean(normalized)} /> : <p className="debug-item-empty">No definitions match this search.</p>}</div>
        {selectedItem ? <DebugItemInspector key={selectedItem.id} item={selectedItem} game={game} debug={debug} run={run} /> : <div className="debug-item-inspector"><p className="debug-item-empty">No item definition matches this search.</p></div>}
      </div>
    </DebugSection>
    <DebugSection title="Prototype gear shortcuts" subtitle="Tier grants use two copies for shared Ring and Earring slots."><div className="debug-button-grid"><DebugButton action="grant-all-equipment-1" onClick={() => run("Granted all equipment x1.", () => debug.grantAllEquipment(1))}>GRANT ALL EQUIPMENT x1</DebugButton><DebugButton action="grant-all-equipment-2" onClick={() => run("Granted all equipment x2.", () => debug.grantAllEquipment(2))}>GRANT ALL EQUIPMENT x2</DebugButton><DebugButton action="grant-hunter-rank-1" onClick={() => run("Granted all Hunter Rank 1 gear.", () => debug.grantEquipmentTier(1))}>GRANT ALL HUNTER RANK 1 GEAR</DebugButton><DebugButton action="grant-hunter-rank-5" onClick={() => run("Granted all Hunter Rank 5 gear.", () => debug.grantEquipmentTier(5))}>GRANT ALL HUNTER RANK 5 GEAR</DebugButton><DebugButton action="grant-hunter-rank-10" onClick={() => run("Granted all Hunter Rank 10 gear.", () => debug.grantEquipmentTier(10))}>GRANT ALL HUNTER RANK 10 GEAR</DebugButton></div></DebugSection>
  </div>;
}

function DebugItemTree({ taxonomy, game, selectedId, onSelect, searching }: { taxonomy: ItemTaxonomyNode; game: DebugGameState; selectedId?: string; onSelect: (id: string) => void; searching: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(treeStorageKey) ?? "null");
      return Array.isArray(saved) ? new Set(saved.filter((id): id is string => typeof id === "string")) : new Set(defaultExpandedTreeIds);
    } catch { return new Set(defaultExpandedTreeIds); }
  });
  useEffect(() => { try { localStorage.setItem(treeStorageKey, JSON.stringify([...expanded])); } catch { /* optional browser storage */ } }, [expanded]);
  const ownedByDefinition = useMemo(() => {
    const counts = new Map<string, number>();
    for (const instance of Object.values(game.inventory.instances)) counts.set(instance.definitionId, (counts.get(instance.definitionId) ?? 0) + 1);
    for (const [definitionId, quantity] of Object.entries(game.inventory.stackables)) if (quantity > 0) counts.set(definitionId, 1);
    return counts;
  }, [game.inventory]);
  const equippedByDefinition = useMemo(() => {
    const counts = new Map<string, number>();
    for (const instanceId of Object.values(game.equipment.slots)) {
      const instance = instanceId ? game.inventory.instances[instanceId] : undefined;
      if (instance) counts.set(instance.definitionId, (counts.get(instance.definitionId) ?? 0) + 1);
    }
    return counts;
  }, [game.equipment, game.inventory]);
  const toggle = (id: string) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <div className="debug-item-taxonomy-tree">{taxonomy.children.map((node) => <DebugTaxonomyNode key={node.id} node={node} expanded={expanded} searching={searching} onToggle={toggle} selectedId={selectedId} onSelect={onSelect} ownedByDefinition={ownedByDefinition} equippedByDefinition={equippedByDefinition} />)}</div>;
}

function DebugTaxonomyNode({ node, expanded, searching, onToggle, selectedId, onSelect, ownedByDefinition, equippedByDefinition }: { node: ItemTaxonomyNode; expanded: Set<string>; searching: boolean; onToggle: (id: string) => void; selectedId?: string; onSelect: (id: string) => void; ownedByDefinition: Map<string, number>; equippedByDefinition: Map<string, number> }) {
  const open = searching || expanded.has(node.id);
  if (node.children.length) return <section className="debug-item-tree-branch" data-debug-kind="debug-item-tree-branch"><button type="button" className="debug-item-tree-branch-header" onClick={() => onToggle(node.id)} aria-expanded={open} aria-controls={`debug-tree-${node.id}`}><DisclosureChevron open={open} /><strong>{node.label}</strong><span>{node.definitionIds.length}</span></button>{open && <div id={`debug-tree-${node.id}`} className="debug-item-tree-children">{node.children.map((child) => <DebugTaxonomyNode key={child.id} node={child} expanded={expanded} searching={searching} onToggle={onToggle} selectedId={selectedId} onSelect={onSelect} ownedByDefinition={ownedByDefinition} equippedByDefinition={equippedByDefinition} />)}</div>}</section>;
  return <>{node.definitionIds.map((definitionId) => <DebugItemDefinitionRow key={definitionId} item={itemById[definitionId]} selectedId={selectedId} onSelect={onSelect} ownedByDefinition={ownedByDefinition} equippedByDefinition={equippedByDefinition} />)}</>;
}

function DebugItemDefinitionRow({ item, selectedId, onSelect, ownedByDefinition, equippedByDefinition }: { item?: ItemDefinition; selectedId?: string; onSelect: (id: string) => void; ownedByDefinition: Map<string, number>; equippedByDefinition: Map<string, number> }) {
  if (!item) return null;
  const owned = ownedByDefinition.get(item.id) ?? 0;
  const equipped = equippedByDefinition.get(item.id) ?? 0;
  return <button type="button" className={`debug-item-browser-row ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => onSelect(item.id)} data-debug-kind="debug-item" data-debug-item-id={item.id} data-debug-label={item.name} aria-label={`Inspect ${item.name}`}><PlaceholderArt icon={item.icon} size="small" variant={itemRarityArtVariant(item.rarity)} /><span><strong>{item.name}</strong><small>{itemFamilyLabel(item)}</small></span><em>{owned}{equipped > 0 ? `  /  ${equipped} equipped` : ""}</em><ChevronRight size={14} aria-hidden="true" /></button>;
}

function DebugItemInspector({ item, game, debug, run }: { item: ItemDefinition; game: DebugGameState; debug: DebugTabProps["debug"]; run: DebugTabProps["run"] }) {
  const [setCountOpen, setSetCountOpen] = useState(false);
  const [countDraft, setCountDraft] = useState(String(getOwnedItemCount(game.inventory, item.id)));
  const [selectedCopyId, setSelectedCopyId] = useState<string | undefined>(() => getInstancesByDefinitionId(game.inventory, item.id)[0]?.id);
  const instances = getInstancesByDefinitionId(game.inventory, item.id);
  const selectedCopy = selectedCopyId && instances.some((instance) => instance.id === selectedCopyId) ? selectedCopyId : instances[0]?.id;
  const equippedIds = new Set(Object.values(game.equipment.slots).filter((value): value is string => Boolean(value)));
  const hunterRank = hunterRankForPoints(game.progression.hunterRankPoints);
  const owned = getOwnedItemCount(game.inventory, item.id);
  const deleteCopy = (instanceId: string) => {
    const index = instances.findIndex((instance) => instance.id === instanceId);
    const nextSelection = instances[index + 1]?.id ?? instances[index - 1]?.id;
    run(`Deleted ${item.name} Copy ${index + 1}.`, () => debug.deleteItemInstance(instanceId));
    setSelectedCopyId(nextSelection);
  };
  return <aside className="debug-item-inspector" data-debug-kind="debug-item-inspector" data-debug-item-id={item.id}>
    <header className="debug-item-inspector-header"><PlaceholderArt icon={item.icon} size="large" variant={itemRarityArtVariant(item.rarity)} /><div><span className="tiny-label">{itemTypeLabel(item).toUpperCase()}</span><h3>{item.name}</h3><p>{item.rarity}  /  Hunter Rank {item.requiredHunterRank ?? "N/A"}  /  {owned} owned{item.inventoryMode === "instance" && instances.some((instance) => equippedIds.has(instance.id)) ? "  /  Equipped" : ""}</p></div></header>
    <div className="debug-item-ownership"><div className="debug-item-ownership-actions"><DebugButton action="grant-item" onClick={() => run(`Granted 1 x ${item.name}.`, () => debug.grantItem(item.id, 1))}><PackagePlus size={13} />{item.inventoryMode === "instance" ? "COPY +1" : "+1"}</DebugButton><DebugButton action="grant-item-10" onClick={() => run(`Granted 10 x ${item.name}.`, () => debug.grantItem(item.id, 10))}>{item.inventoryMode === "instance" ? "COPY +10" : "+10"}</DebugButton><button type="button" className="debug-text-button" onClick={() => setSetCountOpen((value) => !value)}>{item.inventoryMode === "instance" ? "SET COPIES" : "SET QUANTITY"}</button></div>{setCountOpen && <div className="debug-set-count-popover"><label>New {item.inventoryMode === "instance" ? "copy count" : "quantity"}<input value={countDraft} onChange={(event) => setCountDraft(event.target.value)} inputMode="numeric" aria-label={`Set ${item.name} ${item.inventoryMode === "instance" ? "copy count" : "quantity"}`} /></label><button type="button" className="debug-primary-button" onClick={() => { run(`Set ${item.name} owned count to ${countDraft}.`, () => debug.setOwnedItemCount(item.id, Number(countDraft))); setSetCountOpen(false); }}>APPLY</button><small>Equipped copies are protected; unequipped copies are removed first.</small></div>}</div>
    {item.inventoryMode === "stackable" ? <div className="debug-stackable-inspector"><strong>{owned.toLocaleString()} in one stack</strong><p>Stackable definitions have quantity only. They do not have copies, quality, upgrades, or affixes.</p></div> : <><div className="debug-copy-list"><div className="debug-inspector-label">OWNED COPIES <span>{instances.length}</span></div>{instances.length ? instances.map((instance, index) => <button type="button" key={instance.id} className={`debug-copy-row ${selectedCopy === instance.id ? "is-selected" : ""}`} onClick={() => setSelectedCopyId(instance.id)} data-debug-kind="debug-item-copy" data-debug-instance-id={instance.id} aria-label={`Inspect ${item.name} Copy ${index + 1}`}><span><strong>Copy {index + 1}</strong><small>{equippedIds.has(instance.id) ? `Equipped  /  ${getEquipmentSlotDefinition(equippedSlotForInstance(game.equipment, instance.id)!).label}` : "Unequipped"}</small></span><em>Q{instance.quality}  /  +{instance.upgradeLevel}  /  {instance.affixes.length} mod{instance.affixes.length === 1 ? "" : "s"}</em></button>) : <p className="debug-item-empty">No owned copies. Grant a copy to inspect it.</p>}</div>{selectedCopy && <DebugCopyInspector key={selectedCopy} item={item} instanceId={selectedCopy} game={game} debug={debug} run={run} hunterRank={hunterRank} equipped={equippedIds.has(selectedCopy)} copyNumber={instances.findIndex((instance) => instance.id === selectedCopy) + 1} onDelete={deleteCopy} />}</>}
  </aside>;
}

function DebugCopyInspector({ item, instanceId, game, debug, run, hunterRank, equipped, copyNumber, onDelete }: { item: ItemDefinition; instanceId: string; game: DebugGameState; debug: DebugTabProps["debug"]; run: DebugTabProps["run"]; hunterRank: number; equipped: boolean; copyNumber: number; onDelete: (instanceId: string) => void }) {
  const resolved = resolveItemInstance(game.inventory, instanceId);
  const [qualityDraft, setQualityDraft] = useState(String(resolved?.instance.quality ?? 0));
  const [upgradeDraft, setUpgradeDraft] = useState(String(resolved?.instance.upgradeLevel ?? 0));
  const [affixChoice, setAffixChoice] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (!resolved) return null;
  const affixes = resolved.instance.affixes;
  const availableTiers = itemAffixDefinitions.flatMap((affix) => affix.tiers.filter((tier) => isAffixTierApplicable(item, affix, tier) && !affixes.some((entry) => entry.affixId === affix.id)).map((tier) => ({ affix, tier })));
  const applyQuality = (value: number) => { const next = Number.isFinite(value) ? Math.max(0, Math.min(20, Math.floor(value))) : 0; setQualityDraft(String(next)); run(`Set ${item.name} quality to ${next}.`, () => debug.setItemQuality(instanceId, next)); };
  const applyUpgrade = (value: number) => { const next = Number.isFinite(value) ? Math.max(0, Math.min(10, Math.floor(value))) : 0; setUpgradeDraft(String(next)); run(`Set ${item.name} upgrade to ${next}.`, () => debug.setItemUpgradeLevel(instanceId, next)); };
  return <section className="debug-copy-inspector" data-debug-kind="debug-copy-inspector" data-debug-instance-id={instanceId}>
    <div className="debug-copy-heading"><div><span className="tiny-label">SELECTED COPY</span><strong>{item.name}</strong><small>{equipped ? "Equipped copy" : "Unequipped copy"}  /  Hunter Rank {hunterRank}</small></div><span className="debug-copy-sequence">Copy {copyNumber}</span></div>
    <div className="debug-copy-controls"><DebugEditorField label="Quality" value={resolved.instance.quality} draft={qualityDraft} setDraft={setQualityDraft} apply={applyQuality} max={20} /><DebugEditorField label="Upgrade" value={resolved.instance.upgradeLevel} draft={upgradeDraft} setDraft={setUpgradeDraft} apply={applyUpgrade} max={10} /></div>
    <div className="debug-affix-editor"><div className="debug-inspector-label">ADD AFFIX <span>{availableTiers.length} valid tiers</span></div><div className="debug-affix-add-row"><select value={affixChoice} onChange={(event) => setAffixChoice(event.target.value)} aria-label={`Choose affix for ${item.name}`}><option value="">Choose an exact valid tier...</option>{availableTiers.map(({ affix, tier }) => <option key={`${affix.id}.${tier.id}`} value={`${affix.id}|${tier.id}`}>{affix.name}  /  T{tier.tier} {affix.kind}</option>)}</select><button type="button" className="debug-primary-button" disabled={!affixChoice} onClick={() => { const [affixId, tierId] = affixChoice.split("|"); const affix = itemAffixDefinitions.find((candidate) => candidate.id === affixId); run(`Added ${affix?.name ?? "affix"} T${tierId} to ${item.name}.`, () => debug.addItemAffix(instanceId, affixId, tierId)); setAffixChoice(""); }}>ADD</button></div></div>
    <div className="debug-affix-list">{affixes.length ? affixes.map((affixInstance) => { const presentation = itemModifierDisplays(resolved).filter((entry) => entry.id.startsWith(`${affixInstance.affixId}.`)); const affix = itemAffixDefinitions.find((candidate) => candidate.id === affixInstance.affixId); const tier = affix?.tiers.find((candidate) => candidate.id === affixInstance.tierId); return <div className="debug-affix-row" key={affixInstance.affixId} data-debug-kind="debug-instance-affix" data-debug-instance-id={instanceId} data-debug-affix-id={affixInstance.affixId}><div><strong>{affix?.name ?? "Unknown affix"}  /  T{tier?.tier ?? "?"}</strong>{presentation.map((modifier) => <small key={modifier.id}>{modifier.label}: {modifier.value}</small>)}</div><div><button type="button" onClick={() => { setFeedback(`${affix?.name ?? "Affix"} rerolled.`); run(`Rerolled ${affix?.name ?? affixInstance.affixId} on ${item.name}.`, () => debug.rerollItemAffix(instanceId, affixInstance.affixId)); }} data-debug-action="reroll-item-affix" data-debug-instance-id={instanceId}><RotateCcw size={13} />REROLL</button><button type="button" onClick={() => run(`Removed ${affix?.name ?? affixInstance.affixId} from ${item.name}.`, () => debug.removeItemAffix(instanceId, affixInstance.affixId))} data-debug-action="remove-item-affix" data-debug-instance-id={instanceId}><Trash2 size={13} />REMOVE</button></div></div>; }) : <p className="debug-item-empty">No affixes on this copy.</p>}</div>
    {feedback && <p className="debug-feedback" role="status">{feedback} Values update above after the mutation.</p>}
    <div className="debug-effective-stats"><div className="debug-inspector-label">EFFECTIVE STATS</div>{formatItemStats(resolved.effectiveStats).map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div>
    <section className="debug-copy-actions"><header>Copy Actions</header><button type="button" className="button button-danger" disabled={equipped} title={equipped ? "Unequip this copy before deleting it." : undefined} onClick={() => setDeleteOpen(true)}><Trash2 size={13} />Delete This Copy</button>{equipped && <small>Unequip this copy before deleting it.</small>}</section>
    <button type="button" className="debug-advanced-toggle" onClick={() => setAdvancedOpen((value) => !value)} aria-expanded={advancedOpen} aria-controls={`debug-advanced-${instanceId}`}><DisclosureChevron open={advancedOpen} />Advanced technical data</button>{advancedOpen && <div id={`debug-advanced-${instanceId}`} className="debug-advanced-data"><code>Instance: {resolved.instance.id}</code><code>Definition: {resolved.instance.definitionId}</code>{resolved.instance.affixes.map((affix) => <code key={affix.affixId}>Affix: {affix.affixId}  /  Tier: {affix.tierId}  /  Rolls: {JSON.stringify(affix.rolls)}</code>)}</div>}
    <ConfirmDialog open={deleteOpen} title={`Delete Copy ${copyNumber}?`} message={`${item.name}\nQuality ${resolved.instance.quality}%  /  Upgrade +${resolved.instance.upgradeLevel}\nThis exact copy will be removed permanently.`} confirmLabel="Delete Copy" onCancel={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); onDelete(instanceId); }} />
  </section>;
}

function DebugEditorField({ label, value, draft, setDraft, apply, max }: { label: string; value: number; draft: string; setDraft: (value: string) => void; apply: (value: number) => void; max: number }) {
  return <div className="debug-editor-field"><label>{label}</label><div><button type="button" onClick={() => apply(value - 1)} aria-label={`Decrease ${label.toLowerCase()}`}>-</button><input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={`Set ${label.toLowerCase()}`} inputMode="numeric" /><button type="button" onClick={() => apply(value + 1)} aria-label={`Increase ${label.toLowerCase()}`}>+</button><button type="button" onClick={() => apply(max)}>MAX</button><button type="button" onClick={() => apply(0)}>RESET</button><button type="button" className="debug-primary-button" onClick={() => apply(Number(draft))}>APPLY</button></div></div>;
}
