import type { MiningRuntimeGame } from "./miningTypes"
import { advanceMining, startMiningState } from "./miningRuntime"

export interface MiningRateEstimate { miningXpPerHour: number; masteryXpPerHour: number; ironOrePerHour: number; roughGemPerHour: number; blackStonePerHour: number; activeSwingFraction: number; restFraction: number; secondsPerProjection: number }

export function estimateMiningRates(game: MiningRuntimeGame): MiningRateEstimate {
  const initial = game.mining.active ? game : { ...game, mining: startMiningState(game.mining, game) }
  const secondsPerProjection = 3600
  const result = advanceMining(initial, secondsPerProjection, { next: () => 1 })
  const seconds = Math.max(1, result.summary.seconds)
  return { miningXpPerHour: result.summary.miningXp * 3600 / seconds, masteryXpPerHour: result.summary.masteryXp * 3600 / seconds, ironOrePerHour: (result.summary.ironOre + (initial.mining.yieldRemainders["item.iron-ore"] ?? 0)) * 3600 / seconds, roughGemPerHour: result.summary.expectedRoughGems * 3600 / seconds, blackStonePerHour: result.summary.expectedBlackStones * 3600 / seconds, activeSwingFraction: Math.max(0, Math.min(1, (seconds - result.summary.restSeconds) / seconds)), restFraction: Math.max(0, Math.min(1, result.summary.restSeconds / seconds)), secondsPerProjection }
}
