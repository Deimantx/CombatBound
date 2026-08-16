import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { equipItemInstance, getCompatibleItemInstances, validateEquipmentChange } from "../game/equipment/equipmentRules";
import type { InventoryState } from "../game/inventory/inventoryTypes";
import { grantItem, normalizeInventoryState } from "../game/items/itemOwnership";
import { resolveItemInstance } from "../game/items/itemResolver";
import { migrateV10Save } from "../game/persistence/saveMigration";
import { isGameSave } from "../game/persistence/saveValidation";

describe("Phase 1 item instances", () => {
  it("creates deterministic independent instances while keeping stacks fungible", () => {
    let inventory: InventoryState = { stackables: {}, instances: {}, nextInstanceSequence: 1 };
    inventory = grantItem(inventory, "item.hunter-sword", 3).inventory;
    inventory = grantItem(inventory, "item.wolf-fang", 5).inventory;
    inventory = grantItem(inventory, "item.wolf-fang", 3).inventory;
    const swords = Object.values(inventory.instances);
    expect(swords.map((instance) => instance.id)).toEqual([
      "item-instance-00000001",
      "item-instance-00000002",
      "item-instance-00000003",
    ]);
    expect(swords.every((instance) => instance.definitionId === "item.hunter-sword")).toBe(true);
    expect(inventory.stackables["item.wolf-fang"]).toBe(8);
  });

  it("resolves a shared definition through one owned instance", () => {
    const game = createInitialGameState();
    const instanceId = game.equipment.slots.weapon!;
    const resolved = resolveItemInstance(game.inventory, instanceId);
    expect(resolved?.instance.id).toBe(instanceId);
    expect(resolved?.definition.id).toBe("item.training-sword");
    expect(resolved?.effectiveStats.baseDamageMin).toBe(24);
    expect(resolved?.effectiveStats.baseDamageMax).toBe(32);
    expect(resolved?.effectiveStats).not.toBe(resolved?.definition.stats);
  });

  it("moves and replaces exact instances without duplicating ownership", () => {
    let game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.hunter-sword", 2);
    game = { ...game, inventory: granted.inventory };
    const [first, second] = Object.values(granted.inventory.instances).filter((instance) => instance.definitionId === "item.hunter-sword");
    const firstEquip = equipItemInstance({ inventory: game.inventory, equipment: game.equipment, instanceId: first.id, slotId: "weapon", masteryLevel: 10 });
    expect(firstEquip.validation.valid).toBe(true);
    const moved = equipItemInstance({ inventory: game.inventory, equipment: firstEquip.equipment, instanceId: first.id, slotId: "weapon", masteryLevel: 10 });
    expect(moved.equipment.slots.weapon).toBe(first.id);
    const replaced = equipItemInstance({ inventory: game.inventory, equipment: moved.equipment, instanceId: second.id, slotId: "weapon", masteryLevel: 10 });
    expect(replaced.equipment.slots.weapon).toBe(second.id);
    expect(Object.keys(game.inventory.instances)).toHaveLength(8);
  });

  it("normalizes a stale sequence above the highest existing suffix", () => {
    const inventory = normalizeInventoryState({
      stackables: {},
      instances: { "item-instance-00000015": { id: "item-instance-00000015", definitionId: "item.hunter-sword", version: 1 } },
      nextInstanceSequence: 2,
    });
    expect(inventory.nextInstanceSequence).toBe(16);
  });

  it("migrates V10 quantity ownership into V11 stacks and instances", () => {
    const game = createInitialGameState();
    const legacy = migrateV10Save({
      version: 10,
      progression: game.progression,
      inventory: { quantities: { "item.hunter-sword": 2, "item.wolf-fang": 7 } },
      equipment: { slots: { weapon: "item.hunter-sword" } },
      collection: game.collection,
      gold: 0,
      settings: { reducedMotion: false, showInspectorButton: true },
      spellbook: game.spellbook,
      combatAutomation: game.combatAutomation,
      combatAutomationPresets: game.combatAutomationPresets,
      combatAbilities: game.combatAbilities,
    });
    expect(legacy?.version).toBe(11);
    expect(legacy?.inventory.stackables["item.wolf-fang"]).toBe(7);
    expect(Object.values(legacy?.inventory.instances ?? {}).filter((instance) => instance.definitionId === "item.hunter-sword")).toHaveLength(2);
    expect(legacy?.equipment.slots.weapon).toBe("item-instance-00000001");
  });

  it("validates modern saves against ownership and slot invariants", () => {
    const game = createInitialGameState();
    const save = {
      version: 11 as const,
      progression: game.progression,
      inventory: game.inventory,
      equipment: game.equipment,
      collection: game.collection,
      gold: game.gold,
      settings: { reducedMotion: false, showInspectorButton: true },
      spellbook: game.spellbook,
      combatAutomation: game.combatAutomation,
      combatAutomationPresets: game.combatAutomationPresets,
      combatAbilities: game.combatAbilities,
    };
    expect(isGameSave(save)).toBe(true);
    const invalid = { ...save, equipment: { slots: { weapon: "item.training-sword" } } };
    expect(isGameSave(invalid)).toBe(false);
  });

  it("lists duplicate compatible equipment as separate candidates", () => {
    let inventory: InventoryState = { stackables: {}, instances: {}, nextInstanceSequence: 1 };
    inventory = grantItem(inventory, "item.hunter-sword", 2).inventory;
    const candidates = getCompatibleItemInstances(inventory, "weapon");
    expect(candidates).toHaveLength(2);
    expect(new Set(candidates.map((entry) => entry.instance.id)).size).toBe(2);
    expect(validateEquipmentChange({ instanceId: candidates[0].instance.id, slotId: "weapon", inventory, equipment: { slots: {} }, masteryLevel: 10 }).valid).toBe(true);
  });
});
