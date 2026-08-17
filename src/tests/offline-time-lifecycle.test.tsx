import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileSessionCoordinator } from "../app/profile/ProfileSessionCoordinator";
import { SimulationDriver } from "../app/simulation/SimulationDriver";
import { createAndEnterProfile, returnToProfileSelect } from "../app/profile/profileSessionController";
import { useGameStore } from "../state/gameStore";
import { useProfileStore } from "../state/profileStore";

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
});
