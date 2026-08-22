import type { ItemUpgradeBranchDefinition, ItemUpgradeEffect, ItemUpgradeNodeDefinition, ItemUpgradeTreeDefinition } from "../../../items/itemUpgradeTypes";
import { deepFreeze } from "../../freeze";

type DefensiveNodeSpec = {
  id: string;
  name: string;
  description: string;
  costs: ItemUpgradeNodeDefinition["costs"];
  effects: ItemUpgradeEffect[];
};

type DefensiveBranchSpec = {
  id: string;
  name: string;
  styleLabel: string;
  description: string;
  icon: string;
  nodes: DefensiveNodeSpec[];
};

export const costs = (...entries: Array<[string, number]>): ItemUpgradeNodeDefinition["costs"] => entries.map(([itemId, quantity]) => ({ itemId, quantity }));

export const globalStat = (stat: keyof import("../../../items/itemTypes").ItemStats, value: number): ItemUpgradeEffect => ({ type: "globalStat", stat, operation: "flat", value });

export function makeDefensiveUpgradeTree(itemKey: string, itemDefinitionId: string, branches: DefensiveBranchSpec[]) {
  const treeId = `upgrade-tree.${itemKey}`;
  const branchDefinitions: ItemUpgradeBranchDefinition[] = branches.map((branch, index) => ({
    id: `upgrade-branch.${itemKey}.${branch.id}`,
    treeId,
    name: branch.name,
    styleLabel: branch.styleLabel,
    description: branch.description,
    order: index + 1,
    icon: branch.icon,
  }));
  const nodeDefinitions: ItemUpgradeNodeDefinition[] = branches.flatMap((branch, branchIndex) => {
    const branchId = branchDefinitions[branchIndex].id;
    return branch.nodes.map((node, nodeIndex) => ({
      id: `upgrade-node.${itemKey}.${node.id}`,
      treeId,
      branchId,
      name: node.name,
      description: node.description,
      prerequisiteNodeIds: nodeIndex === 0 ? [] : [`upgrade-node.${itemKey}.${branch.nodes[nodeIndex - 1].id}`],
      costs: node.costs,
      effects: node.effects,
      presentation: { column: nodeIndex + 1, row: branchIndex, size: nodeIndex === branch.nodes.length - 1 ? "capstone" : "major", icon: branch.icon },
    }));
  });
  const tree: ItemUpgradeTreeDefinition = {
    id: treeId,
    itemDefinitionId,
    selectionMode: "single-branch",
    branchIds: branchDefinitions.map((branch) => branch.id),
    nodeIds: nodeDefinitions.map((node) => node.id),
  };
  return deepFreeze({ tree, branches: branchDefinitions, nodes: nodeDefinitions });
}
