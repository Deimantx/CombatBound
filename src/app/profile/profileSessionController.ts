import { loadProfileGameSave } from "../../game/profiles/profileStorage";
import {
  acquireProfileSessionLease,
  getProfileSessionOwnerId,
  releaseOwnedProfileSessionLease,
} from "../../game/profiles/profileSessionLease";
import type { Difficulty, GameType, OfflineTimeReport, ProfileId, ProfileSlot } from "../../game/profiles/profileTypes";
import { useDevToolsRuntimeStore } from "../debug/devtools/devToolsRuntimeStore";
import { useOfflineActivityRuntimeStore } from "../../state/offlineActivityRuntimeStore";
import { useGameStore } from "../../state/gameStore";
import { getProfileMetadata, useProfileStore } from "../../state/profileStore";

const sessionConflictMessage = "This profile is active in another CombatBound tab. This tab was disconnected to protect your save.";

export function createAndEnterProfile(
  slot: ProfileSlot,
  gameType: GameType,
  difficulty: Difficulty,
): boolean {
  useOfflineActivityRuntimeStore.getState().reset();
  const now = Date.now();
  const metadata = useProfileStore.getState().createProfileMetadata(slot, gameType, difficulty, now);
  if (!metadata) return false;
  const lease = acquireProfileSessionLease(metadata.id, getProfileSessionOwnerId(), now);
  if (!lease.ok) {
    useProfileStore.getState().deleteProfile(metadata.id);
    return false;
  }
  useGameStore.getState().startFreshProfile(metadata.id);
  useProfileStore.getState().beginSession(metadata.id, now);
  useGameStore.getState().saveActiveProfileNow();
  return true;
}

export function loadAndEnterProfile(profileId: ProfileId): { ok: boolean; error?: string; report?: OfflineTimeReport | null } {
  useOfflineActivityRuntimeStore.getState().reset();
  if (!getProfileMetadata(profileId)) return { ok: false, error: "Profile metadata is missing." };
  const save = loadProfileGameSave(profileId);
  if (!save) return { ok: false, error: "This profile save is missing or corrupted." };
  const now = Date.now();
  const lease = acquireProfileSessionLease(profileId, getProfileSessionOwnerId(), now);
  if (!lease.ok) {
    return {
      ok: false,
      error: "Profile already active. This profile is currently open in another CombatBound tab or window. Close the other session or wait for it to expire before loading this profile here.",
    };
  }
  const report = useProfileStore.getState().beginSession(profileId, now);
  if (!report) {
    releaseOwnedProfileSessionLease(profileId, getProfileSessionOwnerId());
    return { ok: false, error: "This profile could not be claimed safely." };
  }
  useGameStore.getState().hydrateProfile(profileId, save);
  useProfileStore.getState().setSessionConflictMessage(null);
  return { ok: true, report };
}

export function disconnectForSessionConflict(): void {
  useOfflineActivityRuntimeStore.getState().reset();
  const gameStore = useGameStore.getState();
  if (!gameStore.activeProfileId) return;
  gameStore.stopHunt();
  useProfileStore.getState().dismissOfflineReport();
  useProfileStore.getState().setSessionConflictMessage(sessionConflictMessage);
  useDevToolsRuntimeStore.getState().close();
  useDevToolsRuntimeStore.getState().clearEnemyImmortality();
  useDevToolsRuntimeStore.getState().setSimulationPaused(false);
  gameStore.unloadProfile();
}

export function returnToProfileSelect(): void {
  useOfflineActivityRuntimeStore.getState().reset();
  const gameStore = useGameStore.getState();
  const profileId = gameStore.activeProfileId;
  if (!profileId) return;
  const ownerId = getProfileSessionOwnerId();
  const lease = acquireProfileSessionLease(profileId, ownerId, Date.now());
  if (!lease.ok) {
    disconnectForSessionConflict();
    return;
  }
  gameStore.stopHunt();
  gameStore.saveActiveProfileNow();
  useProfileStore.getState().finishSession(profileId);
  releaseOwnedProfileSessionLease(profileId, ownerId);
  useProfileStore.getState().dismissOfflineReport();
  useDevToolsRuntimeStore.getState().close();
  useDevToolsRuntimeStore.getState().clearEnemyImmortality();
  useDevToolsRuntimeStore.getState().setSimulationPaused(false);
  gameStore.unloadProfile();
}

export { sessionConflictMessage };
