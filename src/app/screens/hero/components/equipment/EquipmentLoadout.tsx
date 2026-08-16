import type { EquipmentSlotId, EquipmentState } from "../../../../../game/equipment/equipmentTypes";
import type { DefensiveEquipmentContext } from "../../../../../game/equipment/defensiveEquipment";
import type { InventoryState } from "../../../../../game/inventory/inventoryTypes";
import { EquipmentSlotCard } from "./EquipmentSlotCard";

export type EquipmentLayout = ReadonlyArray<ReadonlyArray<EquipmentSlotId | null>>;

export function EquipmentLoadout({ layout, selected, equipment, inventory, defensiveContext, onSelect }: {
  layout: EquipmentLayout;
  selected: EquipmentSlotId;
  equipment: EquipmentState;
  inventory: InventoryState;
  defensiveContext: DefensiveEquipmentContext;
  onSelect: (slotId: EquipmentSlotId) => void;
}) {
  return (
    <div className="hero-equipment-loadout" data-debug-kind="hero-equipment-loadout">
      <div className="hero-equipment-body-layout" data-debug-kind="hero-equipment-body-layout">
        {layout.flatMap((row, rowIndex) => row.map((slotId, columnIndex) => (
          <div key={`${rowIndex}-${columnIndex}-${slotId ?? "empty"}`} className={`hero-equipment-body-cell ${slotId ? "" : "is-empty"}`}>
            {slotId && <EquipmentSlotCard slotId={slotId} equipment={equipment} inventory={inventory} defensiveContext={defensiveContext} selected={selected === slotId} onSelect={() => onSelect(slotId)} />}
          </div>
        )))}
      </div>
      <div className="hero-equipment-loadout-legend"><span><i className="legend-swatch is-filled" /> Equipped</span><span><i className="legend-swatch is-empty" /> Empty</span><span>Click a slot to inspect</span></div>
    </div>
  );
}
