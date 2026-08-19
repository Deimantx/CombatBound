import { proficiencyById } from '../data/proficiencies'
import type { CombatProficiencyId, ProgressionState, ProficiencyProgress, ProficiencyXpReason, ProficiencyXpResult } from './progressionTypes'
import { MAX_PROFICIENCY_LEVEL, PROFICIENCY_XP_PER_DAMAGE } from './progressionBalance'
export function baseProficiencyXpForLevel(level: number) {
  return Math.floor(100 * Math.pow(Math.max(0, level - 1), 1.65))
}

export function proficiencyXpMultiplierForTargetLevel(targetLevel: number) {
  return 1 + Math.floor((targetLevel - 1) / 10) * 0.1
}

export function proficiencyXpCostForTargetLevel(targetLevel: number) {
  const safeTargetLevel = Math.max(2, Math.floor(targetLevel))
  const base = baseProficiencyXpForLevel(safeTargetLevel) - baseProficiencyXpForLevel(safeTargetLevel - 1)
  return Math.round(base * proficiencyXpMultiplierForTargetLevel(safeTargetLevel))
}

function buildProficiencyXpThresholds(maxLevel: number) {
  const thresholds = [0, 0]
  for (let level = 2; level <= maxLevel; level += 1) thresholds[level] = thresholds[level - 1] + proficiencyXpCostForTargetLevel(level)
  return thresholds
}

const proficiencyXpThresholds = buildProficiencyXpThresholds(MAX_PROFICIENCY_LEVEL)

export function proficiencyXpForLevel(level: number) {
  const safeLevel = Math.max(0, Math.floor(level))
  if (safeLevel <= 1) return 0
  if (safeLevel <= MAX_PROFICIENCY_LEVEL) return proficiencyXpThresholds[safeLevel]
  return proficiencyXpThresholds[MAX_PROFICIENCY_LEVEL]
}

export function proficiencyLevelForXp(totalXp: number) {
  const safeXp = Math.max(0, Number.isFinite(totalXp) ? totalXp : 0)
  let low = 1
  let high = MAX_PROFICIENCY_LEVEL
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (proficiencyXpForLevel(middle) <= safeXp) low = middle
    else high = middle - 1
  }
  return low
}

export interface ProficiencyLevelProgress {
  level: number
  currentLevelXp: number
  nextLevelXp: number
  xpIntoLevel: number
  xpRequiredForLevel: number
  progressFraction: number
  xpToNextLevel: number
  isMaxLevel: boolean
}

/** Returns honest progress within the current proficiency level for UI surfaces. */
export function getProficiencyLevelProgress(totalXp: number, maxLevel = MAX_PROFICIENCY_LEVEL): ProficiencyLevelProgress {
  const safeXp = Math.max(0, Number.isFinite(totalXp) ? totalXp : 0)
  const cappedMaxLevel = Math.max(1, Math.floor(maxLevel))
  if (safeXp <= 0) {
    const nextLevelXp = proficiencyXpForLevel(Math.min(2, cappedMaxLevel))
    return { level: 0, currentLevelXp: 0, nextLevelXp, xpIntoLevel: 0, xpRequiredForLevel: nextLevelXp, progressFraction: 0, xpToNextLevel: nextLevelXp, isMaxLevel: false }
  }
  const level = Math.min(cappedMaxLevel, proficiencyLevelForXp(safeXp))
  const currentLevelXp = proficiencyXpForLevel(level)
  const isMaxLevel = level >= cappedMaxLevel
  const nextLevelXp = isMaxLevel ? currentLevelXp : proficiencyXpForLevel(level + 1)
  const xpRequiredForLevel = Math.max(0, nextLevelXp - currentLevelXp)
  const xpIntoLevel = Math.max(0, safeXp - currentLevelXp)
  const progressFraction = isMaxLevel ? 1 : xpRequiredForLevel > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpRequiredForLevel)) : 0
  return { level, currentLevelXp, nextLevelXp, xpIntoLevel, xpRequiredForLevel, progressFraction, xpToNextLevel: isMaxLevel ? 0 : Math.max(0, nextLevelXp - safeXp), isMaxLevel }
}

export function getProficiencyProgress(progression: ProgressionState, proficiencyId: CombatProficiencyId) {
  return progression.proficiencies[proficiencyId]
}

export function getProficiencyLevel(progression: ProgressionState, proficiencyId: CombatProficiencyId) {
  const progress = getProficiencyProgress(progression, proficiencyId)
  return progress ? getProficiencyLevelProgress(progress.totalXp).level : 0
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
