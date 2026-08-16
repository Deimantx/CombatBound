import type { EquipmentSlotId } from "../equipment/equipmentTypes";
import { buildEquipmentPreviewState } from "../equipment/equipmentPreview";
import type { EquipmentChangeValidation } from "../equipment/equipmentRules";
import type { EquipmentComparisonRow } from "../presentation/equipmentComparison";
import type { ItemInstanceId } from "../items/itemTypes";
import type { GameState } from "../gameState";

export function previewInventoryEquipmentChange(game: GameState, instanceId: ItemInstanceId, slotId: EquipmentSlotId) {
  const state = buildEquipmentPreviewState(game, { instanceId, slotId });
  const validation: EquipmentChangeValidation = state.validation ?? { valid: false, reason: "unknown-instance" };
  return {
    validation,
    preview: state.previewEquipment ? { equipment: state.previewEquipment, validation } : undefined,
    comparison: state.comparison as EquipmentComparisonRow[],
  };
}
