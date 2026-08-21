import type { ItemStats } from "./itemTypes";

export type ItemUpgradeTreeId = string;
export type ItemUpgradeNodeId = string;

export interface ItemUpgradeMaterialCost {
  itemId: string;
  quantity: number;
}

export type ItemUpgradeEffect =
  | { type: "localStat"; target: "physicalDamage" | "attackSpeed" | "criticalChance"; operation: "flat" | "increased" | "more"; value: number }
  | { type: "globalStat"; stat: keyof ItemStats; operation: "flat"; value: number }
  | { type: "weaponMechanicModifier"; mechanicId: string; modifier: string; value: number };

export interface ItemUpgradeNodeDefinition {
  id: ItemUpgradeNodeId;
  treeId: ItemUpgradeTreeId;
  name: string;
  description: string;
  prerequisiteNodeIds: ItemUpgradeNodeId[];
  costs: ItemUpgradeMaterialCost[];
  effects: ItemUpgradeEffect[];
  presentation: {
    branch: string;
    column: number;
    row: number;
    size?: "minor" | "major" | "capstone";
    icon: string;
  };
}

export interface ItemUpgradeTreeDefinition {
  id: ItemUpgradeTreeId;
  itemDefinitionId: string;
  nodeIds: ItemUpgradeNodeId[];
}

export type UpgradeNodeState = "purchased" | "available" | "prerequisite-locked" | "materials-locked";

export interface ItemUpgradePurchaseResult {
  inventory: import("../inventory/inventoryTypes").InventoryState;
  outcome: "purchased" | "unknown-instance" | "unknown-tree" | "unknown-node" | "already-unlocked" | "prerequisite-locked" | "insufficient-materials" | "combat-locked" | "invalid-instance";
  nodeId: ItemUpgradeNodeId;
}
