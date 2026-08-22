import type { ItemStats } from "./itemTypes";

export type ItemUpgradeTreeId = string;
export type ItemUpgradeNodeId = string;
export type ItemUpgradeBranchId = string;
export type ItemUpgradeSelectionMode = "single-branch";

export type ItemUpgradeSpecialization =
  | { state: "unspecialized"; branchId: null }
  | { state: "specialized"; branchId: ItemUpgradeBranchId }
  | { state: "invalid"; branchId: null };

export interface ItemUpgradeBranchDefinition {
  id: ItemUpgradeBranchId;
  treeId: ItemUpgradeTreeId;
  name: string;
  styleLabel: string;
  description: string;
  order: number;
  icon: string;
}

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
  branchId: ItemUpgradeBranchId;
  name: string;
  description: string;
  requiredProfessionLevel: number;
  prerequisiteNodeIds: ItemUpgradeNodeId[];
  costs: ItemUpgradeMaterialCost[];
  effects: ItemUpgradeEffect[];
  presentation: {
    column: number;
    row: number;
    size?: "minor" | "major" | "capstone";
    icon: string;
  };
}

export interface ItemUpgradeTreeDefinition {
  id: ItemUpgradeTreeId;
  itemDefinitionId: string;
  selectionMode: ItemUpgradeSelectionMode;
  branchIds: ItemUpgradeBranchId[];
  nodeIds: ItemUpgradeNodeId[];
}

export type UpgradeNodeState = "purchased" | "available" | "prerequisite-locked" | "materials-locked" | "branch-locked";

export interface ItemUpgradePurchaseResult {
  inventory: import("../inventory/inventoryTypes").InventoryState;
  outcome: "purchased" | "unknown-instance" | "unknown-tree" | "unknown-node" | "already-unlocked" | "prerequisite-locked" | "insufficient-materials" | "branch-locked" | "combat-locked" | "invalid-instance";
  nodeId: ItemUpgradeNodeId;
}
