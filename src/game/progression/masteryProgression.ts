import { MAX_MASTERY_LEVEL, PERK_POINT_BASE_XP, PERK_POINT_INCREMENT_XP } from './progressionBalance'
import type { ProgressionState, ProficiencyPerkDefinition } from './progressionTypes'

export function masteryXpForLevel(level: number) {
  return Math.floor(100 * Math.pow(Math.max(0, level - 1), 1.65))
}

export function masteryLevelForXp(totalXp: number) {
  let level = 1
  while (level < MAX_MASTERY_LEVEL && masteryXpForLevel(level + 1) <= Math.max(0, totalXp)) level += 1
  return level
}

export function masteryXpToNextLevel(progression: ProgressionState) {
  const level = masteryLevelForXp(progression.masteryXp)
  return level >= MAX_MASTERY_LEVEL ? 0 : Math.max(0, masteryXpForLevel(level + 1) - progression.masteryXp)
}

export function perkPointCost(pointNumber: number) {
  return PERK_POINT_BASE_XP + Math.max(0, pointNumber - 1) * PERK_POINT_INCREMENT_XP
}

export function totalMasteryXpForPerkPoints(pointCount: number) {
  let total = 0
  for (let point = 1; point <= Math.max(0, Math.floor(pointCount)); point += 1) total += perkPointCost(point)
  return total
}

export function calculateEarnedPerkPoints(masteryXp: number) {
  let points = 0
  while (totalMasteryXpForPerkPoints(points + 1) <= Math.max(0, masteryXp)) points += 1
  return points
}

export function calculateSpentPerkPoints(progression: ProgressionState, perkDefinitions: Record<string, ProficiencyPerkDefinition>) {
  return Object.entries(progression.purchasedPerks).reduce((total, [perkId, rank]) => total + (perkDefinitions[perkId]?.costPerRank ?? 0) * Math.max(0, rank), 0)
}

export function calculateAvailablePerkPoints(progression: ProgressionState, perkDefinitions: Record<string, ProficiencyPerkDefinition>) {
  return Math.max(0, calculateEarnedPerkPoints(progression.masteryXp) - calculateSpentPerkPoints(progression, perkDefinitions))
}
