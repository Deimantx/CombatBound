import { getLevelProgress, levelForXp, xpForLevel } from "../progression/levelCurve"
import type { ProfessionSkillId, ProfessionSkillProgress, ProfessionState } from "./professionTypes"
import { getProfessionPerkDefinitions, professionPerkDefinitionsBySkill, type ProfessionPerkRegistry } from "./professionPerkRegistry"

export const MAX_PROFESSION_LEVEL = 100

export function createInitialProfessionState(): ProfessionState {
  return {
    skills: { mining: { skillId: "mining", totalXp: 0, bonusSkillPoints: 0, purchasedPerks: {} } },
    resourceMasteries: { "mastery.iron-vein": { masteryId: "mastery.iron-vein", totalXp: 0 } },
  }
}

export function normalizeProfessionState(value: unknown, registry?: ProfessionPerkRegistry): ProfessionState {
  const raw = value && typeof value === "object" ? value as Partial<ProfessionState> : {}
  const definitionsBySkill = registry ?? professionPerkDefinitionsBySkill
  const rawSkills = raw.skills && typeof raw.skills === "object" ? raw.skills : {}
  const skills: Partial<Record<ProfessionSkillId, ProfessionSkillProgress>> = {}
  for (const [rawSkillId, rawProgress] of Object.entries(rawSkills)) {
    if (rawSkillId !== "mining" && rawSkillId !== "blacksmithing") continue
    const skillId = rawSkillId as ProfessionSkillId
    if (!rawProgress || typeof rawProgress !== "object") continue
    const progress = rawProgress as Partial<ProfessionSkillProgress>
    skills[skillId] = {
      skillId,
      totalXp: finiteNonNegative(progress.totalXp),
      bonusSkillPoints: finiteNonNegative(progress.bonusSkillPoints),
      purchasedPerks: normalizeRanks(progress.purchasedPerks, getProfessionPerkDefinitions(skillId, definitionsBySkill)),
    }
  }
  for (const rawSkillId of Object.keys(definitionsBySkill)) {
    if (rawSkillId !== "mining" && rawSkillId !== "blacksmithing") continue
    const skillId = rawSkillId as ProfessionSkillId
    if (!skills[skillId]) skills[skillId] = { skillId, totalXp: 0, bonusSkillPoints: 0, purchasedPerks: {} }
  }
  const rawMastery = raw.resourceMasteries?.["mastery.iron-vein"]
  return {
    skills,
    resourceMasteries: { "mastery.iron-vein": { masteryId: "mastery.iron-vein", totalXp: finiteNonNegative(rawMastery?.totalXp) } },
  }
}

function finiteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0
}

function normalizeRanks(value: unknown, definitions: Record<string, { maxRank: number }>) {
  const ranks: Record<string, number> = {}
  if (!value || typeof value !== "object" || Array.isArray(value)) return ranks
  for (const [id, rank] of Object.entries(value)) {
    const maxRank = definitions[id]?.maxRank ?? 0
    if (maxRank <= 0 || typeof rank !== "number" || !Number.isFinite(rank)) continue
    const safeRank = Math.max(0, Math.min(maxRank, Math.floor(rank)))
    if (safeRank > 0) ranks[id] = safeRank
  }
  return ranks
}

export function getProfessionSkillProgress(state: ProfessionState, skillId: ProfessionSkillId) {
  return state.skills[skillId]
}

export function getProfessionLevel(state: ProfessionState, skillId: ProfessionSkillId) {
  const progress = state.skills[skillId]
  return progress ? Math.max(1, levelForXp(progress.totalXp, MAX_PROFESSION_LEVEL)) : 0
}

export function getProfessionLevelProgress(state: ProfessionState, skillId: ProfessionSkillId) {
  const progress = state.skills[skillId]
  if (!progress) return { ...getLevelProgress(0, MAX_PROFESSION_LEVEL), level: 0 }
  const result = getLevelProgress(progress.totalXp, MAX_PROFESSION_LEVEL)
  return { ...result, level: Math.max(1, result.level) }
}

export function professionXpForLevel(level: number) { return xpForLevel(level, MAX_PROFESSION_LEVEL) }
export function professionLevelForXp(totalXp: number) { return levelForXp(totalXp, MAX_PROFESSION_LEVEL) }

export function professionPointsFromLevels(state: ProfessionState, skillId: ProfessionSkillId) {
  return Math.max(0, getProfessionLevel(state, skillId) - 1)
}

export function professionPointsSpent(state: ProfessionState, skillId: ProfessionSkillId, registry?: ProfessionPerkRegistry) {
  const progress = state.skills[skillId]
  if (!progress) return 0
  const definitions = getProfessionPerkDefinitions(skillId, registry)
  return Object.entries(progress.purchasedPerks).reduce((sum, [perkId, rank]) => sum + (definitions[perkId]?.costPerRank ?? 0) * rank, 0)
}

export function professionAvailablePoints(state: ProfessionState, skillId: ProfessionSkillId, registry?: ProfessionPerkRegistry) {
  const progress = state.skills[skillId]
  if (!progress) return 0
  return Math.max(0, professionPointsFromLevels(state, skillId) + progress.bonusSkillPoints - professionPointsSpent(state, skillId, registry))
}

export function awardProfessionXp(state: ProfessionState, skillId: ProfessionSkillId, amount: number) {
  const current = state.skills[skillId] ?? { skillId, totalXp: 0, bonusSkillPoints: 0, purchasedPerks: {} }
  const oldLevel = getProfessionLevel(state, skillId)
  const totalXp = current.totalXp + finiteNonNegative(amount)
  const next = { ...state, skills: { ...state.skills, [skillId]: { ...current, totalXp } } }
  const newLevel = getProfessionLevel(next, skillId)
  return { state: next, oldLevel, newLevel, levelsGained: Math.max(0, newLevel - oldLevel), xpGained: totalXp - current.totalXp }
}

export function setProfessionLevel(state: ProfessionState, skillId: ProfessionSkillId, level: number) {
  const current = state.skills[skillId] ?? { skillId, totalXp: 0, bonusSkillPoints: 0, purchasedPerks: {} }
  return { ...state, skills: { ...state.skills, [skillId]: { ...current, totalXp: professionXpForLevel(Math.max(1, Math.min(MAX_PROFESSION_LEVEL, Math.floor(level)))) } } }
}

export function setProfessionXp(state: ProfessionState, skillId: ProfessionSkillId, totalXp: number) {
  const current = state.skills[skillId] ?? { skillId, totalXp: 0, bonusSkillPoints: 0, purchasedPerks: {} }
  return { ...state, skills: { ...state.skills, [skillId]: { ...current, totalXp: finiteNonNegative(totalXp) } } }
}

export function addProfessionBonusSkillPoint(state: ProfessionState, skillId: ProfessionSkillId) {
  const current = state.skills[skillId] ?? { skillId, totalXp: 0, bonusSkillPoints: 0, purchasedPerks: {} }
  return { ...state, skills: { ...state.skills, [skillId]: { ...current, bonusSkillPoints: current.bonusSkillPoints + 1 } } }
}
