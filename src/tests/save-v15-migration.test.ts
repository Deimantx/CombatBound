import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { gameStateToSaveV14, gameStateToSaveV17, parseGameSaveJson } from "../game/persistence/saveGame";
import { migrateV14Save } from "../game/persistence/saveMigration";
import { isGameSaveV15, isGameSaveV16, isGameSaveV18 } from "../game/persistence/saveValidation";

const settings = { reducedMotion: false, showInspectorButton: true };
const temperedEdge = "upgrade-node.iron-sword.tempered-edge-1";
const duelistRoot = "upgrade-node.iron-sword.balanced-grip";
const duelistSecond = "upgrade-node.iron-sword.honed-point";
const duelistThird = "upgrade-node.iron-sword.duelist-flow";

describe("V17 persistence boundaries", () => {
  it("freezes V15 as a historical pre-foundation schema", () => {
    const migratedFromV14 = migrateV14Save(gameStateToSaveV14(createInitialGameState(), settings));
    const v15 = migratedFromV14 && {
      ...migratedFromV14,
      inventory: {
        ...migratedFromV14.inventory,
        instances: Object.fromEntries(Object.entries(migratedFromV14.inventory.instances).map(([id, instance]) => [id, { id, definitionId: instance.definitionId, version: 2 as const, affixes: [] }])),
      },
    };
    expect(v15).not.toBeNull();
    expect(v15?.version).toBe(15);
    expect(isGameSaveV15(v15)).toBe(true);
    expect(v15?.inventory.instances).toBeDefined();
  });

  it("migrates V15 through the V17 Iron Sword boundary and removes retired spells", () => {
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
    expect(migrated?.version).toBe(18);
    expect(isGameSaveV18(migrated)).toBe(true);
    expect(migrated?.magicArts.knownArtIds).toEqual(["magic-art.earth-shield"]);
    expect(migrated?.progression.proficiencies["fire-magic" as never]).toBeUndefined();
    expect(migrated?.progression.proficiencies["one-handed-sword"]?.totalXp).toBe(25);
    expect(migrated?.combatAbilities.slots).toEqual([null, "defense.guard", null, null, null]);
    expect(migrated?.combatAutomation.rules).toHaveLength(0);
    expect("spellbook" in (migrated ?? {})).toBe(false);
  });

  it("accepts V16 cross-branch history, then applies the deterministic V17 winner policy", () => {
    const current = gameStateToSaveV17(createInitialGameState(), settings);
    const swordId = Object.keys(current.inventory.instances)[0]!;
    const v16 = {
      ...current,
      version: 16 as const,
      inventory: {
        ...current.inventory,
        instances: {
          ...current.inventory.instances,
          [swordId]: { ...current.inventory.instances[swordId]!, unlockedUpgradeNodeIds: [temperedEdge, duelistRoot] },
        },
      },
    };
    expect(isGameSaveV16(v16)).toBe(true);
    const migrated = parseGameSaveJson(JSON.stringify(v16));
    expect(migrated?.version).toBe(18);
    expect(migrated?.inventory.instances[swordId]?.unlockedUpgradeNodeIds).toEqual([temperedEdge]);
  });

  it("preserves the exact instance ID for empty and single-branch V16 items", () => {
    const current = gameStateToSaveV17(createInitialGameState(), settings);
    const swordId = Object.keys(current.inventory.instances)[0]!;
    const emptyV16 = { ...current, version: 16 as const, inventory: { ...current.inventory, instances: { ...current.inventory.instances, [swordId]: { ...current.inventory.instances[swordId]!, unlockedUpgradeNodeIds: [] } } } };
    const empty = parseGameSaveJson(JSON.stringify(emptyV16));
    expect(empty?.inventory.instances[swordId]).toEqual({ id: swordId, definitionId: "item.iron-sword", version: 3, unlockedUpgradeNodeIds: [] });

    const singleV16 = { ...current, version: 16 as const, inventory: { ...current.inventory, instances: { ...current.inventory.instances, [swordId]: { ...current.inventory.instances[swordId]!, unlockedUpgradeNodeIds: [duelistRoot, duelistSecond, duelistThird] } } } };
    const single = parseGameSaveJson(JSON.stringify(singleV16));
    expect(single?.inventory.instances[swordId]?.unlockedUpgradeNodeIds).toEqual([duelistRoot, duelistSecond, duelistThird]);
  });
});
