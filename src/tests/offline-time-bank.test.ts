import { describe, expect, it } from "vitest";
import { calculateOfflineTimeCredit, normalizeBankSeconds, spendOfflineBankTime } from "../game/offline/offlineTimeBank";
import { offlineTimePolicy } from "../game/offline/offlineTimePolicy";

const input = (overrides: Partial<Parameters<typeof calculateOfflineTimeCredit>[0]> = {}) => ({
  profileId: "profile-1" as const,
  lastActiveAt: 1_000_000,
  now: 1_000_000,
  bankBeforeSeconds: 0,
  source: "profile-load" as const,
  ...overrides,
});

describe("Offline Time Bank domain", () => {
  it("credits a normal absence in whole seconds", () => {
    const result = calculateOfflineTimeCredit(input({ now: 1_000_000 + 7_200_000 }));
    expect(result.rawAwaySeconds).toBe(7200);
    expect(result.eligibleAwaySeconds).toBe(7200);
    expect(result.creditedSeconds).toBe(7200);
    expect(result.bankAfterSeconds).toBe(7200);
  });

  it("floors sub-second time and normalizes invalid balances", () => {
    expect(normalizeBankSeconds(-1)).toBe(0);
    expect(normalizeBankSeconds(Number.NaN)).toBe(0);
    expect(normalizeBankSeconds(4.9)).toBe(4);
    const result = calculateOfflineTimeCredit(input({ now: 1_004_999, bankBeforeSeconds: 3.9 }));
    expect(result.rawAwaySeconds).toBe(4);
    expect(result.bankBeforeSeconds).toBe(3);
    expect(result.creditedSeconds).toBe(4);
  });

  it("applies the single-away cap and total bank cap independently", () => {
    const single = calculateOfflineTimeCredit(input({ now: 1_000_000 + offlineTimePolicy.maxSingleCreditSeconds * 1000 + 1_000 }));
    expect(single.creditedSeconds).toBe(offlineTimePolicy.maxSingleCreditSeconds);
    expect(single.discardedSeconds).toBe(1);
    expect(single.discardReason).toBe("single-credit-cap");

    const total = calculateOfflineTimeCredit(input({
      bankBeforeSeconds: offlineTimePolicy.bankCapSeconds - 60,
      now: 1_000_000 + 3600 * 1000,
    }));
    expect(total.creditedSeconds).toBe(60);
    expect(total.discardReason).toBe("bank-cap");

    const both = calculateOfflineTimeCredit(input({
      bankBeforeSeconds: offlineTimePolicy.bankCapSeconds - 60,
      now: 1_000_000 + (offlineTimePolicy.maxSingleCreditSeconds + 60) * 1000,
    }));
    expect(both.discardReason).toBe("single-credit-cap-and-bank-cap");
  });

  it("handles rollback and repeated settlement safely", () => {
    const rollback = calculateOfflineTimeCredit(input({ now: 999_000, bankBeforeSeconds: 123 }));
    expect(rollback.anomaly).toBe("clock-rollback");
    expect(rollback.creditedSeconds).toBe(0);
    expect(rollback.bankAfterSeconds).toBe(123);
    const settled = calculateOfflineTimeCredit(input({ now: 1_060_000 }));
    const repeated = calculateOfflineTimeCredit(input({ lastActiveAt: settled.settledAt, now: settled.settledAt, bankBeforeSeconds: settled.bankAfterSeconds }));
    expect(repeated.creditedSeconds).toBe(0);
  });

  it("spends exactly or fails without partial spending", () => {
    expect(spendOfflineBankTime(1800, 1800)).toMatchObject({ ok: true, spentSeconds: 1800, bankAfterSeconds: 0 });
    expect(spendOfflineBankTime(1800, 3600)).toMatchObject({ ok: false, spentSeconds: 0, bankAfterSeconds: 1800, error: "insufficient-bank" });
    expect(spendOfflineBankTime(1800, 0)).toMatchObject({ ok: false, error: "invalid-request" });
    expect(spendOfflineBankTime(1800, 3.9)).toMatchObject({ ok: true, requestedSeconds: 3, spentSeconds: 3, bankAfterSeconds: 1797 });
    expect(spendOfflineBankTime(1800, Number.POSITIVE_INFINITY)).toMatchObject({ ok: false, error: "invalid-request" });
  });
});
