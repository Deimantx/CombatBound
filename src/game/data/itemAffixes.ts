import { deepFreeze } from "./freeze";
import type {
  ItemAffixDefinition,
  ItemAffixTierDefinition,
} from "../items/itemModifierTypes";

const equipmentCategories = ["weapon", "armor", "accessory"] as const;
const armorKinds = ["offhand", "head", "armor", "gloves", "boots"] as const;

function tier(id: string, modifiers: ItemAffixTierDefinition["modifiers"]): ItemAffixTierDefinition {
  return { id, tier: 1, modifiers };
}

export const itemAffixDefinitions: ItemAffixDefinition[] = deepFreeze([
  {
    id: "affix.sharpened",
    name: "Sharpened",
    kind: "prefix",
    appliesTo: { slotKinds: ["weapon"] },
    tiers: [tier("affix.sharpened.t1", [{ id: "local-physical", scope: "local", target: "physicalDamage", operation: "increased", roll: { min: 0.12, max: 0.18, step: 0.01, valueType: "decimal" } }])],
  },
  {
    id: "affix.swift",
    name: "Swift",
    kind: "prefix",
    appliesTo: { slotKinds: ["weapon"] },
    tiers: [tier("affix.swift.t1", [{ id: "local-attack-speed", scope: "local", target: "attackSpeed", operation: "increased", roll: { min: 0.04, max: 0.08, step: 0.01, valueType: "decimal" } }])],
  },
  {
    id: "affix.reinforced",
    name: "Reinforced",
    kind: "prefix",
    appliesTo: { categories: ["armor"], slotKinds: armorKinds as unknown as ItemAffixDefinition["appliesTo"]["slotKinds"] },
    tiers: [tier("affix.reinforced.t1", [{ id: "local-armour", scope: "local", target: "armour", operation: "increased", roll: { min: 0.12, max: 0.20, step: 0.01, valueType: "decimal" } }])],
  },
  {
    id: "affix.nimble",
    name: "Nimble",
    kind: "prefix",
    appliesTo: { categories: ["armor"] },
    tiers: [tier("affix.nimble.t1", [{ id: "local-evasion", scope: "local", target: "evasion", operation: "increased", roll: { min: 0.12, max: 0.20, step: 0.01, valueType: "decimal" } }])],
  },
  {
    id: "affix.stalwart",
    name: "Stalwart",
    kind: "prefix",
    appliesTo: { categories: [...equipmentCategories] },
    tiers: [tier("affix.stalwart.t1", [{ id: "max-life", scope: "global", stat: "maxLife", operation: "flat", roll: { min: 10, max: 24, valueType: "integer" } }])],
  },
  {
    id: "affix.precise",
    name: "Precise",
    kind: "suffix",
    appliesTo: { categories: [...equipmentCategories] },
    tiers: [tier("affix.precise.t1", [{ id: "accuracy-flat", scope: "global", stat: "accuracyRating", operation: "flat", roll: { min: 6, max: 14, valueType: "integer" } }])],
  },
  {
    id: "affix.of-embers",
    name: "of Embers",
    kind: "suffix",
    appliesTo: { categories: [...equipmentCategories] },
    tiers: [tier("affix.of-embers.t1", [{ id: "fire-resistance", scope: "global", stat: "fireResistance", operation: "flat", roll: { min: 0.03, max: 0.07, step: 0.01, valueType: "decimal" } }])],
  },
  {
    id: "affix.of-frost",
    name: "of Frost",
    kind: "suffix",
    appliesTo: { categories: [...equipmentCategories] },
    tiers: [tier("affix.of-frost.t1", [{ id: "cold-resistance", scope: "global", stat: "coldResistance", operation: "flat", roll: { min: 0.03, max: 0.07, step: 0.01, valueType: "decimal" } }])],
  },
  {
    id: "affix.of-storms",
    name: "of Storms",
    kind: "suffix",
    appliesTo: { categories: [...equipmentCategories] },
    tiers: [tier("affix.of-storms.t1", [{ id: "lightning-resistance", scope: "global", stat: "lightningResistance", operation: "flat", roll: { min: 0.03, max: 0.07, step: 0.01, valueType: "decimal" } }])],
  },
  {
    id: "affix.of-the-void",
    name: "of the Void",
    kind: "suffix",
    appliesTo: { categories: [...equipmentCategories] },
    tiers: [tier("affix.of-the-void.t1", [{ id: "chaos-resistance", scope: "global", stat: "chaosResistance", operation: "flat", roll: { min: 0.03, max: 0.07, step: 0.01, valueType: "decimal" } }])],
  },
] as ItemAffixDefinition[]);

export const itemAffixById = Object.fromEntries(itemAffixDefinitions.map((affix) => [affix.id, affix]));
