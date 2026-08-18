import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAndEnterProfile, returnToProfileSelect } from "../app/profile/profileSessionController";
import { useGameStore } from "../state/gameStore";
import { useProfileStore } from "../state/profileStore";
import { useOfflineActivityRuntimeStore } from "../state/offlineActivityRuntimeStore";

describe("Offline activity runtime profile boundaries", () => {
  beforeEach(() => {
    localStorage.clear();
    useOfflineActivityRuntimeStore.getState().reset();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
  });

  afterEach(() => {
    try { returnToProfileSelect(); } catch { /* test teardown */ }
    localStorage.clear();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
  });

  it("does not show Profile 1 Last Skip or errors in Profile 2", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    useOfflineActivityRuntimeStore.getState().setLastResult({
      activityType: "combat-hunt",
      simulation: {
        requestedSeconds: 300,
        simulatedSeconds: 300,
        stopReason: "requested-time-complete",
        state: useGameStore.getState().game,
        summary: {},
      },
    });
    useOfflineActivityRuntimeStore.getState().setMessage("old profile error");
    returnToProfileSelect();
    expect(createAndEnterProfile(2, "regular", "normal")).toBe(true);
    const runtime = useOfflineActivityRuntimeStore.getState();
    expect(runtime.lastResult).toBeNull();
    expect(runtime.message).toBeNull();
    expect(runtime.transactionRunning).toBe(false);
  });
});
