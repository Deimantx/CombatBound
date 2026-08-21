import { loadLegacySingleGameSaveForProfileMigration, parseGameSaveJson } from "../persistence/saveGame";
import type { GameSaveV14, GameSaveV15, GameSaveV16, GameSaveV17 } from "../persistence/saveTypes";
import { normalizeBankSeconds, normalizeTimestampMs } from "../offline/offlineTimeBank";
import { offlineTimePolicy } from "../offline/offlineTimePolicy";
import {
  PROFILE_SLOT_COUNT,
  isDifficulty,
  isProfileId,
  isProfileSlot,
  profileIdForSlot,
  type ProfileId,
  type ProfileIndexV1,
  type ProfileMetadata,
  type ProfileSlot,
} from "./profileTypes";

export const PROFILE_INDEX_KEY = "combatbound-profiles-v1";
export const PROFILE_MIGRATION_KEY = "combatbound-profile-migration-v1";

function emptyProfileIndex(): ProfileIndexV1 {
  return { version: 1, slots: [null, null, null] };
}

function normalizeMetadata(value: unknown, expectedSlot: ProfileSlot): ProfileMetadata | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ProfileMetadata>;
  if (!isProfileSlot(candidate.slot) || candidate.slot !== expectedSlot) return null;
  if (!isProfileId(candidate.id) || candidate.id !== profileIdForSlot(expectedSlot)) return null;
  if (candidate.gameType !== "regular" || !isDifficulty(candidate.difficulty)) return null;
  const timestamps = [candidate.createdAt, candidate.lastPlayedAt, candidate.lastActiveAt];
  if (!timestamps.every((entry) => typeof entry === "number" && Number.isFinite(entry) && entry >= 0)) return null;
  const createdAt = normalizeTimestampMs(candidate.createdAt ?? 0);
  const lastPlayedAt = normalizeTimestampMs(candidate.lastPlayedAt ?? 0);
  const lastActiveAt = normalizeTimestampMs(candidate.lastActiveAt ?? 0);
  if (typeof createdAt !== "number" || typeof lastPlayedAt !== "number" || typeof lastActiveAt !== "number") return null;
  return {
    id: candidate.id,
    slot: expectedSlot,
    gameType: "regular",
    difficulty: candidate.difficulty,
    createdAt,
    lastPlayedAt,
    lastActiveAt,
    // A malformed compatible bank field must not discard an otherwise valid profile.
    offlineBankSeconds: normalizeBankSeconds(candidate.offlineBankSeconds ?? 0, offlineTimePolicy),
  };
}

export function readProfileIndex(): ProfileIndexV1 {
  if (typeof localStorage === "undefined") return emptyProfileIndex();
  try {
    const raw = localStorage.getItem(PROFILE_INDEX_KEY);
    if (!raw) return emptyProfileIndex();
    const value = JSON.parse(raw) as { version?: unknown; slots?: unknown[] };
    if (value.version !== 1 || !Array.isArray(value.slots)) return emptyProfileIndex();
    const slots = [1, 2, 3].map((slot) => normalizeMetadata(value.slots?.[slot - 1], slot as ProfileSlot)) as ProfileIndexV1["slots"];
    const normalized = { version: 1 as const, slots };
    // Policy normalization is deliberately persisted at the profile boundary so
    // an older prototype bank cannot reappear above the seven-day cap.
    if (JSON.stringify(normalized) !== JSON.stringify(value)) writeProfileIndex(normalized);
    return normalized;
  } catch {
    return emptyProfileIndex();
  }
}

export function writeProfileIndex(index: ProfileIndexV1): boolean {
  if (typeof localStorage === "undefined") return true;
  const normalized = { version: 1 as const, slots: [1, 2, 3].map((slot) => normalizeMetadata(index.slots[slot - 1], slot as ProfileSlot)) as ProfileIndexV1["slots"] };
  try {
    localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function getProfileSaveKey(profileId: ProfileId): string {
  return `combatbound-${profileId}-save`;
}

export function loadProfileGameSave(profileId: ProfileId): GameSaveV17 | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(getProfileSaveKey(profileId));
    return raw ? parseGameSaveJson(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfileGameSave(profileId: ProfileId, save: GameSaveV17 | GameSaveV16 | GameSaveV15 | GameSaveV14): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    localStorage.setItem(getProfileSaveKey(profileId), JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearProfileGameSave(profileId: ProfileId): void {
  if (typeof localStorage !== "undefined") localStorage.removeItem(getProfileSaveKey(profileId));
}

export function createEmptyProfileIndex(): ProfileIndexV1 {
  return emptyProfileIndex();
}

export function migrateLegacySingleSaveIfNeeded(): ProfileIndexV1 {
  const current = readProfileIndex();
  if (typeof localStorage === "undefined" || localStorage.getItem(PROFILE_MIGRATION_KEY)) return current;
  if (current.slots.some(Boolean)) {
    localStorage.setItem(PROFILE_MIGRATION_KEY, "1");
    return current;
  }
  const legacySave = loadLegacySingleGameSaveForProfileMigration();
  if (legacySave) {
    const now = Date.now();
    const profile: ProfileMetadata = { id: "profile-1", slot: 1, gameType: "regular", difficulty: "normal", createdAt: now, lastPlayedAt: now, lastActiveAt: now, offlineBankSeconds: 0 };
    const migrated = { version: 1 as const, slots: [profile, null, null] as ProfileIndexV1["slots"] };
    saveProfileGameSave(profile.id, legacySave);
    writeProfileIndex(migrated);
    localStorage.setItem(PROFILE_MIGRATION_KEY, "1");
    return migrated;
  }
  localStorage.setItem(PROFILE_MIGRATION_KEY, "1");
  writeProfileIndex(current);
  return current;
}

export function slotMetadata(index: ProfileIndexV1, slot: ProfileSlot): ProfileMetadata | null {
  return index.slots[slot - 1];
}

export { PROFILE_SLOT_COUNT };
