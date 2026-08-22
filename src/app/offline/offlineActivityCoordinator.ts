import type { ProfileId } from "../../game/profiles/profileTypes";
import {
  combatHuntActivityAdapter,
  type CombatHuntOfflineSummary,
} from "../../game/offline/combatHuntActivity";
import { miningActivityAdapter, type MiningOfflineSummary } from "../../game/offline/miningActivity";
import {
  createDeterministicOfflineRng,
  OfflineActivityRegistry,
  runOfflineActivityTransaction,
  type OfflineActivityDisplayInfo,
  type OfflineActivityEligibility,
  type OfflineActivityTransactionResult,
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

const offlineActivityRegistry = new OfflineActivityRegistry<GameState>([
  combatHuntActivityAdapter,
  miningActivityAdapter,
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

export function requestOfflineSkip(requestedSeconds: number): OfflineActivityTransactionResult<CombatHuntOfflineSummary | MiningOfflineSummary> {
  const current = activeProfile();
  if (!current) {
    const result = { ok: false as const, error: "no-eligible-activity" as const, message: "Open a profile before spending Time Bank time." };
    useOfflineActivityRuntimeStore.getState().setMessage(result.message);
    return result;
  }

  const ownerId = getProfileSessionOwnerId();
  const result = runOfflineActivityTransaction<GameState, CombatHuntOfflineSummary>({
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
    useOfflineActivityRuntimeStore.getState().setLastResult({
      profileId: current.id,
      activityType: result.activityType,
      simulation: result.simulation,
    });
    useOfflineActivityRuntimeStore.getState().openResults();
  } else {
    useOfflineActivityRuntimeStore.getState().closeResults();
    useOfflineActivityRuntimeStore.getState().setMessage(result.message);
  }
  return result;
}
