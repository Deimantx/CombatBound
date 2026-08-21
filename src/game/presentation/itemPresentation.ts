import { itemUpgradeBranchById, itemUpgradeNodeById, itemUpgradeTreeById } from "../data/gear/itemUpgradeTrees";
import { getItemUpgradeSpecialization } from "../items/itemUpgradeLogic";
import { weaponArchetypeById } from "../data/gear/weaponArchetypes";
import { equipmentSlotKindLabel } from "../equipment/equipmentTypes";
import type { ResolvedItemInstance, ItemInstance } from "../items/itemTypes";
import { formatItemStats, labelForStatKey } from "./statFormatting";

export interface ItemModifierDisplay {
  id: string;
  source: "upgrade-node";
  label: string;
  value: string;
  tone?: "gold" | "green" | "blue" | "default";
}

export interface ItemPresentation {
  name: string;
  rarity: string;
  typeLabel: string;
  slotLabel?: string;
  hunterRankRequirement?: number;
  proficiencyId?: string;
  requiredProficiencyLevel?: number;
  materialTier?: string;
  weaponFamily?: string;
  weaponArchetype?: string;
  specialization?: { branchId: string; label: string };
  upgradeProgress?: { unlocked: number; total: number };
  equipped: boolean;
  quantity: number;
  modified: boolean;
  modifiers: ItemModifierDisplay[];
  effectiveStats?: ReturnType<typeof formatItemStats>;
  baseStats?: ReturnType<typeof formatItemStats>;
  technical?: { instanceId: string; definitionId: string; unlockedUpgradeNodeIds: string[] };
}

function formatEffect(target: string, operation: string, value: number) {
  const label = target === "physicalDamage" ? "Physical Damage" : target === "attackSpeed" ? "Attack Speed" : target === "criticalChance" ? "Critical Strike Chance" : labelForStatKey(target);
  const amount = target === "accuracyRating" || target === "blockChance" || target === "criticalStrikeChance" ? `${value >= 0 ? "+" : ""}${(value * (target === "accuracyRating" ? 1 : 100)).toFixed(target === "accuracyRating" ? 0 : 0)}${target === "accuracyRating" ? "" : "%"}` : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
  return `${operation === "increased" ? "Increased " : operation === "more" ? "More " : ""}${label} ${amount}`;
}

export function buildItemInstanceSearchText(resolved: ResolvedItemInstance) {
  const { definition } = resolved;
  const archetype = definition.weaponArchetypeId ? definition.weaponArchetypeId.replace("weapon-archetype.", "") : "";
  return [definition.id, definition.name, definition.description, definition.category, definition.rarity, definition.equipmentSlotKind ?? "", definition.weaponProficiencyId ?? "", definition.weaponFamilyId ?? "", archetype, definition.materialTierId ?? ""].join(" ").toLowerCase();
}

export function itemModifierDisplays(resolved: ResolvedItemInstance): ItemModifierDisplay[] {
  return resolved.contributions.map((contribution) => ({ id: contribution.sourceId, source: "upgrade-node", label: contribution.sourceLabel, value: formatEffect(contribution.target, contribution.operation, contribution.value), tone: "green" as const }));
}

export function buildItemPresentation(resolved: ResolvedItemInstance, options: { equipped?: boolean; quantity?: number; includeBaseStats?: boolean; technical?: boolean } = {}): ItemPresentation {
  const { definition, instance } = resolved;
  const tree = definition.upgradeTreeId ? itemUpgradeTreeById[definition.upgradeTreeId] : undefined;
  const unlocked = instance.unlockedUpgradeNodeIds;
  const specialization = getItemUpgradeSpecialization(instance, tree);
  const branch = specialization.state === "specialized" ? itemUpgradeBranchById[specialization.branchId] : undefined;
  const maxBranchNodeCount = tree ? Math.max(...tree.branchIds.map((branchId) => tree.nodeIds.filter((nodeId) => itemUpgradeNodeById[nodeId]?.branchId === branchId).length), 0) : undefined;
  const branchNodeCount = branch ? tree?.nodeIds.filter((nodeId) => itemUpgradeNodeById[nodeId]?.branchId === branch.id).length : maxBranchNodeCount;
  return {
    name: definition.name,
    rarity: definition.rarity,
    typeLabel: definition.category[0].toUpperCase() + definition.category.slice(1),
    slotLabel: definition.equipmentSlotKind ? equipmentSlotKindLabel(definition.equipmentSlotKind) : undefined,
    hunterRankRequirement: definition.requiredHunterRank,
    proficiencyId: definition.weaponProficiencyId,
    requiredProficiencyLevel: definition.requiredProficiencyLevel,
    materialTier: definition.materialTierId ? `${definition.materialTierId[0].toUpperCase()}${definition.materialTierId.slice(1)}` : undefined,
    weaponFamily: definition.weaponFamilyId ? `${definition.weaponFamilyId[0].toUpperCase()}${definition.weaponFamilyId.slice(1)}` : undefined,
    weaponArchetype: definition.weaponArchetypeId ? weaponArchetypeById[definition.weaponArchetypeId]?.name ?? definition.weaponArchetypeId.replace("weapon-archetype.", "") : undefined,
    specialization: branch ? { branchId: branch.id, label: branch.name } : undefined,
    upgradeProgress: tree ? { unlocked: unlocked.length, total: branchNodeCount ?? tree.nodeIds.length } : undefined,
    equipped: Boolean(options.equipped),
    quantity: options.quantity ?? 1,
    modified: unlocked.length > 0,
    modifiers: itemModifierDisplays(resolved),
    effectiveStats: formatItemStats(resolved.effectiveStats),
    baseStats: options.includeBaseStats ? formatItemStats(resolved.baseStats) : undefined,
    technical: options.technical ? { instanceId: instance.id, definitionId: instance.definitionId, unlockedUpgradeNodeIds: unlocked } : undefined,
  };
}

export function buildStackableItemPresentation(definition: ResolvedItemInstance["definition"], quantity: number): ItemPresentation {
  return { name: definition.name, rarity: definition.rarity, typeLabel: definition.category[0].toUpperCase() + definition.category.slice(1), quantity, equipped: false, modified: false, modifiers: [], effectiveStats: undefined, baseStats: undefined };
}

export function itemInstanceIsModified(instance: ItemInstance) { return instance.unlockedUpgradeNodeIds.length > 0; }
