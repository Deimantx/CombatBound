import { itemById } from "../../data/items"
import { getProfessionPerkDefinitions } from "../professionPerkRegistry"
import type { ProfessionState } from "../professionTypes"
import type { ProfessionModifierEffect } from "../professionPerkTypes"
import type { BlacksmithingRecipeTag, BlacksmithingModifier } from "./blacksmithingTypes"
import { BASE_FORGE_REST_DURATION_SECONDS, BASE_MAX_FORGE_STAMINA } from "./blacksmithingData"

export interface BlacksmithingStatsInput {
  professions: ProfessionState
  operationTags?: BlacksmithingRecipeTag[]
}

export interface BlacksmithingDerivedStats {
  maxForgeStamina: number
  restDurationSeconds: number
  firstRestDurationMultiplier: number
  blacksmithingXpMultiplier: number
  allOperationSpeedIncreased: number
  smeltingSpeedIncreased: number
  smithingSpeedIncreased: number
  weaponSmithingSpeedIncreased: number
  defensiveSmithingSpeedIncreased: number
  toolSmithingSpeedIncreased: number
  forgeStaminaCostReduced: number
  forgeStaminaCostIncreased: number
  smeltingStaminaCostReduced: number
  weaponSmithingStaminaCostReduced: number
  defensiveSmithingStaminaCostReduced: number
  toolSmithingStaminaCostReduced: number
  smeltingXpIncreased: number
  smithingXpIncreased: number
  weaponSmithingXpIncreased: number
  defensiveSmithingXpIncreased: number
  materialRecoveryChance: number
}

function safeProfessionInput(input: BlacksmithingStatsInput | { professions?: ProfessionState }): ProfessionState {
  return input.professions ?? { skills: {}, resourceMasteries: { "mastery.iron-vein": { masteryId: "mastery.iron-vein", totalXp: 0 } } }
}

function applies(effect: ProfessionModifierEffect, tags: readonly BlacksmithingRecipeTag[]) {
  if (effect.type !== "blacksmithingModifier") return false
  return !effect.recipeTags?.length || effect.recipeTags.some((tag) => tags.includes(tag))
}

export function resolveBlacksmithingModifiers(input: BlacksmithingStatsInput | { professions?: ProfessionState; operationTags?: BlacksmithingRecipeTag[] }, operationTags: BlacksmithingRecipeTag[] = input.operationTags ?? []) {
  const totals: Record<BlacksmithingModifier, number> = {
    blacksmithingXpIncreased: 0, maxForgeStaminaFlat: 0, forgeStaminaCostReduced: 0, forgeStaminaCostIncreased: 0,
    forgeRestDurationReduced: 0, firstForgeRestDurationReduced: 0, allOperationSpeedIncreased: 0,
    smeltingSpeedIncreased: 0, smithingSpeedIncreased: 0,
    weaponSmithingSpeedIncreased: 0, defensiveSmithingSpeedIncreased: 0, toolSmithingSpeedIncreased: 0,
    smeltingXpIncreased: 0, smithingXpIncreased: 0,
    weaponSmithingXpIncreased: 0, defensiveSmithingXpIncreased: 0,
    smeltingStaminaCostReduced: 0, weaponSmithingStaminaCostReduced: 0, defensiveSmithingStaminaCostReduced: 0,
    toolSmithingStaminaCostReduced: 0,
    smeltingBaseMaterialRecoveryChance: 0, weaponBaseMaterialRecoveryChance: 0,
    defensiveBaseMaterialRecoveryChance: 0, toolBaseMaterialRecoveryChance: 0, globalBaseMaterialRecoveryChance: 0,
  }
  const progress = safeProfessionInput(input).skills.blacksmithing
  if (!progress) return totals
  const definitions = getProfessionPerkDefinitions("blacksmithing")
  for (const [perkId, rank] of Object.entries(progress.purchasedPerks)) {
    const perk = definitions[perkId]
    if (!perk || rank <= 0) continue
    for (const effect of perk.effects) {
      if (!applies(effect, operationTags)) continue
      if (effect.type === "blacksmithingModifier") totals[effect.modifier] += effect.valuePerRank * rank
    }
  }
  return totals
}

