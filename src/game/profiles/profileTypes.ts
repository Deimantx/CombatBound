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
  // Offline Time Bank is profile metadata; raw GameSave imports do not transfer it.
  offlineBankSeconds: number;
}

export interface ProfileIndexV1 {
  version: 1;
  slots: [ProfileMetadata | null, ProfileMetadata | null, ProfileMetadata | null];
}

export type {
  OfflineTimeAnomaly,
  OfflineTimeDiscardReason,
  OfflineTimeSource,
} from "../offline/offlineTimeTypes";
import type {
  OfflineTimeCreditResult,
} from "../offline/offlineTimeTypes";

export interface OfflineTimeReport extends OfflineTimeCreditResult {
  /** Compatibility alias for older UI/test consumers; rawAwaySeconds is canonical. */
  awaySeconds: number;
}

export { OFFLINE_REPORT_MIN_SECONDS, PROFILE_HEARTBEAT_MS } from "../offline/offlineTimePolicy";
export type { OfflineTimeCreditResult } from "../offline/offlineTimeTypes";

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
