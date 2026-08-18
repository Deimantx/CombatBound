import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { createAndEnterProfile, returnToProfileSelect } from "../app/profile/profileSessionController";
import { useGameStore } from "../state/gameStore";
import { useProfileStore } from "../state/profileStore";
import { useOfflineActivityRuntimeStore } from "../state/offlineActivityRuntimeStore";

describe("Time Bank player UI", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
  });

  afterEach(() => {
    cleanup();
    try { returnToProfileSelect(); } catch { /* profile may already be unloaded */ }
    localStorage.clear();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
  });

  it("shows a compact non-modal panel with bank, activity, quick skips, and custom minutes", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    useProfileStore.getState().addOfflineBankForDebug("profile-1", 10 * 60);
    useGameStore.getState().startHunt();
    render(<App />);

    expect(screen.getByRole("button", { name: /TIME BANK/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /TIME BANK/ }));
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getAllByText("10m")).not.toHaveLength(0);
    expect(screen.getByText("Maximum")).toBeInTheDocument();
    expect(screen.getByText("7d")).toBeInTheDocument();
    expect(screen.getByText("CURRENT ACTIVITY")).toBeInTheDocument();
    expect(screen.getByText("Hunt — Wolf Den")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SKIP 5M" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "SKIP 15M" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "SKIP 1H" })).toBeDisabled();
    expect(screen.getByLabelText("Custom minutes")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("CURRENT ACTIVITY")).not.toBeInTheDocument();
  });

  it("keeps spending disabled when no activity is active", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    useProfileStore.getState().addOfflineBankForDebug("profile-1", 60 * 60);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /TIME BANK/ }));
    expect(screen.getByText("No eligible activity")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SKIP 5M" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "SKIP 15M" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "SKIP 1H" })).toBeDisabled();
  });

  it("opens a full results report, shows every loot row, and can reopen it", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    useGameStore.getState().startHunt();
    const game = useGameStore.getState().game;
    useOfflineActivityRuntimeStore.getState().setLastResult({
      profileId: "profile-1",
      activityType: "combat-hunt",
      simulation: {
        requestedSeconds: 1800,
        activitySeconds: 600,
        bankSpentSeconds: 1800,
        wastedSeconds: 1200,
        stopReason: "death",
        state: game,
        summary: {
          enemiesDefeated: 4,
          groupClears: 1,
          damageDealt: 1200,
          damageTaken: 300,
          healing: 60,
          highestHit: 180,
          masteryXp: 500,
          proficiencyXp: { "one-handed-sword": 500 },
          progressionRows: [
            { progressionId: "combat-mastery", name: "Combat Mastery", xpBefore: 0, xpAfter: 500, xpGained: 500, levelBefore: 1, levelAfter: 2, xpPerHour: 1000 },
            { progressionId: "one-handed-sword", name: "One-Handed Sword", xpBefore: 0, xpAfter: 500, xpGained: 500, levelBefore: 0, levelAfter: 2, xpPerHour: 1000 },
          ],
          gold: 1284,
          itemsGained: 5,
          lootGained: {
            "item.wolf-fang": 18,
            "item.wolf-pelt": 7,
            "item.bandit-scrap": 3,
            "item.hunter-sword": 1,
            "item.training-shield": 1,
          },
          itemInstanceIdsGained: [],
          requestedSeconds: 1800,
          activitySeconds: 600,
          wastedSeconds: 1200,
          eventSteps: 30,
          virtualElapsedSeconds: 600,
        },
      },
    });
    useOfflineActivityRuntimeStore.getState().openResults();
    render(<App />);

    const dialog = screen.getByRole("dialog", { name: /Wolf Den/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("TIME SKIP RESULTS")).toBeInTheDocument();
    expect(within(dialog).getByText("30m 00s")).toBeInTheDocument();
    expect(within(dialog).getByText("10m 00s")).toBeInTheDocument();
    expect(within(dialog).getByText("20m 00s")).toBeInTheDocument();
    expect(within(dialog).getByText("Hunter Defeated")).toBeInTheDocument();
    expect(within(dialog).getByText("Combat Mastery")).toBeInTheDocument();
    expect(within(dialog).getByText("One-Handed Sword")).toBeInTheDocument();
    expect(within(dialog).getByText("Gold")).toBeInTheDocument();
    expect(within(dialog).getByText("Wolf Fang")).toBeInTheDocument();
    expect(within(dialog).getByText("Wolf Pelt")).toBeInTheDocument();
    expect(within(dialog).getByText("Bandit Scrap")).toBeInTheDocument();
    expect(within(dialog).getByText("Hunter Sword")).toBeInTheDocument();
    expect(within(dialog).getByText("Training Shield")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /Wolf Den/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /TIME BANK/ }));
    fireEvent.click(screen.getByRole("button", { name: "VIEW LAST RESULTS" }));
    expect(screen.getByRole("dialog", { name: /Wolf Den/i })).toBeInTheDocument();
  });
});
