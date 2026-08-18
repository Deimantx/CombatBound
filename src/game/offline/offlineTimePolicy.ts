export interface OfflineTimePolicy {
  reportMinSeconds: number;
  maxSingleCreditSeconds: number;
  bankCapSeconds: number;
  heartbeatMs: number;
  sessionLeaseTtlMs: number;
}

/** Central tuning point for profile time accounting and session ownership. */
export const offlineTimePolicy: Readonly<OfflineTimePolicy> = Object.freeze({
  reportMinSeconds: 60,
  maxSingleCreditSeconds: 7 * 24 * 60 * 60,
  bankCapSeconds: 7 * 24 * 60 * 60,
  heartbeatMs: 30_000,
  sessionLeaseTtlMs: 5 * 60_000,
});

export const OFFLINE_MAX_SINGLE_CREDIT_SECONDS = offlineTimePolicy.maxSingleCreditSeconds;
export const OFFLINE_BANK_CAP_SECONDS = offlineTimePolicy.bankCapSeconds;
export const OFFLINE_REPORT_MIN_SECONDS = offlineTimePolicy.reportMinSeconds;
export const PROFILE_HEARTBEAT_MS = offlineTimePolicy.heartbeatMs;
export const PROFILE_SESSION_LEASE_TTL_MS = offlineTimePolicy.sessionLeaseTtlMs;
