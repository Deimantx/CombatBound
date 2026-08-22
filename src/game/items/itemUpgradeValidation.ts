import { itemById } from "../data/items";
import { itemUpgradeBranchById, itemUpgradeNodeById, itemUpgradeTreeById, itemUpgradeTreeDefinitions } from "../data/gear/itemUpgradeTrees";
import type { ItemUpgradeTreeDefinition } from "./itemUpgradeTypes";
import { isKnownWeaponMechanicModifier, weaponMechanicSchemaById } from "../weapons/weaponMechanicRegistry";

const magicCrystalPattern = /^item\.magic-crystal-|^item\.magic-crystal-(dust|box)$/;

export function validateItemUpgradeTrees(
  trees: readonly ItemUpgradeTreeDefinition[] = itemUpgradeTreeDefinitions,
  nodes = itemUpgradeNodeById,
) {
  const errors: string[] = [];
  const treeIds = new Set<string>();
  const nodeIds = new Set<string>();
  for (const tree of trees) {
    if (treeIds.has(tree.id)) errors.push(`Duplicate upgrade tree ID ${tree.id}`);
    treeIds.add(tree.id);
    if (tree.selectionMode !== "single-branch") errors.push(`Unsupported upgrade selection mode ${tree.selectionMode}`);
    if (new Set(tree.branchIds).size !== tree.branchIds.length) errors.push(`Duplicate branch ID in ${tree.id}`);
    const treeBranchIds = new Set(tree.branchIds);
    for (const branchId of tree.branchIds) {
      const branch = itemUpgradeBranchById[branchId];
      if (!branch) errors.push(`${tree.id} references unknown branch ${branchId}`);
      else if (branch.treeId !== tree.id) errors.push(`${tree.id} references cross-tree branch ${branchId}`);
    }
    const item = itemById[tree.itemDefinitionId];
    if (!item) errors.push(`Upgrade tree ${tree.id} references unknown item ${tree.itemDefinitionId}`);
    else if (item.upgradeTreeId !== tree.id) errors.push(`${tree.itemDefinitionId} does not reference ${tree.id}`);
    const treeNodeIds = new Set<string>();
    for (const nodeId of tree.nodeIds) {
      if (nodeIds.has(nodeId)) errors.push(`Duplicate node ID ${nodeId} across upgrade trees`);
      nodeIds.add(nodeId);
      if (treeNodeIds.has(nodeId)) errors.push(`Duplicate node ID ${nodeId} in ${tree.id}`);
      treeNodeIds.add(nodeId);
      if (nodes[nodeId]?.treeId !== tree.id) errors.push(`Unknown or cross-tree node ${nodeId} in ${tree.id}`);
      else if (!treeBranchIds.has(nodes[nodeId].branchId)) errors.push(`${nodeId} references an unknown branch`);
    }
    for (const nodeId of tree.nodeIds) {
      const node = nodes[nodeId];
      if (!node) continue;
      for (const prerequisite of node.prerequisiteNodeIds) if (!treeNodeIds.has(prerequisite)) errors.push(`${nodeId} has unknown prerequisite ${prerequisite}`);
      for (const prerequisite of node.prerequisiteNodeIds) if (treeNodeIds.has(prerequisite) && nodes[prerequisite]?.branchId !== node.branchId) errors.push(`${nodeId} has a cross-branch prerequisite`);
      for (const cost of node.costs) {
        const material = itemById[cost.itemId];
        if (!material) errors.push(`${nodeId} has unknown cost item ${cost.itemId}`);
        else if (material.inventoryMode !== "stackable") errors.push(`${nodeId} cost item ${cost.itemId} is not stackable`);
        if (!Number.isInteger(cost.quantity) || cost.quantity <= 0) errors.push(`${nodeId} has invalid cost quantity for ${cost.itemId}`);
        if (magicCrystalPattern.test(cost.itemId)) errors.push(`${nodeId} cannot use Magic Crystals as a cost`);
      }
      for (const effect of node.effects) {
        const effectType = effect && typeof effect === "object" ? (effect as { type?: unknown }).type : undefined;
        if (typeof effectType !== "string") {
          errors.push(`${nodeId} has an unknown effect`);
          continue;
        }
        if (!Number.isFinite(effect.value)) errors.push(`${nodeId} has a non-finite effect value`);
        if (effect.type === "localStat") {
          if (!("physicalDamage" === effect.target || "attackSpeed" === effect.target || "criticalChance" === effect.target)) errors.push(`${nodeId} has an invalid local stat target`);
          if (!(effect.operation === "flat" || effect.operation === "increased" || effect.operation === "more")) errors.push(`${nodeId} has an invalid local stat operation`);
        } else if (effect.type === "globalStat") {
          if (!(effect.stat in { maxLife: 1, lifeRegenFlat: 1, accuracyRating: 1, evasionRating: 1, armour: 1, blockChance: 1, blockEffect: 1, manaRegenFlat: 1, increasedAttackSpeed: 1, increasedCastSpeed: 1, criticalStrikeChance: 1, criticalStrikeMultiplier: 1, baseDamageMin: 1, baseDamageMax: 1, baseAttackTime: 1, maxStamina: 1, staminaRegen: 1, maxMana: 1, fireResistance: 1, coldResistance: 1, lightningResistance: 1, chaosResistance: 1 })) errors.push(`${nodeId} has an invalid global stat target`);
          if (effect.operation !== "flat") errors.push(`${nodeId} has an invalid global stat operation`);
        } else if (effect.type === "weaponMechanicModifier") {
          if (!weaponMechanicSchemaById[effect.mechanicId] || !isKnownWeaponMechanicModifier(effect.mechanicId, effect.modifier)) errors.push(`${nodeId} has an invalid mechanic modifier`);
        } else {
          errors.push(`${nodeId} has an unknown effect type ${effectType}`);
        }
      }
      if (!Number.isInteger(node.presentation.column) || node.presentation.column < 0 || !Number.isInteger(node.presentation.row) || node.presentation.row < 0) errors.push(`${nodeId} has invalid presentation coordinates`);
    }
    for (const branchId of tree.branchIds) if (!tree.nodeIds.some((nodeId) => nodes[nodeId]?.branchId === branchId && nodes[nodeId]?.prerequisiteNodeIds.every((prerequisite) => !treeNodeIds.has(prerequisite) || nodes[prerequisite]?.branchId !== branchId))) errors.push(`${tree.id} branch ${branchId} has no root`);
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) { errors.push(`Cycle detected in ${tree.id}`); return; }
      if (visited.has(nodeId)) return;
      visiting.add(nodeId);
      for (const prerequisite of nodes[nodeId]?.prerequisiteNodeIds ?? []) if (treeNodeIds.has(prerequisite)) visit(prerequisite);
      visiting.delete(nodeId);
      visited.add(nodeId);
    };
    for (const nodeId of tree.nodeIds) visit(nodeId);
  }
  return { valid: errors.length === 0, errors };
}

export function getUpgradeTreeForItem(upgradeTreeId: string | undefined) {
  return upgradeTreeId ? itemUpgradeTreeById[upgradeTreeId] : undefined;
}
