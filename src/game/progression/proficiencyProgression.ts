import { proficiencyById } from '../data/proficiencies'
import type { CombatProficiencyId, ProgressionState, ProficiencyProgress, ProficiencyXpReason, ProficiencyXpResult } from './progressionTypes'
import { MAX_PROFICIENCY_LEVEL, PROFICIENCY_XP_PER_DAMAGE } from './progressionBalance'
import { baseLevelXpForLevel, buildLevelXpThresholds, getLevelProgress, levelForXp, levelXpCostForTargetLevel, levelXpMultiplierForTargetLevel, xpForLevel } from './levelCurve'
export const baseProficiencyXpForLevel = baseLevelXpForLevel
export const proficiencyXpMultiplierForTargetLevel = levelXpMultiplierForTargetLevel
export const proficiencyXpCostForTargetLevel = levelXpCostForTargetLevel
const proficiencyXpThresholds = buildLevelXpThresholds(MAX_PROFICIENCY_LEVEL)

export function proficiencyXpForLevel(level: number) {
  const safeLevel = Math.max(0, Math.floor(level))
  return safeLevel <= MAX_PROFICIENCY_LEVEL ? proficiencyXpThresholds[Math.min(safeLevel, MAX_PROFICIENCY_LEVEL)] : xpForLevel(safeLevel, MAX_PROFICIENCY_LEVEL)
}

export function proficiencyLevelForXp(totalXp: number) {
  const safeXp = Math.max(0, Number.isFinite(totalXp) ? totalXp : 0)
  return levelForXp(safeXp, MAX_PROFICIENCY_LEVEL)
}

export type ProficiencyLevelProgress = ReturnType<typeof getLevelProgress>

/** Returns honest progress within the current proficiency level for UI surfaces. */
export function getProficiencyLevelProgress(totalXp: number, maxLevel = MAX_PROFICIENCY_LEVEL): ProficiencyLevelProgress {
  return getLevelProgress(totalXp, maxLevel)
}

export function getProficiencyProgress(progression: ProgressionState, proficiencyId: CombatProficiencyId) {
  return progression.proficiencies[proficiencyId]
}

export function getProficiencyLevel(progression: ProgressionState, proficiencyId: CombatProficiencyId) {
  const progress = getProficiencyProgress(progression, proficiencyId)
  return progress ? Math.max(1, proficiencyLevelForXp(progress.totalXp)) : 0
}

/** Canonical state-aware level selector: an owned zero-XP record is discovered at Level 1. */
export function getProficiencyLevelForState(progression: ProgressionState, proficiencyId: CombatProficiencyId) {
  return getProficiencyLevel(progression, proficiencyId)
}

export function getProficiencyLevelProgressForState(progression: ProgressionState, proficiencyId: CombatProficiencyId): ProficiencyLevelProgress {
  const progress = getProficiencyProgress(progression, proficiencyId)
  if (!progress) return getProficiencyLevelProgress(0)
  const base = getProficiencyLevelProgress(progress.totalXp)
  return { ...base, level: Math.max(1, base.level) }
}

export function getProficiencyXpToNextLevel(progression: ProgressionState, proficiencyId: CombatProficiencyId) {
  const progress = getProficiencyProgress(progression, proficiencyId)
  return getProficiencyLevelProgress(progress?.totalXp ?? 0).xpToNextLevel
}

export function createInitialProgression(): ProgressionState {
  const starter: ProficiencyProgress = { proficiencyId: 'one-handed-sword', totalXp: 0 }
  return { proficiencies: { 'one-handed-sword': starter }, hunterRankPoints: 0, bonusPerkPoints: 0, purchasedPerks: {} }
}

export function discoverProficiency(progression: ProgressionState, proficiencyId: CombatProficiencyId): ProgressionState {
  if (progression.proficiencies[proficiencyId]) return progression
  return { ...progression, proficiencies: { ...progression.proficiencies, [proficiencyId]: { proficiencyId, totalXp: 0 } } }
}

export function calculateProficiencyXpAward(reason: ProficiencyXpReason) {
  if (reason.type === 'successful-cleanse') return Math.max(0, Number.isFinite(reason.weight) ? reason.weight : 0)
  return Math.max(0, Number.isFinite(reason.amount) ? reason.amount : 0)
}

export function awardProficiencyXp(progression: ProgressionState, proficiencyId: CombatProficiencyId, amount: number): ProficiencyXpResult {
  const proficiencyXpGained = Math.max(0, Number.isFinite(amount) ? amount * PROFICIENCY_XP_PER_DAMAGE : 0)
  const current = progression.proficiencies[proficiencyId] ?? { proficiencyId, totalXp: 0 }
  const oldProficiencyLevel = proficiencyLevelForXp(current.totalXp)
  const nextTotalXp = current.totalXp + proficiencyXpGained
  const next: ProgressionState = {
    ...progression,
    proficiencies: { ...progression.proficiencies, [proficiencyId]: { proficiencyId, totalXp: nextTotalXp } },
  }
  const newProficiencyLevel = proficiencyLevelForXp(nextTotalXp)
  return {
    progression: next,
    proficiencyId,
    proficiencyXpGained,
    oldProficiencyLevel,
    newProficiencyLevel,
    levelsGained: Math.max(0, newProficiencyLevel - oldProficiencyLevel),
  }
}

export function allProficiencyDefinitions() { return Object.values(proficiencyById) }
