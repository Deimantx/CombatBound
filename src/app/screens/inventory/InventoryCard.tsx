import { Lock, Sparkles } from "lucide-react";
import { getEquipmentSlotDefinition, type EquipmentSlotId } from "../../../game/equipment/equipmentTypes";
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
  masteryLevel: number;
  selected: boolean;
  onSelect: () => void;
}

export function InventoryCard({ entry, masteryLevel, selected, onSelect }: InventoryCardProps) {
  const presentation = entry.resolved ? buildItemPresentation(entry.resolved, { equipped: entry.equipped }) : buildStackableItemPresentation(entry.definition, entry.quantity);
  const tooltip = entry.resolved ? buildPlayerItemInstanceTooltip(entry.resolved, { equipped: entry.equipped, masteryLevel }) : buildItemTooltip(entry.definition, { quantity: entry.quantity, masteryLevel });
  const instance = entry.resolved?.instance;
  const upgradeLevel = instance?.upgradeLevel ?? 0;
  const quality = instance?.quality ?? 0;
  const equippedSlot = entry.equippedSlot as EquipmentSlotId | undefined;
  const masteryLocked = Boolean(entry.definition.equipmentSlotKind && (entry.definition.requiredMasteryLevel ?? 0) > masteryLevel && !entry.equipped);
  const lockLabel = masteryLocked ? `Requires Mastery ${entry.definition.requiredMasteryLevel}; Current Mastery ${masteryLevel}` : undefined;
  return <GameTooltip content={tooltip}><button type="button" className={`inventory-card rarity-${entry.definition.rarity} ${selected ? "is-selected" : ""}`} onClick={onSelect} data-debug-kind="inventory-item" data-debug-target-id={entry.instanceId ?? entry.definition.id} data-debug-item-id={entry.definition.id} data-debug-instance-id={entry.instanceId} data-debug-label={entry.definition.name} aria-label={`Select ${entry.definition.name}${entry.equipped ? ", equipped" : ""}`}>
    <div className="inventory-card-art">
      <PlaceholderArt icon={entry.definition.icon} size="medium" variant={entry.definition.rarity === "rare" ? "gold" : entry.definition.rarity === "uncommon" ? "blue" : "muted"} />
      {!entry.instanceId && <span className="item-quantity">×{formatCompactQuantity(entry.quantity)}</span>}
      {entry.equipped && <span className="item-equipped-marker" title={`Equipped${equippedSlot ? ` · ${getEquipmentSlotDefinition(equippedSlot).label}` : ""}`} aria-label="Equipped">✓</span>}
      {masteryLocked && <span className="item-mastery-lock" title={lockLabel} aria-label={lockLabel}><Lock size={11} aria-hidden="true" /></span>}
      {upgradeLevel > 0 && <em className="item-upgrade-marker" title={`Upgrade +${upgradeLevel}`}>+{upgradeLevel}</em>}
      {quality > 0 && <em className="item-quality-marker" title={`Quality ${quality}%`}>Q{quality}</em>}
      {instance && instance.affixes.length > 0 && <span className="item-affix-marker" data-debug-kind="item-affix-marker" data-debug-instance-id={instance.id} title="Has item modifiers" aria-label={`${instance.affixes.length} Affixes`}><Sparkles size={11} aria-hidden="true" /></span>}
    </div>
    <div className="inventory-card-footer"><strong title={presentation.name}>{presentation.name}</strong></div>
  </button></GameTooltip>;
}
