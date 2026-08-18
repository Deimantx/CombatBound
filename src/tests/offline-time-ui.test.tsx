import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { createAndEnterProfile, returnToProfileSelect } from "../app/profile/profileSessionController";
import { useGameStore } from "../state/gameStore";
import { useProfileStore } from "../state/profileStore";

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
    expect(screen.getByRole("button", { name: "SKIP 5M" })).toBeDisabled();
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
});
