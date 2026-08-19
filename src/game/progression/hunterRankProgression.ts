import type { ProgressionState } from './progressionTypes'

export const MIN_HUNTER_RANK = 1
export const MAX_HUNTER_RANK = 30
export const HUNTER_RANK_2_POINT_COST = 10
export const HUNTER_RANK_COST_GROWTH = 1.25

export interface HunterRankProgress {
  rank: number
  totalPoints: number
  currentRankStartPoints: number
  nextRankTotalPoints: number
  pointsIntoRank: number
  pointsRequiredForNextRank: number
  pointsToNextRank: number
  progressFraction: number
  isMaxRank: boolean
}

function safePoints(totalPoints: number) {
  return Math.max(0, Number.isFinite(totalPoints) ? totalPoints : 0)
}

export function hunterRankPointCostForRank(rank: number) {
  const targetRank = Math.max(MIN_HUNTER_RANK, Math.min(MAX_HUNTER_RANK, Number.isFinite(rank) ? Math.floor(rank) : MIN_HUNTER_RANK))
  if (targetRank <= MIN_HUNTER_RANK) return 0
  let cost = HUNTER_RANK_2_POINT_COST
  for (let currentRank = 3; currentRank <= targetRank; currentRank += 1) cost = Math.round(cost * HUNTER_RANK_COST_GROWTH)
  return cost
}

export function totalHunterRankPointsForRank(rank: number) {
  const targetRank = Math.max(MIN_HUNTER_RANK, Math.min(MAX_HUNTER_RANK, Math.floor(rank)))
  let total = 0
  for (let currentRank = 2; currentRank <= targetRank; currentRank += 1) total += hunterRankPointCostForRank(currentRank)
  return total
}

export function hunterRankForPoints(totalPoints: number) {
  const points = safePoints(totalPoints)
  let rank = MIN_HUNTER_RANK
  while (rank < MAX_HUNTER_RANK && totalHunterRankPointsForRank(rank + 1) <= points) rank += 1
  return rank
}

export function getHunterRankProgress(totalPoints: number): HunterRankProgress {
  const safeTotalPoints = safePoints(totalPoints)
  const rank = hunterRankForPoints(safeTotalPoints)
  const currentRankStartPoints = totalHunterRankPointsForRank(rank)
  const isMaxRank = rank >= MAX_HUNTER_RANK
  const nextRankTotalPoints = isMaxRank ? currentRankStartPoints : totalHunterRankPointsForRank(rank + 1)
  const pointsRequiredForNextRank = isMaxRank ? 0 : nextRankTotalPoints - currentRankStartPoints
  const pointsIntoRank = Math.max(0, safeTotalPoints - currentRankStartPoints)
  return {
    rank,
    totalPoints: safeTotalPoints,
    currentRankStartPoints,
    nextRankTotalPoints,
    pointsIntoRank,
    pointsRequiredForNextRank,
    pointsToNextRank: isMaxRank ? 0 : Math.max(0, nextRankTotalPoints - safeTotalPoints),
    progressFraction: isMaxRank ? 1 : pointsRequiredForNextRank > 0 ? Math.max(0, Math.min(1, pointsIntoRank / pointsRequiredForNextRank)) : 0,
    isMaxRank,
  }
}

export interface HunterRankPointAwardResult {
  progression: ProgressionState
  pointsGained: number
  oldRank: number
  newRank: number
  ranksGained: number
}

export function awardHunterRankPoints(progression: ProgressionState, amount: number): HunterRankPointAwardResult {
  const pointsGained = Math.max(0, Number.isFinite(amount) ? amount : 0)
  const currentPoints = safePoints(progression.hunterRankPoints)
  const oldRank = hunterRankForPoints(currentPoints)
  const progressionWithPoints = { ...progression, hunterRankPoints: currentPoints + pointsGained }
  const newRank = hunterRankForPoints(progressionWithPoints.hunterRankPoints)
  return { progression: progressionWithPoints, pointsGained, oldRank, newRank, ranksGained: Math.max(0, newRank - oldRank) }
}

/**
 * Profession implementations should call awardHunterRankPoints with the number
 * of levels gained, never with raw Profession XP or action counts.
 */
export function hunterRankPointsForProfessionLevelGain(oldLevel: number, newLevel: number) {
  return Math.max(0, Math.floor(Number.isFinite(newLevel) ? newLevel : 0) - Math.floor(Number.isFinite(oldLevel) ? oldLevel : 0))
}
