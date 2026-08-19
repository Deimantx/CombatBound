import { Check, LockKeyhole } from "lucide-react";
import { PlaceholderArt } from "../../../../components/PlaceholderArt";
import { GameTooltip } from "../../../../components/tooltip/GameTooltip";
import { buildPlayerItemInstanceTooltip } from "../../../../../game/presentation/tooltipBuilders";
import { getEquipmentSlotDefinition, type EquipmentSlotId } from "../../../../../game/equipment/equipmentTypes";
import type { EquipmentChangeValidation } from "../../../../../game/equipment/equipmentRules";
import type { ResolvedItemInstance } from "../../../../../game/items/itemTypes";
import { itemRarityArtVariant, itemRarityClass } from "../../../../../game/presentation/itemRarity";

export interface EquipmentCandidateModel {
  entry: ResolvedItemInstance;
  validation: EquipmentChangeValidation;
  equipped: boolean;
  equippedSlot?: EquipmentSlotId;
  hunterRankLocked: boolean;
  canEquip: boolean;
  combatLocked: boolean;
}

export function EquipmentCandidateCard({ model, slotId, selected, hovered, hunterRank, onSelect, onHover, onLeave }: {
  model: EquipmentCandidateModel;
  slotId: EquipmentSlotId;
  selected: boolean;
  hovered: boolean;
  hunterRank: number;
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const { entry, validation, equipped, equippedSlot, hunterRankLocked, combatLocked } = model;
  const equippedSlotLabel = equippedSlot ? getEquipmentSlotDefinition(equippedSlot).label : undefined;
  const tooltip = buildPlayerItemInstanceTooltip(entry, { equipped, hunterRank });
  const canEquip = validation.valid && !combatLocked && !equipped;
  return (
    <GameTooltip content={tooltip}>
      <button
        type="button"
        className={`hero-equipment-candidate ${itemRarityClass(entry.definition.rarity)} ${selected ? "is-selected" : ""} ${hovered ? "is-hovered" : ""} ${hunterRankLocked ? "is-hunter-rank-locked" : ""}`}
        onClick={onSelect}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        title={hunterRankLocked ? `Requires Hunter Rank ${entry.definition.requiredHunterRank}` : equippedSlotLabel && !equipped ? `Equipped · ${equippedSlotLabel}` : combatLocked ? "Equipment changes are locked during combat. Preview remains available." : undefined}
        data-debug-kind="equipment-candidate"
        data-debug-target-id={entry.instance.id}
        data-debug-item-id={entry.definition.id}
        data-debug-instance-id={entry.instance.id}
        data-debug-slot-id={slotId}
        data-debug-preview-selected={selected ? "true" : "false"}
        data-debug-preview-hovered={hovered ? "true" : "false"}
        data-debug-can-equip={canEquip ? "true" : "false"}
        data-debug-label={entry.definition.name}
      >
        <PlaceholderArt icon={entry.definition.icon} size="small" variant={itemRarityArtVariant(entry.definition.rarity)} />
        <span>
          <strong>{entry.definition.name}</strong>
          {entry.definition.requiredHunterRank !== undefined && <small>Hunter Rank {entry.definition.requiredHunterRank}</small>}
        </span>
        {hunterRankLocked && <span className="equipment-candidate-state is-locked"><LockKeyhole size={13} aria-hidden="true" /><span className="sr-only">HUNTER RANK {entry.definition.requiredHunterRank} REQUIRED</span></span>}
        {equippedSlotLabel && !equipped && <span className="equipment-candidate-state is-equipped" title={`Equipped · ${equippedSlotLabel}`} aria-label={`Equipped · ${equippedSlotLabel}`}><Check size={13} aria-hidden="true" /></span>}
      </button>
    </GameTooltip>
  );
}
