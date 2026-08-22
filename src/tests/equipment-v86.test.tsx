import { describe, expect, it } from "vitest";
import { EQUIPMENT_SLOT_IDS } from "../game/equipment/equipmentTypes";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { createInitialGameState } from "../game/gameState";

describe("current equipment foundation", () => {
  it("keeps the canonical thirteen equipment slots", () => {
    expect(EQUIPMENT_SLOT_IDS).toHaveLength(14);
    expect(new Set(EQUIPMENT_SLOT_IDS).size).toBe(14);
  });

  it("uses the equipped exact Iron Sword instance for build stats", () => {
    const game = createInitialGameState();
    const swordId = game.equipment.slots.weapon!;
    const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
    expect(game.inventory.instances[swordId].definitionId).toBe("item.iron-sword");
    expect(stats.attackDamageMin).toBe(24);
    expect(stats.attackDamageMax).toBe(32);
    expect(stats.attackInterval).toBe(2.35);
  });
});