export function getBlacksmithingStats(input: BlacksmithingStatsInput | { professions?: ProfessionState; operationTags?: BlacksmithingRecipeTag[] }, operationTags: BlacksmithingRecipeTag[] = input.operationTags ?? []) {
  const totals = resolveBlacksmithingModifiers(input, operationTags)
  const tags = new Set(operationTags)
  const speed = (totals.allOperationSpeedIncreased
    + (tags.has("smelting") ? totals.smeltingSpeedIncreased : 0)
    + (tags.has("weapon") ? totals.weaponSmithingSpeedIncreased : 0)
    + (tags.has("defensive") ? totals.defensiveSmithingSpeedIncreased : 0)
    + (tags.has("tool") ? totals.toolSmithingSpeedIncreased : 0)
    + (!tags.has("smelting") && tags.has("iron") ? totals.smithingSpeedIncreased : 0))
  const costReduction = totals.forgeStaminaCostReduced
    + (tags.has("smelting") ? totals.smeltingStaminaCostReduced : 0)
    + (tags.has("weapon") ? totals.weaponSmithingStaminaCostReduced : 0)
    + (tags.has("defensive") ? totals.defensiveSmithingStaminaCostReduced : 0)
    + (tags.has("tool") ? totals.toolSmithingStaminaCostReduced : 0)
  const xp = totals.blacksmithingXpIncreased
    + (tags.has("smelting") ? totals.smeltingXpIncreased : 0)
    + (tags.has("weapon") ? totals.weaponSmithingXpIncreased : 0)
    + (tags.has("defensive") ? totals.defensiveSmithingXpIncreased : 0)
  const recovery = tags.has("smelting")
    ? totals.smeltingBaseMaterialRecoveryChance
    : tags.has("weapon") ? totals.weaponBaseMaterialRecoveryChance
      : tags.has("defensive") ? totals.defensiveBaseMaterialRecoveryChance
        : tags.has("tool") ? totals.toolBaseMaterialRecoveryChance : 0
  return {
    ...totals,
    maxForgeStamina: Math.max(1, BASE_MAX_FORGE_STAMINA + totals.maxForgeStaminaFlat),
    restDurationSeconds: Math.max(0.1, BASE_FORGE_REST_DURATION_SECONDS * Math.max(0.1, 1 - totals.forgeRestDurationReduced)),
    firstRestDurationMultiplier: Math.max(0.1, 1 - totals.firstForgeRestDurationReduced),
    blacksmithingXpMultiplier: Math.max(0, 1 + xp),
    allOperationSpeedIncreased: speed,
    forgeStaminaCostReduced: costReduction,
    materialRecoveryChance: Math.max(0, Math.min(0.75, recovery + totals.globalBaseMaterialRecoveryChance)),
  }
}

export function operationTagsForItem(itemDefinitionId: string): BlacksmithingRecipeTag[] {
  const definition = itemById[itemDefinitionId]
  const tags: BlacksmithingRecipeTag[] = ["iron"]
  if (definition?.professionToolKind) tags.push("tool")
  else if (definition?.category === "weapon") tags.push("weapon")
  else if (definition?.equipmentSlotKind) {
    tags.push("defensive")
    if (definition.equipmentSlotKind === "offhand") tags.push("shield")
  }
  return tags
}

export function effectiveBlacksmithingDuration(baseDurationSeconds: number, stats: BlacksmithingDerivedStats) {
  return Math.max(0.25, baseDurationSeconds / (1 + stats.allOperationSpeedIncreased))
}

export function effectiveForgeStaminaCost(baseCost: number, stats: BlacksmithingDerivedStats) {
  return Math.max(1, baseCost * (1 + stats.forgeStaminaCostIncreased - stats.forgeStaminaCostReduced))
}

export function effectiveBlacksmithingXp(baseXp: number, stats: BlacksmithingDerivedStats) {
  return Math.max(0, baseXp * stats.blacksmithingXpMultiplier)
}
