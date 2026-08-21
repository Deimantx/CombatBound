import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { resolveItemInstance } from "../game/items/itemResolver";

describe("current item instance ownership", () => {
  it("keeps exact copies independently addressable", () => {
    const game = createInitialGameState();
    const first = resolveItemInstance(game.inventory, Object.keys(game.inventory.instances)[0]);
    expect(first?.instance.id).toMatch(/^item-instance-/);
    expect(first?.instance.version).toBe(3);
    expect(first?.instance.unlockedUpgradeNodeIds).toEqual([]);
  });
});
