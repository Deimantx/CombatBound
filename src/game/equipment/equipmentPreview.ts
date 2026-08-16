import { calculateHunterCombatStats, type HunterCombatStats } from "./derivedStats";
import { previewEquipmentChange, validateEquipmentChange, type EquipmentChangeValidation } from "./equipmentRules";
import type { EquipmentState, EquipmentSlotId } from "./equipmentTypes";
import { buildEquipmentComparisonRows, type EquipmentComparisonRow } from "../presentation/equipmentComparison";
import { masteryLevelForXp } from "../progression/masteryProgression";
import { resolveItemInstance } from "../items/itemResolver";
import type { GameState } from "../gameState";
import type { ItemInstanceId } from "../items/itemTypes";

export interface EquipmentPreviewRequest {
  slotId: EquipmentSlotId;
  instanceId: ItemInstanceId | string;
}

export interface EquipmentPreviewState {
  request: EquipmentPreviewRequest | null;
  currentStats: HunterCombatStats;
  validation?: EquipmentChangeValidation;
  previewEquipment?: EquipmentState;
  previewStats?: HunterCombatStats;
  comparison: EquipmentComparisonRow[];
}

/**
 * Builds the one canonical equipment preview consumed by Hero and Inventory.
 * Mastery-locked candidates still get a structural stat preview; the original
 * validation is retained so the action layer can keep them unequippable.
 */
export function buildEquipmentPreviewState(game: GameState, request: EquipmentPreviewRequest | null): EquipmentPreviewState {
  const currentStats = calculateHunterCombatStats(
    game.equipment,
    game.inventory,
    game.progression,
    game.combat.stance,
    game.combat.techniques,
  );
  if (!request) return { request: null, currentStats, comparison: [] };

  const masteryLevel = masteryLevelForXp(game.progression.masteryXp);
  const validation = validateEquipmentChange({
    instanceId: request.instanceId,
    slotId: request.slotId,
    inventory: game.inventory,
    equipment: game.equipment,
    masteryLevel,
  });
  if (!validation.valid && validation.reason !== "mastery-level") {
    return { request, currentStats, validation, comparison: [] };
  }

  const resolved = resolveItemInstance(game.inventory, request.instanceId as ItemInstanceId);
  // The resolver-backed validation above is authoritative. A mastery-locked
  // item previews at its own requirement while the original validation keeps
  // the action disabled.
  const preview = previewEquipmentChange({
    instanceId: request.instanceId,
    slotId: request.slotId,
    inventory: game.inventory,
    equipment: game.equipment,
    masteryLevel: validation.valid ? masteryLevel : Math.max(masteryLevel, resolved?.definition.requiredMasteryLevel ?? masteryLevel),
  });
  if (!preview.validation.valid) return { request, currentStats, validation, comparison: [] };
  const previewStats = calculateHunterCombatStats(
    preview.equipment,
    game.inventory,
    game.progression,
    game.combat.stance,
    game.combat.techniques,
  );
  return {
    request,
    currentStats,
    validation,
    previewEquipment: preview.equipment,
    previewStats,
    comparison: buildEquipmentComparisonRows(
      currentStats as unknown as Record<string, number>,
      previewStats as unknown as Record<string, number>,
    ),
  };
}
