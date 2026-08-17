import type { ProfileId } from "../profiles/profileTypes";

export type OfflineTimeSource = "profile-load" | "visibility-resume" | "debug";
export type OfflineTimeAnomaly = "none" | "clock-rollback";
export type OfflineTimeDiscardReason =
  | "none"
  | "single-credit-cap"
  | "bank-cap"
  | "single-credit-cap-and-bank-cap";

export interface OfflineTimeCreditInput {
  profileId: ProfileId;
  lastActiveAt: number;
  now: number;
  bankBeforeSeconds: number;
  source: OfflineTimeSource;
}

export interface OfflineTimeCreditResult {
  profileId: ProfileId;
  source: OfflineTimeSource;
  previousActiveAt: number;
  settledAt: number;
  rawAwaySeconds: number;
  eligibleAwaySeconds: number;
  creditedSeconds: number;
  discardedSeconds: number;
  bankBeforeSeconds: number;
  bankAfterSeconds: number;
  anomaly: OfflineTimeAnomaly;
  discardReason: OfflineTimeDiscardReason;
}

export type OfflineBankSpendFailure = "invalid-request" | "insufficient-bank";

export interface OfflineBankSpendResult {
  ok: boolean;
  requestedSeconds: number;
  spentSeconds: number;
  bankBeforeSeconds: number;
  bankAfterSeconds: number;
  error?: OfflineBankSpendFailure;
}
