import type { ProfileId, ProfileIndexV1 } from "../../game/profiles/profileTypes";
import { normalizeBankSeconds, spendOfflineBankTime } from "../../game/offline/offlineTimeBank";
import { offlineTimePolicy } from "../../game/offline/offlineTimePolicy";
import {
  readProfileIndex,
  saveProfileGameSave,
  writeProfileIndex,
  slotMetadata,
} from "../../game/profiles/profileStorage";
import { gameStateToSaveV12 } from "../../game/persistence/saveGame";
import type { GameState } from "../../game/gameState";
import { hasValidOwnedProfileSessionLease } from "../../game/profiles/profileSessionLease";
import { useGameStore } from "../../state/gameStore";
import { useProfileStore } from "../../state/profileStore";

export interface OfflineActivitySimulationCommitInput {
  profileId: ProfileId;
  ownerId: string;
  previousGame: GameState;
  nextGame: GameState;
  simulatedSeconds: number;
  reducedMotion: boolean;
  showInspectorButton: boolean;
}

function sameActiveProfile(profileId: ProfileId): boolean {
  return useGameStore.getState().activeProfileId === profileId;
}

function restoreStorage(
  profileId: ProfileId,
  previousIndex: ProfileIndexV1,
  previousSave: ReturnType<typeof gameStateToSaveV12>,
  gameSaveWasWritten: boolean,
) {
  // Rollback is deliberately best-effort: a storage failure can prevent even
  // the compensating write, but it must never mutate the live stores first.
  if (gameSaveWasWritten) saveProfileGameSave(profileId, previousSave);
  writeProfileIndex(previousIndex);
  useProfileStore.getState().refreshProfiles();
}

/** Stages both profile keys, then publishes the new state to Zustand. */
export function commitOfflineActivitySimulation(
  input: OfflineActivitySimulationCommitInput,
): boolean {
  if (!sameActiveProfile(input.profileId)) return false;
  if (!hasValidOwnedProfileSessionLease(input.profileId, input.ownerId)) return false;

  const previousIndex = readProfileIndex();
  const previousMetadata = slotMetadata(
    previousIndex,
    previousIndex.slots.find((entry) => entry?.id === input.profileId)?.slot ?? 1,
  );
  if (!previousMetadata || previousMetadata.id !== input.profileId) return false;

  const spend = input.simulatedSeconds > 0
    ? spendOfflineBankTime(previousMetadata.offlineBankSeconds, input.simulatedSeconds, offlineTimePolicy)
    : {
        ok: true as const,
        requestedSeconds: 0,
        spentSeconds: 0,
        bankBeforeSeconds: normalizeBankSeconds(previousMetadata.offlineBankSeconds, offlineTimePolicy),
        bankAfterSeconds: normalizeBankSeconds(previousMetadata.offlineBankSeconds, offlineTimePolicy),
      };
  if (!spend.ok) return false;

  const nextIndex: ProfileIndexV1 = {
    version: 1,
    slots: previousIndex.slots.map((entry) =>
      entry?.id === input.profileId
        ? { ...entry, offlineBankSeconds: spend.bankAfterSeconds }
        : entry,
    ) as ProfileIndexV1["slots"],
  };
  const previousSave = gameStateToSaveV12(input.previousGame, {
    reducedMotion: input.reducedMotion,
    showInspectorButton: input.showInspectorButton,
  });
  const nextSave = gameStateToSaveV12(input.nextGame, {
    reducedMotion: input.reducedMotion,
    showInspectorButton: input.showInspectorButton,
  });

  let metadataWriteAttempted = false;
  let gameSaveWriteAttempted = false;
  try {
    if (!sameActiveProfile(input.profileId) || !hasValidOwnedProfileSessionLease(input.profileId, input.ownerId)) return false;
    metadataWriteAttempted = true;
    if (!writeProfileIndex(nextIndex)) return false;

    if (!sameActiveProfile(input.profileId) || !hasValidOwnedProfileSessionLease(input.profileId, input.ownerId)) {
      restoreStorage(input.profileId, previousIndex, previousSave, false);
      return false;
    }
    gameSaveWriteAttempted = true;
    if (!saveProfileGameSave(input.profileId, nextSave)) {
      restoreStorage(input.profileId, previousIndex, previousSave, true);
      return false;
    }

    if (!sameActiveProfile(input.profileId) || !hasValidOwnedProfileSessionLease(input.profileId, input.ownerId)) {
      restoreStorage(input.profileId, previousIndex, previousSave, true);
      return false;
    }
    useProfileStore.getState().refreshProfiles();
    if (!sameActiveProfile(input.profileId) || !useGameStore.getState().replaceGameStateForOfflineSimulation(input.nextGame)) {
      restoreStorage(input.profileId, previousIndex, previousSave, true);
      return false;
    }
    return true;
  } catch {
    if (metadataWriteAttempted) restoreStorage(input.profileId, previousIndex, previousSave, gameSaveWriteAttempted);
    return false;
  }
}
