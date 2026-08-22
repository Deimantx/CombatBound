import type { GameState } from "../gameState"
import { advanceMining } from "../professions/mining/miningRuntime"
import type { OfflineActivityAdapter, OfflineActivityEligibility, OfflineActivitySimulationRequest, OfflineSimulationRng } from "./offlineActivityContract"
import type { MiningRuntimeSummary } from "../professions/mining/miningTypes"
import { getProfessionLevel } from "../professions/professionProgression"
import { ironMasteryLevel } from "../professions/mining/miningMastery"
import { perHour } from "./offlineResultMetrics"

export interface MiningOfflineSummary extends MiningRuntimeSummary {
  miningLevelBefore: number
  miningLevelAfter: number
  masteryLevelBefore: number
  masteryLevelAfter: number
  ironOrePerHour: number
  roughGemPerHour: number
  blackStonePerHour: number
}

function isMiningActive(game: GameState) { return game.mining.active }

export const miningActivityAdapter: OfflineActivityAdapter<GameState, MiningOfflineSummary> = {
  activityType: "mining-iron-vein",
  isActive: isMiningActive,
  getEligibility: (game): OfflineActivityEligibility => isMiningActive(game) ? { eligible: true } : { eligible: false, reason: "Start Mining before spending Time Bank time." },
  getDisplayInfo: (game) => ({ label: "Mining", detail: "Iron Vein" }),
  simulate: (snapshot: GameState, request: OfflineActivitySimulationRequest, rng: OfflineSimulationRng) => {
    const result = advanceMining(snapshot, request.requestedSeconds, rng)
    const activitySeconds = Math.floor(result.summary.seconds)
    const bankSpentSeconds = result.stopReason === "safety-limit" ? activitySeconds : request.requestedSeconds
    const masteryId = "mastery.iron-vein"
    const miningLevelBefore = getProfessionLevel(snapshot.professions, "mining")
    const miningLevelAfter = getProfessionLevel(result.game.professions, "mining")
    const masteryLevelBefore = ironMasteryLevel(snapshot.professions.resourceMasteries[masteryId] ?? { masteryId, totalXp: 0 })
    const masteryLevelAfter = ironMasteryLevel(result.game.professions.resourceMasteries[masteryId] ?? { masteryId, totalXp: 0 })
    const divisor = Math.max(1, activitySeconds)
    const summary: MiningOfflineSummary = {
      ...result.summary,
      miningLevelBefore,
      miningLevelAfter,
      masteryLevelBefore,
      masteryLevelAfter,
      ironOrePerHour: perHour(result.summary.ironOre, divisor),
      roughGemPerHour: perHour(result.summary.expectedRoughGems, divisor),
      blackStonePerHour: perHour(result.summary.expectedBlackStones, divisor),
    }
    return { requestedSeconds: request.requestedSeconds, activitySeconds, bankSpentSeconds, wastedSeconds: bankSpentSeconds - activitySeconds, stopReason: result.stopReason, state: result.game, summary }
  },
}
