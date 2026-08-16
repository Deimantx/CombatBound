import type { ItemDefinition } from "../data/items";
import type { ItemStats } from "./itemTypes";
import type { ItemStatContribution } from "./itemModifierTypes";

export const MIN_ITEM_QUALITY = 0;
export const MAX_ITEM_QUALITY = 20; // [TUNING]
export const QUALITY_LOCAL_INCREASE_PER_POINT = 0.01; // [TUNING]

export function isValidItemQuality(value: number) {
  return Number.isInteger(value) && value >= MIN_ITEM_QUALITY && value <= MAX_ITEM_QUALITY;
}

export function itemQualityContributions(definition: ItemDefinition, stats: ItemStats, quality: number): ItemStatContribution[] {
  const contributions: ItemStatContribution[] = [];
  if (quality <= 0) return contributions;
  const value = quality * QUALITY_LOCAL_INCREASE_PER_POINT;
  if (definition.category === "weapon" && stats.baseDamageMin !== undefined && stats.baseDamageMax !== undefined)
    contributions.push({ sourceType: "quality", sourceId: "quality", sourceLabel: `Quality ${quality}%`, scope: "local", target: "physicalDamage", operation: "increased", value });
  if (stats.armour !== undefined)
    contributions.push({ sourceType: "quality", sourceId: "quality", sourceLabel: `Quality ${quality}%`, scope: "local", target: "armour", operation: "increased", value });
  if (stats.evasionRating !== undefined)
    contributions.push({ sourceType: "quality", sourceId: "quality", sourceLabel: `Quality ${quality}%`, scope: "local", target: "evasion", operation: "increased", value });
  return contributions;
}
