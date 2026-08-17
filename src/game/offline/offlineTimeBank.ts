import { offlineTimePolicy, type OfflineTimePolicy } from "./offlineTimePolicy";
import type {
  OfflineBankSpendResult,
  OfflineTimeCreditInput,
  OfflineTimeCreditResult,
} from "./offlineTimeTypes";

export function normalizeTimestampMs(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function normalizeBankSeconds(
  value: number,
  policy: OfflineTimePolicy = offlineTimePolicy,
): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(policy.bankCapSeconds, Math.floor(value));
}

export function calculateOfflineTimeCredit(
  input: OfflineTimeCreditInput,
  policy: OfflineTimePolicy = offlineTimePolicy,
): OfflineTimeCreditResult {
  // Client wall-clock changes cannot be proven fraudulent; caps bound their effect.
  const previousActiveAt = normalizeTimestampMs(input.lastActiveAt);
  const settledAt = normalizeTimestampMs(input.now);
  const bankBeforeSeconds = normalizeBankSeconds(input.bankBeforeSeconds, policy);

  if (settledAt < previousActiveAt) {
    return {
      profileId: input.profileId,
      source: input.source,
      previousActiveAt,
      settledAt,
      rawAwaySeconds: 0,
      eligibleAwaySeconds: 0,
      creditedSeconds: 0,
      discardedSeconds: 0,
      bankBeforeSeconds,
      bankAfterSeconds: bankBeforeSeconds,
      anomaly: "clock-rollback",
      discardReason: "none",
    };
  }

  const rawAwaySeconds = Math.max(0, Math.floor((settledAt - previousActiveAt) / 1000));
  const eligibleAwaySeconds = Math.min(rawAwaySeconds, policy.maxSingleCreditSeconds);
  const remainingCapacity = Math.max(0, policy.bankCapSeconds - bankBeforeSeconds);
  const creditedSeconds = Math.min(eligibleAwaySeconds, remainingCapacity);
  const discardedSeconds = rawAwaySeconds - creditedSeconds;
  const hitSingleCap = rawAwaySeconds > eligibleAwaySeconds;
  const hitBankCap = eligibleAwaySeconds > creditedSeconds;

  return {
    profileId: input.profileId,
    source: input.source,
    previousActiveAt,
    settledAt,
    rawAwaySeconds,
    eligibleAwaySeconds,
    creditedSeconds,
    discardedSeconds,
    bankBeforeSeconds,
    bankAfterSeconds: bankBeforeSeconds + creditedSeconds,
    anomaly: "none",
    discardReason: hitSingleCap && hitBankCap
      ? "single-credit-cap-and-bank-cap"
      : hitSingleCap
        ? "single-credit-cap"
        : hitBankCap
          ? "bank-cap"
          : "none",
  };
}

export function spendOfflineBankTime(
  bankBeforeInput: number,
  requestedInput: number,
  policy: OfflineTimePolicy = offlineTimePolicy,
): OfflineBankSpendResult {
  const bankBeforeSeconds = normalizeBankSeconds(bankBeforeInput, policy);
  if (!Number.isFinite(requestedInput) || requestedInput <= 0) {
    return {
      ok: false,
      requestedSeconds: requestedInput,
      spentSeconds: 0,
      bankBeforeSeconds,
      bankAfterSeconds: bankBeforeSeconds,
      error: "invalid-request",
    };
  }

  const requestedSeconds = Math.floor(requestedInput);
  if (requestedSeconds <= 0) {
    return {
      ok: false,
      requestedSeconds,
      spentSeconds: 0,
      bankBeforeSeconds,
      bankAfterSeconds: bankBeforeSeconds,
      error: "invalid-request",
    };
  }
  if (requestedSeconds > bankBeforeSeconds) {
    return {
      ok: false,
      requestedSeconds,
      spentSeconds: 0,
      bankBeforeSeconds,
      bankAfterSeconds: bankBeforeSeconds,
      error: "insufficient-bank",
    };
  }
  return {
    ok: true,
    requestedSeconds,
    spentSeconds: requestedSeconds,
    bankBeforeSeconds,
    bankAfterSeconds: bankBeforeSeconds - requestedSeconds,
  };
}
