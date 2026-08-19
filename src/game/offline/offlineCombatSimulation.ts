import { calculateHunterCombatStats } from "../equipment/derivedStats";
import { advanceCombatStep, createCombatContext } from "../combat/combatEngine";
import { proficiencyById } from "../data/proficiencies";
import { proficiencyLevelForXp } from "../progression/proficiencyProgression";
import type { CombatProficiencyId } from "../progression/progressionTypes";
import type { GameState } from "../gameState";
import type { ItemInstanceId } from "../items/itemTypes";
import type {
  OfflineActivitySimulationRequest,
  OfflineActivitySimulationResult,
  OfflineSimulationRng,
} from "./offlineActivityContract";
import {
  getNextOfflineCombatBoundary,
  quantizeOfflineCombatBoundary,
  secondsToOfflineCombatTicks,
  OFFLINE_COMBAT_TICKS_PER_SECOND,
} from "./offlineCombatScheduler";
import { perHour } from "./offlineResultMetrics";

export interface CombatHuntOfflineSummary {
  enemiesDefeated: number;
  groupClears: number;
  damageDealt: number;
  damageTaken: number;
  healing: number;
  highestHit: number;
  proficiencyXp: Partial<Record<CombatProficiencyId, number>>;
  progressionRows: OfflineProgressionResultRow[];
  gold: number;
  itemsGained: number;
  lootGained: Record<string, number>;
  itemInstanceIdsGained: ItemInstanceId[];
  requestedSeconds: number;
  activitySeconds: number;
  wastedSeconds: number;
  eventSteps: number;
  virtualElapsedSeconds: number;
}

export interface OfflineProgressionResultRow {
  progressionId: string;
  name: string;
  xpBefore: number;
  xpAfter: number;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  xpPerHour: number;
}

// Phase A Wolf Den/Bandit Camp benchmarks peaked at 79,887 event steps for
// seven days. Keep a large finite ceiling for malformed/stalled state without
// making the guard an arbitrary 10x bump over the observed workload.
const MAX_EVENT_STEPS = 2_000_000;

function delta(current: number, previous: number): number {
  return Math.max(0, current - previous);
}

function recordDelta(
  current: Record<string, number>,
  previous: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const id of new Set([...Object.keys(current), ...Object.keys(previous)])) {
    const amount = delta(current[id] ?? 0, previous[id] ?? 0);
    if (amount > 0) result[id] = amount;
  }
  return result;
}

function progressionRows(initial: GameState, final: GameState, requestedSeconds: number): OfflineProgressionResultRow[] {
  const rows: OfflineProgressionResultRow[] = [];
  const ids = new Set([
    ...Object.keys(initial.progression.proficiencies),
    ...Object.keys(final.progression.proficiencies),
  ] as CombatProficiencyId[]);
  for (const proficiencyId of ids) {
    const before = initial.progression.proficiencies[proficiencyId]?.totalXp ?? 0;
    const after = final.progression.proficiencies[proficiencyId]?.totalXp ?? 0;
    rows.push({
      progressionId: proficiencyId,
      name: proficiencyById[proficiencyId]?.name ?? proficiencyId,
      xpBefore: before,
      xpAfter: after,
      xpGained: delta(after, before),
      levelBefore: proficiencyLevelForXp(before),
      levelAfter: proficiencyLevelForXp(after),
      xpPerHour: perHour(delta(after, before), requestedSeconds),
    });
  }
  return rows;
}

function summaryFor(
  initial: GameState,
  final: GameState,
  requestedSeconds: number,
  activitySeconds: number,
  eventSteps: number,
  virtualElapsedSeconds: number,
): CombatHuntOfflineSummary {
  const initialSession = initial.combat.session;
  const finalSession = final.combat.session;
  const proficiencyXp: Partial<Record<CombatProficiencyId, number>> = {};
  for (const proficiencyId of new Set([
    ...Object.keys(initialSession.proficiencyXpGained),
    ...Object.keys(finalSession.proficiencyXpGained),
  ]) as Set<CombatProficiencyId>) {
    const amount = delta(
      finalSession.proficiencyXpGained[proficiencyId] ?? 0,
      initialSession.proficiencyXpGained[proficiencyId] ?? 0,
    );
    if (amount > 0) proficiencyXp[proficiencyId] = amount;
  }
  return {
    enemiesDefeated: delta(finalSession.enemiesDefeated, initialSession.enemiesDefeated),
    groupClears: delta(finalSession.groupClears, initialSession.groupClears),
    damageDealt: delta(finalSession.damageDealt, initialSession.damageDealt),
    damageTaken: delta(finalSession.damageTaken, initialSession.damageTaken),
    healing: delta(finalSession.healing, initialSession.healing),
    highestHit: Math.max(0, finalSession.highestHit),
    proficiencyXp,
    progressionRows: progressionRows(initial, final, requestedSeconds),
    gold: delta(finalSession.goldGained, initialSession.goldGained),
    itemsGained: delta(finalSession.itemsGained, initialSession.itemsGained),
    lootGained: recordDelta(finalSession.lootGained, initialSession.lootGained),
    itemInstanceIdsGained: finalSession.itemInstanceIdsGained.filter((id) => !initialSession.itemInstanceIdsGained.includes(id)),
    requestedSeconds,
    activitySeconds,
    wastedSeconds: Math.max(0, requestedSeconds - activitySeconds),
    eventSteps,
    virtualElapsedSeconds,
  };
}

