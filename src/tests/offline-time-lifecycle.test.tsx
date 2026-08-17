import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileSessionCoordinator } from "../app/profile/ProfileSessionCoordinator";
import { SimulationDriver } from "../app/simulation/SimulationDriver";
import { createAndEnterProfile, returnToProfileSelect } from "../app/profile/profileSessionController";
import { useGameStore } from "../state/gameStore";
import { useProfileStore } from "../state/profileStore";
import type { OfflineTimeReport } from "../game/profiles/profileTypes";
import { readProfileSessionLease } from "../game/profiles/profileSessionLease";

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value });
  fireEvent(document, new Event("visibilitychange"));
}

describe("Offline Time browser lifecycle", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    setVisibility("visible");
  });

  afterEach(() => {
    cleanup();
    try { returnToProfileSelect(); } catch { /* profile may already be unloaded */ }
    vi.useRealTimers();
    localStorage.clear();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
    setVisibility("visible");
  });

  it("settles hidden time once and does not move the anchor while hidden", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    render(<ProfileSessionCoordinator profileId="profile-1" />);
    act(() => {
      vi.setSystemTime(1_001_000);
      setVisibility("hidden");
      vi.advanceTimersByTime(3_600_000);
    });
    const hiddenAnchor = useProfileStore.getState().index.slots[0]!.lastActiveAt;
    expect(hiddenAnchor).toBe(1_001_000);
    act(() => {
      vi.setSystemTime(1_001_000 + 3_600_000);
      setVisibility("visible");
    });
    const banked = useProfileStore.getState().index.slots[0]!.offlineBankSeconds;
    expect(banked).toBe(3600);
    act(() => setVisibility("visible"));
    expect(useProfileStore.getState().index.slots[0]!.offlineBankSeconds).toBe(banked);
  });

  it("does not advance live simulation while hidden", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    useGameStore.getState().startHunt();
    render(<SimulationDriver />);
    act(() => vi.advanceTimersByTime(300));
    const beforeHidden = useGameStore.getState().game.combat.session.elapsedSeconds;
    act(() => {
      setVisibility("hidden");
      vi.advanceTimersByTime(5_000);
    });
    expect(useGameStore.getState().game.combat.session.elapsedSeconds).toBe(beforeHidden);
  });

  it("pauses the live driver while the offline report is open", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    useGameStore.getState().startHunt();
    render(<SimulationDriver />);
    act(() => vi.advanceTimersByTime(500));
    const beforeReport = useGameStore.getState().game.combat.session.elapsedSeconds;
    const report: OfflineTimeReport = {
      profileId: "profile-1",
      source: "profile-load",
      previousActiveAt: 0,
      settledAt: 60_000,
      rawAwaySeconds: 60,
      eligibleAwaySeconds: 60,
      creditedSeconds: 60,
      discardedSeconds: 0,
      bankBeforeSeconds: 0,
      bankAfterSeconds: 60,
      anomaly: "none",
      discardReason: "none",
      awaySeconds: 60,
    };
    act(() => useProfileStore.setState({ pendingOfflineReport: report }));
    act(() => vi.advanceTimersByTime(1_000));
    expect(useGameStore.getState().game.combat.session.elapsedSeconds).toBe(beforeReport);
    act(() => useProfileStore.getState().dismissOfflineReport());
    act(() => vi.advanceTimersByTime(1_000));
    expect(useGameStore.getState().game.combat.session.elapsedSeconds).toBeGreaterThan(beforeReport);
  });

  it("keeps a BFCache page alive and re-establishes an expired same-owner lease", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    render(<ProfileSessionCoordinator profileId="profile-1" />);
    const persistedHide = new Event("pagehide");
    Object.defineProperty(persistedHide, "persisted", { value: true });
    act(() => fireEvent(window, persistedHide));
    expect(useGameStore.getState().activeProfileId).toBe("profile-1");
    expect(readProfileSessionLease("profile-1")).not.toBeNull();
    act(() => {
      vi.setSystemTime(1_000_000 + 301_000);
      fireEvent(window, new Event("pageshow"));
    });
    expect(readProfileSessionLease("profile-1")?.expiresAt).toBeGreaterThan(1_000_000 + 301_000);
    expect(useGameStore.getState().activeProfileId).toBe("profile-1");
  });
});
