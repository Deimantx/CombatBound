import { useMemo, useState } from "react";
import { ChevronRight, PackagePlus, RotateCcw, Trash2 } from "lucide-react";
import { itemAffixDefinitions } from "../../../../game/data/itemAffixes";
import { itemDefinitions, type ItemDefinition } from "../../../../game/data/items";
import { equipmentSlotKindLabel } from "../../../../game/equipment/equipmentTypes";
import { equippedSlotForInstance } from "../../../../game/equipment/equipmentRules";
import { getOwnedItemCount, getInstancesByDefinitionId } from "../../../../game/items/itemOwnership";
import { isAffixTierApplicable } from "../../../../game/items/itemInstanceValidation";
import { resolveItemInstance } from "../../../../game/items/itemResolver";
import { itemModifierDisplays } from "../../../../game/presentation/itemPresentation";
import { formatItemStats } from "../../../../game/presentation/statFormatting";
import { getMasteryLevelProgress } from "../../../../game/progression/masteryProgression";
import { useGameStore } from "../../../../state/gameStore";
import { DisclosureChevron } from "../../../components/DisclosureChevron";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { SearchField } from "../../../components/SearchField";
import { DebugButton } from "../components/DebugButton";
import { DebugFilterBar } from "../components/DebugFilterBar";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps, DebugGameState } from "../debugTypes";

const filters = ["all", "equipment", "consumables", "materials", "currency"] as const;
type ItemFilter = (typeof filters)[number];

function itemTypeLabel(item: ItemDefinition) {
  return item.equipmentSlotKind ? equipmentSlotKindLabel(item.equipmentSlotKind) : item.category[0].toUpperCase() + item.category.slice(1);
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
  const equipmentGroups = [
    { id: "weapons", label: "Weapons", items: items.filter((item) => item.equipmentSlotKind === "weapon") },
    { id: "offhands", label: "Offhands", items: items.filter((item) => item.equipmentSlotKind === "offhand") },
    { id: "armor", label: "Armor", items: items.filter((item) => ["head", "armor", "gloves", "boots"].includes(item.equipmentSlotKind ?? "")) },
    { id: "accessories", label: "Accessories", items: items.filter((item) => ["belt", "cape", "necklace", "ring", "earring"].includes(item.equipmentSlotKind ?? "")) },
  ];
  const nonEquipment = items.filter((item) => !item.equipmentSlotKind);

  return <div className="debug-tab-content debug-column debug-items-tab" data-debug-kind="debug-items-workspace">
    <DebugSection title="Item browser" subtitle={`${items.length} matching canonical definitions`} actions={<SearchField value={query} onChange={setQuery} placeholder="Search by name, type, rarity, affix..." label="Search items" debugKind="debug-item-search" />}>
      <DebugFilterBar values={filters} value={filter} onChange={setFilter} labels={{ all: "ALL", equipment: "EQUIPMENT", consumables: "CONSUMABLES", materials: "MATERIALS", currency: "CURRENCY" }} />
      <div className="debug-items-workspace-grid">
        <div className="debug-item-browser" data-debug-kind="debug-item-browser">
          {filter === "all" || filter === "equipment" ? equipmentGroups.map((group) => <DebugItemGroup key={group.id} label={group.label} items={group.items} selectedId={selectedItem?.id} game={game} onSelect={setSelectedId} />) : null}
          {filter !== "equipment" && nonEquipment.length > 0 && <DebugItemGroup label="Resources" items={nonEquipment} selectedId={selectedItem?.id} game={game} onSelect={setSelectedId} />}
          {!items.length && <p className="debug-item-empty">No definitions match this search.</p>}
        </div>
        {selectedItem ? <DebugItemInspector key={selectedItem.id} item={selectedItem} game={game} debug={debug} run={run} /> : <div className="debug-item-inspector"><p className="debug-item-empty">No item definition matches this search.</p></div>}
      </div>
    </DebugSection>
    <DebugSection title="Prototype gear shortcuts" subtitle="Tier grants use two copies for shared Ring and Earring slots."><div className="debug-button-grid"><DebugButton action="grant-all-equipment-1" onClick={() => run("Granted all equipment x1.", () => debug.grantAllEquipment(1))}>GRANT ALL EQUIPMENT x1</DebugButton><DebugButton action="grant-all-equipment-2" onClick={() => run("Granted all equipment x2.", () => debug.grantAllEquipment(2))}>GRANT ALL EQUIPMENT x2</DebugButton><DebugButton action="grant-tier-1" onClick={() => run("Granted all level 1 gear.", () => debug.grantEquipmentTier(1))}>GRANT ALL LV 1 GEAR</DebugButton><DebugButton action="grant-tier-5" onClick={() => run("Granted all level 5 gear.", () => debug.grantEquipmentTier(5))}>GRANT ALL LV 5 GEAR</DebugButton><DebugButton action="grant-tier-10" onClick={() => run("Granted all level 10 gear.", () => debug.grantEquipmentTier(10))}>GRANT ALL LV 10 GEAR</DebugButton></div></DebugSection>
  </div>;
}

