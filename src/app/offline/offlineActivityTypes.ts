import type { GameState } from "../../game/gameState";
import type {
  OfflineActivitySimulationResult,
  OfflineActivityTransactionSuccess,
} from "../../game/offline/offlineActivityContract";
import type { CombatHuntOfflineSummary } from "../../game/offline/combatHuntActivity";
import type { MiningOfflineSummary } from "../../game/offline/miningActivity";

export type OfflineActivitySummary = CombatHuntOfflineSummary | MiningOfflineSummary;

export type OfflineActivityLastResult =
  | {
      profileId: string;
      activityType: "combat-hunt";
      simulation: OfflineActivitySimulationResult<GameState, CombatHuntOfflineSummary>;
    }
  | {
      profileId: string;
      activityType: "mining-iron-vein";
      simulation: OfflineActivitySimulationResult<GameState, MiningOfflineSummary>;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isCombatHuntOfflineSummary(value: unknown): value is CombatHuntOfflineSummary {
  return isRecord(value) &&
    typeof value.enemiesDefeated === "number" &&
    typeof value.damageDealt === "number" &&
    typeof value.damageTaken === "number" &&
    typeof value.healing === "number" &&
    typeof value.highestHit === "number" &&
    Array.isArray(value.progressionRows) &&
    isRecord(value.lootGained);
}

export function isMiningOfflineSummary(value: unknown): value is MiningOfflineSummary {
  return isRecord(value) &&
    typeof value.seconds === "number" &&
    typeof value.swings === "number" &&
    typeof value.stagesBroken === "number" &&
    typeof value.deposits === "number" &&
    typeof value.restSeconds === "number" &&
    typeof value.ironOre === "number" &&
    typeof value.roughGems === "number" &&
    typeof value.blackStones === "number" &&
    typeof value.miningXp === "number" &&
    typeof value.masteryXp === "number" &&
    typeof value.miningLevelBefore === "number" &&
    typeof value.miningLevelAfter === "number" &&
    typeof value.masteryLevelBefore === "number" &&
    typeof value.masteryLevelAfter === "number" &&
    typeof value.ironOrePerHour === "number" &&
    typeof value.roughGemPerHour === "number" &&
    typeof value.blackStonePerHour === "number";
}

export function toOfflineActivityLastResult(
  profileId: string,
  result: OfflineActivityTransactionSuccess<OfflineActivitySummary, GameState>,
): OfflineActivityLastResult | null {
  if (result.activityType === "combat-hunt" && isCombatHuntOfflineSummary(result.simulation.summary)) {
    return {
      profileId,
      activityType: "combat-hunt",
      simulation: { ...result.simulation, summary: result.simulation.summary },
    };
  }
  if (result.activityType === "mining-iron-vein" && isMiningOfflineSummary(result.simulation.summary)) {
    return {
      profileId,
      activityType: "mining-iron-vein",
      simulation: { ...result.simulation, summary: result.simulation.summary },
    };
  }
  return null;
}
