import { describe, expect, it } from "vitest";
import { itemById } from "../game/data/items";
import { ironDefensiveBranches, ironDefensiveNodes, ironDefensiveTreeDefinitions, itemUpgradeNodeById } from "../game/data/gear/itemUpgradeTrees";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { getDefensiveEquipmentContext, calculateDefensiveTrainingAwards } from "../game/equipment/defensiveEquipment";
import { equipItemInstance, validateEquipmentChange } from "../game/equipment/equipmentRules";
import { grantItem } from "../game/items/itemOwnership";
import { getItemProficiencyRequirement } from "../game/equipment/itemProficiency";
import { validateItemUpgradeTrees } from "../game/items/itemUpgradeValidation";

const defensiveIds = ["item.iron-helmet", "item.iron-armor", "item.iron-gloves", "item.iron-boots", "item.iron-shield"] as const;

function grantOne(inventory: ReturnType<typeof createInitialGameState>["inventory"], itemId: string) {
  const result = grantItem(inventory, itemId, 1);
  const instance = result.createdInstanceIds[0];
  if (!instance) throw new Error(`Missing instance for ${itemId}`);
  return { inventory: result.inventory, instance };
}

describe("Iron heavy armor and shield V17", () => {
  it("authors the five exact defensive definitions and tuned base stats", () => {
    expect(defensiveIds.map((id) => itemById[id]?.name)).toEqual(["Iron Helmet", "Iron Armor", "Iron Gloves", "Iron Boots", "Iron Shield"]);
    expect(defensiveIds.every((id) => itemById[id]?.category === "armor" && itemById[id]?.purpose === "equipment" && itemById[id]?.materialTierId === "iron" && itemById[id]?.requiredHunterRank === 1 && itemById[id]?.requiredProficiencyLevel === 1)).toBe(true);
    expect(defensiveIds.map((id) => itemById[id]?.stats)).toEqual([
      { armour: 18, maxLife: 12 },
      { armour: 45, maxLife: 35 },
      { armour: 12, maxLife: 8 },
      { armour: 15, maxLife: 10 },
      { armour: 20, maxLife: 10, blockChance: 0.10, blockEffect: 0.25 },
    ]);
    expect(getItemProficiencyRequirement(itemById["item.iron-helmet"])).toMatchObject({ proficiencyId: "heavy-armor", requiredLevel: 1, kind: "defensive" });
    expect(getItemProficiencyRequirement(itemById["item.iron-shield"])).toMatchObject({ proficiencyId: "shield", requiredLevel: 1, kind: "defensive" });
  });

  it("registers five 3-branch, 12-node single-branch trees with only global stat effects", () => {
    expect(ironDefensiveTreeDefinitions).toHaveLength(5);
    expect(ironDefensiveBranches).toHaveLength(15);
    expect(ironDefensiveNodes).toHaveLength(60);
    expect(ironDefensiveTreeDefinitions.every((tree) => tree.selectionMode === "single-branch" && tree.branchIds.length === 3 && tree.nodeIds.length === 12)).toBe(true);
    expect(ironDefensiveNodes.every((node) => node.effects.every((effect) => effect.type === "globalStat" && effect.operation === "flat"))).toBe(true);
    expect(validateItemUpgradeTrees().valid).toBe(true);
    expect(itemUpgradeNodeById["upgrade-node.iron-shield.aegis"]?.costs.some((cost) => cost.itemId.includes("magic-crystal"))).toBe(false);
  });

  it("discovers heavy armor and shield proficiency only after a valid equip", () => {
    const base = createInitialGameState();
    const helmet = grantOne({ ...base.inventory, instances: {} }, "item.iron-helmet");
    const result = equipItemInstance({ inventory: helmet.inventory, equipment: { slots: {} }, instanceId: helmet.instance, slotId: "head", hunterRank: 1, progression: base.progression });
    expect(result.validation).toMatchObject({ valid: true, proficiencyId: "heavy-armor", willDiscoverProficiency: true });
    expect(result.equipment.slots.head).toBe(helmet.instance);
    expect(result.progression?.proficiencies["heavy-armor"]).toBeDefined();
  });

  it("keeps defensive training and derived stats distinct for the shield", () => {
    const base = createInitialGameState();
    let inventory = { ...base.inventory, instances: {} };
    const equipment: { slots: Partial<Record<"head" | "armor" | "gloves" | "boots" | "offhand", string>> } = { slots: {} };
    for (const [itemId, slot] of [["item.iron-helmet", "head"], ["item.iron-armor", "armor"], ["item.iron-gloves", "gloves"], ["item.iron-boots", "boots"], ["item.iron-shield", "offhand"]] as const) {
      const granted = grantOne(inventory, itemId);
      inventory = granted.inventory;
      const result = equipItemInstance({ inventory, equipment, instanceId: granted.instance, slotId: slot, hunterRank: 1, progression: base.progression, ignoreRequirements: true });
      Object.assign(equipment.slots, result.equipment.slots);
    }
    expect(getDefensiveEquipmentContext(equipment, inventory)).toMatchObject({ heavyArmorPieces: 4, shieldEquipped: true });
    expect(calculateDefensiveTrainingAwards(getDefensiveEquipmentContext(equipment, inventory))).toMatchObject({ "heavy-armor": 1, shield: 1 });
    const stats = calculateHunterCombatStats(equipment, inventory, base.progression);
    expect(stats.armour).toBe(145);
    expect(stats.maxLife).toBe(575);
    expect(stats.blockChance).toBeCloseTo(0.10);
    expect(stats.blockEffect).toBeCloseTo(0.25);
  });

  it("does not discover or equip on failed slot or hunter-rank validation", () => {
    const base = createInitialGameState();
    const granted = grantOne({ ...base.inventory, instances: {} }, "item.iron-shield");
    expect(validateEquipmentChange({ inventory: granted.inventory, equipment: { slots: {} }, instanceId: granted.instance, slotId: "weapon", hunterRank: 1, progression: base.progression }).reason).toBe("wrong-slot-kind");
    expect(validateEquipmentChange({ inventory: granted.inventory, equipment: { slots: {} }, instanceId: granted.instance, slotId: "offhand", hunterRank: 0, progression: base.progression }).reason).toBe("hunter-rank");
  });
});
