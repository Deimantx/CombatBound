import type { CombatSkillId, ProgressionState } from './progressionTypes'

export const MAX_SKILL_LEVEL = 100 // [TUNING] Prototype value.

export function xpForLevel(level: number) { return Math.floor(100 * Math.pow(Math.max(0, level - 1), 1.65)) }

export function levelForXp(totalXp: number) {
  let level = 1
  while (level < MAX_SKILL_LEVEL && xpForLevel(level + 1) <= totalXp) level += 1
  return level
}

export function addSkillXp(progression: ProgressionState, skillId: CombatSkillId, amount: number) {
  const current = progression.skills[skillId]
  const totalXp = current.totalXp + amount
  const next: ProgressionState = { ...progression, skills: { ...progression.skills, [skillId]: { ...current, totalXp, level: levelForXp(totalXp) } } }
  next.hunterRank = calculateHunterRank(next)
  return { progression: next, leveledUp: next.skills[skillId].level > current.level }
}

export function calculateTotalCombatLevel(progression: ProgressionState) { return Object.values(progression.skills).reduce((sum, skill) => sum + skill.level, 0) }
export function calculateHunterRank(progression: ProgressionState) { return Math.max(1, 1 + Math.floor((calculateTotalCombatLevel(progression) - 4) / 10)) }

export function createInitialProgression(): ProgressionState {
  return { skills: { swordsmanship: { id: 'swordsmanship', level: 1, totalXp: 0 }, defense: { id: 'defense', level: 1, totalXp: 0 }, stances: { id: 'stances', level: 1, totalXp: 0 }, magic: { id: 'magic', level: 1, totalXp: 0 } }, trainingFocus: 'swordsmanship', hunterRank: 1 }
}
