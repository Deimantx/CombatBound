import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { previewInventoryEquipmentChange } from "../../../game/inventory/inventoryPreview";
import { getEquipmentSlotDefinition, type EquipmentSlotId } from "../../../game/equipment/equipmentTypes";
import { hunterRankForPoints } from "../../../game/progression/hunterRankProgression";
import { buildItemPresentation, buildStackableItemPresentation } from "../../../game/presentation/itemPresentation";
import { formatItemStatsWithKeys } from "../../../game/presentation/statFormatting";
import { itemRarityArtVariant } from "../../../game/presentation/itemRarity";
import { buildItemTooltip, buildPlayerItemInstanceTooltip, buildStatTooltip } from "../../../game/presentation/tooltipBuilders";
import { lootContainerById } from "../../../game/data/loot/lootContainers";
import { chooseEquipmentTargetSlot, type InventoryViewEntry } from "../../../game/inventory/inventorySelectors";
import { useGameStore } from "../../../state/gameStore";
import { DisclosureChevron } from "../../components/DisclosureChevron";
import { GameTooltip } from "../../components/tooltip/GameTooltip";
import { PlaceholderArt } from "../../components/PlaceholderArt";
import { InventoryBuildChanges } from "./InventoryBuildChanges";
import { buildEquipmentReplacementPresentation, equipmentSlotTargets, InventoryReplacementContext } from "./InventoryReplacementContext";

