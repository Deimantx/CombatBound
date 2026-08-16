import { calculateHunterCombatStats } from "../equipment/derivedStats";
import { previewEquipmentChange, validateEquipmentChange } from "../equipment/equipmentRules";
import type { EquipmentSlotId } from "../equipment/equipmentTypes";
import { masteryLevelForXp } from "../progression/masteryProgression";
import { buildEquipmentComparisonRows, type EquipmentComparisonRow } from "../presentation/equipmentComparison";
import type { ItemInstanceId } from "../items/itemTypes";
import type { GameState } from "../gameState";

export function previewInventoryEquipmentChange(game: GameState, instanceId: ItemInstanceId, slotId: EquipmentSlotId) {
  const validation = validateEquipmentChange({
    instanceId,
    slotId,
    inventory: game.inventory,
    equipment: game.equipment,
    masteryLevel: masteryLevelForXp(game.progression.masteryXp),
  });
  if (!validation.valid) return { validation, preview: undefined, comparison: [] as EquipmentComparisonRow[] };
  const preview = previewEquipmentChange({
    instanceId,
    slotId,
    inventory: game.inventory,
    equipment: game.equipment,
    masteryLevel: masteryLevelForXp(game.progression.masteryXp),
  });
  const currentStats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression, game.combat.stance, game.combat.techniques);
  const previewStats = calculateHunterCombatStats(preview.equipment, game.inventory, game.progression, game.combat.stance, game.combat.techniques);
  return {
    validation,
    preview,
    comparison: buildEquipmentComparisonRows(currentStats as unknown as Record<string, number>, previewStats as unknown as Record<string, number>),
  };
}
