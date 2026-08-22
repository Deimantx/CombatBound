import { costs, globalStat, makeDefensiveUpgradeTree } from "./defensiveUpgradeTreeHelpers";

const authored = makeDefensiveUpgradeTree("iron-armor", "item.iron-armor", [
  {
    id: "fortress", name: "Fortress", styleLabel: "Armour", description: "Turns the cuirass into a true defensive bastion.", icon: "shield", nodes: [
      { id: "reinforced-plates", name: "Reinforced Plates", description: "+10 Armour.", costs: costs(["item.iron-bar", 3], ["item.rough-metal-fragment", 3]), effects: [globalStat("armour", 10)] },
      { id: "layered-steelwork", name: "Layered Steelwork", description: "+15 Armour.", costs: costs(["item.iron-bar", 5], ["item.metal-scraps", 4]), effects: [globalStat("armour", 15)] },
      { id: "bastion-plate", name: "Bastion Plate", description: "+22 Armour.", costs: costs(["item.iron-bar", 7], ["item.mineralized-shell-plate", 2], ["item.ironback-core", 1]), effects: [globalStat("armour", 22)] },
      { id: "walking-fortress", name: "Walking Fortress", description: "+35 Armour.", costs: costs(["item.iron-bar", 10], ["item.wardens-grave-plate", 1], ["item.black-stone", 1]), effects: [globalStat("armour", 35)] },
    ],
  },
  {
    id: "colossus", name: "Colossus", styleLabel: "Life", description: "Adds the mass and endurance of a colossus.", icon: "heart", nodes: [
      { id: "deep-padding", name: "Deep Padding", description: "+12 Max Life.", costs: costs(["item.iron-bar", 3], ["item.gravebound-bone", 3]), effects: [globalStat("maxLife", 12)] },
      { id: "fortified-core", name: "Fortified Core", description: "+18 Max Life.", costs: costs(["item.iron-bar", 5], ["item.thornhide-strip", 3]), effects: [globalStat("maxLife", 18)] },
      { id: "titan-frame", name: "Titan Frame", description: "+28 Max Life.", costs: costs(["item.iron-bar", 7], ["item.wardens-grave-plate", 1]), effects: [globalStat("maxLife", 28)] },
      { id: "colossus-plate", name: "Colossus Plate", description: "+45 Max Life.", costs: costs(["item.iron-bar", 10], ["item.hollow-bell-core", 1], ["item.black-stone", 1]), effects: [globalStat("maxLife", 45)] },
    ],
  },
  {
    id: "renewal", name: "Renewal", styleLabel: "Recovery", description: "Builds a sustaining inner layer for steady recovery.", icon: "heart", nodes: [
      { id: "restorative-lining", name: "Restorative Lining", description: "+0.10 flat Life Regen.", costs: costs(["item.iron-bar", 3], ["item.spirit-ash", 3]), effects: [globalStat("lifeRegenFlat", 0.10)] },
      { id: "sustaining-plate", name: "Sustaining Plate", description: "+0.15 flat Life Regen.", costs: costs(["item.iron-bar", 5], ["item.dark-spirits-dust", 3]), effects: [globalStat("lifeRegenFlat", 0.15)] },
      { id: "living-iron", name: "Living Iron", description: "+0.25 flat Life Regen and +8 Max Life.", costs: costs(["item.iron-bar", 7], ["item.guardian-thorn", 1]), effects: [globalStat("lifeRegenFlat", 0.25), globalStat("maxLife", 8)] },
      { id: "everlasting-plate", name: "Everlasting Plate", description: "+0.50 flat Life Regen and +15 Max Life.", costs: costs(["item.iron-bar", 10], ["item.hollow-bell-core", 1], ["item.black-stone", 1]), effects: [globalStat("lifeRegenFlat", 0.50), globalStat("maxLife", 15)] },
    ],
  },
]);

export const ironArmorUpgradeTree = authored.tree;
export const ironArmorUpgradeBranches = authored.branches;
export const ironArmorUpgradeNodes = authored.nodes;
