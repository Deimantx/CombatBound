import { describe, expect, it } from "vitest";
import { itemById } from "../game/data/items";
import { itemUpgradeTreeDefinitions } from "../game/data/gear/itemUpgradeTrees";
import { EQUIPMENT_SLOT_IDS } from "../game/equipment/equipmentTypes";
import { equipItemInstance, normalizeEquipmentState } from "../game/equipment/equipmentRules";
import { grantItem } from "../game/items/itemOwnership";
import { normalizeItemInstance } from "../game/items/itemInstanceValidation";
import { createInitialGameState } from "../game/gameState";
import { gameStateToSaveV17, parseGameSaveJson } from "../game/persistence/saveGame";

describe("Iron melee roster and V17 foundation", () => {
  it("authors the complete eight-weapon roster and 96-node tree set", () => {
    const ids = ["sword", "axe", "mace", "dagger", "greatsword", "great-axe", "warhammer", "spear"];
    expect(ids.map((family) => itemById[`item.iron-${family}`]?.weaponFamilyId)).toEqual(ids);
    expect(itemUpgradeTreeDefinitions).toHaveLength(8);
    expect(itemUpgradeTreeDefinitions.reduce((count, tree) => count + tree.nodeIds.length, 0)).toBe(96);
    expect(itemUpgradeTreeDefinitions.every((tree) => tree.branchIds.length === 3 && tree.nodeIds.length === 12)).toBe(true);
  });

  it("keeps current V17 loads conservative", () => {
    const initial = createInitialGameState();
    const swordId = Object.values(initial.inventory.instances).find((instance) => instance.definitionId === "item.iron-sword")?.id;
    const save = gameStateToSaveV17({ ...initial, inventory: { ...initial.inventory, instances: {} }, equipment: { slots: {} } }, { reducedMotion: false, showInspectorButton: false });
    const loaded = parseGameSaveJson(JSON.stringify(save));
    expect(swordId).toBeDefined();
    expect(Object.values(loaded?.inventory.instances ?? {}).some((instance) => instance.definitionId === "item.iron-sword")).toBe(false);
    expect(loaded?.equipment.slots).toEqual({});
  });

  it("selects the valid branch after filtering orphaned upgrade nodes", () => {
    const initial = createInitialGameState();
    const sword = Object.values(initial.inventory.instances).find((instance) => instance.definitionId === "item.iron-sword")!;
    const normalized = normalizeItemInstance({ ...sword, unlockedUpgradeNodeIds: ["upgrade-node.iron-sword.tempered-edge-2", "upgrade-node.iron-sword.balanced-grip", "upgrade-node.iron-sword.honed-point"] });
    expect(normalized?.unlockedUpgradeNodeIds).toEqual(["upgrade-node.iron-sword.balanced-grip", "upgrade-node.iron-sword.honed-point"]);
  });

  it("discovers an undiscovered base Iron proficiency atomically with equip", () => {
    const initial = createInitialGameState();
    const granted = grantItem(initial.inventory, "item.iron-axe", 1).inventory;
    const axe = Object.values(granted.instances).find((instance) => instance.definitionId === "item.iron-axe")!;
    const progression = { ...initial.progression, proficiencies: {} };
    const result = equipItemInstance({ inventory: granted, equipment: { slots: {} }, instanceId: axe.id, slotId: "weapon", hunterRank: 1, progression });
    expect(result.validation.valid).toBe(true);
    expect(result.validation.willDiscoverProficiency).toBe(true);
    expect(result.progression?.proficiencies["one-handed-axe"]).toEqual({ proficiencyId: "one-handed-axe", totalXp: 0 });
  });

  it("normalizes a malformed two-handed offhand conflict deterministically", () => {
    const initial = createInitialGameState();
    const granted = grantItem(initial.inventory, "item.iron-greatsword", 1).inventory;
    const greatsword = Object.values(granted.instances).find((instance) => instance.definitionId === "item.iron-greatsword")!;
    const shieldId = "item-instance-999";
    const shieldInventory = { ...granted, instances: { ...granted.instances, [shieldId]: { id: shieldId, definitionId: "test.shield", version: 3 as const, unlockedUpgradeNodeIds: [] } } };
    const shield: typeof itemById[string] = { id: "test.shield", name: "Test Shield", category: "accessory", rarity: "common", description: "Test", icon: "shield", inventoryMode: "instance", equipmentSlotKind: "offhand", defensiveProficiencyId: "shield" };
    const equipment = normalizeEquipmentState({ slots: { weapon: greatsword.id, offhand: shieldId } }, shieldInventory, { ...itemById, "test.shield": shield });
    expect(equipment.slots.weapon).toBe(greatsword.id);
    expect(equipment.slots.offhand).toBeUndefined();
  });

  it("keeps the canonical thirteen equipment slot IDs stable", () => {
    expect(EQUIPMENT_SLOT_IDS).toEqual(["weapon", "offhand", "head", "armor", "gloves", "boots", "belt", "cape", "necklace", "ring1", "ring2", "earring1", "earring2"]);
  });
});