export function InventoryDetails({ entry, game }: { entry?: InventoryViewEntry; game: ReturnType<typeof useGameStore.getState>["game"] }) {
  const equipItem = useGameStore((state) => state.equipItemInstance);
  const openLootContainer = useGameStore((state) => state.openLootContainer);
  const [baseOpen, setBaseOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<EquipmentSlotId | undefined>();
  if (!entry) return <aside className="inventory-details-pane" data-ui-panel="inventoryDetails" data-debug-kind="inventory-details-pane"><div className="inventory-empty-state"><SlidersHorizontal size={18} /><strong>Select an item</strong><span>Choose an item card to inspect it.</span></div></aside>;
  const resolved = entry.resolved;
  const hunterRank = hunterRankForPoints(game.progression.hunterRankPoints);
  const presentation = resolved ? buildItemPresentation(resolved, { equipped: entry.equipped, includeBaseStats: baseOpen }) : buildStackableItemPresentation(entry.definition, entry.quantity);
  const tooltip = resolved ? buildPlayerItemInstanceTooltip(resolved, { equipped: entry.equipped, equippedSlot: entry.equippedSlot, hunterRank }) : buildItemTooltip(entry.definition, { quantity: entry.quantity, hunterRank });
  const combatLocked = game.combat.phase === "active" || game.combat.phase === "recovery";
  const slotTargets = resolved?.definition.equipmentSlotKind ? equipmentSlotTargets(resolved.definition.equipmentSlotKind) : [];
  const automaticSlot = resolved ? chooseEquipmentTargetSlot(slotTargets, game.equipment, resolved.instance.id) : undefined;
  const chosenSlot = targetSlot && slotTargets.some((slot) => slot.id === targetSlot) ? targetSlot : automaticSlot;
  const equipmentPreview = resolved && chosenSlot ? previewInventoryEquipmentChange(game, resolved.instance.id, chosenSlot) : undefined;
  const validation = equipmentPreview?.validation;
  const currentSlot = entry.equipped ? entry.equippedSlot : undefined;
  const isCurrent = Boolean(currentSlot && chosenSlot === currentSlot);
  const isMoving = Boolean(currentSlot && chosenSlot && chosenSlot !== currentSlot);
  const replacement = resolved && chosenSlot ? buildEquipmentReplacementPresentation(resolved, chosenSlot, game.equipment, game.inventory) : undefined;
  const equip = () => { if (!resolved || !chosenSlot || !validation?.valid || combatLocked || isCurrent) return; equipItem(resolved.instance.id, chosenSlot); };
  const actionLabel = isCurrent ? "Equipped" : isMoving && chosenSlot ? `Move to ${getEquipmentSlotDefinition(chosenSlot).label}` : `Equip ${entry.definition.name}`;
  const actionDescription = replacement?.current ? `Replaces ${replacement.current.name} in the ${replacement.slotLabel} slot.` : chosenSlot ? `Equip this item to the ${getEquipmentSlotDefinition(chosenSlot).label} slot.` : "Choose a valid equipment target.";
  const statRows = resolved ? formatItemStatsWithKeys(resolved.effectiveStats) : [];
  const baseStatRows = resolved ? formatItemStatsWithKeys(resolved.baseStats) : [];
  const container = entry.definition.lootContainerId ? lootContainerById[entry.definition.lootContainerId] : undefined;
  return <aside className="inventory-details-pane" data-ui-panel="inventoryDetails" data-debug-kind="inventory-details-pane">
    <GameTooltip content={tooltip}><div className="detail-item-head" data-debug-kind="tooltip-trigger" data-debug-item-id={entry.definition.id} data-debug-instance-id={entry.instanceId}><PlaceholderArt icon={entry.definition.icon} label={entry.definition.name} size="large" variant={itemRarityArtVariant(entry.definition.rarity)} /><div><span className="tiny-label">{(presentation.slotLabel ?? presentation.typeLabel).toUpperCase()}</span><h2>{presentation.name}</h2><p>{presentation.rarity}</p></div></div></GameTooltip>
    <div className="detail-badge-row">{entry.equipped && <span className="detail-badge is-equipped">Equipped · {currentSlot ? getEquipmentSlotDefinition(currentSlot).label : ""}</span>}{presentation.hunterRankRequirement !== undefined && <span className={`detail-badge ${hunterRank >= presentation.hunterRankRequirement ? "is-equipped" : ""}`}>Hunter Rank {presentation.hunterRankRequirement}</span>}</div>
    <p className="detail-description">{entry.definition.description}</p>
    {container && !resolved && <DetailSection title="Loot container"><div className="detail-action-row"><span className="detail-muted">{container.description}</span><GameTooltip content={{ id: container.id, icon: entry.definition.icon, title: container.name, description: container.description }}><button type="button" className="button button-primary" onClick={() => openLootContainer(entry.definition.id)} disabled={entry.quantity <= 0}>Open</button></GameTooltip></div></DetailSection>}
    {resolved ? <>
      <div className="detail-summary-grid">{presentation.modified ? <><span className="detail-badge">{resolved.instance.quality > 0 ? `Quality ${resolved.instance.quality}%` : "No quality"}</span><span className="detail-badge">{resolved.instance.upgradeLevel > 0 ? `Upgrade +${resolved.instance.upgradeLevel}` : "No upgrade"}</span><span className="detail-badge">{resolved.instance.affixes.length} modifier{resolved.instance.affixes.length === 1 ? "" : "s"}</span></> : <span className="detail-badge">Unmodified</span>}</div>
      <DetailSection title="Modifiers">{presentation.modifiers.length ? <div className="detail-modifier-list">{presentation.modifiers.map((modifier) => <div key={modifier.id}><span>{modifier.kind ? `${modifier.kind === "prefix" ? "Prefix" : "Suffix"} · ` : ""}{modifier.label}{modifier.tier ? ` (T${modifier.tier})` : ""}</span><strong>{modifier.value}</strong></div>)}</div> : <span className="detail-muted">No modifications.</span>}</DetailSection>
      <DetailSection title="Item stats"><div className="detail-stat-list">{statRows.map((stat) => <GameTooltip key={stat.key} content={buildStatTooltip(stat.key, stat.numericValue, "Effective item stat", stat.range)}><div><span>{stat.label}</span><strong>{stat.value}</strong></div></GameTooltip>)}</div></DetailSection>
      <button type="button" className="inventory-disclosure-toggle" onClick={() => setBaseOpen((value) => !value)} aria-expanded={baseOpen}><DisclosureChevron open={baseOpen} />{baseOpen ? "Hide base stats" : "Show base stats"}</button>
      {baseOpen && <div className="detail-stat-list">{baseStatRows.map((stat) => <GameTooltip key={stat.key} content={buildStatTooltip(stat.key, stat.numericValue, "Base item stat", stat.range)}><div><span>{stat.label}</span><strong>{stat.value}</strong></div></GameTooltip>)}</div>}
      {slotTargets.length > 0 && <>
        {replacement && <InventoryReplacementContext presentation={replacement} />}
        <DetailSection title="Equip"><div className="detail-action-row">{slotTargets.length === 1 ? <span className="detail-badge">Target: {slotTargets[0].label}{currentSlot === slotTargets[0].id ? " ✓" : ""}</span> : <div className="inventory-equip-targets" aria-label="Choose equipment target">{slotTargets.map((slot) => <button type="button" key={slot.id} className={chosenSlot === slot.id ? "is-selected" : ""} onClick={() => setTargetSlot(slot.id)}>{slot.label}{currentSlot === slot.id ? " ✓" : ""}</button>)}</div>}<GameTooltip content={{ id: "inventory-equip-action", title: actionLabel, description: actionDescription }}><button type="button" className="button button-primary" disabled={!validation?.valid || combatLocked || isCurrent} onClick={equip}>{actionLabel}</button></GameTooltip></div>{combatLocked && <p className="inventory-lock-note">Stop combat to change equipment.</p>}{validation?.reason === "hunter-rank" && <p className="inventory-lock-note">Requires Hunter Rank {entry.definition.requiredHunterRank}. Current Hunter Rank {hunterRank}.</p>}</DetailSection>
        {!isCurrent && <InventoryBuildChanges rows={equipmentPreview?.comparison ?? []} replacementName={replacement?.current?.name} slotLabel={chosenSlot ? getEquipmentSlotDefinition(chosenSlot).label : undefined} />}
      </>}
    </> : <DetailSection title="Quantity"><div className="detail-stat-list"><div><span>In one stack</span><strong>{entry.quantity.toLocaleString()}</strong></div></div></DetailSection>}
  </aside>;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) { return <section className="detail-section"><header>{title.toUpperCase()}</header>{children}</section>; }
