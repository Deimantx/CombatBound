import type { ProfessionState } from "./professionTypes"
import { getProfessionLevel, professionAvailablePoints } from "./professionProgression"
import type { ProfessionPerkDefinition, ProfessionPerkPrerequisite } from "./professionPerkTypes"

export type ProfessionPerkPurchaseStatus = "available" | "maxed" | "level-locked" | "prerequisite-locked" | "points-locked"

export function prerequisiteSatisfied(prerequisite: ProfessionPerkPrerequisite, ranks: Record<string, number>) {
  const satisfied = prerequisite.requirements.filter((requirement) => (ranks[requirement.perkId] ?? 0) >= requirement.requiredRank).length
  return prerequisite.mode === "all" ? satisfied === prerequisite.requirements.length : satisfied >= (prerequisite.minimumSatisfied ?? 1)
}

export function getProfessionPerkPurchaseState(state: ProfessionState, perk: ProfessionPerkDefinition, definitions: Record<string, ProfessionPerkDefinition>) {
  const progress = state.skills[perk.skillId]
  const currentRank = progress?.purchasedPerks[perk.id] ?? 0
  const availablePoints = professionAvailablePoints(state, perk.skillId)
  const missingPrerequisite = perk.prerequisiteRules.some((rule) => !prerequisiteSatisfied(rule, progress?.purchasedPerks ?? {}))
  const status: ProfessionPerkPurchaseStatus = currentRank >= perk.maxRank ? "maxed" : getProfessionLevel(state, perk.skillId) < perk.requiredSkillLevel ? "level-locked" : missingPrerequisite ? "prerequisite-locked" : availablePoints < perk.costPerRank ? "points-locked" : "available"
  return { status, currentRank, availablePoints, missingPoints: Math.max(0, perk.costPerRank - availablePoints), definitions }
}

export function purchaseProfessionPerk(state: ProfessionState, perkId: string, definitions: Record<string, ProfessionPerkDefinition> = {}) {
  const perk = definitions[perkId]
  if (!perk) return { outcome: "unknown" as const, state }
  const purchase = getProfessionPerkPurchaseState(state, perk, definitions)
  if (purchase.status !== "available") return { outcome: purchase.status, state }
  const current = state.skills[perk.skillId]
  if (!current) return { outcome: "missing-skill" as const, state }
  return { outcome: "purchased" as const, state: { ...state, skills: { ...state.skills, [perk.skillId]: { ...current, purchasedPerks: { ...current.purchasedPerks, [perkId]: purchase.currentRank + 1 } } } } }
}

export function resetProfessionPerks(state: ProfessionState, skillId: "mining") {
  const current = state.skills[skillId]
  return current ? { ...state, skills: { ...state.skills, [skillId]: { ...current, purchasedPerks: {} } } } : state
}
