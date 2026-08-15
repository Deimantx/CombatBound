import { create } from "zustand";
import { loadProfileGameSave, migrateLegacySingleSaveIfNeeded, readProfileIndex, writeProfileIndex, clearProfileGameSave, slotMetadata } from "../game/profiles/profileStorage";
import { OFFLINE_REPORT_MIN_SECONDS, type Difficulty, type GameType, type OfflineTimeReport, type ProfileId, type ProfileIndexV1, type ProfileMetadata, type ProfileSlot } from "../game/profiles/profileTypes";

interface ProfileStoreState {
  index: ProfileIndexV1;
  pendingOfflineReport: OfflineTimeReport | null;
  refreshProfiles: () => void;
  createProfileMetadata: (slot: ProfileSlot, gameType: GameType, difficulty: Difficulty) => ProfileMetadata | null;
  deleteProfile: (profileId: ProfileId) => void;
  beginSession: (profileId: ProfileId, now?: number) => OfflineTimeReport | null;
  touchActiveProfile: (profileId: ProfileId, now?: number) => void;
  finishSession: (profileId: ProfileId, now?: number) => void;
  dismissOfflineReport: () => void;
}

const initialIndex = migrateLegacySingleSaveIfNeeded();

function withSlot(index: ProfileIndexV1, slot: ProfileSlot, metadata: ProfileMetadata | null): ProfileIndexV1 {
  const slots = [...index.slots] as ProfileIndexV1["slots"];
  slots[slot - 1] = metadata;
  return { version: 1, slots };
}

export const useProfileStore = create<ProfileStoreState>((set, get) => ({
  index: initialIndex,
  pendingOfflineReport: null,
  refreshProfiles: () => set({ index: readProfileIndex() }),
  createProfileMetadata: (slot, gameType, difficulty) => {
    if (gameType !== "regular" || difficulty !== "normal" || slotMetadata(get().index, slot)) return null;
    const now = Date.now();
    const metadata: ProfileMetadata = { id: `profile-${slot}` as ProfileId, slot, gameType, difficulty, createdAt: now, lastPlayedAt: now, lastActiveAt: now, offlineBankSeconds: 0 };
    const index = withSlot(get().index, slot, metadata);
    writeProfileIndex(index);
    set({ index });
    return metadata;
  },
  deleteProfile: (profileId) => {
    const metadata = get().index.slots.find((entry) => entry?.id === profileId);
    if (!metadata) return;
    clearProfileGameSave(profileId);
    const index = withSlot(get().index, metadata.slot, null);
    writeProfileIndex(index);
    set({ index, pendingOfflineReport: null });
  },
  beginSession: (profileId, now = Date.now()) => {
    const metadata = get().index.slots.find((entry) => entry?.id === profileId);
    if (!metadata) return null;
    const awaySeconds = Math.max(0, Math.floor((now - metadata.lastActiveAt) / 1000));
    const report: OfflineTimeReport = { profileId, awaySeconds, bankBeforeSeconds: metadata.offlineBankSeconds, bankAfterSeconds: metadata.offlineBankSeconds + awaySeconds };
    const updated = { ...metadata, offlineBankSeconds: report.bankAfterSeconds, lastActiveAt: now, lastPlayedAt: now };
    const index = withSlot(get().index, metadata.slot, updated);
    writeProfileIndex(index);
    set({ index, pendingOfflineReport: awaySeconds >= OFFLINE_REPORT_MIN_SECONDS ? report : null });
    return report;
  },
  touchActiveProfile: (profileId, now = Date.now()) => {
    const metadata = get().index.slots.find((entry) => entry?.id === profileId);
    if (!metadata) return;
    const index = withSlot(get().index, metadata.slot, { ...metadata, lastActiveAt: now });
    writeProfileIndex(index);
    set({ index });
  },
  finishSession: (profileId, now = Date.now()) => {
    const metadata = get().index.slots.find((entry) => entry?.id === profileId);
    if (!metadata) return;
    const index = withSlot(get().index, metadata.slot, { ...metadata, lastActiveAt: now, lastPlayedAt: now });
    writeProfileIndex(index);
    set({ index });
  },
  dismissOfflineReport: () => set({ pendingOfflineReport: null }),
}));

export function getProfileMetadata(profileId: ProfileId): ProfileMetadata | null {
  return useProfileStore.getState().index.slots.find((entry) => entry?.id === profileId) ?? null;
}

export function getProfileSave(profileId: ProfileId) {
  return loadProfileGameSave(profileId);
}
