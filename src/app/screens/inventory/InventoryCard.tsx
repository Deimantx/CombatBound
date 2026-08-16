import { getEquipmentSlotDefinition, type EquipmentSlotId } from "../../../game/equipment/equipmentTypes";
import { buildItemPresentation, buildStackableItemPresentation, itemInstanceIsModified } from "../../../game/presentation/itemPresentation";
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
  selected: boolean;
  onSelect: () => void;
}

export function InventoryCard({ entry, selected, onSelect }: InventoryCardProps) {
  const presentation = entry.resolved ? buildItemPresentation(entry.resolved, { equipped: entry.equipped }) : buildStackableItemPresentation(entry.definition, entry.quantity);
  const tooltip = entry.resolved ? buildPlayerItemInstanceTooltip(entry.resolved, { equipped: entry.equipped }) : buildItemTooltip(entry.definition, { quantity: entry.quantity });
  const instance = entry.resolved?.instance;
  const equippedSlot = entry.equippedSlot as EquipmentSlotId | undefined;
  return <GameTooltip content={tooltip}><button type="button" className={`inventory-card rarity-${entry.definition.rarity} ${selected ? "is-selected" : ""}`} onClick={onSelect} data-debug-kind="inventory-item" data-debug-target-id={entry.instanceId ?? entry.definition.id} data-debug-item-id={entry.definition.id} data-debug-instance-id={entry.instanceId} data-debug-label={entry.definition.name} aria-label={`Select ${entry.definition.name}${entry.equipped ? ", equipped" : ""}`}>
    {!entry.instanceId && <span className="item-quantity">×{formatCompactQuantity(entry.quantity)}</span>}
    <PlaceholderArt icon={entry.definition.icon} size="small" variant={entry.definition.rarity === "rare" ? "gold" : entry.definition.rarity === "uncommon" ? "blue" : "muted"} />
    <strong title={presentation.name}>{presentation.name}</strong>
    {entry.equipped && <span className="item-equipped-marker" title={`Equipped${equippedSlot ? ` · ${getEquipmentSlotDefinition(equippedSlot).label}` : ""}`} aria-label="Equipped">✓</span>}
    {instance && itemInstanceIsModified(instance) && <span className="item-modifier-badges" data-debug-kind="item-modifier-badges" data-debug-instance-id={instance.id}>{instance.quality > 0 && <em>Q{instance.quality}</em>}{instance.upgradeLevel > 0 && <em>+{instance.upgradeLevel}</em>}{instance.affixes.length > 0 && <em>{instance.affixes.length} Mods</em>}</span>}
  </button></GameTooltip>;
}
