import { PlaceholderArt } from "../../../../components/PlaceholderArt";
import { GameTooltip } from "../../../../components/tooltip/GameTooltip";
import { buildPlayerItemInstanceTooltip } from "../../../../../game/presentation/tooltipBuilders";
import type { EquipmentSlotId } from "../../../../../game/equipment/equipmentTypes";
import type { EquipmentChangeValidation } from "../../../../../game/equipment/equipmentRules";
import type { ResolvedItemInstance } from "../../../../../game/items/itemTypes";

export interface EquipmentCandidateModel {
  entry: ResolvedItemInstance;
  validation: EquipmentChangeValidation;
  equipped: boolean;
  masteryLocked: boolean;
  canEquip: boolean;
  combatLocked: boolean;
}

export function EquipmentCandidateCard({ model, slotId, selected, hovered, masteryLevel, onSelect, onHover, onLeave }: {
  model: EquipmentCandidateModel;
  slotId: EquipmentSlotId;
  selected: boolean;
  hovered: boolean;
  masteryLevel: number;
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const { entry, validation, equipped, masteryLocked, combatLocked } = model;
  const status = equipped
    ? "CURRENT"
    : masteryLocked
      ? `MASTERY ${entry.definition.requiredMasteryLevel} REQUIRED`
      : combatLocked
        ? "LOCKED DURING COMBAT"
        : "PREVIEW";
  const tooltip = buildPlayerItemInstanceTooltip(entry, { equipped, masteryLevel });
  const canEquip = validation.valid && !combatLocked && !equipped;
  return (
    <GameTooltip content={tooltip}>
      <button
        type="button"
        className={`hero-equipment-candidate ${selected ? "is-selected" : ""} ${hovered ? "is-hovered" : ""} ${masteryLocked ? "is-mastery-locked" : ""}`}
        onClick={onSelect}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        title={masteryLocked ? `Requires Mastery ${entry.definition.requiredMasteryLevel}` : combatLocked ? "Equipment changes are locked during combat. Preview remains available." : undefined}
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
        <PlaceholderArt icon={entry.definition.icon} size="small" variant={entry.definition.rarity === "rare" ? "gold" : entry.definition.rarity === "uncommon" ? "blue" : "muted"} />
        <span>
          <strong>{entry.definition.name}</strong>
          <small>{entry.definition.rarity.toUpperCase()} · {entry.definition.category.toUpperCase()}</small>
          <small>MASTERY {entry.definition.requiredMasteryLevel ?? 1}</small>
        </span>
        <em>{status}</em>
      </button>
    </GameTooltip>
  );
}
