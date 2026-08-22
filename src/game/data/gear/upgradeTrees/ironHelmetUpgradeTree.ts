import { costs, globalStat, makeDefensiveUpgradeTree } from "./defensiveUpgradeTreeHelpers";

const authored = makeDefensiveUpgradeTree("iron-helmet", "item.iron-helmet", [
  {
    id: "ironclad", name: "Ironclad", styleLabel: "Armour", description: "More armour through layered iron protection.", icon: "helmet", nodes: [
      { id: "reinforced-brow", name: "Reinforced Brow", description: "+4 Armour.", costs: costs(["item.iron-bar", 2], ["item.rough-metal-fragment", 2]), effects: [globalStat("armour", 4)] },
      { id: "layered-helm", name: "Layered Helm", description: "+6 Armour.", costs: costs(["item.iron-bar", 4], ["item.metal-scraps", 3]), effects: [globalStat("armour", 6)] },
      { id: "shell-lining", name: "Shell Lining", description: "+10 Armour.", costs: costs(["item.iron-bar", 6], ["item.mineralized-shell-plate", 2]), effects: [globalStat("armour", 10)] },
      { id: "iron-crown", name: "Iron Crown", description: "+16 Armour.", costs: costs(["item.iron-bar", 8], ["item.ironback-core", 1], ["item.black-stone", 1]), effects: [globalStat("armour", 16)] },
    ],
  },
  {
    id: "vitality", name: "Vitality", styleLabel: "Life / Recovery", description: "Life and recovery through a stronger helm interior.", icon: "heart", nodes: [
      { id: "padded-crown", name: "Padded Crown", description: "+5 Max Life.", costs: costs(["item.iron-bar", 2], ["item.gravebound-bone", 2]), effects: [globalStat("maxLife", 5)] },
      { id: "fortified-skull", name: "Fortified Skull", description: "+8 Max Life.", costs: costs(["item.iron-bar", 4], ["item.thornhide-strip", 3]), effects: [globalStat("maxLife", 8)] },
      { id: "unyielding-mind", name: "Unyielding Mind", description: "+12 Max Life and +0.05 flat Life Regen.", costs: costs(["item.iron-bar", 6], ["item.wardens-grave-plate", 1]), effects: [globalStat("maxLife", 12), globalStat("lifeRegenFlat", 0.05)] },
      { id: "colossus-helm", name: "Colossus Helm", description: "+20 Max Life and +0.10 flat Life Regen.", costs: costs(["item.iron-bar", 8], ["item.hollow-bell-core", 1], ["item.black-stone", 1]), effects: [globalStat("maxLife", 20), globalStat("lifeRegenFlat", 0.10)] },
    ],
  },
  {
    id: "sentinel", name: "Sentinel", styleLabel: "Block", description: "A guarded visor and disciplined facing for stronger Blocks.", icon: "shield", nodes: [
      { id: "guarded-visor", name: "Guarded Visor", description: "+0.5 percentage points Block Chance.", costs: costs(["item.iron-bar", 2], ["item.metal-scraps", 2]), effects: [globalStat("blockChance", 0.005)] },
      { id: "closed-face", name: "Closed Face", description: "+1 percentage point Block Effect.", costs: costs(["item.iron-bar", 4], ["item.mineralized-shell-plate", 2]), effects: [globalStat("blockEffect", 0.01)] },
      { id: "sentinel-helm", name: "Sentinel Helm", description: "+1 percentage point Block Chance and Block Effect.", costs: costs(["item.iron-bar", 6], ["item.ironback-core", 1]), effects: [globalStat("blockChance", 0.01), globalStat("blockEffect", 0.01)] },
      { id: "unbroken-watch", name: "Unbroken Watch", description: "+2 percentage points Block Chance and +3 percentage points Block Effect.", costs: costs(["item.iron-bar", 8], ["item.wardens-grave-plate", 1], ["item.black-stone", 1]), effects: [globalStat("blockChance", 0.02), globalStat("blockEffect", 0.03)] },
    ],
  },
]);

export const ironHelmetUpgradeTree = authored.tree;
export const ironHelmetUpgradeBranches = authored.branches;
export const ironHelmetUpgradeNodes = authored.nodes;
