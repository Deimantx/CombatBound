import { Lock } from "lucide-react";
import type { DragEvent } from "react";
import { getEquipmentSlotDefinition } from "../../../game/equipment/equipmentTypes";
import { itemRarityArtVariant, itemRarityClass } from "../../../game/presentation/itemRarity";
import { buildItemPresentation, buildStackableItemPresentation } from "../../../game/presentation/itemPresentation";
import { buildItemTooltip, buildPlayerItemInstanceTooltip } from "../../../game/presentation/tooltipBuilders";
import type { InventoryViewEntry } from "../../../game/inventory/inventorySelectors";
import { GameTooltip } from "../../components/tooltip/GameTooltip";
import { PlaceholderArt } from "../../components/PlaceholderArt";

export function formatCompactQuantity(quantity: number) {
  const absolute = Math.max(0, Math.floor(quantity));
  if (absolute < 1000) return absolute.toLocaleString();
  const units = [[1_000_000_000, "B"], [1_000_000, "M"], [1_000, "K"]] as const;
  const [unit, suffix] = units.find(([value]) => absolute >= value) ?? units[units.length - 1];
  const scaled = absolute / unit;
  const decimals = scaled < 10 ? 1 : 0;
  return `${scaled.toFixed(decimals).replace(/\.0$/, "")}${suffix}`;
}

interface InventoryCardProps {
  entry: InventoryViewEntry;
  hunterRank: number;
  selected: boolean;
  onSelect: () => void;
  manualMode?: boolean;
  dragging?: boolean;
  dragTarget?: "before" | "after";
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragOver?: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
}

export function InventoryCard({ entry, hunterRank, selected, onSelect, manualMode = false, dragging = false, dragTarget, onDragStart, onDragOver, onDrop, onDragEnd }: InventoryCardProps) {
  const presentation = entry.resolved ? buildItemPresentation(entry.resolved, { equipped: entry.equipped }) : buildStackableItemPresentation(entry.definition, entry.quantity);
  const tooltip = entry.resolved ? buildPlayerItemInstanceTooltip(entry.resolved, { equipped: entry.equipped, equippedSlot: entry.equippedSlot, hunterRank }) : buildItemTooltip(entry.definition, { quantity: entry.quantity, hunterRank });
  const instance = entry.resolved?.instance;
  const upgradeCount = instance?.unlockedUpgradeNodeIds?.length ?? 0;
  const equippedSlot = entry.equippedSlot;
  const hunterRankLocked = Boolean(entry.definition.equipmentSlotKind && (entry.definition.requiredHunterRank ?? 0) > hunterRank && !entry.equipped);
  const lockLabel = hunterRankLocked ? `Requires Hunter Rank ${entry.definition.requiredHunterRank}; Current Hunter Rank ${hunterRank}` : undefined;
  return <GameTooltip content={tooltip}><button type="button" className={`inventory-card ${itemRarityClass(entry.definition.rarity)} ${selected ? "is-selected" : ""} ${manualMode ? "is-manual" : ""} ${dragging ? "is-dragging" : ""} ${dragTarget ? `drag-target-${dragTarget}` : ""}`} draggable={manualMode} onClick={onSelect} onDragStart={(event) => onDragStart?.(event)} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd} data-debug-kind="inventory-item" data-debug-target-id={entry.instanceId ?? entry.definition.id} data-debug-item-id={entry.definition.id} data-debug-instance-id={entry.instanceId} data-debug-label={entry.definition.name} aria-label={`Select ${entry.definition.name}${entry.equipped ? ", equipped" : ""}`}>
    <div className="inventory-card-art">
      <PlaceholderArt icon={entry.definition.icon} size="medium" variant={itemRarityArtVariant(entry.definition.rarity)} />
      {!entry.instanceId && <span className="item-quantity">x{formatCompactQuantity(entry.quantity)}</span>}
      {entry.equipped && <span className="item-equipped-marker" title={`Equipped${equippedSlot ? ` - ${getEquipmentSlotDefinition(equippedSlot).label}` : ""}`} aria-label={`Equipped${equippedSlot ? ` - ${getEquipmentSlotDefinition(equippedSlot).label}` : ""}`}>OK</span>}
      {hunterRankLocked && <span className="item-hunter-rank-lock" title={lockLabel} aria-label={lockLabel}><Lock size={11} aria-hidden="true" /></span>}
      {upgradeCount > 0 && <em className="item-upgrade-marker" title={`${upgradeCount} unlocked upgrade nodes`} aria-label={`${upgradeCount} unlocked upgrade nodes`}>{upgradeCount}</em>}
    </div>
    <div className="inventory-card-footer"><strong title={presentation.name}>{presentation.name}</strong></div>
  </button></GameTooltip>;
}
