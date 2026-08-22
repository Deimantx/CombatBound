import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { itemById } from "../game/data/items";
import { itemUpgradeBranchById, itemUpgradeNodeById, itemUpgradeTreeById, itemUpgradeTreeDefinitions } from "../game/data/gear/itemUpgradeTrees";
import { debugGrantSelectedGearMaterials } from "../game/debug/debugActions";
import { grantItem } from "../game/items/itemOwnership";
import { getItemUpgradeSpecialization, getUpgradeNodeState, purchaseItemUpgradeNode } from "../game/items/itemUpgradeLogic";
import { resolveItemInstance } from "../game/items/itemResolver";

function gearFixture(itemId: string, quantity = 1) {
  const base = createInitialGameState();
  const cleanInventory = { ...base.inventory, instances: {} };
  const granted = grantItem(cleanInventory, itemId, quantity);
  const game = debugGrantSelectedGearMaterials({ ...base, inventory: granted.inventory }, itemId);
  const tree = itemUpgradeTreeById[itemById[itemId].upgradeTreeId!];
  return { base, game, tree, instanceIds: granted.createdInstanceIds };
}

function branchRoot(treeId: string, branchId: string) {
  const tree = itemUpgradeTreeById[treeId]!;
  return tree.nodeIds.find((nodeId) => itemUpgradeNodeById[nodeId]?.branchId === branchId)!;
}

function buyBranch(inventory: ReturnType<typeof createInitialGameState>["inventory"], instanceId: string, treeId: string, branchId: string, count: number) {
  let next = inventory;
  const nodes = itemUpgradeTreeById[treeId]!.nodeIds.filter((nodeId) => itemUpgradeNodeById[nodeId]?.branchId === branchId).slice(0, count);
  for (const nodeId of nodes) next = purchaseItemUpgradeNode({ inventory: next, instanceId, nodeId }).inventory;
  return next;
}

describe("defensive upgrade runtime V17", () => {
  it("locks the two unselected branches for every defensive tree", () => {
    for (const definition of ["item.iron-helmet", "item.iron-armor", "item.iron-gloves", "item.iron-boots", "item.iron-shield"]) {
      const { game, tree, instanceIds } = gearFixture(definition);
      const instanceId = instanceIds[0]!;
      const selectedBranch = tree.branchIds[1]!;
      const selectedRoot = branchRoot(tree.id, selectedBranch);
      const purchased = purchaseItemUpgradeNode({ inventory: game.inventory, instanceId, nodeId: selectedRoot });
      expect(purchased.outcome).toBe("purchased");
      expect(getItemUpgradeSpecialization(purchased.inventory.instances[instanceId], tree)).toEqual({ state: "specialized", branchId: selectedBranch });
      const otherRoots = tree.branchIds.filter((branchId) => branchId !== selectedBranch).map((branchId) => branchRoot(tree.id, branchId));
      for (const nodeId of otherRoots) {
        expect(getUpgradeNodeState(purchased.inventory, instanceId, nodeId)).toBe("branch-locked");
        const rejected = purchaseItemUpgradeNode({ inventory: purchased.inventory, instanceId, nodeId });
        expect(rejected.outcome).toBe("branch-locked");
        expect(rejected.inventory).toBe(purchased.inventory);
      }
    }
  });

  it("keeps exact armor copies isolated and resolves real branch stats", () => {
    const { game, tree, instanceIds } = gearFixture("item.iron-armor", 2);
    const fortress = tree.branchIds.find((branchId) => itemUpgradeBranchById[branchId].name === "Fortress")!;
    const renewal = tree.branchIds.find((branchId) => itemUpgradeBranchById[branchId].name === "Renewal")!;
    const inventory = buyBranch(buyBranch(game.inventory, instanceIds[0]!, tree.id, fortress, 2), instanceIds[1]!, tree.id, renewal, 2);
    const first = resolveItemInstance(inventory, instanceIds[0]!)!;
    const second = resolveItemInstance(inventory, instanceIds[1]!)!;
    expect(first.instance.id).not.toBe(second.instance.id);
    expect(first.instance.definitionId).toBe(second.instance.definitionId);
    expect(first.instance.unlockedUpgradeNodeIds).toHaveLength(2);
    expect(second.instance.unlockedUpgradeNodeIds).toHaveLength(2);
    expect(first.effectiveStats.armour).toBe(70);
    expect(second.effectiveStats.armour).toBe(45);
    expect(second.effectiveStats.lifeRegenFlat).toBeCloseTo(0.25);
    expect(getItemUpgradeSpecialization(first.instance, tree).branchId).toBe(fortress);
    expect(getItemUpgradeSpecialization(second.instance, tree).branchId).toBe(renewal);
  });

  it("resolves every shield identity through the exact item stat pipeline", () => {
    const expected = [
      { branch: "Guard", stats: { blockChance: 0.22 } },
      { branch: "Bastion", stats: { armour: 63, blockEffect: 0.45 } },
      { branch: "Warding", stats: { fireResistance: 0.09, coldResistance: 0.09, lightningResistance: 0.09, chaosResistance: 0.05 } },
    ];
    for (const entry of expected) {
      const { game, tree, instanceIds } = gearFixture("item.iron-shield");
      const branch = tree.branchIds.find((branchId) => itemUpgradeBranchById[branchId].name === entry.branch)!;
      const inventory = buyBranch(game.inventory, instanceIds[0]!, tree.id, branch, 4);
      const resolved = resolveItemInstance(inventory, instanceIds[0]!)!;
      for (const [stat, value] of Object.entries(entry.stats)) expect(resolved.effectiveStats[stat as keyof typeof resolved.effectiveStats]).toBeCloseTo(value);
    }
  });

  it("does not turn the shield into a Heavy Armor training piece", () => {
    const treeCount = itemUpgradeTreeDefinitions.filter((tree) => tree.itemDefinitionId.startsWith("item.iron-")).reduce((total, tree) => total + tree.nodeIds.length, 0);
    expect(treeCount).toBe(156);
  });
});
