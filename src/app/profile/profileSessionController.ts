import { loadProfileGameSave } from "../../game/profiles/profileStorage";
import type { Difficulty, GameType, OfflineTimeReport, ProfileId, ProfileSlot } from "../../game/profiles/profileTypes";
import { useDevToolsRuntimeStore } from "../debug/devtools/devToolsRuntimeStore";
import { useGameStore } from "../../state/gameStore";
import { getProfileMetadata, useProfileStore } from "../../state/profileStore";

export function createAndEnterProfile(
  slot: ProfileSlot,
  gameType: GameType,
  difficulty: Difficulty,
): boolean {
  const metadata = useProfileStore.getState().createProfileMetadata(slot, gameType, difficulty);
  if (!metadata) return false;
  useGameStore.getState().startFreshProfile(metadata.id);
  useProfileStore.getState().beginSession(metadata.id);
  useGameStore.getState().saveActiveProfileNow();
  return true;
}

export function loadAndEnterProfile(profileId: ProfileId): { ok: boolean; error?: string; report?: OfflineTimeReport | null } {
  if (!getProfileMetadata(profileId)) return { ok: false, error: "Profile metadata is missing." };
  const save = loadProfileGameSave(profileId);
  if (!save) return { ok: false, error: "This profile save is missing or corrupted." };
  const report = useProfileStore.getState().beginSession(profileId);
  useGameStore.getState().hydrateProfile(profileId, save);
  return { ok: true, report };
}

export function returnToProfileSelect(): void {
  const gameStore = useGameStore.getState();
  const profileId = gameStore.activeProfileId;
  if (!profileId) return;
  gameStore.stopHunt();
  gameStore.saveActiveProfileNow();
  useProfileStore.getState().finishSession(profileId);
  useProfileStore.getState().dismissOfflineReport();
  useDevToolsRuntimeStore.getState().close();
  useDevToolsRuntimeStore.getState().clearEnemyImmortality();
  useDevToolsRuntimeStore.getState().setSimulationPaused(false);
  gameStore.unloadProfile();
}
