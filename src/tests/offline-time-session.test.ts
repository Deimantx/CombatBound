import { beforeEach, describe, expect, it } from "vitest";
import { acquireProfileSessionLease, releaseProfileSessionLease } from "../game/offline/offlineTimeSession";
import { acquireProfileSessionLease as acquireStored, clearProfileSessionLease, profileSessionLeaseKey, readProfileSessionLease, releaseOwnedProfileSessionLease } from "../game/profiles/profileSessionLease";

describe("Offline Time session leases", () => {
  beforeEach(() => localStorage.clear());

  it("acquires, renews, rejects contention, and takes over after expiry", () => {
    const acquired = acquireProfileSessionLease(null, "profile-1", "tab-a", 1000);
    expect(acquired.ok).toBe(true);
    const renewed = acquireProfileSessionLease(acquired.lease, "profile-1", "tab-a", 2000);
    expect(renewed.status).toBe("renewed");
    const rejected = acquireProfileSessionLease(renewed.lease, "profile-1", "tab-b", 2001);
    expect(rejected.ok).toBe(false);
    const taken = acquireProfileSessionLease(renewed.lease, "profile-1", "tab-b", 303_001);
    expect(taken.ok).toBe(true);
    expect(taken.status).toBe("taken-over");
  });

  it("only the owner can release a stored lease", () => {
    const key = profileSessionLeaseKey("profile-1");
    expect(acquireStored("profile-1", "tab-a", 1000).ok).toBe(true);
    expect(releaseProfileSessionLease(readProfileSessionLease("profile-1"), "tab-b")).not.toBeNull();
    expect(releaseOwnedProfileSessionLease("profile-1", "tab-b")).toBe(false);
    expect(localStorage.getItem(key)).not.toBeNull();
    expect(releaseOwnedProfileSessionLease("profile-1", "tab-a")).toBe(true);
    expect(localStorage.getItem(key)).toBeNull();
    clearProfileSessionLease("profile-1");
  });
});
