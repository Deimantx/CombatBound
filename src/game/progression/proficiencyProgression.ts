import { proficiencyById } from '../data/proficiencies'
import type { CombatProficiencyId, ProgressionState, ProficiencyProgress, ProficiencyXpReason, ProficiencyXpResult } from './progressionTypes'
import { DISRUPTION_XP_BY_DANGER, MAX_PROFICIENCY_LEVEL, PROFICIENCY_XP_PER_DAMAGE } from './progressionBalance'
import { calculateEarnedPerkPoints, masteryLevelForXp } from './masteryProgression'

export function proficiencyXpForLevel(level: number) {
  return Math.floor(100 * Math.pow(Math.max(0, level - 1), 1.65))
}

export function proficiencyLevelForXp(totalXp: number) {
  let level = 1
  while (level < MAX_PROFICIENCY_LEVEL && proficiencyXpForLevel(level + 1) <= Math.max(0, totalXp)) level += 1
  return level
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
  if (!progress) return proficiencyXpForLevel(1)
  return getProficiencyLevelProgress(progress.totalXp).xpToNextLevel
}

export function createInitialProgression(): ProgressionState {
  const starter: ProficiencyProgress = { proficiencyId: 'one-handed-sword', totalXp: 0 }
  return { proficiencies: { 'one-handed-sword': starter }, masteryXp: 0, purchasedPerks: {} }
}

export function discoverProficiency(progression: ProgressionState, proficiencyId: CombatProficiencyId): ProgressionState {
  if (progression.proficiencies[proficiencyId]) return progression
  return { ...progression, proficiencies: { ...progression.proficiencies, [proficiencyId]: { proficiencyId, totalXp: 0 } } }
}

export function calculateProficiencyXpAward(reason: ProficiencyXpReason) {
  if (reason.type === 'successful-interrupt') return DISRUPTION_XP_BY_DANGER[reason.danger]
  if (reason.type === 'successful-cleanse') return Math.max(0, Number.isFinite(reason.weight) ? reason.weight : 0)
  return Math.max(0, Number.isFinite(reason.amount) ? reason.amount : 0)
}

export function awardProficiencyXp(progression: ProgressionState, proficiencyId: CombatProficiencyId, amount: number): ProficiencyXpResult {
  const proficiencyXpGained = Math.max(0, Number.isFinite(amount) ? amount * PROFICIENCY_XP_PER_DAMAGE : 0)
  const current = progression.proficiencies[proficiencyId] ?? { proficiencyId, totalXp: 0 }
  const oldProficiencyLevel = proficiencyLevelForXp(current.totalXp)
  const oldMasteryLevel = masteryLevelForXp(progression.masteryXp)
  const oldPerkPoints = calculateEarnedPerkPoints(progression.masteryXp)
  const nextTotalXp = current.totalXp + proficiencyXpGained
  const masteryXp = progression.masteryXp + proficiencyXpGained
  const newPerkPoints = calculateEarnedPerkPoints(masteryXp)
  const next: ProgressionState = {
    ...progression,
    proficiencies: { ...progression.proficiencies, [proficiencyId]: { proficiencyId, totalXp: nextTotalXp } },
    masteryXp,
  }
  return {
    progression: next,
    proficiencyId,
    proficiencyXpGained,
    oldProficiencyLevel,
    newProficiencyLevel: proficiencyLevelForXp(nextTotalXp),
    oldMasteryLevel,
    newMasteryLevel: masteryLevelForXp(masteryXp),
    oldEarnedPerkPoints: oldPerkPoints,
    newEarnedPerkPoints: newPerkPoints,
    perkPointsEarned: newPerkPoints - oldPerkPoints,
  }
}

export function allProficiencyDefinitions() { return Object.values(proficiencyById) }
