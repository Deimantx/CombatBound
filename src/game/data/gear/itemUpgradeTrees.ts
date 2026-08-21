import { deepFreeze } from "../freeze";
import type { ItemUpgradeNodeDefinition, ItemUpgradeTreeDefinition } from "../../items/itemUpgradeTypes";

const treeId = "upgrade-tree.iron-sword";
const node = (
  id: string,
  name: string,
  description: string,
  branch: string,
  column: number,
  row: number,
  prerequisiteNodeIds: string[],
  costs: ItemUpgradeNodeDefinition["costs"],
  effects: ItemUpgradeNodeDefinition["effects"],
  size: ItemUpgradeNodeDefinition["presentation"]["size"] = "minor",
): ItemUpgradeNodeDefinition => ({
  id: `upgrade-node.iron-sword.${id}`,
  treeId,
  name,
  description,
  prerequisiteNodeIds,
  costs,
  effects,
  presentation: { branch, column, row, size, icon: "sword" },
});

const p1 = "upgrade-node.iron-sword.tempered-edge-1";
const p2 = "upgrade-node.iron-sword.tempered-edge-2";
const p3 = "upgrade-node.iron-sword.alpha-edge";
const r1 = "upgrade-node.iron-sword.balanced-grip";
const r2 = "upgrade-node.iron-sword.honed-point";
const r3 = "upgrade-node.iron-sword.duelist-flow";
const g1 = "upgrade-node.iron-sword.guarded-hilt";
const g2 = "upgrade-node.iron-sword.counter-edge";
const g3 = "upgrade-node.iron-sword.counter-tempo";

