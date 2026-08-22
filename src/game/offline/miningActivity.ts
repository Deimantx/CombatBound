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

export interface MiningActivityAdapterOptions {
  /** Test-only injection point for exercising the runtime safety boundary. */
  maxEvents?: number
}

function replayableRng(rng: OfflineSimulationRng) {
  const values: number[] = []
  return {
    recording: { next: () => { const value = rng.next(); values.push(value); return value } },
    replay: { next: () => values.shift() ?? rng.next() },
  }
}

export function createMiningActivityAdapter(options: MiningActivityAdapterOptions = {}): OfflineActivityAdapter<GameState, MiningOfflineSummary> {
  return {
    activityType: "mining-iron-vein",
    isActive: isMiningActive,
    getEligibility: (game): OfflineActivityEligibility => isMiningActive(game) ? { eligible: true } : { eligible: false, reason: "Start Mining before spending Time Bank time." },
    getDisplayInfo: (game) => ({ label: "Mining", detail: "Iron Vein" }),
    simulate: (snapshot: GameState, request: OfflineActivitySimulationRequest, rng: OfflineSimulationRng) => {
      const rngs = replayableRng(rng)
      let result = advanceMining(snapshot, request.requestedSeconds, rngs.recording, { maxEvents: options.maxEvents })
      // Time Bank spends whole seconds. If the safety cap interrupts inside a
      // timer interval, replay exactly the accepted whole-second prefix so the
      // committed state cannot be ahead of the billed duration.
      if (result.stopReason === "safety-limit" && !Number.isInteger(result.summary.seconds)) {
        const acceptedSeconds = Math.floor(result.summary.seconds)
        const replayed = advanceMining(snapshot, acceptedSeconds, rngs.replay, { maxEvents: options.maxEvents })
        result = { ...replayed, stopReason: "safety-limit" }
      }
      const activitySeconds = result.stopReason === "safety-limit" ? Math.floor(result.summary.seconds) : request.requestedSeconds
      const bankSpentSeconds = result.stopReason === "safety-limit" ? activitySeconds : request.requestedSeconds
      const masteryId = "mastery.iron-vein"
      const miningLevelBefore = getProfessionLevel(snapshot.professions, "mining")
      const miningLevelAfter = getProfessionLevel(result.game.professions, "mining")
      const masteryLevelBefore = ironMasteryLevel(snapshot.professions.resourceMasteries[masteryId] ?? { masteryId, totalXp: 0 })
      const masteryLevelAfter = ironMasteryLevel(result.game.professions.resourceMasteries[masteryId] ?? { masteryId, totalXp: 0 })
      const divisor = Math.max(1, activitySeconds)
      const summary: MiningOfflineSummary = {
        ...result.summary,
        seconds: activitySeconds,
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
}

export const miningActivityAdapter = createMiningActivityAdapter()
