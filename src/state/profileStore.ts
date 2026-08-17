import { create } from "zustand";
import {
  clearProfileGameSave,
  loadProfileGameSave,
  migrateLegacySingleSaveIfNeeded,
  readProfileIndex,
  slotMetadata,
  writeProfileIndex,
} from "../game/profiles/profileStorage";
import {
  calculateOfflineTimeCredit,
  normalizeBankSeconds,
  normalizeTimestampMs,
  spendOfflineBankTime,
} from "../game/offline/offlineTimeBank";
import { offlineTimePolicy } from "../game/offline/offlineTimePolicy";
import type {
  OfflineBankSpendResult,
  OfflineTimeCreditResult,
  OfflineTimeSource,
} from "../game/offline/offlineTimeTypes";
import {
  clearProfileSessionLease,
  getProfileSessionOwnerId,
  isProfileSessionOwner,
  readProfileSessionLease,
  type ProfileSessionLease,
} from "../game/profiles/profileSessionLease";
import type {
  Difficulty,
  GameType,
  OfflineTimeReport,
  ProfileId,
  ProfileIndexV1,
  ProfileMetadata,
  ProfileSlot,
} from "../game/profiles/profileTypes";

interface ProfileStoreState {
  index: ProfileIndexV1;
  pendingOfflineReport: OfflineTimeReport | null;
  sessionConflictMessage: string | null;
  refreshProfiles: () => void;
  createProfileMetadata: (slot: ProfileSlot, gameType: GameType, difficulty: Difficulty, now?: number) => ProfileMetadata | null;
  deleteProfile: (profileId: ProfileId) => void;
  beginSession: (profileId: ProfileId, now?: number) => OfflineTimeReport | null;
  settleOfflineTime: (profileId: ProfileId, source: OfflineTimeSource, now?: number) => OfflineTimeCreditResult | null;
  spendOfflineTime: (profileId: ProfileId, seconds: number) => OfflineBankSpendResult | null;
  setOfflineBankForDebug: (profileId: ProfileId, seconds: number) => boolean;
  addOfflineBankForDebug: (profileId: ProfileId, seconds: number) => boolean;
  touchActiveProfile: (profileId: ProfileId, now?: number) => boolean;
  finishSession: (profileId: ProfileId, now?: number) => boolean;
  dismissOfflineReport: () => void;
  setSessionConflictMessage: (message: string | null) => void;
}

const initialIndex = migrateLegacySingleSaveIfNeeded();

function withSlot(index: ProfileIndexV1, slot: ProfileSlot, metadata: ProfileMetadata | null): ProfileIndexV1 {
  const slots = [...index.slots] as ProfileIndexV1["slots"];
  slots[slot - 1] = metadata;
  return { version: 1, slots };
}

function metadataFor(index: ProfileIndexV1, profileId: ProfileId): ProfileMetadata | null {
  return index.slots.find((entry) => entry?.id === profileId) ?? null;
}

function canMutateProfile(profileId: ProfileId): boolean {
  return isProfileSessionOwner(profileId, getProfileSessionOwnerId());
}

function reportFromResult(result: OfflineTimeCreditResult): OfflineTimeReport {
  return { ...result, awaySeconds: result.rawAwaySeconds };
}

