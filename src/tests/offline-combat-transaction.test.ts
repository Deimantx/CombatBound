import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requestOfflineSkip } from "../app/offline/offlineActivityCoordinator";
import { createAndEnterProfile, returnToProfileSelect } from "../app/profile/profileSessionController";
import { loadProfileGameSave } from "../game/profiles/profileStorage";
import { useGameStore } from "../state/gameStore";
import { useProfileStore } from "../state/profileStore";

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
    expect(result).toMatchObject({ ok: true, simulation: { requestedSeconds: 10, simulatedSeconds: 10, stopReason: "requested-time-complete" } });
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(10);
    expect(useGameStore.getState().game.combat.eventSequence).toBeGreaterThan(beforeSequence);
    expect(loadProfileGameSave("profile-1")?.version).toBe(12);
  });

  it("partially debits a deterministic death and leaves the Hunt defeated", () => {
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
    });
    const result = requestOfflineSkip(60);
    expect(result).toMatchObject({ ok: true, simulation: { requestedSeconds: 60, stopReason: "death" } });
    if (!result.ok) return;
    expect(result.simulation.simulatedSeconds).toBeGreaterThan(0);
    expect(result.simulation.simulatedSeconds).toBeLessThan(60);
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(3600 - result.simulation.simulatedSeconds);
    expect(useGameStore.getState().game.combat.phase).toBe("defeat");
  });
});
