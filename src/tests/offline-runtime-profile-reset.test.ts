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
      profileId: "profile-1",
      activityType: "combat-hunt",
      simulation: {
        requestedSeconds: 300,
        activitySeconds: 300,
        bankSpentSeconds: 300,
        wastedSeconds: 0,
        stopReason: "requested-time-complete",
        state: useGameStore.getState().game,
        summary: { enemiesDefeated: 0, damageDealt: 0, damageTaken: 0, healing: 0, highestHit: 0, proficiencyXp: {}, progressionRows: [], gold: 0, itemsGained: 0, lootGained: {}, itemInstanceIdsGained: [], requestedSeconds: 300, activitySeconds: 300, wastedSeconds: 0, eventSteps: 0, virtualElapsedSeconds: 300 },
      },
    });
    useOfflineActivityRuntimeStore.getState().setMessage("old profile error");
    returnToProfileSelect();
    expect(createAndEnterProfile(2, "regular", "normal")).toBe(true);
    const runtime = useOfflineActivityRuntimeStore.getState();
    expect(runtime.lastResult).toBeNull();
    expect(runtime.message).toBeNull();
    expect(runtime.transactionRunning).toBe(false);
    expect(runtime.resultsOpen).toBe(false);
  });
});
