export const PROFILE_SLOT_COUNT = 3;

export type ProfileSlot = 1 | 2 | 3;
export type ProfileId = "profile-1" | "profile-2" | "profile-3";
export type GameType = "regular";
export type Difficulty = "normal" | "hard" | "custom";

export interface ProfileMetadata {
  id: ProfileId;
  slot: ProfileSlot;
  gameType: GameType;
  difficulty: Difficulty;
  createdAt: number;
  lastPlayedAt: number;
  lastActiveAt: number;
  offlineBankSeconds: number;
}

export interface ProfileIndexV1 {
  version: 1;
  slots: [ProfileMetadata | null, ProfileMetadata | null, ProfileMetadata | null];
}

export interface OfflineTimeReport {
  profileId: ProfileId;
  awaySeconds: number;
  bankBeforeSeconds: number;
  bankAfterSeconds: number;
}

export const PROFILE_HEARTBEAT_MS = 30_000;
export const OFFLINE_REPORT_MIN_SECONDS = 60;

export function profileIdForSlot(slot: ProfileSlot): ProfileId {
  return `profile-${slot}` as ProfileId;
}

export function isProfileSlot(value: unknown): value is ProfileSlot {
  return value === 1 || value === 2 || value === 3;
}

export function isProfileId(value: unknown): value is ProfileId {
  return value === "profile-1" || value === "profile-2" || value === "profile-3";
}

export function isDifficulty(value: unknown): value is Difficulty {
  return value === "normal" || value === "hard" || value === "custom";
}