function DebugItemGroup({ label, items, selectedId, game, onSelect }: { label: string; items: ItemDefinition[]; selectedId?: string; game: DebugGameState; onSelect: (id: string) => void }) {
  if (!items.length) return null;
  return <section className="debug-item-group" data-debug-kind="debug-item-group" data-debug-group-label={label}><header><strong>{label}</strong><span>{items.length}</span></header>{items.map((item) => {
    const owned = getOwnedItemCount(game.inventory, item.id);
    const instances = item.inventoryMode === "instance" ? getInstancesByDefinitionId(game.inventory, item.id) : [];
    const equipped = instances.filter((instance) => Boolean(equippedSlotForInstance(game.equipment, instance.id))).length;
    return <button type="button" key={item.id} className={`debug-item-browser-row ${selectedId === item.id ? "is-selected" : ""}`} onClick={() => onSelect(item.id)} data-debug-kind="debug-item" data-debug-item-id={item.id} data-debug-label={item.name} aria-label={`Inspect ${item.name}`}>
      <PlaceholderArt icon={item.icon} size="small" variant={item.rarity === "rare" ? "gold" : item.rarity === "uncommon" ? "blue" : "muted"} /><span><strong>{item.name}</strong><small>{itemTypeLabel(item)} · {item.rarity}</small></span><em>{owned}{item.inventoryMode === "instance" ? ` owned${equipped ? ` · ${equipped} equipped` : ""}` : ""}</em><ChevronRight size={14} aria-hidden="true" />
    </button>;
  })}</section>;
}

function DebugItemInspector({ item, game, debug, run }: { item: ItemDefinition; game: DebugGameState; debug: DebugTabProps["debug"]; run: DebugTabProps["run"] }) {
  const [setCountOpen, setSetCountOpen] = useState(false);
  const [countDraft, setCountDraft] = useState(String(getOwnedItemCount(game.inventory, item.id)));
  const [selectedCopyId, setSelectedCopyId] = useState<string | undefined>(() => getInstancesByDefinitionId(game.inventory, item.id)[0]?.id);
  const instances = getInstancesByDefinitionId(game.inventory, item.id);
  const selectedCopy = selectedCopyId && instances.some((instance) => instance.id === selectedCopyId) ? selectedCopyId : instances[0]?.id;
  const equippedIds = new Set(Object.values(game.equipment.slots).filter((value): value is string => Boolean(value)));
  const masteryLevel = getMasteryLevelProgress(game.progression.masteryXp).level;
  const owned = getOwnedItemCount(game.inventory, item.id);

  return <aside className="debug-item-inspector" data-debug-kind="debug-item-inspector" data-debug-item-id={item.id}>
    <header className="debug-item-inspector-header"><PlaceholderArt icon={item.icon} size="large" variant={item.rarity === "rare" ? "gold" : item.rarity === "uncommon" ? "blue" : "muted"} /><div><span className="tiny-label">{itemTypeLabel(item).toUpperCase()}</span><h3>{item.name}</h3><p>{item.rarity} · Mastery {item.requiredMasteryLevel ?? "—"} · {owned} owned{item.inventoryMode === "instance" && instances.some((instance) => equippedIds.has(instance.id)) ? " · Equipped" : ""}</p></div></header>
    <div className="debug-item-ownership"><div className="debug-item-ownership-actions"><DebugButton action="grant-item" onClick={() => run(`Granted 1 x ${item.name}.`, () => debug.grantItem(item.id, 1))}><PackagePlus size={13} />{item.inventoryMode === "instance" ? "COPY +1" : "+1"}</DebugButton><DebugButton action="grant-item-10" onClick={() => run(`Granted 10 x ${item.name}.`, () => debug.grantItem(item.id, 10))}>{item.inventoryMode === "instance" ? "COPY +10" : "+10"}</DebugButton><button type="button" className="debug-text-button" onClick={() => setSetCountOpen((value) => !value)}>{item.inventoryMode === "instance" ? "SET COPIES" : "SET QUANTITY"}</button></div>{setCountOpen && <div className="debug-set-count-popover"><label>New {item.inventoryMode === "instance" ? "copy count" : "quantity"}<input value={countDraft} onChange={(event) => setCountDraft(event.target.value)} inputMode="numeric" aria-label={`Set ${item.name} ${item.inventoryMode === "instance" ? "copy count" : "quantity"}`} /></label><button type="button" className="debug-primary-button" onClick={() => { run(`Set ${item.name} owned count to ${countDraft}.`, () => debug.setOwnedItemCount(item.id, Number(countDraft))); setSetCountOpen(false); }}>APPLY</button><small>Equipped copies are protected; unequipped copies are removed first.</small></div>}</div>
    {item.inventoryMode === "stackable" ? <div className="debug-stackable-inspector"><strong>{owned.toLocaleString()} in one stack</strong><p>Stackable definitions have quantity only. They do not have copies, quality, upgrades, or affixes.</p></div> : <><div className="debug-copy-list"><div className="debug-inspector-label">OWNED COPIES <span>{instances.length}</span></div>{instances.length ? instances.map((instance, index) => <button type="button" key={instance.id} className={`debug-copy-row ${selectedCopy === instance.id ? "is-selected" : ""}`} onClick={() => setSelectedCopyId(instance.id)} data-debug-kind="debug-item-copy" data-debug-instance-id={instance.id} aria-label={`Inspect ${item.name} Copy ${index + 1}`}><span><strong>Copy {index + 1}</strong><small>{equippedIds.has(instance.id) ? `Equipped · ${equippedSlotForInstance(game.equipment, instance.id)}` : "Unequipped"}</small></span><em>Q{instance.quality} · +{instance.upgradeLevel} · {instance.affixes.length} mod{instance.affixes.length === 1 ? "" : "s"}</em></button>) : <p className="debug-item-empty">No owned copies. Grant a copy to inspect it.</p>}</div>{selectedCopy && <DebugCopyInspector key={selectedCopy} item={item} instanceId={selectedCopy} game={game} debug={debug} run={run} masteryLevel={masteryLevel} equipped={equippedIds.has(selectedCopy)} />}</>}
  </aside>;
}

