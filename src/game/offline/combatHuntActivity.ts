import type { GameState } from "../gameState";
import { combatLocationById } from "../data/world/combatLocations";
import { simulateCombatHuntOffline, type CombatHuntOfflineSummary } from "./offlineCombatSimulation";
import type {
  OfflineActivityAdapter,
  OfflineActivityEligibility,
} from "./offlineActivityContract";

function isHuntActive(game: GameState): boolean {
  return (game.combat.phase === "active" || game.combat.phase === "recovery") && Boolean(game.combat.combatLocationId);
}

export const combatHuntActivityAdapter: OfflineActivityAdapter<GameState, CombatHuntOfflineSummary> = {
  activityType: "combat-hunt",
  isActive: isHuntActive,
  getEligibility: (game): OfflineActivityEligibility => isHuntActive(game)
    ? { eligible: true }
    : { eligible: false, reason: "Start a Hunt before spending Time Bank time." },
  getDisplayInfo: (game) => {
    const location = game.combat.combatLocationId ? combatLocationById[game.combat.combatLocationId] : undefined;
    return {
      label: "Hunt",
      detail: location?.name ?? "Combat Location",
    };
  },
  simulate: simulateCombatHuntOffline,
};

export type { CombatHuntOfflineSummary } from "./offlineCombatSimulation";
