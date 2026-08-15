import { useEffect } from "react";
import { PROFILE_HEARTBEAT_MS, type ProfileId } from "../../game/profiles/profileTypes";
import { useGameStore } from "../../state/gameStore";
import { useProfileStore } from "../../state/profileStore";

function touch(profileId: ProfileId): void {
  useGameStore.getState().saveActiveProfileNow();
  useProfileStore.getState().touchActiveProfile(profileId);
}

export function ProfileSessionHeartbeat({ profileId }: { profileId: ProfileId }) {
  useEffect(() => {
    const handleLifecycle = () => {
      if (document.visibilityState === "hidden") touch(profileId);
    };
    const handlePageHide = () => touch(profileId);
    const handleBeforeUnload = () => touch(profileId);
    const interval = window.setInterval(() => touch(profileId), PROFILE_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", handleLifecycle);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleLifecycle);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [profileId]);
  return null;
}
