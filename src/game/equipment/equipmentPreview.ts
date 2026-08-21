import { calculateHunterCombatStats, type HunterCombatStats } from "./derivedStats";
import { previewEquipmentChange, validateEquipmentChange, type EquipmentChangeValidation } from "./equipmentRules";
import type { EquipmentState, EquipmentSlotId } from "./equipmentTypes";
import { buildEquipmentComparisonRows, type EquipmentComparisonRow } from "../presentation/equipmentComparison";
import { hunterRankForPoints } from "../progression/hunterRankProgression";
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
 * Hunter Rank-locked candidates still get a structural stat preview; the original
 * validation is retained so the action layer can keep them unequippable.
 */
export function buildEquipmentPreviewState(game: GameState, request: EquipmentPreviewRequest | null): EquipmentPreviewState {
  const currentStats = calculateHunterCombatStats(
    game.equipment,
    game.inventory,
    game.progression,
  );
  if (!request) return { request: null, currentStats, comparison: [] };

  const hunterRank = hunterRankForPoints(game.progression.hunterRankPoints);
  const validation = validateEquipmentChange({
    instanceId: request.instanceId,
    slotId: request.slotId,
    inventory: game.inventory,
    equipment: game.equipment,
    hunterRank,
    progression: game.progression,
  });
  if (!validation.valid && validation.reason !== "hunter-rank" && validation.reason !== "proficiency-level") {
    return { request, currentStats, validation, comparison: [] };
  }

  const resolved = resolveItemInstance(game.inventory, request.instanceId as ItemInstanceId);
  // The resolver-backed validation above is authoritative. A rank-locked
  // item previews at its own requirement while the original validation keeps
  // the action disabled.
  const preview = previewEquipmentChange({
    instanceId: request.instanceId,
    slotId: request.slotId,
    inventory: game.inventory,
    equipment: game.equipment,
    hunterRank: validation.valid ? hunterRank : Math.max(hunterRank, resolved?.definition.requiredHunterRank ?? hunterRank),
    progression: game.progression,
  });
  if (!preview.validation.valid) return { request, currentStats, validation, comparison: [] };
  const previewStats = calculateHunterCombatStats(
    preview.equipment,
    game.inventory,
    game.progression,
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
