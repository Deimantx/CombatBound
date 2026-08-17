import type { ProfileId } from "../profiles/profileTypes";
import { offlineTimePolicy, type OfflineTimePolicy } from "./offlineTimePolicy";

export interface ProfileSessionLease {
  version: 1;
  profileId: ProfileId;
  ownerId: string;
  acquiredAt: number;
  heartbeatAt: number;
  expiresAt: number;
}

export type ProfileSessionLeaseStatus = "acquired" | "renewed" | "taken-over" | "rejected";

export interface ProfileSessionLeaseResult {
  ok: boolean;
  status: ProfileSessionLeaseStatus;
  lease: ProfileSessionLease | null;
}

export function acquireProfileSessionLease(
  existing: ProfileSessionLease | null,
  profileId: ProfileId,
  ownerId: string,
  now: number,
  policy: OfflineTimePolicy = offlineTimePolicy,
): ProfileSessionLeaseResult {
  const timestamp = Number.isFinite(now) ? Math.max(0, Math.floor(now)) : 0;
  const expiresAt = timestamp + policy.sessionLeaseTtlMs;
  if (!existing) {
    return { ok: true, status: "acquired", lease: { version: 1, profileId, ownerId, acquiredAt: timestamp, heartbeatAt: timestamp, expiresAt } };
  }
  if (existing.ownerId === ownerId) {
    return { ok: true, status: "renewed", lease: { ...existing, heartbeatAt: timestamp, expiresAt } };
  }
  if (existing.expiresAt <= timestamp) {
    return { ok: true, status: "taken-over", lease: { version: 1, profileId, ownerId, acquiredAt: timestamp, heartbeatAt: timestamp, expiresAt } };
  }
  return { ok: false, status: "rejected", lease: existing };
}

export function releaseProfileSessionLease(
  existing: ProfileSessionLease | null,
  ownerId: string,
): ProfileSessionLease | null {
  return existing?.ownerId === ownerId ? null : existing;
}

export function isProfileSessionLeaseExpired(lease: ProfileSessionLease | null, now: number): boolean {
  return Boolean(lease && lease.expiresAt <= now);
}
