import { useEffect } from "react";
import { offlineTimePolicy } from "../../game/offline/offlineTimePolicy";
import {
  getProfileSessionOwnerId,
  isProfileSessionOwner,
  profileSessionLeaseKey,
  readProfileSessionLease,
  releaseOwnedProfileSessionLease,
  renewProfileSessionLease,
} from "../../game/profiles/profileSessionLease";
import type { ProfileId } from "../../game/profiles/profileTypes";
import { useGameStore } from "../../state/gameStore";
import { useProfileStore } from "../../state/profileStore";
import { disconnectForSessionConflict } from "./profileSessionController";

function owns(profileId: ProfileId): boolean {
  return isProfileSessionOwner(profileId, getProfileSessionOwnerId());
}

function handleConflict(profileId: ProfileId): void {
  if (useGameStore.getState().activeProfileId === profileId) disconnectForSessionConflict();
}

/** Coordinates visibility accounting and the profile lease; hidden pages never advance gameplay. */
export function ProfileSessionCoordinator({ profileId }: { profileId: ProfileId }) {
  useEffect(() => {
    const ownerId = getProfileSessionOwnerId();
    let closed = false;

    const verify = () => {
      if (!owns(profileId)) handleConflict(profileId);
      return owns(profileId);
    };

    const suspend = () => {
      if (closed || document.visibilityState !== "hidden" || !verify()) return;
      // Save gameplay before moving the accounting boundary. Hidden time is banked,
      // never simulated by the live combat runtime.
      const saved = useGameStore.getState().saveActiveProfileNow();
      const touched = useProfileStore.getState().touchActiveProfile(profileId, Date.now());
      const renewed = renewProfileSessionLease(profileId, ownerId, Date.now());
      if (!saved || !touched || !renewed) handleConflict(profileId);
    };

    const resume = () => {
      if (closed || document.visibilityState !== "visible" || !verify()) return;
      const result = useProfileStore.getState().settleOfflineTime(profileId, "visibility-resume", Date.now());
      const renewed = renewProfileSessionLease(profileId, ownerId, Date.now());
      if ((!result && !owns(profileId)) || !renewed) handleConflict(profileId);
    };

    const heartbeat = () => {
      if (closed || !verify()) return;
      const now = Date.now();
      if (document.visibilityState === "hidden") {
        // Lease heartbeat and time-bank anchor are intentionally independent.
        renewProfileSessionLease(profileId, ownerId, now);
        return;
      }
      const saved = useGameStore.getState().saveActiveProfileNow();
      const touched = useProfileStore.getState().touchActiveProfile(profileId, now);
      const renewed = renewProfileSessionLease(profileId, ownerId, now);
      if (!saved || !touched || !renewed) handleConflict(profileId);
    };

    const close = () => {
      if (closed || !owns(profileId)) return;
      closed = true;
      if (document.visibilityState === "visible") {
        useGameStore.getState().saveActiveProfileNow();
        useProfileStore.getState().finishSession(profileId, Date.now());
      }
      releaseOwnedProfileSessionLease(profileId, ownerId);
      // pagehide/beforeunload can be followed by a suspended document; detach this
      // runtime so it cannot continue writing after its lease has been released.
      useGameStore.getState().unloadProfile();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") suspend();
      else resume();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === profileSessionLeaseKey(profileId)) {
        const lease = readProfileSessionLease(profileId);
        if (!lease || lease.ownerId !== ownerId || lease.expiresAt <= Date.now()) handleConflict(profileId);
      }
    };

    const interval = window.setInterval(heartbeat, offlineTimePolicy.heartbeatMs);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", close);
    window.addEventListener("beforeunload", close);
    window.addEventListener("storage", handleStorage);
    return () => {
      closed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", close);
      window.removeEventListener("beforeunload", close);
      window.removeEventListener("storage", handleStorage);
    };
  }, [profileId]);

  return null;
}
