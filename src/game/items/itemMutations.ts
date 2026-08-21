/*
 * Legacy mutation names remain as frozen migration/test adapters only. Current
 * gameplay mutates v3 instances through itemUpgradeLogic.purchaseItemUpgradeNode.
 */
import { itemById } from "../data/items";
import { itemAffixById } from "../data/itemAffixes";
import { getItemInstance } from "./itemOwnership";
import type { ItemInstance, ItemInstanceId } from "./itemTypes";
import type { ItemMutationFailureReason, ItemMutationResult, ItemRollRng } from "./itemModifierTypes";
import { rollItemModifier } from "./itemModifierTypes";
import type { InventoryState } from "../inventory/inventoryTypes";

function unchanged(inventory: InventoryState, reason: ItemMutationFailureReason): ItemMutationResult { return { inventory, changed: false, reason }; }
function legacyUpdate(inventory: InventoryState, instanceId: ItemInstanceId, update: (instance: ItemInstance) => ItemInstance): ItemMutationResult {
  const instance = getItemInstance(inventory, instanceId);
  if (!instance || !itemById[instance.definitionId]) return unchanged(inventory, "unknown-instance");
  return { inventory: { ...inventory, instances: { ...inventory.instances, [instanceId]: update(instance) } }, changed: true };
}

export function setItemQuality(inventory: InventoryState, instanceId: ItemInstanceId, quality: number): ItemMutationResult {
  if (!Number.isInteger(quality) || quality < 0) return unchanged(inventory, "invalid-quality");
  return legacyUpdate(inventory, instanceId, (instance) => ({ ...instance, quality }));
}
export function setItemUpgradeLevel(inventory: InventoryState, instanceId: ItemInstanceId, upgradeLevel: number): ItemMutationResult {
  if (!Number.isInteger(upgradeLevel) || upgradeLevel < 0) return unchanged(inventory, "invalid-upgrade-level");
  return legacyUpdate(inventory, instanceId, (instance) => ({ ...instance, upgradeLevel }));
}
export function rollItemAffix(affixId: string, tierId: string, rng: ItemRollRng) {
  const affix = itemAffixById[affixId];
  const tier = affix?.tiers.find((candidate) => candidate.id === tierId);
  if (!affix) return { affix: null, reason: "unknown-affix" as const };
  if (!tier) return { affix: null, reason: "unknown-tier" as const };
  const rolls: Record<string, number> = {};
  for (const modifier of tier.modifiers) rolls[modifier.id] = rollItemModifier(modifier.roll, rng);
  return { affix: { affixId, tierId, rolls } };
}
export function addItemAffix(inventory: InventoryState, instanceId: ItemInstanceId, affixId: string, tierId: string, rng: ItemRollRng): ItemMutationResult {
  const rolled = rollItemAffix(affixId, tierId, rng);
  if (!rolled.affix) return unchanged(inventory, rolled.reason);
  return legacyUpdate(inventory, instanceId, (instance) => ({ ...instance, affixes: [...(instance.affixes ?? []), rolled.affix!] }));
}
export function removeItemAffix(inventory: InventoryState, instanceId: ItemInstanceId, affixId: string): ItemMutationResult {
  return legacyUpdate(inventory, instanceId, (instance) => ({ ...instance, affixes: (instance.affixes ?? []).filter((entry) => entry.affixId !== affixId) }));
}
export function rerollItemAffix(inventory: InventoryState, instanceId: ItemInstanceId, affixId: string, rng: ItemRollRng): ItemMutationResult {
  const current = getItemInstance(inventory, instanceId)?.affixes?.find((entry) => entry.affixId === affixId);
  if (!current) return unchanged(inventory, "unknown-affix");
  const rolled = rollItemAffix(affixId, current.tierId, rng);
  if (!rolled.affix) return unchanged(inventory, rolled.reason);
  return legacyUpdate(inventory, instanceId, (instance) => ({ ...instance, affixes: (instance.affixes ?? []).map((entry) => entry.affixId === affixId ? rolled.affix! : entry) }));
}
