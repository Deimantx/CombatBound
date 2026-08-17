import { Check } from "lucide-react";
import { EQUIPMENT_SLOT_DEFINITIONS, type EquipmentSlotId } from "../../../../../game/equipment/equipmentTypes";
import { resolveItemInstance } from "../../../../../game/items/itemResolver";
import { buildPlayerItemInstanceTooltip } from "../../../../../game/presentation/tooltipBuilders";
import { GameTooltip } from "../../../../components/tooltip/GameTooltip";
import { PlaceholderArt } from "../../../../components/PlaceholderArt";
import type { DefensiveEquipmentContext } from "../../../../../game/equipment/defensiveEquipment";
import type { EquipmentState } from "../../../../../game/equipment/equipmentTypes";
import type { InventoryState } from "../../../../../game/inventory/inventoryTypes";
import { itemRarityArtVariant, itemRarityClass } from "../../../../../game/presentation/itemRarity";

export function EquipmentSlotCard({ slotId, equipment, inventory, defensiveContext, selected, onSelect }: {
  slotId: EquipmentSlotId;
  equipment: EquipmentState;
  inventory: InventoryState;
  defensiveContext: DefensiveEquipmentContext;
  selected: boolean;
  onSelect: () => void;
}) {
  const definition = EQUIPMENT_SLOT_DEFINITIONS.find((slot) => slot.id === slotId)!;
  const item = equipment.slots[slotId] ? resolveItemInstance(inventory, equipment.slots[slotId]!) : null;
  const tooltip = item
    ? buildPlayerItemInstanceTooltip(item, { equipped: true, equippedSlot: slotId, defensiveContext })
    : { id: `equipment-slot.${slotId}`, title: `${definition.label} Slot`, description: `Equip a compatible ${definition.label.toLowerCase()} here.` };
  const marker = item?.instance.upgradeLevel ? `+${item.instance.upgradeLevel}` : item?.instance.quality ? `Q${item.instance.quality}` : undefined;
  return (
    <GameTooltip content={tooltip}>
      <button
        type="button"
        className={`hero-equipment-slot ${item ? itemRarityClass(item.definition.rarity) : ""} ${selected ? "is-selected" : ""} ${item ? "has-item" : "is-empty"}`}
        onClick={onSelect}
        data-debug-kind="equipment-slot"
        data-debug-slot-id={slotId}
        data-debug-slot={slotId}
        data-debug-slot-group={definition.group}
        data-debug-item-id={item?.definition.id}
        data-debug-instance-id={item?.instance.id}
        data-debug-label={definition.label}
      >
        <span className="slot-label">{"shortLabel" in definition ? definition.shortLabel : definition.label}</span>
        <PlaceholderArt icon={item?.definition.icon ?? definition.icon} size="medium" variant={item ? itemRarityArtVariant(item.definition.rarity) : "muted"} />
        <strong>{item?.definition.name ?? "Empty"}</strong>
        <small>{marker ?? (item ? "EQUIPPED" : "EMPTY SLOT")}</small>
        {item && item.instance.affixes.length > 0 && <span className="equipment-slot-sparkle" aria-label="Modified item">✦</span>}
        {selected && <span className="selected-check"><Check size={12} /></span>}
      </button>
    </GameTooltip>
  );
}
