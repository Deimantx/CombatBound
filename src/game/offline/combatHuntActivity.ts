import type { GameState } from "../gameState";
import { combatLocationById } from "../data/world/combatLocations";
import type {
  OfflineActivityAdapter,
  OfflineActivityEligibility,
  OfflineActivitySimulationRequest,
  OfflineActivitySimulationResult,
  OfflineSimulationRng,
} from "./offlineActivityContract";

export interface CombatHuntOfflineSummary {
  enemiesDefeated: number;
  groupClears: number;
  masteryXp: number;
  gold: number;
}

function isHuntActive(game: GameState): boolean {
  return (game.combat.phase === "active" || game.combat.phase === "recovery") && Boolean(game.combat.combatLocationId);
}

/**
 * Contract-1.0 activity boundary for Combat. The canonical offline Combat
 * event simulator is intentionally a follow-up phase; this adapter keeps the
 * current activity visible without inventing a DPS shortcut.
 */
export const combatHuntActivityAdapter: OfflineActivityAdapter<GameState, CombatHuntOfflineSummary> = {
  activityType: "combat-hunt",
  isActive: isHuntActive,
  getEligibility: (game): OfflineActivityEligibility => isHuntActive(game)
    ? { eligible: false, reason: "Offline Combat simulation is not available yet." }
    : { eligible: false, reason: "Start a Hunt before spending Time Bank time." },
  getDisplayInfo: (game) => {
    const location = game.combat.combatLocationId ? combatLocationById[game.combat.combatLocationId] : undefined;
    return {
      label: "Hunt",
      detail: location?.name ?? "Combat Location",
    };
  },
  simulate: (
    _snapshot: GameState,
    _request: OfflineActivitySimulationRequest,
    _rng: OfflineSimulationRng,
  ): OfflineActivitySimulationResult<GameState, CombatHuntOfflineSummary> => {
    throw new Error("Offline Combat Simulation 1.0 is a follow-up phase.");
  },
};
