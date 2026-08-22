import type { BlacksmithingRecipeDefinition, BlacksmithingRuntimeGame } from "./blacksmithingTypes"
import { getBlacksmithingStats, effectiveBlacksmithingDuration, effectiveForgeStaminaCost, effectiveBlacksmithingXp } from "./blacksmithingStats"
import { getProfessionLevelProgress } from "../professionProgression"

export interface BlacksmithingRateEstimate {
  blacksmithingXpPerHour: number
  operationsPerHour: number
  ironBarsPerHour: number
  craftedItemsPerHour: number
  activeWorkFraction: number
  restingFraction: number
  projectedDurationSeconds: number
  xpToNextLevel: number
  etaSeconds: number | null
}

export function estimateBlacksmithingRates(game: BlacksmithingRuntimeGame, recipe: BlacksmithingRecipeDefinition | null = null): BlacksmithingRateEstimate {
  if (!recipe) return { blacksmithingXpPerHour: 0, operationsPerHour: 0, ironBarsPerHour: 0, craftedItemsPerHour: 0, activeWorkFraction: 0, restingFraction: 0, projectedDurationSeconds: 0, xpToNextLevel: 0, etaSeconds: null }
  const stats = getBlacksmithingStats(game, recipe.tags)
  const duration = effectiveBlacksmithingDuration(recipe.baseDurationSeconds, stats)
  const staminaCost = effectiveForgeStaminaCost(recipe.baseForgeStaminaCost, stats)
  const cyclesBeforeRest = Math.max(1, Math.ceil(stats.maxForgeStamina / staminaCost))
  const workSeconds = cyclesBeforeRest * duration
  const restSeconds = cyclesBeforeRest > 0 && stats.maxForgeStamina - cyclesBeforeRest * staminaCost <= 0 ? stats.restDurationSeconds : 0
  const cycleSeconds = Math.max(0.25, workSeconds + restSeconds) / cyclesBeforeRest
  const operationsPerHour = 3600 / cycleSeconds
  const xpPerOperation = effectiveBlacksmithingXp(recipe.baseBlacksmithingXp, stats)
  const xpPerHour = operationsPerHour * xpPerOperation
  const progress = getProfessionLevelProgress(game.professions, "blacksmithing")
  const etaSeconds = progress.isMaxLevel || xpPerHour <= 0 ? null : progress.xpToNextLevel / xpPerHour * 3600
  return {
    blacksmithingXpPerHour: xpPerHour,
    operationsPerHour,
    ironBarsPerHour: recipe.kind === "smelting" ? operationsPerHour : 0,
    craftedItemsPerHour: recipe.kind === "smithing" ? operationsPerHour : 0,
    activeWorkFraction: workSeconds / Math.max(0.25, workSeconds + restSeconds),
    restingFraction: restSeconds / Math.max(0.25, workSeconds + restSeconds),
    projectedDurationSeconds: duration,
    xpToNextLevel: progress.isMaxLevel ? 0 : progress.xpToNextLevel,
    etaSeconds,
  }
}
