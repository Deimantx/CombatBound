import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requestOfflineSkip } from "../app/offline/offlineActivityCoordinator";
import { createAndEnterProfile, returnToProfileSelect } from "../app/profile/profileSessionController";
import { loadProfileGameSave } from "../game/profiles/profileStorage";
import { useGameStore } from "../state/gameStore";
import { useProfileStore } from "../state/profileStore";
import { useOfflineActivityRuntimeStore } from "../state/offlineActivityRuntimeStore";

describe("Offline Combat Time Bank transactions", () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
  });

  afterEach(() => {
    try { returnToProfileSelect(); } catch { /* test teardown */ }
    localStorage.clear();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
  });

  it("commits a full requested skip through canonical Combat and V12 persistence", () => {
    useProfileStore.getState().setOfflineBankForDebug("profile-1", 20);
    useGameStore.getState().startHunt();
    const beforeSequence = useGameStore.getState().game.combat.eventSequence;
    const result = requestOfflineSkip(10);
    expect(result).toMatchObject({ ok: true, simulation: { requestedSeconds: 10, activitySeconds: 10, bankSpentSeconds: 10, wastedSeconds: 0, stopReason: "requested-time-complete" } });
    expect(useOfflineActivityRuntimeStore.getState().resultsOpen).toBe(true);
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(10);
    expect(useGameStore.getState().game.combat.eventSequence).toBeGreaterThan(beforeSequence);
    expect(loadProfileGameSave("profile-1")?.version).toBe(14);
  });

  it("does not open results when the requested skip fails before simulation", () => {
    useGameStore.getState().startHunt();
    const result = requestOfflineSkip(60);
    expect(result).toMatchObject({ ok: false, error: "insufficient-bank" });
    expect(useOfflineActivityRuntimeStore.getState().resultsOpen).toBe(false);
  });

  it("spends the full requested skip when deterministic death ends the Hunt", () => {
    useProfileStore.getState().setOfflineBankForDebug("profile-1", 3600);
    useGameStore.getState().startHunt();
    const current = useGameStore.getState().game;
    useGameStore.getState().replaceGameStateForOfflineSimulation({
      ...current,
      combat: {
        ...current.combat,
        playerHp: 1,
        enemies: current.combat.enemies.map((enemy) => ({ ...enemy, attackTimer: 0 })),
      },
      combatAutomation: { ...current.combatAutomation, enabled: false },
    });
    const result = requestOfflineSkip(60);
    expect(result).toMatchObject({ ok: true, simulation: { requestedSeconds: 60, stopReason: "death" } });
    if (!result.ok) return;
    expect(result.simulation.activitySeconds).toBeGreaterThan(0);
    expect(result.simulation.activitySeconds).toBeLessThan(60);
    expect(result.simulation.bankSpentSeconds).toBe(60);
    expect(useOfflineActivityRuntimeStore.getState().resultsOpen).toBe(true);
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(3600 - 60);
    expect(useGameStore.getState().game.combat.phase).toBe("defeat");
  });
});
