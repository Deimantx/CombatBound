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

export interface BlacksmithingOperationRateInput {
  kind: "smelting" | "smithing"
  durationSeconds: number
  staminaCost: number
  xpReward: number
}

const emptyRates = (): BlacksmithingRateEstimate => ({ blacksmithingXpPerHour: 0, operationsPerHour: 0, ironBarsPerHour: 0, craftedItemsPerHour: 0, activeWorkFraction: 0, restingFraction: 0, projectedDurationSeconds: 0, xpToNextLevel: 0, etaSeconds: null })

export function estimateBlacksmithingOperationRates(game: BlacksmithingRuntimeGame, operation: BlacksmithingOperationRateInput): BlacksmithingRateEstimate {
  const stats = getBlacksmithingStats(game)
  const duration = Math.max(0.001, operation.durationSeconds)
  const staminaCost = Math.max(0.001, operation.staminaCost)
  const cyclesBeforeRest = Math.max(1, Math.ceil(stats.maxForgeStamina / staminaCost))
  const workSeconds = cyclesBeforeRest * duration
  const restSeconds = stats.maxForgeStamina - cyclesBeforeRest * staminaCost <= 0 ? stats.restDurationSeconds : 0
  const cycleSeconds = Math.max(0.25, workSeconds + restSeconds) / cyclesBeforeRest
  const operationsPerHour = 3600 / cycleSeconds
  const xpPerHour = operationsPerHour * Math.max(0, operation.xpReward)
  const progress = getProfessionLevelProgress(game.professions, "blacksmithing")
  const etaSeconds = progress.isMaxLevel || xpPerHour <= 0 ? null : progress.xpToNextLevel / xpPerHour * 3600
  return {
    blacksmithingXpPerHour: xpPerHour,
    operationsPerHour,
    ironBarsPerHour: operation.kind === "smelting" ? operationsPerHour : 0,
    craftedItemsPerHour: operation.kind === "smithing" ? operationsPerHour : 0,
    activeWorkFraction: workSeconds / Math.max(0.25, workSeconds + restSeconds),
    restingFraction: restSeconds / Math.max(0.25, workSeconds + restSeconds),
    projectedDurationSeconds: duration,
    xpToNextLevel: progress.isMaxLevel ? 0 : progress.xpToNextLevel,
    etaSeconds,
  }
}

export function estimateBlacksmithingRates(game: BlacksmithingRuntimeGame, recipe: BlacksmithingRecipeDefinition | null = null): BlacksmithingRateEstimate {
  if (!recipe) return emptyRates()
  const stats = getBlacksmithingStats(game, recipe.tags)
  const duration = effectiveBlacksmithingDuration(recipe.baseDurationSeconds, stats)
  const staminaCost = effectiveForgeStaminaCost(recipe.baseForgeStaminaCost, stats)
  const xpPerOperation = effectiveBlacksmithingXp(recipe.baseBlacksmithingXp, stats)
  return estimateBlacksmithingOperationRates(game, { kind: recipe.kind, durationSeconds: duration, staminaCost, xpReward: xpPerOperation })
}
