import { EQUIPMENT_SLOT_DEFINITIONS, type EquipmentSlotId, type EquipmentState } from "../../../../../game/equipment/equipmentTypes";
import { resolveItemInstance } from "../../../../../game/items/itemResolver";
import { buildEquipmentReplacementPresentation } from "../../../../components/equipment/EquipmentReplacementContext";
import type { DefensiveEquipmentContext } from "../../../../../game/equipment/defensiveEquipment";
import type { InventoryState } from "../../../../../game/inventory/inventoryTypes";
import type { ProgressionState } from "../../../../../game/progression/progressionTypes";
import type { EquipmentPreviewState } from "../../../../../game/equipment/equipmentPreview";
import { hunterRankForPoints } from "../../../../../game/progression/hunterRankProgression";
import type { EquipmentCandidateModel } from "./EquipmentCandidateCard";
import { EquipmentCandidateBrowser } from "./EquipmentCandidateBrowser";
import { EquipmentCurrentCard } from "./EquipmentCurrentCard";
import { EquipmentItemComparison } from "./EquipmentItemComparison";
import { buildEquipmentItemDifferenceRows } from "../../../../../game/presentation/equipmentItemComparison";

export function EquipmentSlotInspector({ slotId, equipment, inventory, progression, defensiveContext, combatLocked, models, previewState, pinned, hovered, onSelectCandidate, onHoverCandidate, onLeaveCandidate, onClearPreview, onEquip, onUnequip }: {
  slotId: EquipmentSlotId;
  equipment: EquipmentState;
  inventory: InventoryState;
  progression: ProgressionState;
  defensiveContext: DefensiveEquipmentContext;
  combatLocked: boolean;
  models: readonly EquipmentCandidateModel[];
  previewState: EquipmentPreviewState;
  pinned: { slotId: EquipmentSlotId; instanceId: string } | null;
  hovered: { slotId: EquipmentSlotId; instanceId: string } | null;
  onSelectCandidate: (instanceId: string) => void;
  onHoverCandidate: (instanceId: string) => void;
  onLeaveCandidate: () => void;
  onClearPreview: () => void;
  onEquip: (instanceId: string) => void;
  onUnequip: () => void;
}) {
  const definition = EQUIPMENT_SLOT_DEFINITIONS.find((slot) => slot.id === slotId)!;
  const current = equipment.slots[slotId] ? resolveItemInstance(inventory, equipment.slots[slotId]!) : null;
  const availableModels = models.filter((model) => !model.equipped);
  const activeRequest = previewState.request?.slotId === slotId ? previewState.request : null;
  const activeModel = activeRequest ? models.find((model) => model.entry.instance.id === activeRequest.instanceId) : undefined;
  const activeCandidate = activeModel?.entry;
  const replacement = activeCandidate ? buildEquipmentReplacementPresentation(activeCandidate, slotId, equipment, inventory) : undefined;
  const isCurrent = Boolean(activeCandidate && activeCandidate.instance.id === current?.instance.id);
  const canCommit = Boolean(activeCandidate && activeModel?.validation.valid && !isCurrent && !combatLocked);
  const actionLabel = replacement?.action === "move" ? `MOVE TO ${replacement.slotLabel.toUpperCase()}` : "EQUIP";
  const hunterRank = hunterRankForPoints(progression.hunterRankPoints);
  const itemRows = buildEquipmentItemDifferenceRows(current ?? undefined, activeCandidate);
  return (
    <section className="hero-equipment-options hero-equipment-slot-inspector" data-debug-kind="hero-equipment-selected" data-debug-options="true" data-debug-slot-id={slotId} data-debug-expanded="true" data-debug-compatible-count={models.length}>
      <div className="equipment-compatible-workspace" data-debug-kind="equipment-compatible-workspace">
        <div className="equipment-item-list-pane" data-debug-kind="equipment-item-list">
          <div className="equipment-pane-heading"><span className="tiny-label">ITEM LIST</span><span>{models.length} item{models.length === 1 ? "" : "s"}</span></div>
          <EquipmentCurrentCard slotId={slotId} current={current} defensiveContext={defensiveContext} hunterRank={hunterRank} combatLocked={combatLocked} onClearPreview={onClearPreview} onUnequip={onUnequip} />
          <EquipmentCandidateBrowser models={availableModels} slotId={slotId} hunterRank={hunterRank} totalCount={models.length} pinned={pinned} hovered={hovered} onSelect={onSelectCandidate} onHover={onHoverCandidate} onLeave={onLeaveCandidate} />
        </div>
        <EquipmentItemComparison slotLabel={definition.label} current={current} candidate={activeCandidate} itemRows={itemRows} buildRows={activeCandidate && !isCurrent ? previewState.comparison : []} combatLocked={combatLocked} hunterRankLocked={Boolean(activeModel?.hunterRankLocked)} actionLabel={actionLabel} canEquip={canCommit} onEquip={() => { if (activeCandidate) onEquip(activeCandidate.instance.id); }} />
      </div>
    </section>
  );
}
