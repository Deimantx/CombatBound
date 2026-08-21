import { describe, expect, it } from "vitest";
import { equipmentDefinitions, itemById } from "../game/data/items";
import { validateEquipmentDefinitions } from "../game/data/validation/itemValidation";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";

describe("authored equipment stat integrity", () => {
  it("validates the current authored equipment catalogue", () => {
    expect(validateEquipmentDefinitions(equipmentDefinitions).errors).toEqual([]);
    expect(itemById["item.iron-sword"].stats).toMatchObject({ baseDamageMin: 24, baseDamageMax: 32, baseAttackTime: 2.35, accuracyRating: 8, criticalStrikeChance: 0.02, blockChance: 0.02 });
  });

  it("keeps build stats tied to the equipped exact instance", () => {
    const game = createInitialGameState();
    const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
    expect(stats.attackDamageMin).toBe(24);
    expect(stats.accuracyRating).toBe(78);
  });
});
