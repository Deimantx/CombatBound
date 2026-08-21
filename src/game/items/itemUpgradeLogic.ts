import { itemById } from "../data/items";
import { itemUpgradeNodeById, itemUpgradeTreeById } from "../data/gear/itemUpgradeTrees";
import { getItemInstance, getStackableQuantity, removeStackableItem } from "./itemOwnership";
import { validateItemInstance } from "./itemInstanceValidation";
import type { ItemInstance, ItemInstanceId } from "./itemTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { ItemUpgradeNodeDefinition, ItemUpgradePurchaseResult, ItemUpgradeSpecialization, ItemUpgradeTreeDefinition, UpgradeNodeState } from "./itemUpgradeTypes";

export function getItemUpgradeSpecialization(instance: Pick<ItemInstance, "unlockedUpgradeNodeIds">, tree: ItemUpgradeTreeDefinition | undefined): ItemUpgradeSpecialization {
  if (!tree) return { state: "unspecialized", branchId: null };
  const branchIds = new Set<string>();
  for (const nodeId of instance.unlockedUpgradeNodeIds) {
    const node = itemUpgradeNodeById[nodeId];
    if (!node || node.treeId !== tree.id || !tree.branchIds.includes(node.branchId)) return { state: "invalid", branchId: null };
    branchIds.add(node.branchId);
  }
  if (branchIds.size === 0) return { state: "unspecialized", branchId: null };
  if (branchIds.size > 1) return { state: "invalid", branchId: null };
  return { state: "specialized", branchId: [...branchIds][0] };
}

export function getUpgradeNodesForInstance(inventory: InventoryState, instanceId: ItemInstanceId) {
  const instance = getItemInstance(inventory, instanceId);
  const definition = instance ? itemById[instance.definitionId] : undefined;
  const tree = definition?.upgradeTreeId ? itemUpgradeTreeById[definition.upgradeTreeId] : undefined;
  return tree?.nodeIds.map((nodeId) => itemUpgradeNodeById[nodeId]).filter((node): node is ItemUpgradeNodeDefinition => Boolean(node)) ?? [];
}

export function getUpgradeNodeState(inventory: InventoryState, instanceId: ItemInstanceId, nodeId: string): UpgradeNodeState | "unknown" {
  const instance = getItemInstance(inventory, instanceId);
  const node = itemUpgradeNodeById[nodeId];
  const definition = instance ? itemById[instance.definitionId] : undefined;
  const tree = definition?.upgradeTreeId ? itemUpgradeTreeById[definition.upgradeTreeId] : undefined;
  if (!instance || !node || !tree || !tree.nodeIds.includes(nodeId)) return "unknown";
  if (instance.unlockedUpgradeNodeIds.includes(nodeId)) return "purchased";
  const specialization = getItemUpgradeSpecialization(instance, tree);
  if (specialization.state === "specialized" && specialization.branchId !== node.branchId) return "branch-locked";
  if (node.prerequisiteNodeIds.some((prerequisite) => !instance.unlockedUpgradeNodeIds.includes(prerequisite))) return "prerequisite-locked";
  return node.costs.every((cost) => getStackableQuantity(inventory, cost.itemId) >= cost.quantity) ? "available" : "materials-locked";
}

export function purchaseItemUpgradeNode({ inventory, instanceId, nodeId, combatLocked = false }: { inventory: InventoryState; instanceId: ItemInstanceId | string; nodeId: string; combatLocked?: boolean }): ItemUpgradePurchaseResult {
  const unchanged = (outcome: ItemUpgradePurchaseResult["outcome"]): ItemUpgradePurchaseResult => ({ inventory, outcome, nodeId });
  if (combatLocked) return unchanged("combat-locked");
  const instance = typeof instanceId === "string" ? getItemInstance(inventory, instanceId as ItemInstanceId) : undefined;
  if (!instance) return unchanged("unknown-instance");
  if (!validateItemInstance(instance).valid) return unchanged("invalid-instance");
  const definition = itemById[instance.definitionId];
  const tree = definition?.upgradeTreeId ? itemUpgradeTreeById[definition.upgradeTreeId] : undefined;
  if (!tree) return unchanged("unknown-tree");
  if (!tree.nodeIds.includes(nodeId)) return unchanged("unknown-node");
  const node = itemUpgradeNodeById[nodeId];
  if (!node) return unchanged("unknown-node");
  if (instance.unlockedUpgradeNodeIds.includes(nodeId)) return unchanged("already-unlocked");
  const specialization = getItemUpgradeSpecialization(instance, tree);
  if (specialization.state === "specialized" && specialization.branchId !== node.branchId) return unchanged("branch-locked");
  if (specialization.state === "invalid") return unchanged("invalid-instance");
  if (node.prerequisiteNodeIds.some((prerequisite) => !instance.unlockedUpgradeNodeIds.includes(prerequisite))) return unchanged("prerequisite-locked");
  if (node.costs.some((cost) => getStackableQuantity(inventory, cost.itemId) < cost.quantity)) return unchanged("insufficient-materials");
  let next = inventory;
  for (const cost of node.costs) next = removeStackableItem(next, cost.itemId, cost.quantity);
  next = { ...next, instances: { ...next.instances, [instance.id]: { ...instance, unlockedUpgradeNodeIds: [...instance.unlockedUpgradeNodeIds, nodeId] } } };
  return { inventory: next, outcome: "purchased", nodeId };
}
