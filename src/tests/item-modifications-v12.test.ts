import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { gameStateToSaveV14, parseGameSaveJson } from "../game/persistence/saveGame";
import { isGameSaveV20 } from "../game/persistence/saveValidation";
import { validateItemInstance } from "../game/items/itemInstanceValidation";

describe("retired item modifier boundary", () => {
  it("creates only strict V3 item instances", () => {
    const game = createInitialGameState();
    const instance = Object.values(game.inventory.instances)[0];
    expect(instance).toEqual({ id: instance.id, definitionId: "item.iron-sword", version: 3, unlockedUpgradeNodeIds: [] });
    expect(validateItemInstance(instance)).toEqual({ valid: true, errors: [] });
  });

  it("accepts frozen V15 legacy fields only at migration and discards them", () => {
    const game = createInitialGameState();
    const base = gameStateToSaveV14(game, { reducedMotion: false, showInspectorButton: true });
    const migrated = parseGameSaveJson(JSON.stringify({
      ...base,
      version: 15,
      magicArts: { knownArtIds: ["magic-art.earth-shield"] },
      inventory: {
        stackables: { "item.healing-potion": 7 },
        instances: {
          "item-instance-00000009": { id: "item-instance-00000009", definitionId: "item.hunter-sword", version: 2, quality: 20, upgradeLevel: 4, affixes: [{ affixId: "legacy.prefix", tierId: "legacy.prefix.t1", rolls: { physical: 0.2 } }] },
        },
        nextInstanceSequence: 10,
      },
      equipment: { slots: { weapon: "item-instance-00000009" } },
    }));
    expect(migrated?.version).toBe(20);
    expect(isGameSaveV20(migrated)).toBe(true);
    const instance = Object.values(migrated!.inventory.instances)[0];
    expect(instance).toEqual({ id: instance.id, definitionId: "item.iron-sword", version: 3, unlockedUpgradeNodeIds: [] });
    expect(instance).not.toHaveProperty("quality");
    expect(instance).not.toHaveProperty("upgradeLevel");
    expect(instance).not.toHaveProperty("affixes");
  });
});
