import type { ProfileId } from "../../game/profiles/profileTypes";
import {
  combatHuntActivityAdapter,
} from "../../game/offline/combatHuntActivity";
import { miningActivityAdapter } from "../../game/offline/miningActivity";
import {
  createDeterministicOfflineRng,
  OfflineActivityRegistry,
  runOfflineActivityTransaction,
  type OfflineActivityDisplayInfo,
  type OfflineActivityEligibility,
  type OfflineActivityTransactionResult,
  type OfflineActivityAdapter,
} from "../../game/offline/offlineActivityContract";
import { offlineTimePolicy } from "../../game/offline/offlineTimePolicy";
import {
  getProfileMetadata,
} from "../../state/profileStore";
import { useGameStore } from "../../state/gameStore";
import { useOfflineActivityRuntimeStore } from "../../state/offlineActivityRuntimeStore";
import { commitOfflineActivitySimulation } from "./commitOfflineActivitySimulation";
import {
  getProfileSessionOwnerId,
  hasValidOwnedProfileSessionLease,
} from "../../game/profiles/profileSessionLease";
import type { GameState } from "../../game/gameState";
import type { OfflineActivitySummary } from "./offlineActivityTypes";
import { toOfflineActivityLastResult } from "./offlineActivityTypes";

const appCombatAdapter: OfflineActivityAdapter<GameState, OfflineActivitySummary> = {
  ...combatHuntActivityAdapter,
  simulate: (snapshot, request, rng) => combatHuntActivityAdapter.simulate(snapshot, request, rng),
};

const appMiningAdapter: OfflineActivityAdapter<GameState, OfflineActivitySummary> = {
  ...miningActivityAdapter,
  simulate: (snapshot, request, rng) => miningActivityAdapter.simulate(snapshot, request, rng),
};

const offlineActivityRegistry = new OfflineActivityRegistry<GameState, OfflineActivitySummary>([
  appCombatAdapter,
  appMiningAdapter,
]);

export interface OfflineActivityPanelState {
  bankSeconds: number;
  bankCapSeconds: number;
  sessionOwned: boolean;
  currentActivity: OfflineActivityDisplayInfo | null;
  eligibility: OfflineActivityEligibility;
  transactionRunning: boolean;
  lastResult: ReturnType<typeof useOfflineActivityRuntimeStore.getState>["lastResult"];
  message: string | null;
}

function activeProfile(): { id: ProfileId; game: GameState } | null {
  const id = useGameStore.getState().activeProfileId;
  if (!id) return null;
  return { id, game: useGameStore.getState().game };
}

export function getOfflineActivityPanelState(game = useGameStore.getState().game): OfflineActivityPanelState {
  const profileId = useGameStore.getState().activeProfileId;
  const metadata = profileId ? getProfileMetadata(profileId) : null;
  const currentAdapter = offlineActivityRegistry.getCurrentActivity(game);
  const currentActivity = currentAdapter?.getDisplayInfo(game) ?? null;
  const eligibility = currentAdapter?.getEligibility(game) ?? {
    eligible: false,
    reason: "Start an activity before spending Time Bank time.",
  };
  const runtime = useOfflineActivityRuntimeStore.getState();
  const ownerId = getProfileSessionOwnerId();
  return {
    bankSeconds: metadata?.offlineBankSeconds ?? 0,
    bankCapSeconds: offlineTimePolicy.bankCapSeconds,
    sessionOwned: Boolean(profileId && hasValidOwnedProfileSessionLease(profileId, ownerId)),
    currentActivity,
    eligibility,
    transactionRunning: runtime.transactionRunning,
    lastResult: runtime.lastResult,
    message: runtime.message,
  };
}

function seedForState(game: GameState): number {
  return (game.combat.eventSequence ^ (game.combat.encounterSequence * 2654435761)) >>> 0;
}

export function requestOfflineSkip(requestedSeconds: number): OfflineActivityTransactionResult<OfflineActivitySummary, GameState> {
  const current = activeProfile();
  if (!current) {
    const result = { ok: false as const, error: "no-eligible-activity" as const, message: "Open a profile before spending Time Bank time." };
    useOfflineActivityRuntimeStore.getState().setMessage(result.message);
    return result;
  }

  const ownerId = getProfileSessionOwnerId();
  const result = runOfflineActivityTransaction<GameState, OfflineActivitySummary>({
    policy: offlineTimePolicy,
    requestedSeconds,
    availableBankSeconds: getProfileMetadata(current.id)?.offlineBankSeconds ?? 0,
    registry: offlineActivityRegistry,
    snapshot: () => useGameStore.getState().game,
    verifyLease: () => hasValidOwnedProfileSessionLease(current.id, ownerId),
    isRunning: () => useOfflineActivityRuntimeStore.getState().transactionRunning,
    setRunning: (running) => useOfflineActivityRuntimeStore.getState().setTransactionRunning(running),
    rng: createDeterministicOfflineRng(seedForState(current.game)),
    seed: seedForState(current.game),
    commit: ({ result: simulation }) => commitOfflineActivitySimulation({
      profileId: current.id,
      ownerId,
      previousGame: current.game,
      nextGame: simulation.state,
      bankSpentSeconds: simulation.bankSpentSeconds,
      reducedMotion: useGameStore.getState().reducedMotion,
      showInspectorButton: useGameStore.getState().showInspectorButton,
    }),
  });

  if (result.ok) {
    const lastResult = toOfflineActivityLastResult(current.id, result);
    if (lastResult) {
      useOfflineActivityRuntimeStore.getState().setLastResult(lastResult);
      useOfflineActivityRuntimeStore.getState().openResults();
    } else {
      useOfflineActivityRuntimeStore.getState().closeResults();
      useOfflineActivityRuntimeStore.getState().setMessage("Unable to display this activity result.");
    }
  } else {
    useOfflineActivityRuntimeStore.getState().closeResults();
    const safeMessage = result.error === "invalid-request" || result.error === "insufficient-bank" || result.error === "no-eligible-activity"
      ? result.message
      : "Time skip failed. Your profile and Time Bank were not changed.";
    if (import.meta.env.DEV) console.warn("[offline-time-skip]", { error: result.error, message: result.message });
    useOfflineActivityRuntimeStore.getState().setMessage(safeMessage);
  }
  return result;
}
