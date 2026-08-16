import type { ItemDefinition } from "../data/items";
import type { ItemStats } from "./itemTypes";
import type { ItemStatContribution } from "./itemModifierTypes";

export const MIN_ITEM_UPGRADE_LEVEL = 0;
export const MAX_ITEM_UPGRADE_LEVEL = 10; // [TUNING]
export const UPGRADE_LOCAL_INCREASE_PER_LEVEL = 0.03; // [TUNING]

export function isValidItemUpgradeLevel(value: number) {
  return Number.isInteger(value) && value >= MIN_ITEM_UPGRADE_LEVEL && value <= MAX_ITEM_UPGRADE_LEVEL;
}

export function itemUpgradeContributions(definition: ItemDefinition, stats: ItemStats, upgradeLevel: number): ItemStatContribution[] {
  const contributions: ItemStatContribution[] = [];
  if (upgradeLevel <= 0) return contributions;
  const value = upgradeLevel * UPGRADE_LOCAL_INCREASE_PER_LEVEL;
  if (definition.category === "weapon" && stats.baseDamageMin !== undefined && stats.baseDamageMax !== undefined)
    contributions.push({ sourceType: "upgrade", sourceId: `upgrade-level-${upgradeLevel}`, sourceLabel: `Upgrade +${upgradeLevel}`, scope: "local", target: "physicalDamage", operation: "increased", value });
  if (stats.armour !== undefined)
    contributions.push({ sourceType: "upgrade", sourceId: `upgrade-level-${upgradeLevel}`, sourceLabel: `Upgrade +${upgradeLevel}`, scope: "local", target: "armour", operation: "increased", value });
  if (stats.evasionRating !== undefined)
    contributions.push({ sourceType: "upgrade", sourceId: `upgrade-level-${upgradeLevel}`, sourceLabel: `Upgrade +${upgradeLevel}`, scope: "local", target: "evasion", operation: "increased", value });
  return contributions;
}
