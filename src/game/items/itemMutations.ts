import { itemById } from "../data/items";
import { itemAffixById } from "../data/itemAffixes";
import { getItemInstance } from "./itemOwnership";
import { DEFAULT_MAX_PREFIXES, DEFAULT_MAX_SUFFIXES, getItemAffixTier, isAffixTierApplicable, validateItemAffixInstance, validateItemInstance } from "./itemInstanceValidation";
import { rollItemModifier, type ItemMutationFailureReason, type ItemMutationResult, type ItemRollRng } from "./itemModifierTypes";
import type { ItemInstance, ItemInstanceId } from "./itemTypes";
import { isValidItemQuality, MAX_ITEM_QUALITY } from "./itemQuality";
import { isValidItemUpgradeLevel, MAX_ITEM_UPGRADE_LEVEL } from "./itemUpgradeRules";
import type { InventoryState } from "../inventory/inventoryTypes";

function unchanged(inventory: InventoryState, reason: ItemMutationFailureReason): ItemMutationResult {
  return { inventory, changed: false, reason };
}

function withInstance(inventory: InventoryState, instanceId: ItemInstanceId, update: (instance: ItemInstance) => ItemInstance): ItemMutationResult {
  const instance = getItemInstance(inventory, instanceId);
  const definition = instance ? itemById[instance.definitionId] : undefined;
  if (!instance || !definition || definition.inventoryMode !== "instance") return unchanged(inventory, "unknown-instance");
  return { inventory: { ...inventory, instances: { ...inventory.instances, [instanceId]: update(instance) } }, changed: true };
}

export function setItemQuality(inventory: InventoryState, instanceId: ItemInstanceId, quality: number): ItemMutationResult {
  if (!Number.isInteger(quality) || !isValidItemQuality(quality) || quality < 0 || quality > MAX_ITEM_QUALITY) return unchanged(inventory, "invalid-quality");
  if (getItemInstance(inventory, instanceId)?.quality === quality) return { inventory, changed: false };
  return withInstance(inventory, instanceId, (instance) => ({ ...instance, quality }));
}

export function setItemUpgradeLevel(inventory: InventoryState, instanceId: ItemInstanceId, upgradeLevel: number): ItemMutationResult {
  if (!Number.isInteger(upgradeLevel) || !isValidItemUpgradeLevel(upgradeLevel) || upgradeLevel < 0 || upgradeLevel > MAX_ITEM_UPGRADE_LEVEL) return unchanged(inventory, "invalid-upgrade-level");
  if (getItemInstance(inventory, instanceId)?.upgradeLevel === upgradeLevel) return { inventory, changed: false };
  return withInstance(inventory, instanceId, (instance) => ({ ...instance, upgradeLevel }));
}

export function rollItemAffix(affixId: string, tierId: string, rng: ItemRollRng) {
  const affix = itemAffixById[affixId];
  if (!affix) return { affix: null, reason: "unknown-affix" as const };
  const tier = getItemAffixTier(affix, tierId);
  if (!tier) return { affix: null, reason: "unknown-tier" as const };
  const rolls: Record<string, number> = {};
  for (const modifier of tier.modifiers) rolls[modifier.id] = rollItemModifier(modifier.roll, rng);
  return { affix: { affixId, tierId, rolls } };
}

export function addItemAffix(inventory: InventoryState, instanceId: ItemInstanceId, affixId: string, tierId: string, rng: ItemRollRng): ItemMutationResult {
  const instance = getItemInstance(inventory, instanceId);
  const definition = instance ? itemById[instance.definitionId] : undefined;
  const affix = itemAffixById[affixId];
  if (!instance || !definition || definition.inventoryMode !== "instance") return unchanged(inventory, "unknown-instance");
  if (!affix) return unchanged(inventory, "unknown-affix");
  const tier = getItemAffixTier(affix, tierId);
  if (!tier) return unchanged(inventory, "unknown-tier");
  if (!isAffixTierApplicable(definition, affix, tier)) return unchanged(inventory, "affix-not-applicable");
  if (instance.affixes.some((entry) => entry.affixId === affixId)) return unchanged(inventory, "duplicate-affix");
  const kindCount = instance.affixes.filter((entry) => itemAffixById[entry.affixId]?.kind === affix.kind).length;
  if (affix.kind === "prefix" && kindCount >= DEFAULT_MAX_PREFIXES) return unchanged(inventory, "prefix-limit");
  if (affix.kind === "suffix" && kindCount >= DEFAULT_MAX_SUFFIXES) return unchanged(inventory, "suffix-limit");
  const rolled = rollItemAffix(affixId, tierId, rng);
  if (!rolled.affix) return unchanged(inventory, rolled.reason);
  if (validateItemAffixInstance(definition, rolled.affix, instance.affixes).length) return unchanged(inventory, "invalid-roll-data");
  return withInstance(inventory, instanceId, (current) => ({ ...current, affixes: [...current.affixes, rolled.affix!] }));
}

export function removeItemAffix(inventory: InventoryState, instanceId: ItemInstanceId, affixId: string): ItemMutationResult {
  const instance = getItemInstance(inventory, instanceId);
  if (!instance || !instance.affixes.some((entry) => entry.affixId === affixId)) return unchanged(inventory, "unknown-affix");
  return withInstance(inventory, instanceId, (current) => ({ ...current, affixes: current.affixes.filter((entry) => entry.affixId !== affixId) }));
}

export function rerollItemAffix(inventory: InventoryState, instanceId: ItemInstanceId, affixId: string, rng: ItemRollRng): ItemMutationResult {
  const instance = getItemInstance(inventory, instanceId);
  const current = instance?.affixes.find((entry) => entry.affixId === affixId);
  if (!instance || !current) return unchanged(inventory, "unknown-affix");
  const definition = itemById[instance.definitionId];
  const affix = itemAffixById[affixId];
  const tier = affix ? getItemAffixTier(affix, current.tierId) : undefined;
  if (!definition || !affix) return unchanged(inventory, "unknown-affix");
  if (!tier) return unchanged(inventory, "unknown-tier");
  if (!isAffixTierApplicable(definition, affix, tier)) return unchanged(inventory, "affix-not-applicable");
  const rolled = rollItemAffix(affixId, current.tierId, rng);
  if (!rolled.affix) return unchanged(inventory, rolled.reason);
  const nextInstance = { ...instance, affixes: instance.affixes.map((entry) => entry.affixId === affixId ? rolled.affix! : entry) };
  if (!validateItemInstance(nextInstance).valid) return unchanged(inventory, "invalid-roll-data");
  return withInstance(inventory, instanceId, () => nextInstance);
}
