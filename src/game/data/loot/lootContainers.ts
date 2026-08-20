import { deepFreeze } from "../freeze";
import type { LootContainerDefinition } from "../../loot/lootTypes";

/** Container tables use provisional weights and quantities. [TUNING] */
export const lootContainerDefinitions = deepFreeze<LootContainerDefinition[]>([
  {
    id: "loot-container.ore-box",
    name: "Ore Box",
    description: "Contains random Iron, Copper or Lead Ore.",
    rolls: 2,
    entries: [
      { itemId: "item.iron-ore", weight: 5, minQuantity: 1, maxQuantity: 2 },
      { itemId: "item.copper-ore", weight: 3, minQuantity: 1, maxQuantity: 2 },
      { itemId: "item.lead-ore", weight: 1, minQuantity: 1, maxQuantity: 1 },
    ],
  },
  {
    id: "loot-container.magic-crystal-box",
    name: "Magic Crystal Box",
    description: "Contains a random Minor Magic Crystal or Magic Crystal Dust.",
    rolls: 1,
    entries: [
      { itemId: "item.magic-crystal-minor-assault", weight: 1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "item.magic-crystal-minor-health", weight: 1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "item.magic-crystal-minor-precision", weight: 1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "item.magic-crystal-minor-mana", weight: 1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "item.magic-crystal-minor-recovery", weight: 1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "item.magic-crystal-minor-ward", weight: 1, minQuantity: 1, maxQuantity: 1 },
      { itemId: "item.magic-crystal-dust", weight: 3, minQuantity: 1, maxQuantity: 2 },
    ],
  },
]);

export const lootContainerById = Object.fromEntries(lootContainerDefinitions.map((definition) => [definition.id, definition])) as Record<string, LootContainerDefinition>;
