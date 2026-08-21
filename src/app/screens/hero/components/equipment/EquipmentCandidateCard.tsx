import { Check, LockKeyhole } from "lucide-react";
import { PlaceholderArt } from "../../../../components/PlaceholderArt";
import { GameTooltip } from "../../../../components/tooltip/GameTooltip";
import { buildPlayerItemInstanceTooltip } from "../../../../../game/presentation/tooltipBuilders";
import { getEquipmentSlotDefinition, type EquipmentSlotId } from "../../../../../game/equipment/equipmentTypes";
import type { EquipmentChangeValidation } from "../../../../../game/equipment/equipmentRules";
import type { ResolvedItemInstance } from "../../../../../game/items/itemTypes";
import { itemRarityArtVariant, itemRarityClass } from "../../../../../game/presentation/itemRarity";
import { proficiencyById } from "../../../../../game/data/proficiencies";
import { buildItemPresentation } from "../../../../../game/presentation/itemPresentation";

export interface EquipmentCandidateModel {
  entry: ResolvedItemInstance;
  validation: EquipmentChangeValidation;
  equipped: boolean;
  equippedSlot?: EquipmentSlotId;
  hunterRankLocked: boolean;
  proficiencyLocked: boolean;
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
  const { entry, validation, equipped, equippedSlot, hunterRankLocked, proficiencyLocked, combatLocked } = model;
  const proficiencyName = validation.proficiencyId ? proficiencyById[validation.proficiencyId]?.name ?? validation.proficiencyId : undefined;
  const requirementLabel = proficiencyLocked && proficiencyName && validation.requiredLevel !== undefined
    ? `Requires ${proficiencyName} Level ${validation.requiredLevel}`
    : hunterRankLocked
      ? `Requires Hunter Rank ${entry.definition.requiredHunterRank}`
      : undefined;
  const equippedSlotLabel = equippedSlot ? getEquipmentSlotDefinition(equippedSlot).label : undefined;
  const tooltip = buildPlayerItemInstanceTooltip(entry, { equipped, hunterRank });
  const presentation = buildItemPresentation(entry);
  const canEquip = validation.valid && !combatLocked && !equipped;
  return (
    <GameTooltip content={tooltip}>
      <button
        type="button"
        className={`hero-equipment-candidate ${itemRarityClass(entry.definition.rarity)} ${selected ? "is-selected" : ""} ${hovered ? "is-hovered" : ""} ${hunterRankLocked || proficiencyLocked ? "is-requirement-locked" : ""}`}
        onClick={onSelect}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        title={requirementLabel ?? (equippedSlotLabel && !equipped ? `Equipped - ${equippedSlotLabel}` : combatLocked ? "Equipment changes are locked during combat. Preview remains available." : undefined)}
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
          {presentation.upgradeProgress && <small>{presentation.specialization?.label ?? "Unspecialized"} - {presentation.upgradeProgress.unlocked} / {presentation.upgradeProgress.total} upgrades</small>}
          {entry.definition.requiredHunterRank !== undefined && <small>Hunter Rank {entry.definition.requiredHunterRank}</small>}
        </span>
        {(hunterRankLocked || proficiencyLocked) && <span className="equipment-candidate-state is-locked"><LockKeyhole size={13} aria-hidden="true" /><span className="sr-only">{requirementLabel}</span></span>}
        {equippedSlotLabel && !equipped && <span className="equipment-candidate-state is-equipped" title={`Equipped - ${equippedSlotLabel}`} aria-label={`Equipped - ${equippedSlotLabel}`}><Check size={13} aria-hidden="true" /></span>}
      </button>
    </GameTooltip>
  );
}
