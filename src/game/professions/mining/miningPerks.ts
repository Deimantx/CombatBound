import type { ProfessionPerkDefinition, ProfessionPerkPrerequisite } from "../professionPerkTypes"
import type { MiningStageId } from "./miningTypes"

const stage = (...ids: MiningStageId[]) => ids
const all = (...requirements: [string, number][]): ProfessionPerkPrerequisite[] => requirements.length ? [{ mode: "all", requirements: requirements.map(([perkId, requiredRank]) => ({ perkId, requiredRank })) }] : []
const perk = (id: string, name: string, branch: string, type: ProfessionPerkDefinition["type"], maxRank: number, requiredSkillLevel: number, description: string, effects: ProfessionPerkDefinition["effects"], prerequisiteRules: ProfessionPerkPrerequisite[] = [], x = 0, y = 0): ProfessionPerkDefinition => ({ id, skillId: "mining", name, branch, type, maxRank, costPerRank: 1, requiredSkillLevel, description, effects, prerequisiteRules, position: { x, y } })
const e = (modifier: ProfessionPerkDefinition["effects"][number]["modifier"], valuePerRank: number, stageIds?: MiningStageId[]) => ({ type: "miningModifier" as const, modifier, valuePerRank, stageIds })

export const miningPerks: ProfessionPerkDefinition[] = [
  perk("mining-perk.foundation", "Miner's Foundation", "Core / Learning", "small", 1, 2, "+5 Max Mining Stamina", [e("maxMiningStaminaFlat", 5)], [], 50, 8),
  perk("mining-perk.practiced-swings", "Practiced Swings", "Core / Learning", "small", 4, 1, "+2% Mining Damage per rank", [e("miningDamageIncreased", 0.02)], all(["mining-perk.foundation", 1]), 30, 18),
  perk("mining-perk.steady-rhythm", "Steady Rhythm", "Core / Learning", "small", 4, 1, "+1.5% Swing Speed per rank", [e("swingSpeedIncreased", 0.015)], all(["mining-perk.foundation", 1]), 70, 18),
  perk("mining-perk.stone-lessons", "Stone Lessons", "Core / Learning", "small", 5, 1, "+3% Mining XP per rank", [e("skillXpIncreased", 0.03)], all(["mining-perk.foundation", 1]), 50, 26),
  perk("mining-perk.repetition", "Repetition", "Core / Learning", "small", 5, 10, "+3% Resource Mastery XP per rank", [e("masteryXpIncreased", 0.03)], all(["mining-perk.stone-lessons", 2]), 50, 36),
  perk("mining-perk.veteran-miner", "Veteran Miner", "Core / Learning", "notable", 1, 35, "+10% Mining XP and +10% Resource Mastery XP", [e("skillXpIncreased", 0.1), e("masteryXpIncreased", 0.1)], all(["mining-perk.stone-lessons", 5], ["mining-perk.repetition", 5]), 50, 48),

  perk("mining-perk.tool-familiarity", "Tool Familiarity", "Excavation", "small", 5, 1, "+3% Mining Damage per rank", [e("miningDamageIncreased", 0.03)], all(["mining-perk.practiced-swings", 2]), 18, 18),
  perk("mining-perk.quick-hands", "Quick Hands", "Excavation", "small", 5, 1, "+2% Swing Speed per rank", [e("swingSpeedIncreased", 0.02)], all(["mining-perk.steady-rhythm", 2]), 82, 18),
  perk("mining-perk.surface-breaker", "Surface Breaker", "Excavation", "small", 4, 1, "+4% Mining Damage in Outer Crust and Exposed Seam per rank", [e("stageMiningDamageIncreased", 0.04, stage("outer-crust", "exposed-seam"))], all(["mining-perk.tool-familiarity", 3]), 18, 32),
  perk("mining-perk.core-cutter", "Core Cutter", "Excavation", "small", 4, 20, "+4% Mining Damage in Dense Vein, Rich Core and Heart of Iron per rank", [e("stageMiningDamageIncreased", 0.04, stage("dense-vein", "rich-core", "heart-of-iron"))], all(["mining-perk.surface-breaker", 4]), 18, 46),
  perk("mining-perk.breakers-recovery", "Breaker's Recovery", "Excavation", "small", 4, 1, "Restore 2 Mining Stamina when a stage breaks per rank", [e("stageBreakStaminaRestoreFlat", 2)], all(["mining-perk.core-cutter", 2]), 18, 60),
  perk("mining-perk.heavy-hand", "Heavy Hand", "Excavation", "keystone", 1, 30, "+20% Mining Damage, +15% Mining Stamina Cost", [e("miningDamageIncreased", 0.2), e("staminaCostIncreased", 0.15)], all(["mining-perk.tool-familiarity", 5], ["mining-perk.core-cutter", 2]), 18, 76),
  perk("mining-perk.master-excavator", "Master Excavator", "Excavation", "notable", 1, 50, "+10% Mining Damage and +5% Swing Speed", [e("miningDamageIncreased", 0.1), e("swingSpeedIncreased", 0.05)], all(["mining-perk.quick-hands", 5], ["mining-perk.core-cutter", 4]), 82, 60),

  perk("mining-perk.deep-breath", "Deep Breath", "Endurance", "small", 5, 1, "+5 Max Mining Stamina per rank", [e("maxMiningStaminaFlat", 5)], all(["mining-perk.foundation", 1]), 50, 18),
  perk("mining-perk.efficient-motion", "Efficient Motion", "Endurance", "small", 5, 1, "-3% Mining Stamina Cost per rank", [e("staminaCostReduced", 0.03)], all(["mining-perk.deep-breath", 2]), 50, 32),
  perk("mining-perk.recovery-drill", "Recovery Drill", "Endurance", "small", 5, 1, "-4% Exhaustion Rest Duration per rank", [e("restDurationReduced", 0.04)], all(["mining-perk.efficient-motion", 3]), 50, 46),
  perk("mining-perk.stage-breather", "Stage Breather", "Endurance", "small", 4, 1, "Restore 3 Mining Stamina when a stage breaks per rank", [e("stageBreakStaminaRestoreFlat", 3)], all(["mining-perk.deep-breath", 3]), 72, 32),
  perk("mining-perk.second-wind", "Second Wind", "Endurance", "notable", 1, 30, "The first exhaustion rest in each deposit is 40% shorter", [e("firstRestDurationReduced", 0.4)], all(["mining-perk.recovery-drill", 5]), 50, 62),
  perk("mining-perk.long-haul", "Long Haul", "Endurance", "small", 4, 1, "-2% Mining Stamina Cost and -2% Rest Duration per rank", [e("staminaCostReduced", 0.02), e("restDurationReduced", 0.02)], all(["mining-perk.stage-breather", 2]), 72, 48),
  perk("mining-perk.marathon-miner", "Marathon Miner", "Endurance", "keystone", 1, 50, "-20% Mining Stamina Cost, -10% Mining Damage", [e("staminaCostReduced", 0.2), e("miningDamageIncreased", -0.1)], all(["mining-perk.efficient-motion", 5], ["mining-perk.long-haul", 4]), 72, 70),

  perk("mining-perk.clean-extraction", "Clean Extraction", "Extraction", "small", 5, 1, "+3% Ore Yield per rank", [e("oreYieldIncreased", 0.03)], all(["mining-perk.practiced-swings", 2]), 30, 18),
  perk("mining-perk.material-recovery", "Material Recovery", "Extraction", "small", 5, 1, "+2% Ore Yield per rank", [e("oreYieldIncreased", 0.02)], all(["mining-perk.clean-extraction", 3]), 30, 32),
  perk("mining-perk.seam-knowledge", "Seam Knowledge", "Extraction", "small", 4, 1, "+3% Ore Yield in Exposed Seam and Dense Vein per rank", [e("stageOreYieldIncreased", 0.03, stage("exposed-seam", "dense-vein"))], all(["mining-perk.clean-extraction", 3]), 30, 46),
  perk("mining-perk.deep-yield", "Deep Yield", "Extraction", "small", 5, 20, "+4% Ore Yield in Dense Vein, Rich Core and Heart of Iron per rank", [e("stageOreYieldIncreased", 0.04, stage("dense-vein", "rich-core", "heart-of-iron"))], all(["mining-perk.seam-knowledge", 4]), 30, 60),
  perk("mining-perk.heart-harvest", "Heart Harvest", "Extraction", "small", 4, 35, "+5% Ore Yield in Heart of Iron per rank", [e("stageOreYieldIncreased", 0.05, stage("heart-of-iron"))], all(["mining-perk.deep-yield", 3]), 30, 74),
  perk("mining-perk.rich-seam", "Rich Seam", "Extraction", "notable", 1, 50, "+20% Ore Yield in Rich Core and Heart of Iron", [e("stageOreYieldIncreased", 0.2, stage("rich-core", "heart-of-iron"))], all(["mining-perk.deep-yield", 5], ["mining-perk.heart-harvest", 4]), 30, 88),
  perk("mining-perk.careful-extraction", "Careful Extraction", "Extraction", "keystone", 1, 45, "+25% Ore Yield, -10% Swing Speed", [e("oreYieldIncreased", 0.25), e("swingSpeedIncreased", -0.1)], all(["mining-perk.clean-extraction", 5], ["mining-perk.material-recovery", 5]), 30, 102),

  perk("mining-perk.keen-eye", "Keen Eye", "Prospecting", "small", 5, 1, "+5% relative Rough Gem find chance per rank", [e("roughGemFindIncreased", 0.05)], all(["mining-perk.foundation", 1]), 70, 18),
  perk("mining-perk.mineral-signs", "Mineral Signs", "Prospecting", "small", 5, 1, "+4% relative all by-product find chance per rank", [e("byproductFindIncreased", 0.04)], all(["mining-perk.keen-eye", 3]), 70, 32),
  perk("mining-perk.gem-veins", "Gem Veins", "Prospecting", "small", 4, 1, "+8% relative Rough Gem chance in Dense Vein, Rich Core and Heart of Iron per rank", [e("stageByproductFindIncreased", 0.08, stage("dense-vein", "rich-core", "heart-of-iron"))], all(["mining-perk.keen-eye", 5]), 70, 46),
  perk("mining-perk.deep-prospecting", "Deep Prospecting", "Prospecting", "small", 5, 1, "+6% relative all by-product chance in Rich Core and Heart of Iron per rank", [e("stageByproductFindIncreased", 0.06, stage("rich-core", "heart-of-iron"))], all(["mining-perk.mineral-signs", 3], ["mining-perk.gem-veins", 2]), 70, 60),
  perk("mining-perk.black-stone-sense", "Black Stone Sense", "Prospecting", "small", 5, 40, "+5% relative Black Stone find chance per rank", [e("blackStoneFindIncreased", 0.05)], all(["mining-perk.deep-prospecting", 3]), 70, 74),
  perk("mining-perk.lucky-strike", "Lucky Strike", "Prospecting", "notable", 1, 40, "+40% relative Rough Gem find chance", [e("roughGemFindIncreased", 0.4)], all(["mining-perk.gem-veins", 4]), 70, 88),
  perk("mining-perk.dark-veins", "Dark Veins", "Prospecting", "notable", 1, 60, "+50% relative Black Stone find chance in Heart of Iron", [e("blackStoneFindIncreased", 0.5, stage("heart-of-iron"))], all(["mining-perk.black-stone-sense", 5]), 70, 102),
  perk("mining-perk.prospectors-discipline", "Prospector's Discipline", "Prospecting", "keystone", 1, 50, "+35% relative all by-product find chance, -10% Ore Yield", [e("byproductFindIncreased", 0.35), e("oreYieldIncreased", -0.1)], all(["mining-perk.mineral-signs", 5], ["mining-perk.deep-prospecting", 5]), 70, 116),

  perk("mining-perk.deep-delver", "Deep Delver", "Cross-Cluster", "notable", 1, 55, "In Rich Core and Heart of Iron: +10% Damage and +10% Ore Yield", [e("stageMiningDamageIncreased", 0.1, stage("rich-core", "heart-of-iron")), e("stageOreYieldIncreased", 0.1, stage("rich-core", "heart-of-iron"))], all(["mining-perk.core-cutter", 4], ["mining-perk.deep-yield", 5]), 84, 82),
  perk("mining-perk.efficient-prospector", "Efficient Prospector", "Cross-Cluster", "notable", 1, 55, "In Rich Core and Heart of Iron: -10% Stamina Cost and +10% relative by-product chance", [e("staminaCostReduced", 0.1, stage("rich-core", "heart-of-iron")), e("stageByproductFindIncreased", 0.1, stage("rich-core", "heart-of-iron"))], all(["mining-perk.recovery-drill", 5], ["mining-perk.deep-prospecting", 5]), 50, 130),
  perk("mining-perk.master-miner", "Master Miner", "Cross-Cluster", "major", 1, 75, "+8% Damage, +8% Ore Yield, -8% Stamina Cost, +10% relative by-product chance", [e("miningDamageIncreased", 0.08), e("oreYieldIncreased", 0.08), e("staminaCostReduced", 0.08), e("byproductFindIncreased", 0.1)], [{ mode: "any", minimumSatisfied: 3, requirements: ["mining-perk.veteran-miner", "mining-perk.master-excavator", "mining-perk.marathon-miner", "mining-perk.rich-seam", "mining-perk.prospectors-discipline"].map((perkId) => ({ perkId, requiredRank: 1 })) }], 50, 150),
]

export const miningPerkById = Object.fromEntries(miningPerks.map((perkDefinition) => [perkDefinition.id, perkDefinition])) as Record<string, ProfessionPerkDefinition>
export const MINING_PERK_TREE_COST = miningPerks.reduce((sum, perkDefinition) => sum + perkDefinition.maxRank, 0)