function DebugCopyInspector({ item, instanceId, game, debug, run, masteryLevel, equipped }: { item: ItemDefinition; instanceId: string; game: DebugGameState; debug: DebugTabProps["debug"]; run: DebugTabProps["run"]; masteryLevel: number; equipped: boolean }) {
  const resolved = resolveItemInstance(game.inventory, instanceId);
  const [qualityDraft, setQualityDraft] = useState(String(resolved?.instance.quality ?? 0));
  const [upgradeDraft, setUpgradeDraft] = useState(String(resolved?.instance.upgradeLevel ?? 0));
  const [affixChoice, setAffixChoice] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  if (!resolved) return null;
  const affixes = resolved.instance.affixes;
  const availableTiers = itemAffixDefinitions.flatMap((affix) => affix.tiers.filter((tier) => isAffixTierApplicable(item, affix, tier) && !affixes.some((entry) => entry.affixId === affix.id)).map((tier) => ({ affix, tier })));
  const applyQuality = (value: number) => { const next = Number.isFinite(value) ? Math.max(0, Math.min(20, Math.floor(value))) : 0; setQualityDraft(String(next)); run(`Set ${item.name} quality to ${next}.`, () => debug.setItemQuality(instanceId, next)); };
  const applyUpgrade = (value: number) => { const next = Number.isFinite(value) ? Math.max(0, Math.min(10, Math.floor(value))) : 0; setUpgradeDraft(String(next)); run(`Set ${item.name} upgrade to ${next}.`, () => debug.setItemUpgradeLevel(instanceId, next)); };
  return <section className="debug-copy-inspector" data-debug-kind="debug-copy-inspector" data-debug-instance-id={instanceId}><div className="debug-copy-heading"><div><span className="tiny-label">SELECTED COPY</span><strong>{item.name}</strong><small>{equipped ? "Equipped copy" : "Unequipped copy"} · Mastery {masteryLevel}</small></div><span className="debug-copy-sequence">{instanceId.replace("item-instance-", "Copy ")}</span></div><div className="debug-copy-controls"><div className="debug-editor-field"><label>Quality</label><div><button type="button" onClick={() => applyQuality(resolved.instance.quality - 1)} aria-label="Decrease quality">−</button><input value={qualityDraft} onChange={(event) => setQualityDraft(event.target.value)} aria-label="Set quality" inputMode="numeric" /><button type="button" onClick={() => applyQuality(resolved.instance.quality + 1)} aria-label="Increase quality">+</button><button type="button" onClick={() => applyQuality(20)}>MAX</button><button type="button" onClick={() => applyQuality(0)}>RESET</button><button type="button" className="debug-primary-button" onClick={() => applyQuality(Number(qualityDraft))}>APPLY</button></div></div><div className="debug-editor-field"><label>Upgrade</label><div><button type="button" onClick={() => applyUpgrade(resolved.instance.upgradeLevel - 1)} aria-label="Decrease upgrade">−</button><input value={upgradeDraft} onChange={(event) => setUpgradeDraft(event.target.value)} aria-label="Set upgrade" inputMode="numeric" /><button type="button" onClick={() => applyUpgrade(resolved.instance.upgradeLevel + 1)} aria-label="Increase upgrade">+</button><button type="button" onClick={() => applyUpgrade(10)}>MAX</button><button type="button" onClick={() => applyUpgrade(0)}>RESET</button><button type="button" className="debug-primary-button" onClick={() => applyUpgrade(Number(upgradeDraft))}>APPLY</button></div></div></div><div className="debug-affix-editor"><div className="debug-inspector-label">ADD AFFIX <span>{availableTiers.length} valid tiers</span></div><div className="debug-affix-add-row"><select value={affixChoice} onChange={(event) => setAffixChoice(event.target.value)} aria-label={`Choose affix for ${item.name}`}><option value="">Choose an exact valid tier...</option>{availableTiers.map(({ affix, tier }) => <option key={`${affix.id}.${tier.id}`} value={`${affix.id}|${tier.id}`}>{affix.name} · T{tier.tier} {affix.kind}</option>)}</select><button type="button" className="debug-primary-button" disabled={!affixChoice} onClick={() => { const [affixId, tierId] = affixChoice.split("|"); const affix = itemAffixDefinitions.find((candidate) => candidate.id === affixId); run(`Added ${affix?.name ?? "affix"} T${tierId} to ${item.name}.`, () => debug.addItemAffix(instanceId, affixId, tierId)); setAffixChoice(""); }}>ADD</button></div></div><div className="debug-affix-list">{affixes.length ? affixes.map((affixInstance) => { const presentation = itemModifierDisplays(resolved).filter((entry) => entry.id.startsWith(`${affixInstance.affixId}.`)); const affix = itemAffixDefinitions.find((candidate) => candidate.id === affixInstance.affixId); const tier = affix?.tiers.find((candidate) => candidate.id === affixInstance.tierId); return <div className="debug-affix-row" key={affixInstance.affixId} data-debug-kind="debug-instance-affix" data-debug-instance-id={instanceId} data-debug-affix-id={affixInstance.affixId}><div><strong>{affix?.name ?? "Unknown affix"} · T{tier?.tier ?? "?"}</strong>{presentation.map((modifier) => <small key={modifier.id}>{modifier.label}: {modifier.value}</small>)}</div><div><button type="button" onClick={() => { setFeedback(`${affix?.name ?? "Affix"} rerolled.`); run(`Rerolled ${affix?.name ?? affixInstance.affixId} on ${item.name}.`, () => debug.rerollItemAffix(instanceId, affixInstance.affixId)); }} data-debug-action="reroll-item-affix" data-debug-instance-id={instanceId}><RotateCcw size={13} />REROLL</button><button type="button" onClick={() => run(`Removed ${affix?.name ?? affixInstance.affixId} from ${item.name}.`, () => debug.removeItemAffix(instanceId, affixInstance.affixId))} data-debug-action="remove-item-affix" data-debug-instance-id={instanceId}><Trash2 size={13} />REMOVE</button></div></div>; }) : <p className="debug-item-empty">No affixes on this copy.</p>}</div>{feedback && <p className="debug-feedback" role="status">{feedback} Values update above after the mutation.</p>}<div className="debug-effective-stats"><div className="debug-inspector-label">EFFECTIVE STATS</div>{formatItemStats(resolved.effectiveStats).map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value}</strong></div>)}</div><button type="button" className="debug-advanced-toggle" onClick={() => setAdvancedOpen((value) => !value)} aria-expanded={advancedOpen} aria-controls={`debug-advanced-${instanceId}`}><DisclosureChevron open={advancedOpen} />Advanced technical data</button>{advancedOpen && <div id={`debug-advanced-${instanceId}`} className="debug-advanced-data"><code>Instance: {resolved.instance.id}</code><code>Definition: {resolved.instance.definitionId}</code>{resolved.instance.affixes.map((affix) => <code key={affix.affixId}>Affix: {affix.affixId} · Tier: {affix.tierId} · Rolls: {JSON.stringify(affix.rolls)}</code>)}</div>}</section>;
}
