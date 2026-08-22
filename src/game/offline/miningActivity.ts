import type { GameState } from "../gameState"
import { advanceMining } from "../professions/mining/miningRuntime"
import type { OfflineActivityAdapter, OfflineActivityEligibility, OfflineActivitySimulationRequest, OfflineSimulationRng } from "./offlineActivityContract"
import type { MiningRuntimeSummary } from "../professions/mining/miningTypes"

export type MiningOfflineSummary = MiningRuntimeSummary

function isMiningActive(game: GameState) { return game.mining.active }

export const miningActivityAdapter: OfflineActivityAdapter<GameState, MiningOfflineSummary> = {
  activityType: "mining-iron-vein",
  isActive: isMiningActive,
  getEligibility: (game): OfflineActivityEligibility => isMiningActive(game) ? { eligible: true } : { eligible: false, reason: "Start Mining before spending Time Bank time." },
  getDisplayInfo: (game) => ({ label: "Mining", detail: "Iron Vein" }),
  simulate: (snapshot: GameState, request: OfflineActivitySimulationRequest, rng: OfflineSimulationRng) => {
    const result = advanceMining(snapshot, request.requestedSeconds, rng)
    return { requestedSeconds: request.requestedSeconds, activitySeconds: Math.floor(result.summary.seconds), bankSpentSeconds: request.requestedSeconds, wastedSeconds: request.requestedSeconds - Math.floor(result.summary.seconds), stopReason: "requested-time-complete" as const, state: result.game, summary: result.summary }
  },
}
