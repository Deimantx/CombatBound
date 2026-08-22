import type { GameState } from "../../game/gameState";
import type {
  OfflineActivitySimulationResult,
  OfflineActivityTransactionSuccess,
} from "../../game/offline/offlineActivityContract";
import type { CombatHuntOfflineSummary } from "../../game/offline/combatHuntActivity";
import type { MiningOfflineSummary } from "../../game/offline/miningActivity";
import type { BlacksmithingOfflineSummary } from "../../game/offline/blacksmithingActivity";

export type OfflineActivitySummary = CombatHuntOfflineSummary | MiningOfflineSummary | BlacksmithingOfflineSummary;

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
    }
  | {
      profileId: string;
      activityType: "blacksmithing";
      simulation: OfflineActivitySimulationResult<GameState, BlacksmithingOfflineSummary>;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isCombatHuntOfflineSummary(value: unknown): value is CombatHuntOfflineSummary {
  if (!isRecord(value) ||
    !isFiniteNumber(value.enemiesDefeated) ||
    !isFiniteNumber(value.damageDealt) ||
    !isFiniteNumber(value.damageTaken) ||
    !isFiniteNumber(value.healing) ||
    !isFiniteNumber(value.highestHit) ||
    !isFiniteNumber(value.gold) ||
    !Array.isArray(value.progressionRows) ||
    !isRecord(value.lootGained)) return false;
  const progressionRowsValid = value.progressionRows.every((row) => isRecord(row) &&
    typeof row.progressionId === "string" &&
    typeof row.name === "string" &&
    isFiniteNumber(row.xpGained) &&
    isFiniteNumber(row.xpPerHour) &&
    isFiniteNumber(row.levelBefore) &&
    isFiniteNumber(row.levelAfter));
  const lootValid = Object.values(value.lootGained).every((quantity) => isFiniteNumber(quantity) && quantity >= 0);
  return progressionRowsValid && lootValid;
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

export function isBlacksmithingOfflineSummary(value: unknown): value is BlacksmithingOfflineSummary {
  if (!isRecord(value)) return false;
  const nonnegativeFinite = (candidate: unknown) => typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0;
  const counts = (candidate: unknown) => isRecord(candidate) && Object.values(candidate).every((quantity) => nonnegativeFinite(quantity));
  return nonnegativeFinite(value.seconds) && nonnegativeFinite(value.operationsCompleted) && nonnegativeFinite(value.smeltsCompleted) && nonnegativeFinite(value.smithsCompleted) && nonnegativeFinite(value.restSeconds) && nonnegativeFinite(value.blacksmithingXp) && nonnegativeFinite(value.blacksmithingLevelBefore) && nonnegativeFinite(value.blacksmithingLevelAfter) && nonnegativeFinite(value.blacksmithingXpPerHour) && counts(value.outputsGained) && counts(value.materialsConsumed) && counts(value.materialsRecovered);
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
  if (result.activityType === "blacksmithing" && isBlacksmithingOfflineSummary(result.simulation.summary)) {
    return { profileId, activityType: "blacksmithing", simulation: { ...result.simulation, summary: result.simulation.summary } };
  }
  return null;
}