export const useProfileStore = create<ProfileStoreState>((set, get) => ({
  index: initialIndex,
  pendingOfflineReport: null,
  sessionConflictMessage: null,
  refreshProfiles: () => set({ index: readProfileIndex() }),
  createProfileMetadata: (slot, gameType, difficulty, now = Date.now()) => {
    if (gameType !== "regular" || difficulty !== "normal" || slotMetadata(get().index, slot)) return null;
    const timestamp = normalizeTimestampMs(now);
    const metadata: ProfileMetadata = {
      id: `profile-${slot}` as ProfileId,
      slot,
      gameType,
      difficulty,
      createdAt: timestamp,
      lastPlayedAt: timestamp,
      lastActiveAt: timestamp,
      offlineBankSeconds: 0,
    };
    const index = withSlot(get().index, slot, metadata);
    writeProfileIndex(index);
    set({ index, sessionConflictMessage: null });
    return metadata;
  },
  deleteProfile: (profileId) => {
    const metadata = metadataFor(get().index, profileId);
    if (!metadata) return;
    clearProfileGameSave(profileId);
    clearProfileSessionLease(profileId);
    const index = withSlot(get().index, metadata.slot, null);
    writeProfileIndex(index);
    set({ index, pendingOfflineReport: null });
  },
  settleOfflineTime: (profileId, source, now = Date.now()) => {
    const metadata = metadataFor(get().index, profileId);
    if (!metadata || !canMutateProfile(profileId)) return null;
    const result = calculateOfflineTimeCredit({
      profileId,
      lastActiveAt: metadata.lastActiveAt,
      now,
      bankBeforeSeconds: metadata.offlineBankSeconds,
      source,
    }, offlineTimePolicy);
    const updated = { ...metadata, offlineBankSeconds: result.bankAfterSeconds, lastActiveAt: result.settledAt };
    const index = withSlot(get().index, metadata.slot, updated);
    writeProfileIndex(index);
    const report = reportFromResult(result);
    set({
      index,
      pendingOfflineReport: result.rawAwaySeconds >= offlineTimePolicy.reportMinSeconds ? report : get().pendingOfflineReport,
    });
    return result;
  },
  beginSession: (profileId, now = Date.now()) => {
    const result = get().settleOfflineTime(profileId, "profile-load", now);
    if (!result) return null;
    const metadata = metadataFor(get().index, profileId);
    if (!metadata) return null;
    const updated = { ...metadata, lastPlayedAt: result.settledAt };
    const index = withSlot(get().index, metadata.slot, updated);
    writeProfileIndex(index);
    const report = reportFromResult(result);
    set({ index, pendingOfflineReport: result.rawAwaySeconds >= offlineTimePolicy.reportMinSeconds ? report : null });
    return report;
  },
  spendOfflineTime: (profileId, seconds) => {
    const metadata = metadataFor(get().index, profileId);
    if (!metadata || !canMutateProfile(profileId)) return null;
    const result = spendOfflineBankTime(metadata.offlineBankSeconds, seconds, offlineTimePolicy);
    if (!result.ok) return result;
    const updated = { ...metadata, offlineBankSeconds: result.bankAfterSeconds };
    const index = withSlot(get().index, metadata.slot, updated);
    writeProfileIndex(index);
    set({ index });
    return result;
  },
  setOfflineBankForDebug: (profileId, seconds) => {
    const metadata = metadataFor(get().index, profileId);
    if (!metadata || !canMutateProfile(profileId)) return false;
    const updated = { ...metadata, offlineBankSeconds: normalizeBankSeconds(seconds, offlineTimePolicy) };
    const index = withSlot(get().index, metadata.slot, updated);
    writeProfileIndex(index);
    set({ index });
    return true;
  },
  addOfflineBankForDebug: (profileId, seconds) => {
    const metadata = metadataFor(get().index, profileId);
    if (!metadata || !canMutateProfile(profileId) || !Number.isFinite(seconds)) return false;
    const updated = { ...metadata, offlineBankSeconds: normalizeBankSeconds(metadata.offlineBankSeconds + Math.max(0, Math.floor(seconds)), offlineTimePolicy) };
    const index = withSlot(get().index, metadata.slot, updated);
    writeProfileIndex(index);
    set({ index });
    return true;
  },
  touchActiveProfile: (profileId, now = Date.now()) => {
    const metadata = metadataFor(get().index, profileId);
    if (!metadata || !canMutateProfile(profileId)) return false;
    const timestamp = normalizeTimestampMs(now);
    const index = withSlot(get().index, metadata.slot, { ...metadata, lastActiveAt: timestamp });
    writeProfileIndex(index);
    set({ index });
    return true;
  },
  finishSession: (profileId, now = Date.now()) => {
    const metadata = metadataFor(get().index, profileId);
    if (!metadata || !canMutateProfile(profileId)) return false;
    const timestamp = normalizeTimestampMs(now);
    const index = withSlot(get().index, metadata.slot, { ...metadata, lastActiveAt: timestamp, lastPlayedAt: timestamp });
    writeProfileIndex(index);
    set({ index });
    return true;
  },
  dismissOfflineReport: () => set({ pendingOfflineReport: null }),
  setSessionConflictMessage: (message) => set({ sessionConflictMessage: message }),
}));

export function getProfileMetadata(profileId: ProfileId): ProfileMetadata | null {
  return metadataFor(useProfileStore.getState().index, profileId);
}

export function getProfileSave(profileId: ProfileId) {
  return loadProfileGameSave(profileId);
}

export function getActiveProfileLease(profileId: ProfileId): ProfileSessionLease | null {
  return readProfileSessionLease(profileId);
}
