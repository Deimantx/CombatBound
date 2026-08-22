import { describe, expect, it } from "vitest";
import { itemById } from "../game/data/items";
import { ironDefensiveBranches, ironDefensiveNodes, ironDefensiveTreeDefinitions, itemUpgradeNodeById, itemUpgradeTreeById } from "../game/data/gear/itemUpgradeTrees";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { getDefensiveEquipmentContext, calculateDefensiveTrainingAwards } from "../game/equipment/defensiveEquipment";
import { equipItemInstance, validateEquipmentChange } from "../game/equipment/equipmentRules";
import { grantItem } from "../game/items/itemOwnership";
import { getItemProficiencyRequirement } from "../game/equipment/itemProficiency";
import { validateItemUpgradeTrees } from "../game/items/itemUpgradeValidation";
import { resolveItemInstance } from "../game/items/itemResolver";
import { buildItemPresentation } from "../game/presentation/itemPresentation";
import { itemUpgradeNodeById as upgradeNodes } from "../game/data/gear/itemUpgradeTrees";
import { gameStateToSaveV17, parseGameSaveJson, CURRENT_SAVE_VERSION } from "../game/persistence/saveGame";
import { debugGrantSelectedGearMaterials } from "../game/debug/debugActions";
import { getItemUpgradeSpecialization, purchaseItemUpgradeNode } from "../game/items/itemUpgradeLogic";

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

  it("uses canonical stat semantics for defensive upgrade modifier presentation", () => {
    const base = createInitialGameState();
    const granted = grantOne({ ...base.inventory, instances: {} }, "item.iron-helmet");
    const makeResolved = (unlockedUpgradeNodeIds: string[]) => {
      const instance = { ...granted.inventory.instances[granted.instance], unlockedUpgradeNodeIds };
      const inventory = { ...granted.inventory, instances: { ...granted.inventory.instances, [granted.instance]: instance } };
      return resolveItemInstance(inventory, granted.instance)!;
    };
    const modifiers = [
      ...buildItemPresentation(makeResolved(["upgrade-node.iron-helmet.reinforced-brow"])).modifiers,
      ...buildItemPresentation(makeResolved(["upgrade-node.iron-helmet.padded-crown", "upgrade-node.iron-helmet.fortified-skull", "upgrade-node.iron-helmet.unyielding-mind"])).modifiers,
      ...buildItemPresentation(makeResolved(["upgrade-node.iron-helmet.guarded-visor", "upgrade-node.iron-helmet.closed-face"])).modifiers,
    ].map((modifier) => modifier.value);
    expect(modifiers).toEqual(expect.arrayContaining(["Armour +4", "Max Life +5", "Life Regen +0.05 / sec", "Block Chance +1%", "Block Effect +1%"]));
    expect(modifiers.some((value) => value.includes("400%") || value.includes("500%"))).toBe(false);
    expect(upgradeNodes["upgrade-node.iron-helmet.reinforced-brow"]).toBeDefined();
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
    let inventory: typeof base.inventory = { ...base.inventory, instances: {} };
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

  it("round-trips defensive exact copies, specializations, equipment and progression through V17", () => {
    const base = createInitialGameState();
    let working: typeof base = { ...base, inventory: { ...base.inventory, instances: {} }, equipment: { slots: {} } };
    const authored = [
      ["item.iron-helmet", "head", "ironclad", 3],
      ["item.iron-armor", "armor", "renewal", 4],
      ["item.iron-gloves", "gloves", "guard", 2],
      ["item.iron-boots", "boots", "endurance", 1],
      ["item.iron-shield", "offhand", "bastion", 4],
    ] as const;
    for (const [itemId, slotId, branchSlug, count] of authored) {
      const granted = grantItem(working.inventory, itemId, 1);
      const withMaterials = debugGrantSelectedGearMaterials({ ...working, inventory: granted.inventory }, itemId);
      const tree = itemUpgradeTreeById[itemById[itemId].upgradeTreeId!]!;
      const branchId = `upgrade-branch.${itemId.replace("item.", "")}.${branchSlug}`;
      let inventory = withMaterials.inventory;
      const nodes = tree.nodeIds.filter((nodeId) => upgradeNodes[nodeId]?.branchId === branchId).slice(0, count);
      for (const nodeId of nodes) inventory = purchaseItemUpgradeNode({ inventory, instanceId: granted.createdInstanceIds[0]!, nodeId }).inventory;
      const equipped = equipItemInstance({ inventory, equipment: working.equipment, instanceId: granted.createdInstanceIds[0]!, slotId, hunterRank: 1, progression: working.progression });
      working = { ...working, inventory, equipment: equipped.equipment, progression: equipped.progression ?? working.progression };
    }
    const loaded = parseGameSaveJson(JSON.stringify(gameStateToSaveV17(working, { reducedMotion: false, showInspectorButton: true })));
    expect(CURRENT_SAVE_VERSION).toBe(20);
    expect(Object.values(loaded?.inventory.instances ?? {}).filter((instance) => instance.definitionId !== "item.worn-pickaxe")).toEqual(Object.values(working.inventory.instances));
    expect(Object.values(loaded?.inventory.instances ?? {}).filter((instance) => instance.definitionId === "item.worn-pickaxe")).toHaveLength(1);
    expect(loaded?.equipment.slots).toMatchObject(working.equipment.slots);
    expect(loaded?.equipment.slots.tool).toBeTruthy();
    expect(loaded?.inventory.instances[loaded.equipment.slots.tool!]?.definitionId).toBe("item.worn-pickaxe");
    expect(loaded?.progression.proficiencies["heavy-armor"]?.totalXp).toBe(working.progression.proficiencies["heavy-armor"]?.totalXp);
    expect(loaded?.progression.proficiencies.shield?.totalXp).toBe(working.progression.proficiencies.shield?.totalXp);
    for (const [itemId] of authored) {
      const slotId = itemById[itemId].equipmentSlotKind === "offhand" ? "offhand" : itemById[itemId].equipmentSlotKind as "head" | "armor" | "gloves" | "boots";
      const instanceId = working.equipment.slots[slotId]!;
      const tree = itemUpgradeTreeById[itemById[itemId].upgradeTreeId!]!;
      expect(getItemUpgradeSpecialization(loaded!.inventory.instances[instanceId]!, tree)).toEqual(getItemUpgradeSpecialization(working.inventory.instances[instanceId]!, tree));
    }
  });

  it("uses real Iron Sword, Shield and Greatsword transactions for the 2H conflict", () => {
    const base = createInitialGameState();
    let inventory: typeof base.inventory = { ...base.inventory, instances: {} };
    const sword = grantOne(inventory, "item.iron-sword"); inventory = sword.inventory;
    const shield = grantOne(inventory, "item.iron-shield"); inventory = shield.inventory;
    const greatsword = grantOne(inventory, "item.iron-greatsword"); inventory = greatsword.inventory;
    const swordEquipped = equipItemInstance({ inventory, equipment: { slots: {} }, instanceId: sword.instance, slotId: "weapon", hunterRank: 1, progression: { ...base.progression, proficiencies: {} } });
    const shieldEquipped = equipItemInstance({ inventory, equipment: swordEquipped.equipment, instanceId: shield.instance, slotId: "offhand", hunterRank: 1, progression: swordEquipped.progression });
    expect(shieldEquipped.equipment.slots.offhand).toBe(shield.instance);
    const greatswordEquipped = equipItemInstance({ inventory, equipment: shieldEquipped.equipment, instanceId: greatsword.instance, slotId: "weapon", hunterRank: 1, progression: shieldEquipped.progression });
    expect(greatswordEquipped.equipment.slots.weapon).toBe(greatsword.instance);
    expect(greatswordEquipped.equipment.slots.offhand).toBeUndefined();
    expect(inventory.instances[shield.instance]).toBeDefined();

    const undiscovered = { ...base.progression, proficiencies: {} };
    const twoHanded = equipItemInstance({ inventory, equipment: { slots: { weapon: greatsword.instance } }, instanceId: shield.instance, slotId: "offhand", hunterRank: 1, progression: undiscovered });
    expect(twoHanded.validation.reason).toBe("two-handed-conflict");
    expect(twoHanded.equipment.slots).toEqual({ weapon: greatsword.instance });
    expect(twoHanded.progression).toBeUndefined();
  });

  it("does not auto-grant defensive gear or proficiencies when loading a clean V17 save", () => {
    const base = createInitialGameState();
    const save = gameStateToSaveV17({ ...base, inventory: { ...base.inventory, instances: {} }, equipment: { slots: {} }, progression: { ...base.progression, proficiencies: {} } }, { reducedMotion: false, showInspectorButton: false });
    const loaded = parseGameSaveJson(JSON.stringify(save));
    expect(Object.values(loaded?.inventory.instances ?? {}).some((instance) => instance.definitionId.startsWith("item.iron-") && instance.definitionId !== "item.iron-sword")).toBe(false);
    expect(loaded?.progression.proficiencies["heavy-armor"]).toBeUndefined();
    expect(loaded?.progression.proficiencies.shield).toBeUndefined();
  });
});