export const ironSwordUpgradeNodes = deepFreeze<ItemUpgradeNodeDefinition[]>([
  node("tempered-edge-1", "Tempered Edge I", "+6% increased local Physical Damage.", "Power", 1, 0, [], [{ itemId: "item.iron-bar", quantity: 2 }, { itemId: "item.weapon-scrap", quantity: 2 }], [{ type: "localStat", target: "physicalDamage", operation: "increased", value: 0.06 }], "major"),
  node("tempered-edge-2", "Tempered Edge II", "+8% increased local Physical Damage.", "Power", 2, 0, [p1], [{ itemId: "item.iron-bar", quantity: 4 }, { itemId: "item.rough-metal-fragment", quantity: 4 }], [{ type: "localStat", target: "physicalDamage", operation: "increased", value: 0.08 }], "major"),
  node("alpha-edge", "Alpha Edge", "+10% Critical Strike Multiplier and +5% increased local Physical Damage.", "Power", 3, 0, [p2], [{ itemId: "item.iron-bar", quantity: 6 }, { itemId: "item.alpha-fang", quantity: 1 }], [{ type: "globalStat", stat: "criticalStrikeMultiplier", operation: "flat", value: 0.10 }, { type: "localStat", target: "physicalDamage", operation: "increased", value: 0.05 }], "major"),
  node("masterwork-edge", "Masterwork Edge", "+10% increased local Physical Damage and +5% Critical Strike Multiplier.", "Power", 4, 0, [p3], [{ itemId: "item.iron-bar", quantity: 8 }, { itemId: "item.captains-blade-fragment", quantity: 1 }, { itemId: "item.black-stone", quantity: 1 }], [{ type: "localStat", target: "physicalDamage", operation: "increased", value: 0.10 }, { type: "globalStat", stat: "criticalStrikeMultiplier", operation: "flat", value: 0.05 }], "capstone"),
  node("balanced-grip", "Balanced Grip", "+3 Accuracy Rating and +2% increased local Attack Speed.", "Precision / Rhythm", 1, 1, [], [{ itemId: "item.iron-bar", quantity: 2 }, { itemId: "item.wolf-fang", quantity: 3 }], [{ type: "globalStat", stat: "accuracyRating", operation: "flat", value: 3 }, { type: "localStat", target: "attackSpeed", operation: "increased", value: 0.02 }], "major"),
  node("honed-point", "Honed Point", "+4 Accuracy Rating and +1 percentage point Critical Strike Chance.", "Precision / Rhythm", 2, 1, [r1], [{ itemId: "item.iron-bar", quantity: 4 }, { itemId: "item.wolf-bone", quantity: 3 }], [{ type: "globalStat", stat: "accuracyRating", operation: "flat", value: 4 }, { type: "globalStat", stat: "criticalStrikeChance", operation: "flat", value: 0.01 }], "major"),
  node("duelist-flow", "Duelist Flow", "Improves Accuracy and Attack Speed gained from Duelist Rhythm stacks.", "Precision / Rhythm", 3, 1, [r2], [{ itemId: "item.iron-bar", quantity: 6 }, { itemId: "item.fallen-watch-insignia", quantity: 1 }], [{ type: "weaponMechanicModifier", mechanicId: "weapon-mechanic.duelist-rhythm", modifier: "accuracyPerStack", value: 1 }, { type: "weaponMechanicModifier", mechanicId: "weapon-mechanic.duelist-rhythm", modifier: "attackSpeedPerStack", value: 0.005 }], "major"),
  node("perfect-rhythm", "Perfect Rhythm", "Raises the Rhythm cap and its maximum-stack Physical Damage bonus.", "Precision / Rhythm", 4, 1, [r3], [{ itemId: "item.iron-bar", quantity: 8 }, { itemId: "item.alpha-fang", quantity: 1 }, { itemId: "item.black-stone", quantity: 1 }], [{ type: "weaponMechanicModifier", mechanicId: "weapon-mechanic.duelist-rhythm", modifier: "maxStacks", value: 1 }, { type: "weaponMechanicModifier", mechanicId: "weapon-mechanic.duelist-rhythm", modifier: "maxStackDamageBonus", value: 0.05 }], "capstone"),
  node("guarded-hilt", "Guarded Hilt", "+2 percentage points Block Chance.", "Guard / Riposte", 1, 2, [], [{ itemId: "item.iron-bar", quantity: 2 }, { itemId: "item.metal-scraps", quantity: 3 }], [{ type: "globalStat", stat: "blockChance", operation: "flat", value: 0.02 }], "major"),
  node("counter-edge", "Counter Edge", "Riposte deals +20% more Physical Damage.", "Guard / Riposte", 2, 2, [g1], [{ itemId: "item.iron-bar", quantity: 4 }, { itemId: "item.mineralized-shell-plate", quantity: 2 }], [{ type: "weaponMechanicModifier", mechanicId: "weapon-mechanic.riposte", modifier: "damageMore", value: 0.05 }], "major"),
  node("counter-tempo", "Counter Tempo", "Riposte gains +15 percentage points Critical Strike Chance and lasts 6 seconds.", "Guard / Riposte", 3, 2, [g2], [{ itemId: "item.iron-bar", quantity: 6 }, { itemId: "item.ironback-core", quantity: 1 }], [{ type: "weaponMechanicModifier", mechanicId: "weapon-mechanic.riposte", modifier: "critChanceFlat", value: 0.05 }, { type: "weaponMechanicModifier", mechanicId: "weapon-mechanic.riposte", modifier: "durationSeconds", value: 1 }], "major"),
  node("master-duelist", "Master Duelist", "A successful Riposte hit grants 1 Rhythm stack and adds +2 percentage points Block Chance.", "Guard / Riposte", 4, 2, [g3], [{ itemId: "item.iron-bar", quantity: 8 }, { itemId: "item.captains-blade-fragment", quantity: 1 }, { itemId: "item.black-stone", quantity: 1 }], [{ type: "weaponMechanicModifier", mechanicId: "weapon-mechanic.riposte", modifier: "grantsRhythmOnHit", value: 1 }, { type: "globalStat", stat: "blockChance", operation: "flat", value: 0.02 }], "capstone"),
]);

export const ironSwordUpgradeTree: ItemUpgradeTreeDefinition = deepFreeze({
  id: treeId,
  itemDefinitionId: "item.iron-sword",
  nodeIds: ironSwordUpgradeNodes.map((entry) => entry.id),
});

export const itemUpgradeTreeDefinitions = deepFreeze<ItemUpgradeTreeDefinition[]>([ironSwordUpgradeTree]);
export const itemUpgradeTreeById = Object.fromEntries(itemUpgradeTreeDefinitions.map((tree) => [tree.id, tree]));
export const itemUpgradeNodeById = Object.fromEntries(ironSwordUpgradeNodes.map((nodeDefinition) => [nodeDefinition.id, nodeDefinition]));
