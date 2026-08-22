import type { ProfessionSkillId } from "./professionTypes"
import type { BlacksmithingModifier, BlacksmithingRecipeTag } from "./blacksmithing/blacksmithingTypes"

export type ProfessionPerkType = "small" | "notable" | "keystone" | "major"
export type MiningModifier =
  | "miningDamageIncreased" | "swingSpeedIncreased" | "maxMiningStaminaFlat" | "staminaCostIncreased" | "staminaCostReduced"
  | "restDurationReduced" | "oreYieldIncreased" | "skillXpIncreased" | "masteryXpIncreased" | "byproductFindIncreased"
  | "roughGemFindIncreased" | "blackStoneFindIncreased" | "stageMiningDamageIncreased" | "stageOreYieldIncreased"
  | "stageByproductFindIncreased" | "stageBreakStaminaRestoreFlat" | "firstRestDurationReduced"

export interface MiningModifierEffect {
  type: "miningModifier"
  modifier: MiningModifier
  valuePerRank: number
  stageIds?: string[]
  resourceIds?: string[]
}

export interface BlacksmithingModifierEffect {
  type: "blacksmithingModifier"
  modifier: BlacksmithingModifier
  valuePerRank: number
  recipeTags?: BlacksmithingRecipeTag[]
}

export type ProfessionModifierEffect = MiningModifierEffect | BlacksmithingModifierEffect

export interface ProfessionPerkRequirement { perkId: string; requiredRank: number }
export type ProfessionPerkPrerequisite =
  | { mode: "all"; requirements: ProfessionPerkRequirement[] }
  | { mode: "any"; requirements: ProfessionPerkRequirement[]; minimumSatisfied?: number }

export interface ProfessionPerkDefinition {
  id: string
  skillId: ProfessionSkillId
  name: string
  branch: string
  description: string
  type: ProfessionPerkType
  maxRank: number
  costPerRank: number
  requiredSkillLevel: number
  prerequisiteRules: ProfessionPerkPrerequisite[]
  effects: ProfessionModifierEffect[]
  position: { x: number; y: number }
}
