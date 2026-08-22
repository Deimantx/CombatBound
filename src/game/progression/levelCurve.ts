export interface LevelProgress {
  level: number
  currentLevelXp: number
  nextLevelXp: number
  xpIntoLevel: number
  xpRequiredForLevel: number
  progressFraction: number
  xpToNextLevel: number
  isMaxLevel: boolean
}

/** Shared 1-100 curve. Keep this formula stable: Combat and professions use it. */
export function baseLevelXpForLevel(level: number) {
  return Math.floor(100 * Math.pow(Math.max(0, level - 1), 1.65))
}

export function levelXpMultiplierForTargetLevel(targetLevel: number) {
  return 1 + Math.floor((targetLevel - 1) / 10) * 0.1
}

export function levelXpCostForTargetLevel(targetLevel: number) {
  const safeTargetLevel = Math.max(2, Math.floor(targetLevel))
  const base = baseLevelXpForLevel(safeTargetLevel) - baseLevelXpForLevel(safeTargetLevel - 1)
  return Math.round(base * levelXpMultiplierForTargetLevel(safeTargetLevel))
}

export function buildLevelXpThresholds(maxLevel: number) {
  const safeMax = Math.max(1, Math.floor(maxLevel))
  const thresholds = [0, 0]
  for (let level = 2; level <= safeMax; level += 1) thresholds[level] = thresholds[level - 1] + levelXpCostForTargetLevel(level)
  return thresholds
}

export function xpForLevel(level: number, maxLevel = 100) {
  const thresholds = buildLevelXpThresholds(maxLevel)
  const safeLevel = Math.max(0, Math.floor(level))
  if (safeLevel <= 1) return 0
  return thresholds[Math.min(safeLevel, thresholds.length - 1)]
}

export function levelForXp(totalXp: number, maxLevel = 100, thresholdScale = 1) {
  const thresholds = buildLevelXpThresholds(maxLevel).map((value) => value * Math.max(0, thresholdScale))
  const safeXp = Math.max(0, Number.isFinite(totalXp) ? totalXp : 0)
  let low = 1
  let high = Math.max(1, Math.floor(maxLevel))
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (thresholds[middle] <= safeXp) low = middle
    else high = middle - 1
  }
  return low
}

export function getLevelProgress(totalXp: number, maxLevel = 100, thresholdScale = 1): LevelProgress {
  const safeMax = Math.max(1, Math.floor(maxLevel))
  const scale = Math.max(0.000001, thresholdScale)
  const safeXp = Math.max(0, Number.isFinite(totalXp) ? totalXp : 0)
  if (safeXp <= 0) {
    const nextLevelXp = xpForLevel(Math.min(2, safeMax), safeMax) * scale
    return { level: 0, currentLevelXp: 0, nextLevelXp, xpIntoLevel: 0, xpRequiredForLevel: nextLevelXp, progressFraction: 0, xpToNextLevel: nextLevelXp, isMaxLevel: false }
  }
  const level = Math.min(safeMax, levelForXp(safeXp, safeMax, scale))
  const currentLevelXp = xpForLevel(level, safeMax) * scale
  const isMaxLevel = level >= safeMax
  const nextLevelXp = isMaxLevel ? currentLevelXp : xpForLevel(level + 1, safeMax) * scale
  const xpRequiredForLevel = Math.max(0, nextLevelXp - currentLevelXp)
  const xpIntoLevel = Math.max(0, safeXp - currentLevelXp)
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpRequiredForLevel,
    progressFraction: isMaxLevel ? 1 : xpRequiredForLevel > 0 ? Math.max(0, Math.min(1, xpIntoLevel / xpRequiredForLevel)) : 0,
    xpToNextLevel: isMaxLevel ? 0 : Math.max(0, nextLevelXp - safeXp),
    isMaxLevel,
  }
}
