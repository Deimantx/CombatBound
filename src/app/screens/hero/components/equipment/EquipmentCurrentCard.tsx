import { Check } from "lucide-react";
import { EQUIPMENT_SLOT_DEFINITIONS, type EquipmentSlotId } from "../../../../../game/equipment/equipmentTypes";
import { itemRarityArtVariant, itemRarityClass } from "../../../../../game/presentation/itemRarity";
import { buildPlayerItemInstanceTooltip } from "../../../../../game/presentation/tooltipBuilders";
import type { DefensiveEquipmentContext } from "../../../../../game/equipment/defensiveEquipment";
import type { ResolvedItemInstance } from "../../../../../game/items/itemTypes";
import { GameTooltip } from "../../../../components/tooltip/GameTooltip";
import { PlaceholderArt } from "../../../../components/PlaceholderArt";
import { buildItemPresentation } from "../../../../../game/presentation/itemPresentation";

export function EquipmentCurrentCard({ slotId, current, defensiveContext, hunterRank, combatLocked, onClearPreview, onUnequip }: {
  slotId: EquipmentSlotId;
  current: ResolvedItemInstance | null;
  defensiveContext: DefensiveEquipmentContext;
  hunterRank: number;
  combatLocked: boolean;
  onClearPreview: () => void;
  onUnequip: () => void;
}) {
  const definition = EQUIPMENT_SLOT_DEFINITIONS.find((slot) => slot.id === slotId)!;
  if (!current) return <div className="equipment-current-card is-empty" data-debug-kind="equipment-current-card"><div className="equipment-current-card-heading"><span className="tiny-label">CURRENT</span></div><div className="equipment-current-empty"><PlaceholderArt icon={definition.icon} size="small" variant="muted" /><div><strong>Empty {definition.label} Slot</strong><span>Select an available item to compare.</span></div></div></div>;
  const tooltip = buildPlayerItemInstanceTooltip(current, { equipped: true, equippedSlot: slotId, defensiveContext, hunterRank });
  const presentation = buildItemPresentation(current);
  const marker = presentation.upgradeProgress ? `${presentation.specialization?.label ?? "Unspecialized"} - ${presentation.upgradeProgress.unlocked} / ${presentation.upgradeProgress.total} upgrades` : "Fixed stats";
  return <GameTooltip content={tooltip}><div className={`equipment-current-card ${itemRarityClass(current.definition.rarity)}`} data-debug-kind="equipment-current-card" data-debug-instance-id={current.instance.id} data-debug-item-id={current.definition.id}>
    <div className="equipment-current-card-heading"><span className="tiny-label">CURRENT</span><span className="equipment-current-equipped"><Check size={12} />Equipped</span></div>
    <div className="equipment-current-card-body">
      <button type="button" className="equipment-current-select" onClick={onClearPreview} aria-label={`Keep comparing from current ${current.definition.name}`}>
        <PlaceholderArt icon={current.definition.icon} size="small" variant={itemRarityArtVariant(current.definition.rarity)} />
        <span><strong>{current.definition.name}</strong><small>{marker}</small></span>
      </button>
      <div className="equipment-current-markers">{presentation.upgradeProgress && <em title="Individual Upgrade Tree progress">{presentation.upgradeProgress.unlocked}/{presentation.upgradeProgress.total}</em>}</div>
    </div>
    <button type="button" className="button button-ghost button-small equipment-current-unequip" onClick={onUnequip} disabled={combatLocked} data-debug-action="unequip-equipment">UNEQUIP</button>
  </div></GameTooltip>;
}