function isTerminal(game: GameState): boolean {
  return game.combat.phase === "defeat" || game.combat.phase === "stopped" || game.combat.phase === "inactive";
}

function stopReason(game: GameState): OfflineActivitySimulationResult<GameState, CombatHuntOfflineSummary>["stopReason"] {
  if (game.combat.phase === "defeat" || game.combat.stopReason === "defeat") return "death";
  if (game.combat.phase !== "stopped") return "requested-time-complete";
  switch (game.combat.stopReason) {
    case "consumablesDepleted": return "requirements-lost";
    case "completed":
    case "victoryLimit":
    case "manual": return "activity-ended";
    default: return "invalid";
  }
}

export function simulateCombatHuntOffline(
  snapshot: GameState,
  request: OfflineActivitySimulationRequest,
  rng: OfflineSimulationRng,
): OfflineActivitySimulationResult<GameState, CombatHuntOfflineSummary> {
  const requestedSeconds = request.requestedSeconds;
  const requestedTicks = secondsToOfflineCombatTicks(requestedSeconds);
  const initial = snapshot;
  let game = snapshot;
  let elapsedTicks = 0;
  let eventSteps = 0;
  let wakeAutomationNextQuantum = false;
  const context = createCombatContext(rng);

  while (elapsedTicks < requestedTicks && !isTerminal(game)) {
    if (++eventSteps > MAX_EVENT_STEPS) {
      return {
        requestedSeconds,
        activitySeconds: 0,
        bankSpentSeconds: 0,
        wastedSeconds: 0,
        stopReason: "invalid",
        state: initial,
        summary: summaryFor(initial, initial, requestedSeconds, 0, eventSteps, 0),
      };
    }
    const stats = calculateHunterCombatStats(
      game.equipment,
      game.inventory,
      game.progression,
    );
    const rawBoundary = getNextOfflineCombatBoundary(game, stats, context, wakeAutomationNextQuantum);
    const boundarySeconds = quantizeOfflineCombatBoundary(rawBoundary);
    const boundaryTicks = Number.isFinite(boundarySeconds)
      ? secondsToOfflineCombatTicks(boundarySeconds)
      : requestedTicks - elapsedTicks;
    const stepTicks = Math.min(
      Math.max(1, boundaryTicks),
      requestedTicks - elapsedTicks,
    );
    const previousEventSequence = game.combat.eventSequence;
    game = advanceCombatStep(
      game,
      stepTicks / OFFLINE_COMBAT_TICKS_PER_SECOND,
      context,
      stats,
    );
    wakeAutomationNextQuantum = game.combat.eventSequence !== previousEventSequence;
    elapsedTicks += stepTicks;
  }

  const virtualElapsedSeconds = elapsedTicks / OFFLINE_COMBAT_TICKS_PER_SECOND;
  const reason = elapsedTicks >= requestedTicks && !isTerminal(game)
    ? "requested-time-complete"
    : stopReason(game);
  const activitySeconds = Math.min(
    requestedSeconds,
    elapsedTicks >= requestedTicks ? requestedSeconds : Math.ceil(virtualElapsedSeconds),
  );
  const bankSpentSeconds = requestedSeconds;
  const wastedSeconds = Math.max(0, bankSpentSeconds - activitySeconds);
  return {
    requestedSeconds,
    activitySeconds,
    bankSpentSeconds,
    wastedSeconds,
    stopReason: reason,
    state: game,
    summary: summaryFor(initial, game, requestedSeconds, activitySeconds, eventSteps, virtualElapsedSeconds),
  };
}
