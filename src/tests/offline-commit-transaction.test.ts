
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAndEnterProfile, returnToProfileSelect } from "../app/profile/profileSessionController";
import { commitOfflineActivitySimulation } from "../app/offline/commitOfflineActivitySimulation";
import { gameStateToSaveV20 } from "../game/persistence/saveGame";
import { loadProfileGameSave, saveProfileGameSave } from "../game/profiles/profileStorage";
import { getProfileSessionOwnerId } from "../game/profiles/profileSessionLease";
import { useGameStore } from "../state/gameStore";
import { useProfileStore } from "../state/profileStore";
import { useOfflineActivityRuntimeStore } from "../state/offlineActivityRuntimeStore";

describe("Offline Combat coordinated commit", () => {
  beforeEach(() => {
    localStorage.clear();
    useOfflineActivityRuntimeStore.getState().reset();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    useProfileStore.getState().setOfflineBankForDebug("profile-1", 3600);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try { returnToProfileSelect(); } catch { /* test teardown */ }
    localStorage.clear();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
  });

  function input(nextGame = { ...useGameStore.getState().game, gold: 42 }) {
    const current = useGameStore.getState();
    return {
      profileId: "profile-1" as const,
      ownerId: getProfileSessionOwnerId(),
      previousGame: current.game,
      nextGame,
      bankSpentSeconds: 900,
      reducedMotion: current.reducedMotion,
      showInspectorButton: current.showInspectorButton,
    };
  }

  it("rolls back bank and live/stored gameplay when the gameplay save fails", () => {
    const current = useGameStore.getState();
    const before = gameStateToSaveV20(current.game, { reducedMotion: current.reducedMotion, showInspectorButton: current.showInspectorButton });
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === "combatbound-profile-1-save") throw new Error("forced save failure");
      originalSetItem.call(this, key, value);
    });

    expect(commitOfflineActivitySimulation(input())).toBe(false);
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(3600);
    expect(useGameStore.getState().game.gold).toBe(0);
    expect(loadProfileGameSave("profile-1")).toEqual(before);
  });

  it("persists V17 and publishes both stores only after staged writes succeed", () => {
    expect(commitOfflineActivitySimulation(input())).toBe(true);
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(2700);
    expect(useGameStore.getState().game.gold).toBe(42);
    expect(loadProfileGameSave("profile-1")?.version).toBe(20);
    expect(loadProfileGameSave("profile-1")?.gold).toBe(42);
  });

  it("rolls back the exact stored save when publishing the live result fails", () => {
    const current = useGameStore.getState();
    const liveGame = { ...current.game, gold: 10 };
    expect(useGameStore.getState().replaceGameStateForOfflineSimulation(liveGame)).toBe(true);
    const storedSave = {
      ...gameStateToSaveV20(liveGame, {
        reducedMotion: current.reducedMotion,
        showInspectorButton: current.showInspectorButton,
      }),
      gold: 5,
    };
    expect(saveProfileGameSave("profile-1", storedSave)).toBe(true);

    const originalReplace = useGameStore.getState().replaceGameStateForOfflineSimulation;
    useGameStore.setState({ replaceGameStateForOfflineSimulation: () => false });
    try {
      expect(commitOfflineActivitySimulation({
        ...input({ ...liveGame, gold: 20 }),
        previousGame: liveGame,
      })).toBe(false);
    } finally {
      useGameStore.setState({ replaceGameStateForOfflineSimulation: originalReplace });
    }

    expect(loadProfileGameSave("profile-1")?.gold).toBe(5);
    expect(useGameStore.getState().game.gold).toBe(10);
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(3600);
  });
});
