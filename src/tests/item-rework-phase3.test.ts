import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { buildItemPresentation } from "../game/presentation/itemPresentation";
import { resolveItemInstance } from "../game/items/itemResolver";

describe("current deterministic gear presentation", () => {
  it("identifies an unspecialized exact item without legacy modifier language", () => {
    const game = createInitialGameState();
    const resolved = resolveItemInstance(game.inventory, Object.keys(game.inventory.instances)[0])!;
    const presentation = buildItemPresentation(resolved);
    expect(presentation.specialization).toBeUndefined();
    expect(presentation.upgradeProgress).toEqual({ unlocked: 0, total: 4 });
    expect(JSON.stringify(presentation)).not.toMatch(/quality|upgradeLevel|affix/i);
  });
});
