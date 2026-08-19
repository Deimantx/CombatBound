import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { gameStateToSaveV14, gameStateToSaveV15, parseGameSaveJson } from "../game/persistence/saveGame";
import { isGameSaveV15 } from "../game/persistence/saveValidation";

const settings = { reducedMotion: false, showInspectorButton: true };

describe("Magic Arts V15 persistence", () => {
  it("writes a current save with Magic Arts and no Spellbook", () => {
    const save = gameStateToSaveV15(createInitialGameState(), settings);
    expect(save.version).toBe(15);
    expect(save.magicArts.knownArtIds).toEqual(["magic-art.earth-shield"]);
    expect("spellbook" in save).toBe(false);
    expect(isGameSaveV15(save)).toBe(true);
  });

  it("drops retired Magic progress and spells at the V14 boundary", () => {
    const base = gameStateToSaveV14(createInitialGameState(), settings);
    const legacy = {
      ...base,
      progression: {
        ...base.progression,
        proficiencies: {
          "fire-magic": { proficiencyId: "fire-magic", totalXp: 500 },
          "one-handed-sword": { proficiencyId: "one-handed-sword", totalXp: 25 },
        },
        purchasedPerks: { "perk.fire-magic.fire-magic-foundations": 1 },
      },
      spellbook: { knownSpellIds: ["spell.flame-blast"] },
      combatAbilities: { slots: ["spell.flame-blast", "defense.guard", null, null, null] },
      combatAutomation: { ...base.combatAutomation, rules: [{ id: "old", actionId: "spell.flame-blast", priority: 1, enabled: true, conditions: [{ type: "always" }] }] },
    };
    const migrated = parseGameSaveJson(JSON.stringify(legacy));
    expect(migrated?.version).toBe(15);
    expect(migrated?.magicArts.knownArtIds).toEqual(["magic-art.earth-shield"]);
    expect(migrated?.progression.proficiencies["fire-magic" as never]).toBeUndefined();
    expect(migrated?.progression.proficiencies["one-handed-sword"]?.totalXp).toBe(25);
    expect(migrated?.combatAbilities.slots).toEqual([null, "defense.guard", null, null, null]);
    expect(migrated?.combatAutomation.rules).toHaveLength(0);
    expect(isGameSaveV15(migrated)).toBe(true);
  });
});
