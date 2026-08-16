import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { EQUIPMENT_SLOT_DEFINITIONS, type EquipmentSlotId, type EquipmentState } from "../../../../../game/equipment/equipmentTypes";
import { resolveItemInstance } from "../../../../../game/items/itemResolver";
import { buildPlayerItemInstanceTooltip } from "../../../../../game/presentation/tooltipBuilders";
import { buildEquipmentReplacementPresentation, EquipmentReplacementContext } from "../../../../components/equipment/EquipmentReplacementContext";
import { EquipmentBuildChanges } from "../../../../components/equipment/EquipmentBuildChanges";
import { GameTooltip } from "../../../../components/tooltip/GameTooltip";
import { PlaceholderArt } from "../../../../components/PlaceholderArt";
import type { DefensiveEquipmentContext } from "../../../../../game/equipment/defensiveEquipment";
import type { InventoryState } from "../../../../../game/inventory/inventoryTypes";
import type { ProgressionState } from "../../../../../game/progression/progressionTypes";
import type { EquipmentPreviewState } from "../../../../../game/equipment/equipmentPreview";
import { masteryLevelForXp } from "../../../../../game/progression/masteryProgression";
import type { EquipmentCandidateModel } from "./EquipmentCandidateCard";
import { EquipmentCandidateBrowser } from "./EquipmentCandidateBrowser";

export function EquipmentSlotInspector({ slotId, equipment, inventory, progression, defensiveContext, combatLocked, activeProfileId, models, previewState, pinned, hovered, onSelectCandidate, onHoverCandidate, onLeaveCandidate, onEquip, onUnequip }: {
  slotId: EquipmentSlotId;
  equipment: EquipmentState;
  inventory: InventoryState;
  progression: ProgressionState;
  defensiveContext: DefensiveEquipmentContext;
  combatLocked: boolean;
  activeProfileId: string | null;
  models: readonly EquipmentCandidateModel[];
  previewState: EquipmentPreviewState;
  pinned: { slotId: EquipmentSlotId; instanceId: string } | null;
  hovered: { slotId: EquipmentSlotId; instanceId: string } | null;
  onSelectCandidate: (instanceId: string) => void;
  onHoverCandidate: (instanceId: string) => void;
  onLeaveCandidate: () => void;
  onEquip: (instanceId: string) => void;
  onUnequip: () => void;
}) {
  const definition = EQUIPMENT_SLOT_DEFINITIONS.find((slot) => slot.id === slotId)!;
  const current = equipment.slots[slotId] ? resolveItemInstance(inventory, equipment.slots[slotId]!) : null;
  const activeRequest = previewState.request?.slotId === slotId ? previewState.request : null;
  const activeModel = activeRequest ? models.find((model) => model.entry.instance.id === activeRequest.instanceId) : undefined;
  const activeCandidate = activeModel?.entry;
  const activeValidation = activeModel?.validation ?? previewState.validation;
  const isCurrent = Boolean(activeCandidate && activeCandidate.instance.id === equipment.slots[slotId]);
  const canCommit = Boolean(activeCandidate && activeValidation?.valid && !isCurrent && !combatLocked);
  const replacement = activeCandidate ? buildEquipmentReplacementPresentation(activeCandidate, slotId, equipment, inventory) : undefined;
  const actionLabel = activeCandidate && replacement?.action === "move" ? `MOVE TO ${definition.label.toUpperCase()}` : "EQUIP";
  const lockReason = combatLocked ? "Equipment changes are locked during combat. Preview remains available." : activeModel?.masteryLocked ? `Requires Mastery ${activeCandidate?.definition.requiredMasteryLevel}` : undefined;
  const masteryLevel = masteryLevelForXp(progression.masteryXp);
  return (
    <section className="hero-equipment-options hero-equipment-slot-inspector" data-debug-kind="hero-equipment-selected" data-debug-options="true" data-debug-slot-id={slotId} data-debug-expanded="true" data-debug-compatible-count={models.length}>
      <header className="equipment-slot-inspector-header">
        <div><span className="tiny-label">SLOT INSPECTOR</span><h3>{definition.label.toUpperCase()}</h3><p>{slotDescription(definition.kind)} · {models.length} compatible owned instance{models.length === 1 ? "" : "s"}</p></div>
        <span className={`equipment-inspector-state ${combatLocked ? "is-locked" : "is-ready"}`}>{combatLocked ? "LOCKED" : "READY"}</span>
      </header>
      <div className="equipment-current-item" data-debug-kind="equipment-current-item">
        <div className="equipment-inspector-section-heading"><span className="tiny-label">CURRENTLY EQUIPPED</span>{current && <span className="equipment-current-marker"><Sparkles size={12} /> LIVE</span>}</div>
        {current ? <GameTooltip content={buildPlayerItemInstanceTooltip(current, { equipped: true, equippedSlot: slotId, defensiveContext, masteryLevel })}><div className="equipment-item-summary has-item"><PlaceholderArt icon={current.definition.icon} size="small" variant="gold" /><div><strong>{current.definition.name}</strong><span>{current.definition.rarity.toUpperCase()} · INSTANCE {current.instance.id}</span></div><ArrowRight size={15} aria-hidden="true" /></div></GameTooltip> : <div className="equipment-item-summary is-empty"><PlaceholderArt icon={definition.icon} size="small" variant="muted" /><div><strong>Empty {definition.label} Slot</strong><span>Select a compatible candidate below to preview</span></div></div>}
      </div>
      <EquipmentCandidateBrowser models={models} slotId={slotId} masteryLevel={masteryLevel} activeProfileId={activeProfileId} pinned={pinned} hovered={hovered} onSelect={onSelectCandidate} onHover={onHoverCandidate} onLeave={onLeaveCandidate} />
      {activeCandidate && replacement && <EquipmentReplacementContext presentation={replacement} debugKind="hero-equipment-replacement-context" />}
      {activeCandidate && previewState.comparison.length > 0 && <EquipmentBuildChanges rows={previewState.comparison} replacementName={current?.definition.name} slotLabel={definition.label} debugKind="hero-equipment-build-changes" />}
      <div className="equipment-action-bar">
        {lockReason && <p className="equipment-action-note"><LockKeyhole size={14} />{lockReason}</p>}
        <div className="equipment-action-buttons">
          {current && <button type="button" className="button button-ghost equipment-unequip-button" onClick={onUnequip} disabled={combatLocked} data-debug-action="unequip-equipment">UNEQUIP</button>}
          {activeCandidate ? <button type="button" className="button button-primary hero-equip-preview-button" onClick={() => onEquip(activeCandidate.instance.id)} disabled={!canCommit} data-debug-action="equip-preview" title={isCurrent ? "This item is already equipped in the selected slot." : lockReason}>{actionLabel}</button> : <span className="equipment-action-placeholder">Hover or select an owned item to preview build changes.</span>}
        </div>
      </div>
    </section>
  );
}

function slotDescription(kind: string) {
  if (kind === "weapon") return "primary attack source";
  if (kind === "offhand") return "secondary weapon or shield";
  if (kind === "ring" || kind === "earring") return "shared accessory target";
  return "defensive and utility slot";
}
