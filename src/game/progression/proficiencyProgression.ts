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

export function getProficiencyProgress(progression: ProgressionState, proficiencyId: CombatProficiencyId) {
  return progression.proficiencies[proficiencyId]
}

export function getProficiencyLevel(progression: ProgressionState, proficiencyId: CombatProficiencyId) {
  const progress = getProficiencyProgress(progression, proficiencyId)
  return progress ? proficiencyLevelForXp(progress.totalXp) : 0
}

export function getProficiencyXpToNextLevel(progression: ProgressionState, proficiencyId: CombatProficiencyId) {
  const progress = getProficiencyProgress(progression, proficiencyId)
  if (!progress) return proficiencyXpForLevel(1)
  const level = proficiencyLevelForXp(progress.totalXp)
  return level >= MAX_PROFICIENCY_LEVEL ? 0 : Math.max(0, proficiencyXpForLevel(level + 1) - progress.totalXp)
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
