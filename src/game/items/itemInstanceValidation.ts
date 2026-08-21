import { itemById, type ItemDefinition } from "../data/items";
import { itemUpgradeNodeById, itemUpgradeTreeById } from "../data/gear/itemUpgradeTrees";
import type { ItemInstance } from "./itemTypes";
import { isItemInstanceId } from "./itemTypes";
import type { ItemInstanceValidationResult } from "./itemTypes";

export function validateItemInstance(value: unknown, items: Record<string, ItemDefinition> = itemById): ItemInstanceValidationResult {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, errors: ["Instance record is malformed"] };
  const instance = value as Partial<ItemInstance>;
  if (!isItemInstanceId(instance.id) || instance.id !== (value as { id?: unknown }).id) errors.push("Instance id is invalid");
  if (typeof instance.definitionId !== "string") errors.push("Instance definitionId is invalid");
  const definition = typeof instance.definitionId === "string" ? items[instance.definitionId] : undefined;
  if (!definition) errors.push(`Unknown instance definition ${String(instance.definitionId)}`);
  else if (definition.inventoryMode !== "instance") errors.push(`Instance definition ${definition.id} is not instance-owned`);
  if (instance.version !== 3) errors.push("Instance version must be 3");
  if (instance.version === 3 && Object.keys(value as object).some((field) => !["id", "definitionId", "version", "unlockedUpgradeNodeIds"].includes(field))) errors.push("Unexpected fields are not valid on v3 instances");
  if (!Array.isArray(instance.unlockedUpgradeNodeIds)) errors.push("Unlocked upgrade nodes must be an array");
  if (Array.isArray(instance.unlockedUpgradeNodeIds)) {
    const nodeIds = instance.unlockedUpgradeNodeIds;
    if (nodeIds.some((nodeId) => typeof nodeId !== "string")) errors.push("Upgrade node IDs must be strings");
    if (new Set(nodeIds).size !== nodeIds.length) errors.push("Duplicate upgrade node ID");
    const tree = definition?.upgradeTreeId ? itemUpgradeTreeById[definition.upgradeTreeId] : undefined;
    if (nodeIds.some((nodeId) => !tree?.nodeIds.includes(nodeId) || itemUpgradeNodeById[nodeId]?.treeId !== tree.id)) errors.push("Upgrade node does not belong to item tree");
    const unlocked = new Set(nodeIds.filter((nodeId): nodeId is string => typeof nodeId === "string"));
    for (const nodeId of unlocked) for (const prerequisite of itemUpgradeNodeById[nodeId]?.prerequisiteNodeIds ?? []) if (!unlocked.has(prerequisite)) errors.push(`Upgrade node ${nodeId} is missing prerequisite ${prerequisite}`);
    if (tree?.selectionMode === "single-branch" && new Set(nodeIds.map((nodeId) => itemUpgradeNodeById[nodeId]?.branchId).filter(Boolean)).size > 1) errors.push("Single-branch item contains upgrades from multiple branches");
  }
  return { valid: errors.length === 0, errors };
}

/** Discards malformed descendants rather than auto-purchasing their prerequisites. */
export function normalizeItemInstance(value: unknown, items: Record<string, ItemDefinition> = itemById): ItemInstance | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Partial<ItemInstance> & { version?: unknown; unlockedUpgradeNodeIds?: unknown };
  const id = raw.id;
  const definitionId = raw.definitionId;
  if (!isItemInstanceId(id) || typeof definitionId !== "string" || items[definitionId]?.inventoryMode !== "instance") return null;
  const tree = items[definitionId]?.upgradeTreeId ? itemUpgradeTreeById[items[definitionId].upgradeTreeId!] : undefined;
  const candidates = Array.isArray(raw.unlockedUpgradeNodeIds) ? raw.unlockedUpgradeNodeIds : [];
  const candidateIds = Array.from(new Set(candidates.filter((nodeId): nodeId is string => typeof nodeId === "string" && Boolean(tree?.nodeIds.includes(nodeId)))));
  const unlocked: string[] = [];
  const unlockedSet = new Set<string>();
  const pending = new Set(candidateIds);
  let progressed = true;
  while (pending.size > 0 && progressed) {
    progressed = false;
    for (const nodeId of pending) {
      const node = itemUpgradeNodeById[nodeId];
      if (!node || !node.prerequisiteNodeIds.every((prerequisite) => unlockedSet.has(prerequisite))) continue;
      unlocked.push(nodeId);
      unlockedSet.add(nodeId);
      pending.delete(nodeId);
      progressed = true;
    }
  }
  if (tree?.selectionMode === "single-branch") {
    const validBranches = tree.branchIds.map((branchId) => candidateIds.filter((nodeId) => itemUpgradeNodeById[nodeId]?.branchId === branchId));
    const winning = validBranches.find((branchNodes) => branchNodes.length > 0);
    const allowed = new Set(winning ?? []);
    return { id, definitionId, version: 3, unlockedUpgradeNodeIds: unlocked.filter((nodeId) => allowed.has(nodeId)) };
  }
  return { id, definitionId, version: 3, unlockedUpgradeNodeIds: unlocked };
}
