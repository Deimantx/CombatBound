import { itemById, type ItemDefinition } from "../data/items";
import { itemUpgradeNodeById, itemUpgradeTreeById } from "../data/gear/itemUpgradeTrees";
import type { ItemInstance } from "./itemTypes";
import { isItemInstanceId } from "./itemTypes";
import type { ItemInstanceValidationResult } from "./itemModifierTypes";
import type { ItemAffixDefinition, ItemAffixInstance, ItemAffixTierDefinition } from "./itemModifierTypes";
import { itemAffixById } from "../data/itemAffixes";

/** Legacy authoring adapters retained for historical fixtures only. */
export function isAffixTierApplicable(definition: ItemDefinition, affix: ItemAffixDefinition, tier: ItemAffixTierDefinition) {
  return affix.tiers.some((candidate) => candidate.id === tier.id) && (!affix.appliesTo.categories?.length || affix.appliesTo.categories.includes(definition.category)) && (!affix.appliesTo.slotKinds?.length || (definition.equipmentSlotKind !== undefined && affix.appliesTo.slotKinds.includes(definition.equipmentSlotKind)));
}
export function validateItemAffixInstance(definition: ItemDefinition, affixInstance: ItemAffixInstance, existingAffixes: ItemAffixInstance[] = [], affixes: Record<string, ItemAffixDefinition> = itemAffixById): string[] {
  const affix = affixes[affixInstance.affixId];
  if (!affix) return [`Unknown affix ${affixInstance.affixId}`];
  const tier = affix.tiers.find((candidate) => candidate.id === affixInstance.tierId);
  if (!tier) return [`Unknown tier ${affixInstance.tierId}`];
  return [
    ...(!isAffixTierApplicable(definition, affix, tier) ? [`Affix ${affix.id} is not applicable`] : []),
    ...(existingAffixes.some((entry) => entry.affixId === affix.id) ? [`Duplicate affix ${affix.id}`] : []),
  ];
}

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
  if (instance.version === 3) {
    const legacyFields = ["quality", "upgradeLevel", "affixes"] as const;
    if (legacyFields.some((field) => field in (value as object))) errors.push("Legacy item modifier fields are not valid on v3 instances");
  }
  if (!Array.isArray(instance.unlockedUpgradeNodeIds)) errors.push("Unlocked upgrade nodes must be an array");
  if (Array.isArray(instance.unlockedUpgradeNodeIds)) {
    const nodeIds = instance.unlockedUpgradeNodeIds;
    if (nodeIds.some((nodeId) => typeof nodeId !== "string")) errors.push("Upgrade node IDs must be strings");
    if (new Set(nodeIds).size !== nodeIds.length) errors.push("Duplicate upgrade node ID");
    const tree = definition?.upgradeTreeId ? itemUpgradeTreeById[definition.upgradeTreeId] : undefined;
    if (nodeIds.some((nodeId) => !tree?.nodeIds.includes(nodeId) || itemUpgradeNodeById[nodeId]?.treeId !== tree.id)) errors.push("Upgrade node does not belong to item tree");
    const unlocked = new Set(nodeIds.filter((nodeId): nodeId is string => typeof nodeId === "string"));
    for (const nodeId of unlocked) for (const prerequisite of itemUpgradeNodeById[nodeId]?.prerequisiteNodeIds ?? []) if (!unlocked.has(prerequisite)) errors.push(`Upgrade node ${nodeId} is missing prerequisite ${prerequisite}`);
  }
  return { valid: errors.length === 0, errors };
}

/** Structural validator for the frozen V12/V15 pre-foundation instance shape. */
export function isLegacyItemInstanceV2(value: unknown): value is import("./itemTypes").LegacyItemInstanceV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const instance = value as Record<string, unknown>;
  return isItemInstanceId(instance.id) && typeof instance.definitionId === "string" && instance.version === 2 && Array.isArray(instance.affixes);
}

/** Discards malformed descendants rather than auto-purchasing their prerequisites. */
export function normalizeItemInstance(value: unknown, items: Record<string, ItemDefinition> = itemById): ItemInstance | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Partial<ItemInstance>;
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
  return { id, definitionId, version: 3, unlockedUpgradeNodeIds: unlocked } as ItemInstance;
}
