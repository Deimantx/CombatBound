import { costs, globalStat, makeDefensiveUpgradeTree } from "./defensiveUpgradeTreeHelpers";

const authored = makeDefensiveUpgradeTree("iron-gloves", "item.iron-gloves", [
  {
    id: "reinforced", name: "Reinforced", styleLabel: "Armour", description: "Adds plates to the striking surfaces of the gloves.", icon: "gloves", nodes: [
      { id: "knuckle-plates", name: "Knuckle Plates", description: "+3 Armour.", costs: costs(["item.iron-bar", 2], ["item.rough-metal-fragment", 2]), effects: [globalStat("armour", 3)] },
      { id: "layered-gauntlets", name: "Layered Gauntlets", description: "+5 Armour.", costs: costs(["item.iron-bar", 4], ["item.metal-scraps", 2]), effects: [globalStat("armour", 5)] },
      { id: "crusher-plates", name: "Crusher Plates", description: "+7 Armour.", costs: costs(["item.iron-bar", 6], ["item.crusher-pincer", 1]), effects: [globalStat("armour", 7)] },
      { id: "iron-fists", name: "Iron Fists", description: "+12 Armour.", costs: costs(["item.iron-bar", 8], ["item.ironback-core", 1], ["item.black-stone", 1]), effects: [globalStat("armour", 12)] },
    ],
  },
  {
    id: "guard", name: "Guard", styleLabel: "Block", description: "Improves hand bracing and the control of a guarded blow.", icon: "shield", nodes: [
      { id: "braced-hands", name: "Braced Hands", description: "+0.5 percentage points Block Chance.", costs: costs(["item.iron-bar", 2], ["item.gravebound-bone", 2]), effects: [globalStat("blockChance", 0.005)] },
      { id: "controlled-guard", name: "Controlled Guard", description: "+1 percentage point Block Effect.", costs: costs(["item.iron-bar", 4], ["item.mineralized-shell-plate", 2]), effects: [globalStat("blockEffect", 0.01)] },
      { id: "locked-grip", name: "Locked Grip", description: "+1 percentage point Block Chance and Block Effect.", costs: costs(["item.iron-bar", 6], ["item.fallen-watch-insignia", 1]), effects: [globalStat("blockChance", 0.01), globalStat("blockEffect", 0.01)] },
      { id: "perfect-guard", name: "Perfect Guard", description: "+1.5 percentage points Block Chance and +2 percentage points Block Effect.", costs: costs(["item.iron-bar", 8], ["item.wardens-grave-plate", 1], ["item.black-stone", 1]), effects: [globalStat("blockChance", 0.015), globalStat("blockEffect", 0.02)] },
    ],
  },
  {
    id: "recovery", name: "Recovery", styleLabel: "Recovery", description: "Keeps the hands warm, steady and ready for the next exchange.", icon: "heart", nodes: [
      { id: "warm-lining", name: "Warm Lining", description: "+0.05 flat Life Regen.", costs: costs(["item.iron-bar", 2], ["item.spirit-ash", 2]), effects: [globalStat("lifeRegenFlat", 0.05)] },
      { id: "steady-hands", name: "Steady Hands", description: "+0.08 flat Life Regen.", costs: costs(["item.iron-bar", 4], ["item.dark-spirits-dust", 3]), effects: [globalStat("lifeRegenFlat", 0.08)] },
      { id: "restoring-grip", name: "Restoring Grip", description: "+0.12 flat Life Regen and +5 Max Life.", costs: costs(["item.iron-bar", 6], ["item.guardian-thorn", 1]), effects: [globalStat("lifeRegenFlat", 0.12), globalStat("maxLife", 5)] },
      { id: "unfailing-hands", name: "Unfailing Hands", description: "+0.25 flat Life Regen and +8 Max Life.", costs: costs(["item.iron-bar", 8], ["item.hollow-bell-core", 1], ["item.black-stone", 1]), effects: [globalStat("lifeRegenFlat", 0.25), globalStat("maxLife", 8)] },
    ],
  },
]);

export const ironGlovesUpgradeTree = authored.tree;
export const ironGlovesUpgradeBranches = authored.branches;
export const ironGlovesUpgradeNodes = authored.nodes;
