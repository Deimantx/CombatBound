import { costs, globalStat, makeDefensiveUpgradeTree } from "./defensiveUpgradeTreeHelpers";

const authored = makeDefensiveUpgradeTree("iron-shield", "item.iron-shield", [
  {
    id: "guard", name: "Guard", styleLabel: "Block Chance", description: "Improves facing and timing for more frequent Blocks.", icon: "shield", nodes: [
      { id: "broad-guard", name: "Broad Guard", description: "+2 percentage points Block Chance.", costs: costs(["item.iron-bar", 2], ["item.metal-scraps", 3]), effects: [globalStat("blockChance", 0.02)] },
      { id: "trained-guard", name: "Trained Guard", description: "+2 percentage points Block Chance.", costs: costs(["item.iron-bar", 4], ["item.mineralized-shell-plate", 2]), effects: [globalStat("blockChance", 0.02)] },
      { id: "perfect-facing", name: "Perfect Facing", description: "+3 percentage points Block Chance.", costs: costs(["item.iron-bar", 6], ["item.ironback-core", 1]), effects: [globalStat("blockChance", 0.03)] },
      { id: "impenetrable-guard", name: "Impenetrable Guard", description: "+5 percentage points Block Chance.", costs: costs(["item.iron-bar", 8], ["item.crusher-pincer", 1], ["item.black-stone", 1]), effects: [globalStat("blockChance", 0.05)] },
    ],
  },
  {
    id: "bastion", name: "Bastion", styleLabel: "Armour / Block Effect", description: "Makes the shield face and rim heavier and harder to overcome.", icon: "shield", nodes: [
      { id: "reinforced-face", name: "Reinforced Face", description: "+5 Armour and +3 percentage points Block Effect.", costs: costs(["item.iron-bar", 2], ["item.rough-metal-fragment", 3]), effects: [globalStat("armour", 5), globalStat("blockEffect", 0.03)] },
      { id: "layered-shield", name: "Layered Shield", description: "+8 Armour and +4 percentage points Block Effect.", costs: costs(["item.iron-bar", 4], ["item.metal-scraps", 3]), effects: [globalStat("armour", 8), globalStat("blockEffect", 0.04)] },
      { id: "bastion-rim", name: "Bastion Rim", description: "+12 Armour and +5 percentage points Block Effect.", costs: costs(["item.iron-bar", 6], ["item.wardens-grave-plate", 1]), effects: [globalStat("armour", 12), globalStat("blockEffect", 0.05)] },
      { id: "iron-bastion", name: "Iron Bastion", description: "+18 Armour and +8 percentage points Block Effect.", costs: costs(["item.iron-bar", 8], ["item.ironback-core", 1], ["item.black-stone", 1]), effects: [globalStat("armour", 18), globalStat("blockEffect", 0.08)] },
    ],
  },
  {
    id: "warding", name: "Warding", styleLabel: "Resistances", description: "Adds elemental and chaos resistance to the shield's protection.", icon: "sparkles", nodes: [
      { id: "elemental-facing", name: "Elemental Facing", description: "+1 percentage point Fire, Cold and Lightning Resistance.", costs: costs(["item.iron-bar", 2], ["item.spirit-ash", 3]), effects: [globalStat("fireResistance", 0.01), globalStat("coldResistance", 0.01), globalStat("lightningResistance", 0.01)] },
      { id: "reinforced-ward", name: "Reinforced Ward", description: "+2 percentage points Fire, Cold and Lightning Resistance.", costs: costs(["item.iron-bar", 4], ["item.dark-essence", 3]), effects: [globalStat("fireResistance", 0.02), globalStat("coldResistance", 0.02), globalStat("lightningResistance", 0.02)] },
      { id: "dark-facing", name: "Dark Facing", description: "+2 percentage points Chaos, Fire, Cold and Lightning Resistance.", costs: costs(["item.iron-bar", 6], ["item.hollow-bell-core", 1]), effects: [globalStat("chaosResistance", 0.02), globalStat("fireResistance", 0.02), globalStat("coldResistance", 0.02), globalStat("lightningResistance", 0.02)] },
      { id: "aegis", name: "Aegis", description: "+4 percentage points Fire, Cold and Lightning Resistance and +3 percentage points Chaos Resistance.", costs: costs(["item.iron-bar", 8], ["item.black-bell-fragment", 1], ["item.black-stone", 1]), effects: [globalStat("fireResistance", 0.04), globalStat("coldResistance", 0.04), globalStat("lightningResistance", 0.04), globalStat("chaosResistance", 0.03)] },
    ],
  },
]);

export const ironShieldUpgradeTree = authored.tree;
export const ironShieldUpgradeBranches = authored.branches;
export const ironShieldUpgradeNodes = authored.nodes;
