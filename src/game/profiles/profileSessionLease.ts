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

function writeLease(profileId: ProfileId, lease: ProfileSessionLease | null): void {
  if (typeof localStorage === "undefined") return;
  const key = profileSessionLeaseKey(profileId);
  if (lease) localStorage.setItem(key, JSON.stringify(lease));
  else localStorage.removeItem(key);
}

export function acquireProfileSessionLease(
  profileId: ProfileId,
  ownerId: string,
  now: number,
): ProfileSessionLeaseResult {
  const result = calculateLease(readProfileSessionLease(profileId), profileId, ownerId, now, offlineTimePolicy);
  if (result.ok && result.lease) writeLease(profileId, result.lease);
  return result;
}

export function renewProfileSessionLease(profileId: ProfileId, ownerId: string, now: number): boolean {
  const result = acquireProfileSessionLease(profileId, ownerId, now);
  return result.ok && result.lease?.ownerId === ownerId;
}

export function releaseOwnedProfileSessionLease(profileId: ProfileId, ownerId: string): boolean {
  const existing = readProfileSessionLease(profileId);
  const next = calculateRelease(existing, ownerId);
  if (next === existing) return false;
  writeLease(profileId, next);
  return true;
}

/** Explicit profile deletion cleanup; ownership is no longer meaningful once metadata is gone. */
export function clearProfileSessionLease(profileId: ProfileId): void {
  writeLease(profileId, null);
}

export function isProfileSessionOwner(profileId: ProfileId, ownerId: string, now = Date.now()): boolean {
  const lease = readProfileSessionLease(profileId);
  return !lease || (lease.ownerId === ownerId && lease.expiresAt > now);
}

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
