import { deepFreeze } from "../freeze";
import type { ItemUpgradeBranchDefinition, ItemUpgradeEffect, ItemUpgradeNodeDefinition, ItemUpgradeTreeDefinition } from "../../items/itemUpgradeTypes";

type NodeSpec = { id: string; name: string; description: string; effects: ItemUpgradeEffect[]; costs: ItemUpgradeNodeDefinition["costs"]; size?: "minor" | "major" | "capstone" };
type BranchSpec = { id: string; name: string; styleLabel: string; description: string; icon: string; nodes: NodeSpec[] };

const cost = (...entries: Array<[string, number]>): ItemUpgradeNodeDefinition["costs"] => entries.map(([itemId, quantity]) => ({ itemId, quantity }));
const local = (target: "physicalDamage" | "attackSpeed" | "criticalChance", operation: "increased" | "more", value: number): ItemUpgradeEffect => ({ type: "localStat", target, operation, value });
const stat = (target: keyof import("../../items/itemTypes").ItemStats, value: number): ItemUpgradeEffect => ({ type: "globalStat", stat: target, operation: "flat", value });
const mechanic = (mechanicId: string, modifier: string, value: number): ItemUpgradeEffect => ({ type: "weaponMechanicModifier", mechanicId, modifier, value });

function makeTree(itemKey: string, itemDefinitionId: string, branchSpecs: BranchSpec[]) {
  const treeId = `upgrade-tree.${itemKey}`;
  const branches: ItemUpgradeBranchDefinition[] = branchSpecs.map((branch, index) => ({ id: `upgrade-branch.${itemKey}.${branch.id}`, treeId, name: branch.name, styleLabel: branch.styleLabel, description: branch.description, order: index + 1, icon: branch.icon }));
  const nodes: ItemUpgradeNodeDefinition[] = [];
  for (const [branchIndex, branch] of branchSpecs.entries()) {
    const branchId = branches[branchIndex].id;
    branch.nodes.forEach((spec, nodeIndex) => {
      const id = `upgrade-node.${itemKey}.${spec.id}`;
      nodes.push({ id, treeId, branchId, name: spec.name, description: spec.description, requiredProfessionLevel: 5 + nodeIndex * 5, prerequisiteNodeIds: nodeIndex === 0 ? [] : [`upgrade-node.${itemKey}.${branch.nodes[nodeIndex - 1].id}`], costs: spec.costs, effects: spec.effects, presentation: { column: nodeIndex + 1, row: branchIndex, size: spec.size ?? (nodeIndex === 3 ? "capstone" : "major"), icon: "sword" } });
    });
  }
  return { tree: { id: treeId, itemDefinitionId, selectionMode: "single-branch", branchIds: branches.map((branch) => branch.id), nodeIds: nodes.map((node) => node.id) } satisfies ItemUpgradeTreeDefinition, branches, nodes };
}

