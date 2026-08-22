import { costs, globalStat, makeDefensiveUpgradeTree } from "./defensiveUpgradeTreeHelpers";

const authored = makeDefensiveUpgradeTree("iron-boots", "item.iron-boots", [
  {
    id: "anchored", name: "Anchored", styleLabel: "Armour", description: "Adds weight and reinforcement for an immovable stance.", icon: "footprints", nodes: [
      { id: "reinforced-toes", name: "Reinforced Toes", description: "+4 Armour.", costs: costs(["item.iron-bar", 2], ["item.rough-metal-fragment", 2]), effects: [globalStat("armour", 4)] },
      { id: "weighted-greaves", name: "Weighted Greaves", description: "+6 Armour.", costs: costs(["item.iron-bar", 4], ["item.metal-scraps", 3]), effects: [globalStat("armour", 6)] },
      { id: "anchored-step", name: "Anchored Step", description: "+9 Armour.", costs: costs(["item.iron-bar", 6], ["item.mineralized-shell-plate", 2]), effects: [globalStat("armour", 9)] },
      { id: "immovable-greaves", name: "Immovable Greaves", description: "+14 Armour.", costs: costs(["item.iron-bar", 8], ["item.ironback-core", 1], ["item.black-stone", 1]), effects: [globalStat("armour", 14)] },
    ],
  },
  {
    id: "endurance", name: "Endurance", styleLabel: "Life", description: "Builds the legs for a longer and steadier march.", icon: "heart", nodes: [
      { id: "padded-step", name: "Padded Step", description: "+5 Max Life.", costs: costs(["item.iron-bar", 2], ["item.gravebound-bone", 2]), effects: [globalStat("maxLife", 5)] },
      { id: "enduring-march", name: "Enduring March", description: "+8 Max Life.", costs: costs(["item.iron-bar", 4], ["item.thornhide-strip", 3]), effects: [globalStat("maxLife", 8)] },
      { id: "unbroken-stance", name: "Unbroken Stance", description: "+12 Max Life.", costs: costs(["item.iron-bar", 6], ["item.wardens-grave-plate", 1]), effects: [globalStat("maxLife", 12)] },
      { id: "titans-footing", name: "Titan's Footing", description: "+20 Max Life.", costs: costs(["item.iron-bar", 8], ["item.hollow-bell-core", 1], ["item.black-stone", 1]), effects: [globalStat("maxLife", 20)] },
    ],
  },
  {
    id: "recovery", name: "Recovery", styleLabel: "Recovery", description: "Turns every measured step into a chance to recover.", icon: "heart", nodes: [
      { id: "restful-lining", name: "Restful Lining", description: "+0.05 flat Life Regen.", costs: costs(["item.iron-bar", 2], ["item.spirit-ash", 2]), effects: [globalStat("lifeRegenFlat", 0.05)] },
      { id: "measured-recovery", name: "Measured Recovery", description: "+0.08 flat Life Regen.", costs: costs(["item.iron-bar", 4], ["item.dark-spirits-dust", 3]), effects: [globalStat("lifeRegenFlat", 0.08)] },
      { id: "sustained-march", name: "Sustained March", description: "+0.12 flat Life Regen and +4 Max Life.", costs: costs(["item.iron-bar", 6], ["item.guardian-thorn", 1]), effects: [globalStat("lifeRegenFlat", 0.12), globalStat("maxLife", 4)] },
      { id: "endless-march", name: "Endless March", description: "+0.25 flat Life Regen and +8 Max Life.", costs: costs(["item.iron-bar", 8], ["item.black-bell-fragment", 1], ["item.black-stone", 1]), effects: [globalStat("lifeRegenFlat", 0.25), globalStat("maxLife", 8)] },
    ],
  },
]);

export const ironBootsUpgradeTree = authored.tree;
export const ironBootsUpgradeBranches = authored.branches;
export const ironBootsUpgradeNodes = authored.nodes;
