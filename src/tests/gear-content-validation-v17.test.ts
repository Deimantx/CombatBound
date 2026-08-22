import { describe, expect, it } from "vitest";
import { equipmentDefinitions, itemById, type ItemDefinition } from "../game/data/items";
import { validateEquipmentDefinitions, validateItemDefinition } from "../game/data/validation/itemValidation";
import { itemUpgradeNodeById, itemUpgradeTreeDefinitions } from "../game/data/gear/itemUpgradeTrees";
import { validateItemUpgradeTrees } from "../game/items/itemUpgradeValidation";

const fixture = (overrides: Partial<ItemDefinition>): ItemDefinition => ({
  id: "item.test-validation",
  name: "Test Validation Item",
  category: "armor",
  rarity: "common",
  description: "Test item.",
  icon: "shield",
  inventoryMode: "instance",
  purpose: "equipment",
  equipmentSlotKind: "head",
  stats: { armour: 1 },
  ...overrides,
});

describe("current Iron gear content validation", () => {
  it("keeps all authored equipment and 156 upgrade nodes valid", () => {
    expect(validateEquipmentDefinitions(equipmentDefinitions).errors).toEqual([]);
    expect(validateItemUpgradeTrees().errors).toEqual([]);
    expect(itemUpgradeTreeDefinitions).toHaveLength(13);
    expect(itemUpgradeTreeDefinitions.reduce((total, tree) => total + tree.nodeIds.length, 0)).toBe(156);
  });

  it("rejects magic crystals and enforces Black Stone capstones only", () => {
    const allNodes = itemUpgradeTreeDefinitions.flatMap((tree) => tree.nodeIds.map((nodeId) => itemUpgradeNodeById[nodeId]!));
    expect(allNodes.some((node) => node.costs.some((cost) => /^item\.magic-crystal/.test(cost.itemId)))).toBe(false);
    for (const node of allNodes) {
      const hasBlackStone = node.costs.some((cost) => cost.itemId === "item.black-stone");
      const isCapstone = node.presentation.size === "capstone";
      expect(hasBlackStone).toBe(isCapstone);
      for (const cost of node.costs) {
        const material = itemById[cost.itemId];
        expect(material?.inventoryMode).toBe("stackable");
        expect(material?.purpose).toBe("crafting");
        expect(Number.isInteger(cost.quantity) && cost.quantity > 0).toBe(true);
      }
    }
  });

  it.each([
    ["required level without ID", fixture({ requiredProficiencyLevel: 1 })],
    ["weapon proficiency on armor", fixture({ weaponProficiencyId: "one-handed-sword", requiredProficiencyLevel: 1 })],
    ["shield proficiency on head", fixture({ defensiveProficiencyId: "shield", requiredProficiencyLevel: 1 })],
    ["heavy armor proficiency on offhand", fixture({ equipmentSlotKind: "offhand", defensiveProficiencyId: "heavy-armor", requiredProficiencyLevel: 1 })],
    ["proficiency ID without level", fixture({ defensiveProficiencyId: "heavy-armor" })],
    ["dual proficiency IDs", fixture({ weaponProficiencyId: "one-handed-sword", defensiveProficiencyId: "heavy-armor", requiredProficiencyLevel: 1 })],
  ])("rejects malformed authoring: %s", (_label, item) => {
    expect(validateItemDefinition(item).errors.length).toBeGreaterThan(0);
  });
});