const axe = makeTree("iron-axe", "item.iron-axe", [
  { id: "butcher", name: "Butcher", styleLabel: "Wounds", description: "Deepens target wounds and sustained damage.", icon: "axe", nodes: [
    { id: "serrated-beard", name: "Serrated Beard", description: "+5% increased local Physical Damage.", costs: cost(["item.iron-bar", 2], ["item.wolf-fang", 3]), effects: [local("physicalDamage", "increased", 0.05)] },
    { id: "deep-wounds", name: "Deep Wounds", description: "Wound maximum stacks increase by 1.", costs: cost(["item.iron-bar", 4], ["item.bone-fragment", 3]), effects: [mechanic("weapon-mechanic.axe-wounds", "maxStacks", 1)] },
    { id: "open-flesh", name: "Open Flesh", description: "Wound damage per stack increases by 1.5 percentage points.", costs: cost(["item.iron-bar", 6], ["item.guardian-thorn", 1]), effects: [mechanic("weapon-mechanic.axe-wounds", "damagePerStack", 0.015)] },
    { id: "butchers-brand", name: "Butcher's Brand", description: "Critical Axe Basics grant an additional Wound and deal more local damage.", costs: cost(["item.iron-bar", 8], ["item.wardens-grave-plate", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.axe-wounds", "criticalExtraStacks", 1), local("physicalDamage", "increased", 0.05) ] },
  ] },
  { id: "berserker", name: "Berserker", styleLabel: "Momentum", description: "Builds speed and preserves pressure after misses.", icon: "flame", nodes: [
    { id: "forward-weight", name: "Forward Weight", description: "+3% increased local Attack Speed.", costs: cost(["item.iron-bar", 2], ["item.weapon-scrap", 2]), effects: [local("attackSpeed", "increased", 0.03)] },
    { id: "relentless-grip", name: "Relentless Grip", description: "Momentum Attack Speed per stack increases by 0.5 percentage points.", costs: cost(["item.iron-bar", 4], ["item.leather-straps", 3]), effects: [mechanic("weapon-mechanic.axe-momentum", "attackSpeedPerStack", 0.005)] },
    { id: "unbroken-momentum", name: "Unbroken Momentum", description: "A miss preserves 1 Momentum when Momentum was already active.", costs: cost(["item.iron-bar", 6], ["item.fallen-watch-insignia", 1]), effects: [mechanic("weapon-mechanic.axe-momentum", "missFloor", 1)] },
    { id: "blood-rush", name: "Blood Rush", description: "Maximum Momentum grants +15% more Physical Damage.", costs: cost(["item.iron-bar", 8], ["item.crusher-pincer", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.axe-momentum", "maxStackDamageBonus", 0.10)] },
  ] },
  { id: "executioner", name: "Executioner", styleLabel: "Finisher", description: "Raises the Axe execution window and payoff.", icon: "target", nodes: [
    { id: "heavy-crescent", name: "Heavy Crescent", description: "+10 percentage points Critical Strike Multiplier.", costs: cost(["item.iron-bar", 2], ["item.rough-metal-fragment", 3]), effects: [stat("criticalStrikeMultiplier", 0.10)] },
    { id: "finish-the-weak", name: "Finish the Weak", description: "Execution threshold increases to 40% enemy HP.", costs: cost(["item.iron-bar", 4], ["item.gravebound-bone", 3]), effects: [mechanic("weapon-mechanic.axe-execution", "threshold", 0.10)] },
    { id: "headsmans-focus", name: "Headsman's Focus", description: "+5 percentage points Critical Strike Chance inside Execution range.", costs: cost(["item.iron-bar", 6], ["item.alpha-fang", 1]), effects: [mechanic("weapon-mechanic.axe-execution", "criticalChanceInsideThreshold", 0.05)] },
    { id: "final-verdict", name: "Final Verdict", description: "Execution damage bonus increases to +25% more Physical Damage.", costs: cost(["item.iron-bar", 8], ["item.captains-blade-fragment", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.axe-execution", "damageMore", 0.15)] },
  ] },
]);

const mace = makeTree("iron-mace", "item.iron-mace", [
  { id: "crusher", name: "Crusher", styleLabel: "Crushed", description: "Improves armor pressure from repeated impacts.", icon: "mace", nodes: [
    { id: "weighted-head", name: "Weighted Head", description: "+5% increased local Physical Damage.", costs: cost(["item.iron-bar", 2], ["item.rough-metal-fragment", 2]), effects: [local("physicalDamage", "increased", 0.05)] },
    { id: "deep-crush", name: "Deep Crush", description: "Crushed maximum stacks increase by 1.", costs: cost(["item.iron-bar", 4], ["item.gravebound-bone", 3]), effects: [mechanic("weapon-mechanic.mace-crushed", "maxStacks", 1)] },
    { id: "fracture", name: "Fracture", description: "Crushed armor penetration per stack increases by 2 percentage points.", costs: cost(["item.iron-bar", 6], ["item.ironback-core", 1]), effects: [mechanic("weapon-mechanic.mace-crushed", "armorPenetrationPerStack", 0.02)] },
    { id: "total-crush", name: "Total Crush", description: "Heavy Impact gains damage and armor penetration.", costs: cost(["item.iron-bar", 8], ["item.crusher-pincer", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.mace-impact", "heavyDamageMore", 0.15), mechanic("weapon-mechanic.mace-impact", "heavyArmorPenetrationPercent", 0.10)] },
  ] },
  { id: "breaker", name: "Breaker", styleLabel: "Guard Break", description: "Specializes in blocked damage and Barrier pressure.", icon: "shield", nodes: [
    { id: "guard-breaker", name: "Guard Breaker", description: "Mace target Block Effect multiplier becomes 0.80.", costs: cost(["item.iron-bar", 2], ["item.metal-scraps", 3]), effects: [mechanic("weapon-mechanic.mace-impact", "baseBlockEffectMultiplier", -0.10)] },
    { id: "split-guard", name: "Split Guard", description: "Heavy Impact target Block Effect multiplier becomes 0.60.", costs: cost(["item.iron-bar", 4], ["item.mineralized-shell-plate", 2]), effects: [mechanic("weapon-mechanic.mace-impact", "heavyBlockEffectMultiplier", -0.15)] },
    { id: "siege-knob", name: "Siege Knob", description: "+15% more Mace Basic Physical Damage against an active Barrier.", costs: cost(["item.iron-bar", 6], ["item.ironback-core", 1]), effects: [mechanic("weapon-mechanic.mace-impact", "barrierDamageMore", 0.15)] },
    { id: "bastion-breaker", name: "Bastion Breaker", description: "Further improves Barrier damage and Heavy Impact guard break.", costs: cost(["item.iron-bar", 8], ["item.wardens-grave-plate", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.mace-impact", "barrierDamageMore", 0.15), mechanic("weapon-mechanic.mace-impact", "heavyBlockEffectMultiplier", -0.10)] },
  ] },
  { id: "impact", name: "Impact", styleLabel: "Heavy Impact", description: "Makes the Heavy Impact cycle faster and stronger.", icon: "spark", nodes: [
    { id: "heavy-balance", name: "Heavy Balance", description: "+5% increased local Physical Damage.", costs: cost(["item.iron-bar", 2], ["item.weapon-scrap", 2]), effects: [local("physicalDamage", "increased", 0.05)] },
    { id: "driving-blow", name: "Driving Blow", description: "Heavy Impact gains +10% additional more Physical Damage.", costs: cost(["item.iron-bar", 4], ["item.bone-fragment", 3]), effects: [mechanic("weapon-mechanic.mace-impact", "heavyDamageMore", 0.10)] },
    { id: "measured-violence", name: "Measured Violence", description: "Impact readiness requires one successful normal Basic.", costs: cost(["item.iron-bar", 6], ["item.fallen-watch-insignia", 1]), effects: [mechanic("weapon-mechanic.mace-impact", "requiredHits", -1)] },
    { id: "cataclysm", name: "Cataclysm", description: "Heavy Impact gains Critical Strike Chance and additional damage.", costs: cost(["item.iron-bar", 8], ["item.crusher-pincer", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.mace-impact", "heavyDamageMore", 0.10), mechanic("weapon-mechanic.mace-impact", "heavyCritChance", 0.15)] },
  ] },
]);

const dagger = makeTree("iron-dagger", "item.iron-dagger", [
  { id: "assassin", name: "Assassin", styleLabel: "Critical", description: "Rewards exposed targets and finishing strikes.", icon: "dagger", nodes: [
    { id: "needle-edge", name: "Needle Edge", description: "+2 percentage points Critical Strike Chance.", costs: cost(["item.iron-bar", 2], ["item.wolf-fang", 3]), effects: [stat("criticalStrikeChance", 0.02)] },
    { id: "killer-point", name: "Killer Point", description: "+10 percentage points Critical Strike Multiplier.", costs: cost(["item.iron-bar", 4], ["item.bone-fragment", 3]), effects: [stat("criticalStrikeMultiplier", 0.10)] },
    { id: "exposed-target", name: "Exposed Target", description: "+8% more Dagger Basic damage against harmful effects.", costs: cost(["item.iron-bar", 6], ["item.alpha-fang", 1]), effects: [mechanic("weapon-mechanic.dagger-opportunist", "harmfulEffectDamageMore", 0.08)] },
    { id: "coup-de-grace", name: "Coup de Grace", description: "At 25% enemy HP, gain damage and Critical Strike Chance.", costs: cost(["item.iron-bar", 8], ["item.captains-blade-fragment", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.dagger-opportunist", "lowHealthDamageMore", 0.15), mechanic("weapon-mechanic.dagger-opportunist", "lowHealthCritChance", 0.05)] },
  ] },
  { id: "flurry", name: "Flurry", styleLabel: "Many Hits", description: "Improves Combo conversion into Flurry.", icon: "wind", nodes: [
    { id: "quick-grip", name: "Quick Grip", description: "+4% increased local Attack Speed.", costs: cost(["item.iron-bar", 2], ["item.leather-straps", 2]), effects: [local("attackSpeed", "increased", 0.04)] },
    { id: "flowing-cuts", name: "Flowing Cuts", description: "Flurry threshold decreases to 4 Combo.", costs: cost(["item.iron-bar", 4], ["item.wolf-bone", 3]), effects: [mechanic("weapon-mechanic.dagger-flurry", "threshold", -1)] },
    { id: "twin-fangs", name: "Twin Fangs", description: "Flurry hit damage increases to 72%.", costs: cost(["item.iron-bar", 6], ["item.fallen-watch-insignia", 1]), effects: [mechanic("weapon-mechanic.dagger-flurry", "hitDamageMultiplier", 0.07)] },
    { id: "blade-storm", name: "Blade Storm", description: "Flurry becomes three 60% hits.", costs: cost(["item.iron-bar", 8], ["item.alpha-fang", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.dagger-flurry", "hitCount", 1), mechanic("weapon-mechanic.dagger-flurry", "hitDamageMultiplier", -0.12)] },
  ] },
  { id: "opportunist", name: "Opportunist", styleLabel: "Evasion", description: "Turns successful Evades into short attack windows.", icon: "footprints", nodes: [
    { id: "nimble-foot", name: "Nimble Foot", description: "+3 Evasion Rating.", costs: cost(["item.iron-bar", 2], ["item.leather-straps", 2]), effects: [stat("evasionRating", 3)] },
    { id: "opening-window", name: "Opening Window", description: "Opportunist lasts 6 seconds.", costs: cost(["item.iron-bar", 4], ["item.frayed-cloth", 3]), effects: [mechanic("weapon-mechanic.dagger-opportunist", "durationSeconds", 2)] },
    { id: "backstab", name: "Backstab", description: "Opportunist gains +20% more Physical Damage.", costs: cost(["item.iron-bar", 6], ["item.fallen-watch-insignia", 1]), effects: [mechanic("weapon-mechanic.dagger-opportunist", "damageMore", 0.10)] },
    { id: "perfect-opening", name: "Perfect Opening", description: "Opportunist gains +25 percentage points Critical Strike Chance and grants Combo.", costs: cost(["item.iron-bar", 8], ["item.alpha-fang", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.dagger-opportunist", "critChanceFlat", 0.15), mechanic("weapon-mechanic.dagger-opportunist", "additionalCombo", 1)] },
  ] },
]);

const greatsword = makeTree("iron-greatsword", "item.iron-greatsword", [
  { id: "great-blade", name: "Great Blade", styleLabel: "Power", description: "Maximizes reliable great blade damage.", icon: "greatsword", nodes: [
    { id: "reinforced-edge", name: "Reinforced Edge", description: "+6% increased local Physical Damage.", costs: cost(["item.iron-bar", 2], ["item.weapon-scrap", 2]), effects: [local("physicalDamage", "increased", 0.06)] },
    { id: "broad-blade", name: "Broad Blade", description: "+8% increased local Physical Damage.", costs: cost(["item.iron-bar", 4], ["item.rough-metal-fragment", 4]), effects: [local("physicalDamage", "increased", 0.08)] },
    { id: "heavy-critical", name: "Heavy Critical", description: "+12 percentage points Critical Strike Multiplier.", costs: cost(["item.iron-bar", 6], ["item.alpha-fang", 1]), effects: [stat("criticalStrikeMultiplier", 0.12)] },
    { id: "master-great-blade", name: "Master Great Blade", description: "+12% local Physical Damage and +10 percentage points Critical Strike Multiplier.", costs: cost(["item.iron-bar", 8], ["item.captains-blade-fragment", 1], ["item.black-stone", 1]), effects: [local("physicalDamage", "increased", 0.12), stat("criticalStrikeMultiplier", 0.10)] },
  ] },
  { id: "technique", name: "Technique", styleLabel: "Perfect Swing", description: "Improves the Perfect Swing payoff.", icon: "target", nodes: [
    { id: "clean-form", name: "Clean Form", description: "Perfect Swing gains +5 Accuracy.", costs: cost(["item.iron-bar", 2], ["item.wolf-bone", 3]), effects: [mechanic("weapon-mechanic.greatsword-heavy-rhythm", "perfectSwingAccuracy", 5)] },
    { id: "focused-swing", name: "Focused Swing", description: "Perfect Swing gains +10% more Physical Damage.", costs: cost(["item.iron-bar", 4], ["item.weapon-scrap", 3]), effects: [mechanic("weapon-mechanic.greatsword-heavy-rhythm", "perfectSwingDamageMore", 0.10)] },
    { id: "exact-timing", name: "Exact Timing", description: "Perfect Swing gains +10 percentage points Critical Strike Chance.", costs: cost(["item.iron-bar", 6], ["item.fallen-watch-insignia", 1]), effects: [mechanic("weapon-mechanic.greatsword-heavy-rhythm", "perfectSwingCritChance", 0.10)] },
    { id: "master-technique", name: "Master Technique", description: "A successful Perfect Swing starts the next cycle at 2 Rhythm.", costs: cost(["item.iron-bar", 8], ["item.alpha-fang", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.greatsword-heavy-rhythm", "perfectSwingNextStacks", 1)] },
  ] },
  { id: "tempo", name: "Tempo", styleLabel: "Rhythm", description: "Shortens and accelerates the Heavy Rhythm cycle.", icon: "wind", nodes: [
    { id: "balanced-pommel", name: "Balanced Pommel", description: "+3% increased local Attack Speed.", costs: cost(["item.iron-bar", 2], ["item.leather-straps", 2]), effects: [local("attackSpeed", "increased", 0.03)] },
    { id: "flowing-guard", name: "Flowing Guard", description: "+3 Accuracy Rating and +2% local Attack Speed.", costs: cost(["item.iron-bar", 4], ["item.wolf-fang", 3]), effects: [stat("accuracyRating", 3), local("attackSpeed", "increased", 0.02)] },
    { id: "shortened-rhythm", name: "Shortened Rhythm", description: "Perfect Swing threshold decreases by 1 Rhythm.", costs: cost(["item.iron-bar", 6], ["item.fallen-watch-insignia", 1]), effects: [mechanic("weapon-mechanic.greatsword-heavy-rhythm", "perfectSwingThreshold", -1)] },
    { id: "relentless-form", name: "Relentless Form", description: "Successful Perfect Swing adds another Rhythm to the next cycle and grants speed.", costs: cost(["item.iron-bar", 8], ["item.captains-blade-fragment", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.greatsword-heavy-rhythm", "perfectSwingNextStacks", 1), local("attackSpeed", "increased", 0.03)] },
  ] },
]);

const greatAxe = makeTree("iron-great-axe", "item.iron-great-axe", [
  { id: "executioner", name: "Executioner", styleLabel: "Execution", description: "Extends and intensifies finishing pressure.", icon: "great-axe", nodes: [
    { id: "keen-execution", name: "Keen Execution", description: "Mid Execution damage increases by 5 percentage points.", costs: cost(["item.iron-bar", 2], ["item.bone-fragment", 3]), effects: [mechanic("weapon-mechanic.great-axe-execution", "midDamageMore", 0.05)] },
    { id: "deep-finish", name: "Deep Finish", description: "High Execution threshold increases to 35% target HP.", costs: cost(["item.iron-bar", 4], ["item.gravebound-bone", 3]), effects: [mechanic("weapon-mechanic.great-axe-execution", "highThreshold", 0.10)] },
    { id: "headsmans-certainty", name: "Headsman's Certainty", description: "+5 percentage points Critical Strike Chance inside high Execution.", costs: cost(["item.iron-bar", 6], ["item.wardens-grave-plate", 1]), effects: [mechanic("weapon-mechanic.great-axe-execution", "highCritChance", 0.05)] },
    { id: "final-sentence", name: "Final Sentence", description: "High Execution damage increases by 15 percentage points.", costs: cost(["item.iron-bar", 8], ["item.captains-blade-fragment", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.great-axe-execution", "highDamageMore", 0.15)] },
  ] },
  { id: "bloodlust", name: "Bloodlust", styleLabel: "Frenzy", description: "Turns critical hits into speed and damage.", icon: "flame", nodes: [
    { id: "blooded-grip", name: "Blooded Grip", description: "+2 percentage points Critical Strike Chance.", costs: cost(["item.iron-bar", 2], ["item.wolf-fang", 3]), effects: [stat("criticalStrikeChance", 0.02)] },
    { id: "frenzy", name: "Frenzy", description: "Bloodlust Attack Speed increases to 15%.", costs: cost(["item.iron-bar", 4], ["item.leather-straps", 3]), effects: [mechanic("weapon-mechanic.great-axe-bloodlust", "attackSpeedBonus", 0.05)] },
    { id: "lingering-rage", name: "Lingering Rage", description: "Bloodlust duration increases by 2 seconds.", costs: cost(["item.iron-bar", 6], ["item.alpha-fang", 1]), effects: [mechanic("weapon-mechanic.great-axe-bloodlust", "durationSeconds", 2)] },
    { id: "chain-slaughter", name: "Chain Slaughter", description: "Bloodlust grants +10% more Physical Damage.", costs: cost(["item.iron-bar", 8], ["item.alpha-fang", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.great-axe-bloodlust", "damageMore", 0.10)] },
  ] },
  { id: "brutality", name: "Brutality", styleLabel: "Risk / Reward", description: "Adds raw damage at the cost of Accuracy.", icon: "skull", nodes: [
    { id: "heavy-haft", name: "Heavy Haft", description: "+8% increased local Physical Damage.", costs: cost(["item.iron-bar", 2], ["item.rough-metal-fragment", 3]), effects: [local("physicalDamage", "increased", 0.08)] },
    { id: "reckless-edge", name: "Reckless Edge", description: "+10% local Physical Damage and -3 Accuracy Rating.", costs: cost(["item.iron-bar", 4], ["item.weapon-scrap", 3]), effects: [local("physicalDamage", "increased", 0.10), stat("accuracyRating", -3)] },
    { id: "savage-swing", name: "Savage Swing", description: "+12 percentage points Critical Strike Multiplier and -2 Accuracy Rating.", costs: cost(["item.iron-bar", 6], ["item.crusher-pincer", 1]), effects: [stat("criticalStrikeMultiplier", 0.12), stat("accuracyRating", -2)] },
    { id: "no-restraint", name: "No Restraint", description: "+12% local Physical Damage, +15 percentage points Critical Strike Multiplier, -5 Accuracy Rating.", costs: cost(["item.iron-bar", 8], ["item.wardens-grave-plate", 1], ["item.black-stone", 1]), effects: [local("physicalDamage", "increased", 0.12), stat("criticalStrikeMultiplier", 0.15), stat("accuracyRating", -5)] },
  ] },
]);

const warhammer = makeTree("iron-warhammer", "item.iron-warhammer", [
  { id: "shatter", name: "Shatter", styleLabel: "Armor", description: "Deepens Shatter penetration and Charged Impact.", icon: "warhammer", nodes: [
    { id: "dense-head", name: "Dense Head", description: "+5% increased local Physical Damage.", costs: cost(["item.iron-bar", 2], ["item.rough-metal-fragment", 3]), effects: [local("physicalDamage", "increased", 0.05)] },
    { id: "cracking-blow", name: "Cracking Blow", description: "Shatter penetration per stack increases by 2 percentage points.", costs: cost(["item.iron-bar", 4], ["item.gravebound-bone", 3]), effects: [mechanic("weapon-mechanic.warhammer-shatter", "armorPenetrationPerStack", 0.02)] },
    { id: "deep-fracture", name: "Deep Fracture", description: "Base Warhammer armor penetration increases by 5 percentage points.", costs: cost(["item.iron-bar", 6], ["item.ironback-core", 1]), effects: [mechanic("weapon-mechanic.warhammer-shatter", "baseArmorPenetrationPercent", 0.05)] },
    { id: "pulverize", name: "Pulverize", description: "Charged Impact gains penetration and starts Shatter at 2 stacks.", costs: cost(["item.iron-bar", 8], ["item.crusher-pincer", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.warhammer-charged-impact", "armorPenetrationPercent", 0.15), mechanic("weapon-mechanic.warhammer-charged-impact", "nextStacks", 1)] },
  ] },
  { id: "siege", name: "Siege", styleLabel: "Barrier Break", description: "Breaks Guards and active Barriers.", icon: "shield", nodes: [
    { id: "breach", name: "Breach", description: "Warhammer target Block Effect multiplier becomes 0.70.", costs: cost(["item.iron-bar", 2], ["item.metal-scraps", 3]), effects: [mechanic("weapon-mechanic.warhammer-charged-impact", "baseBlockEffectMultiplier", -0.10)] },
    { id: "barrier-breaker", name: "Barrier Breaker", description: "+15% more Warhammer Basic damage against an active Barrier.", costs: cost(["item.iron-bar", 4], ["item.mineralized-shell-plate", 2]), effects: [mechanic("weapon-mechanic.warhammer-charged-impact", "barrierDamageMore", 0.15)] },
    { id: "structural-weakness", name: "Structural Weakness", description: "Charged Impact gains +20% more damage against an active Barrier.", costs: cost(["item.iron-bar", 6], ["item.hollow-bell-core", 1]), effects: [mechanic("weapon-mechanic.warhammer-charged-impact", "barrierChargedDamageMore", 0.20)] },
    { id: "siege-master", name: "Siege Master", description: "Charged Impact breaks Guards harder and gains Barrier damage.", costs: cost(["item.iron-bar", 8], ["item.black-bell-fragment", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.warhammer-charged-impact", "blockEffectMultiplier", -0.20), mechanic("weapon-mechanic.warhammer-charged-impact", "barrierDamageMore", 0.15)] },
  ] },
  { id: "colossus", name: "Colossus", styleLabel: "Impact", description: "Maximizes single-hit force at a small Accuracy cost.", icon: "skull", nodes: [
    { id: "massive-head", name: "Massive Head", description: "+8% increased local Physical Damage.", costs: cost(["item.iron-bar", 2], ["item.weapon-scrap", 3]), effects: [local("physicalDamage", "increased", 0.08)] },
    { id: "unstoppable-force", name: "Unstoppable Force", description: "+10% local Physical Damage and -3 Accuracy Rating.", costs: cost(["item.iron-bar", 4], ["item.rough-metal-fragment", 4]), effects: [local("physicalDamage", "increased", 0.10), stat("accuracyRating", -3)] },
    { id: "monumental-impact", name: "Monumental Impact", description: "Charged Impact gains +15% additional more Physical Damage.", costs: cost(["item.iron-bar", 6], ["item.crusher-pincer", 1]), effects: [mechanic("weapon-mechanic.warhammer-charged-impact", "damageMore", 0.15)] },
    { id: "worldbreaker", name: "Worldbreaker", description: "+10% local Physical Damage and +20% Charged Impact damage.", costs: cost(["item.iron-bar", 8], ["item.wardens-grave-plate", 1], ["item.black-stone", 1]), effects: [local("physicalDamage", "increased", 0.10), mechanic("weapon-mechanic.warhammer-charged-impact", "damageMore", 0.20)] },
  ] },
]);

const spear = makeTree("iron-spear", "item.iron-spear", [
  { id: "hunter", name: "Hunter", styleLabel: "Mark", description: "Improves Mark accuracy and quarry damage.", icon: "spear", nodes: [
    { id: "trued-point", name: "Trued Point", description: "+3 Accuracy Rating.", costs: cost(["item.iron-bar", 2], ["item.wolf-fang", 3]), effects: [stat("accuracyRating", 3)] },
    { id: "deep-mark", name: "Deep Mark", description: "Mark maximum stacks increase by 1.", costs: cost(["item.iron-bar", 4], ["item.wolf-bone", 3]), effects: [mechanic("weapon-mechanic.spear-mark", "maxStacks", 1)] },
    { id: "hunters-focus", name: "Hunter's Focus", description: "Accuracy per Mark increases by 1.", costs: cost(["item.iron-bar", 6], ["item.fallen-watch-insignia", 1]), effects: [mechanic("weapon-mechanic.spear-mark", "accuracyPerStack", 1)] },
    { id: "quarry-master", name: "Quarry Master", description: "At maximum Mark, gain +10% more Spear Basic damage.", costs: cost(["item.iron-bar", 8], ["item.alpha-fang", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.spear-mark", "maxStackDamageBonus", 0.10)] },
  ] },
  { id: "piercer", name: "Piercer", styleLabel: "Penetration", description: "Turns Mark into reliable armor penetration.", icon: "target", nodes: [
    { id: "hardened-tip", name: "Hardened Tip", description: "Base Spear armor penetration increases by 5 percentage points.", costs: cost(["item.iron-bar", 2], ["item.rough-metal-fragment", 3]), effects: [mechanic("weapon-mechanic.spear-mark", "baseArmorPenetrationPercent", 0.05)] },
    { id: "piercing-line", name: "Piercing Line", description: "Armor penetration per Mark increases by 2 percentage points.", costs: cost(["item.iron-bar", 4], ["item.gravebound-bone", 3]), effects: [mechanic("weapon-mechanic.spear-mark", "armorPenetrationPerStack", 0.02)] },
    { id: "armour-gap", name: "Armour Gap", description: "Counter-Thrust gains +10 percentage points armor penetration.", costs: cost(["item.iron-bar", 6], ["item.ironback-core", 1]), effects: [mechanic("weapon-mechanic.spear-counter-thrust", "armorPenetrationPercent", 0.10)] },
    { id: "impaler", name: "Impaler", description: "Adds armor penetration and maximum-Mark Critical Strike Chance.", costs: cost(["item.iron-bar", 8], ["item.crusher-pincer", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.spear-mark", "baseArmorPenetrationPercent", 0.10), mechanic("weapon-mechanic.spear-mark", "maxStackCritChance", 0.05)] },
  ] },
  { id: "counter-thrust", name: "Counter-Thrust", styleLabel: "Response", description: "Makes Evade windows stronger and more frequent.", icon: "footprints", nodes: [
    { id: "ready-stance", name: "Ready Stance", description: "Counter-Thrust timer advance increases by 10 percentage points.", costs: cost(["item.iron-bar", 2], ["item.leather-straps", 2]), effects: [mechanic("weapon-mechanic.spear-counter-thrust", "timerAdvanceFraction", 0.10)] },
    { id: "answering-point", name: "Answering Point", description: "Counter-Thrust gains +20% more Physical Damage.", costs: cost(["item.iron-bar", 4], ["item.weapon-scrap", 3]), effects: [mechanic("weapon-mechanic.spear-counter-thrust", "damageMore", 0.10)] },
    { id: "punishing-reach", name: "Punishing Reach", description: "Counter-Thrust gains +20 percentage points Critical Strike Chance.", costs: cost(["item.iron-bar", 6], ["item.fallen-watch-insignia", 1]), effects: [mechanic("weapon-mechanic.spear-counter-thrust", "critChanceFlat", 0.10)] },
    { id: "master-counter", name: "Master Counter", description: "Successful Counter-Thrust grants an additional Mark and Precision Chain.", costs: cost(["item.iron-bar", 8], ["item.captains-blade-fragment", 1], ["item.black-stone", 1]), effects: [mechanic("weapon-mechanic.spear-counter-thrust", "additionalMark", 1), mechanic("weapon-mechanic.spear-counter-thrust", "additionalPrecisionChain", 1)] },
  ] },
]);

export const ironMeleeUpgradeTrees = [axe, mace, dagger, greatsword, greatAxe, warhammer, spear];
export const ironMeleeTreeDefinitions = deepFreeze<ItemUpgradeTreeDefinition[]>(ironMeleeUpgradeTrees.map((entry) => entry.tree));
export const ironMeleeBranches = deepFreeze<ItemUpgradeBranchDefinition[]>(ironMeleeUpgradeTrees.flatMap((entry) => entry.branches));
export const ironMeleeNodes = deepFreeze<ItemUpgradeNodeDefinition[]>(ironMeleeUpgradeTrees.flatMap((entry) => entry.nodes));
