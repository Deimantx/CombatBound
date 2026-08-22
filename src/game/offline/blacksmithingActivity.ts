import type { GameState } from "../gameState"
import { advanceBlacksmithing } from "../professions/blacksmithing/blacksmithingRuntime"
import type { BlacksmithingRuntimeSummary } from "../professions/blacksmithing/blacksmithingTypes"
import type { OfflineActivityAdapter, OfflineActivityEligibility, OfflineActivitySimulationRequest, OfflineSimulationRng } from "./offlineActivityContract"
import { getProfessionLevel } from "../professions/professionProgression"
import { perHour } from "./offlineResultMetrics"

export interface BlacksmithingOfflineSummary extends BlacksmithingRuntimeSummary {
  blacksmithingLevelBefore: number
  blacksmithingLevelAfter: number
  blacksmithingXpPerHour: number
}

function replayableRng(rng: OfflineSimulationRng) {
  const values: number[] = []
  return {
    recording: { next: () => { const value = rng.next(); values.push(value); return value } },
    replay: { next: () => values.shift() ?? rng.next() },
  }
}

export function createBlacksmithingActivityAdapter(options: { maxEvents?: number } = {}): OfflineActivityAdapter<GameState, BlacksmithingOfflineSummary> {
  return {
    activityType: "blacksmithing",
    isActive: (game) => game.blacksmithing.active,
    getEligibility: (game): OfflineActivityEligibility => game.blacksmithing.active ? { eligible: true } : { eligible: false, reason: "Start Blacksmithing before spending Time Bank time." },
    getDisplayInfo: (game) => ({ label: "Blacksmithing", detail: game.blacksmithing.activityKind ?? "Forge" }),
    simulate: (snapshot: GameState, request: OfflineActivitySimulationRequest, rng: OfflineSimulationRng) => {
      const rngs = replayableRng(rng)
      let result = advanceBlacksmithing(snapshot, request.requestedSeconds, rngs.recording, { maxEvents: options.maxEvents })
      if (result.stopReason === "safety-limit" && !Number.isInteger(result.summary.seconds)) {
        const acceptedSeconds = Math.floor(result.summary.seconds)
        const replayed = advanceBlacksmithing(snapshot, acceptedSeconds, rngs.replay, { maxEvents: options.maxEvents })
        result = { ...replayed, stopReason: "safety-limit" }
      }
      const activitySeconds = result.stopReason === "safety-limit"
        ? Math.floor(result.summary.seconds)
        : result.stopReason === "elapsed-time-complete"
          ? request.requestedSeconds
          : Math.min(request.requestedSeconds, Math.max(0, Math.ceil(result.summary.seconds)))
      const bankSpentSeconds = result.stopReason === "safety-limit" ? activitySeconds : request.requestedSeconds
      const before = getProfessionLevel(snapshot.professions, "blacksmithing")
      const after = getProfessionLevel(result.game.professions, "blacksmithing")
      const seconds = Math.max(1, activitySeconds)
      const summary: BlacksmithingOfflineSummary = { ...result.summary, seconds: activitySeconds, blacksmithingLevelBefore: before, blacksmithingLevelAfter: after, blacksmithingXpPerHour: perHour(result.summary.blacksmithingXp, seconds) }
      const stopReason = result.stopReason === "elapsed-time-complete"
        ? "requested-time-complete" as const
        : result.stopReason === "requirements-lost"
          ? "requirements-lost" as const
          : result.stopReason === "safety-limit"
            ? "safety-limit" as const
            : "activity-ended" as const
      return { requestedSeconds: request.requestedSeconds, activitySeconds, bankSpentSeconds, wastedSeconds: bankSpentSeconds - activitySeconds, stopReason, state: result.game, summary }
    },
  }
}

export const blacksmithingActivityAdapter = createBlacksmithingActivityAdapter()
