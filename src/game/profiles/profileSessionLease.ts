import {
  acquireProfileSessionLease as calculateLease,
  releaseProfileSessionLease as calculateRelease,
  type ProfileSessionLease,
  type ProfileSessionLeaseResult,
} from "../offline/offlineTimeSession";
import { offlineTimePolicy } from "../offline/offlineTimePolicy";
import { isProfileId, type ProfileId } from "./profileTypes";

export type { ProfileSessionLease, ProfileSessionLeaseResult } from "../offline/offlineTimeSession";

export const PROFILE_SESSION_KEY_PREFIX = "combatbound-";

// This is a local client lease for accidental multi-tab safety, not server anti-cheat authority.

export function profileSessionLeaseKey(profileId: ProfileId): string {
  return `${PROFILE_SESSION_KEY_PREFIX}${profileId}-session-v1`;
}

function isLease(value: unknown): value is ProfileSessionLease {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProfileSessionLease>;
  return candidate.version === 1 && isProfileId(candidate.profileId) &&
    typeof candidate.ownerId === "string" && candidate.ownerId.length > 0 &&
    [candidate.acquiredAt, candidate.heartbeatAt, candidate.expiresAt].every((entry) => typeof entry === "number" && Number.isFinite(entry));
}

export function readProfileSessionLease(profileId: ProfileId): ProfileSessionLease | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(profileSessionLeaseKey(profileId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLease(parsed) && parsed.profileId === profileId ? parsed : null;
  } catch {
    return null;
  }
}

function writeLease(profileId: ProfileId, lease: ProfileSessionLease | null): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const key = profileSessionLeaseKey(profileId);
    if (lease) localStorage.setItem(key, JSON.stringify(lease));
    else localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function writeLeaseAndConfirm(profileId: ProfileId, result: ProfileSessionLeaseResult): ProfileSessionLeaseResult {
  if (!result.ok || !result.lease) return result;
  if (!writeLease(profileId, result.lease)) return { ok: false, status: "rejected", lease: readProfileSessionLease(profileId) };
  const persisted = readProfileSessionLease(profileId);
  if (!persisted || persisted.profileId !== result.lease.profileId || persisted.ownerId !== result.lease.ownerId || persisted.acquiredAt !== result.lease.acquiredAt || persisted.heartbeatAt !== result.lease.heartbeatAt || persisted.expiresAt !== result.lease.expiresAt) {
    return { ok: false, status: "rejected", lease: persisted };
  }
  return { ...result, lease: persisted };
}

export function acquireProfileSessionLease(
  profileId: ProfileId,
  ownerId: string,
  now: number,
): ProfileSessionLeaseResult {
  const result = calculateLease(readProfileSessionLease(profileId), profileId, ownerId, now, offlineTimePolicy);
  return writeLeaseAndConfirm(profileId, result);
}

/** Lifecycle-only ownership boundary. This may acquire or reclaim; save paths must not call it. */
export function ensureProfileSessionLease(profileId: ProfileId, ownerId: string, now: number): ProfileSessionLeaseResult {
  return acquireProfileSessionLease(profileId, ownerId, now);
}

export function renewProfileSessionLease(profileId: ProfileId, ownerId: string, now: number): boolean {
  const result = acquireProfileSessionLease(profileId, ownerId, now);
  return result.ok && result.lease?.ownerId === ownerId;
}

export function releaseOwnedProfileSessionLease(profileId: ProfileId, ownerId: string): boolean {
  const existing = readProfileSessionLease(profileId);
  const next = calculateRelease(existing, ownerId);
  if (next === existing) return false;
  return writeLease(profileId, next);
}

/** Explicit profile deletion cleanup; ownership is no longer meaningful once metadata is gone. */
export function clearProfileSessionLease(profileId: ProfileId): void {
  writeLease(profileId, null);
}

export function isProfileSessionOwner(profileId: ProfileId, ownerId: string, now = Date.now()): boolean {
  const lease = readProfileSessionLease(profileId);
  return Boolean(lease && lease.ownerId === ownerId && lease.expiresAt > now);
}

export function hasValidOwnedProfileSessionLease(profileId: ProfileId, ownerId: string, now = Date.now()): boolean {
  return isProfileSessionOwner(profileId, ownerId, now);
}

export const hasValidOwnedLease = hasValidOwnedProfileSessionLease;

let documentOwnerId: string | null = null;
let fallbackOwnerSequence = 0;

export function getProfileSessionOwnerId(): string {
  if (documentOwnerId) return documentOwnerId;
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) documentOwnerId = uuid;
  } catch {
    // Test/jsdom environments may expose crypto without randomUUID.
  }
  fallbackOwnerSequence += 1;
  documentOwnerId ??= `owner-${Date.now().toString(36)}-${fallbackOwnerSequence}-${Math.random().toString(36).slice(2)}`;
  return documentOwnerId;
}
