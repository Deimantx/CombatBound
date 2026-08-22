import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { createAndEnterProfile, loadAndEnterProfile, returnToProfileSelect } from "../app/profile/profileSessionController";
import { GAME_SAVE_KEY } from "../game/persistence/saveGame";
import { PROFILE_INDEX_KEY, PROFILE_MIGRATION_KEY, loadProfileGameSave, migrateLegacySingleSaveIfNeeded, writeProfileIndex } from "../game/profiles/profileStorage";
import { clearProfileSessionLease, profileSessionLeaseKey } from "../game/profiles/profileSessionLease";
import { useProfileStore } from "../state/profileStore";
import { useGameStore } from "../state/gameStore";

describe("profile gate and offline foundation", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    useGameStore.getState().unloadProfile();
    useProfileStore.getState().refreshProfiles();
  });

  it("starts at profile select with exactly three slots and no AppShell", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Choose your profile" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.queryByLabelText("Primary navigation")).not.toBeInTheDocument();
  });

  it("opens the creation panel and creates only the selected slot", () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole("button", { name: "New Profile" })[1]);
    expect(screen.getByRole("heading", { name: "Prepare a new hunter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Hard/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Custom/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Create & Play" }));
    expect(useGameStore.getState().activeProfileId).toBe("profile-2");
    expect(useProfileStore.getState().index.slots[1]?.id).toBe("profile-2");
    expect(loadProfileGameSave("profile-2")?.version).toBe(19);
    expect(useProfileStore.getState().index.slots[0]).toBeNull();
    expect(useProfileStore.getState().index.slots[2]).toBeNull();
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });

  it("shows a corrupt profile without silently replacing its save", () => {
    const metadata = useProfileStore.getState().createProfileMetadata(2, "regular", "normal");
    expect(metadata).not.toBeNull();
    localStorage.setItem("combatbound-profile-2-save", "not-json");
    useProfileStore.getState().refreshProfiles();
    render(<App />);
    expect(screen.getByText("Save error")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load Game" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Corrupt Profile" })).toBeInTheDocument();
  });

  it("keeps profile saves isolated and returns safely to profile select", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    useGameStore.getState().debug.setGold(321);
    useGameStore.getState().saveActiveProfileNow();
    returnToProfileSelect();

    expect(createAndEnterProfile(2, "regular", "normal")).toBe(true);
    expect(useGameStore.getState().activeProfileId).toBe("profile-2");
    expect(useGameStore.getState().game.gold).toBe(0);
    useGameStore.getState().saveActiveProfileNow();
    expect(loadProfileGameSave("profile-1")?.gold).toBe(321);
    expect(loadProfileGameSave("profile-2")?.gold).toBe(0);
  });

  it("does not auto-acquire a missing lease when saving", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    useGameStore.getState().debug.setGold(321);
    expect(loadProfileGameSave("profile-1")?.gold).toBe(321);
    clearProfileSessionLease("profile-1");
    useGameStore.getState().debug.setGold(999);
    expect(useGameStore.getState().saveActiveProfileNow()).toBe(false);
    expect(loadProfileGameSave("profile-1")?.gold).toBe(321);
    expect(localStorage.getItem(profileSessionLeaseKey("profile-1"))).toBeNull();
  });

  it("banks elapsed offline time once and reports it on load", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    returnToProfileSelect();
    const index = useProfileStore.getState().index;
    const metadata = index.slots[0]!;
    const old = { ...metadata, lastActiveAt: Date.now() - 125_000, lastPlayedAt: Date.now() - 125_000 };
    writeProfileIndex({ version: 1, slots: [old, null, null] });
    useProfileStore.getState().refreshProfiles();

    const result = loadAndEnterProfile("profile-1");
    expect(result.ok).toBe(true);
    expect(result.report?.awaySeconds).toBeGreaterThanOrEqual(120);
    expect(useProfileStore.getState().pendingOfflineReport?.bankAfterSeconds).toBeGreaterThanOrEqual(120);
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBeGreaterThanOrEqual(120);
  });

  it("credits short absences without opening the report modal", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    returnToProfileSelect();
    const metadata = useProfileStore.getState().index.slots[0]!;
    writeProfileIndex({ version: 1, slots: [{ ...metadata, lastActiveAt: metadata.lastActiveAt - 30_000 }, null, null] });
    useProfileStore.getState().refreshProfiles();
    const result = loadAndEnterProfile("profile-1");
    expect(result.report?.rawAwaySeconds).toBe(30);
    expect(useProfileStore.getState().pendingOfflineReport).toBeNull();
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(30);
  });

  it("rejects a foreign active lease before hydration or credit", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    returnToProfileSelect();
    const before = useProfileStore.getState().index.slots[0]!;
    localStorage.setItem(profileSessionLeaseKey("profile-1"), JSON.stringify({ version: 1, profileId: "profile-1", ownerId: "other-tab", acquiredAt: Date.now(), heartbeatAt: Date.now(), expiresAt: Date.now() + 60_000 }));
    const result = loadAndEnterProfile("profile-1");
    expect(result.ok).toBe(false);
    expect(useGameStore.getState().activeProfileId).toBeNull();
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(before.offlineBankSeconds);
  });

  it("normalizes malformed bank metadata without discarding the profile", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    returnToProfileSelect();
    const metadata = useProfileStore.getState().index.slots[0]!;
    localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify({ version: 1, slots: [{ ...metadata, offlineBankSeconds: "not-a-number" }, null, null] }));
    useProfileStore.getState().refreshProfiles();
    expect(useProfileStore.getState().index.slots[0]?.id).toBe("profile-1");
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(0);
  });

  it("clamps an existing bank above the seven-day policy on profile load", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    returnToProfileSelect();
    const metadata = useProfileStore.getState().index.slots[0]!;
    localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify({ version: 1, slots: [{ ...metadata, offlineBankSeconds: 8 * 24 * 60 * 60 }, null, null] }));
    useProfileStore.getState().refreshProfiles();
    expect(useProfileStore.getState().index.slots[0]?.offlineBankSeconds).toBe(7 * 24 * 60 * 60);
    expect(localStorage.getItem(PROFILE_INDEX_KEY)).toContain('604800');
  });

  it("clears profile lease and metadata when deleting a profile", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    expect(localStorage.getItem(profileSessionLeaseKey("profile-1"))).not.toBeNull();
    useProfileStore.getState().deleteProfile("profile-1");
    expect(localStorage.getItem(profileSessionLeaseKey("profile-1"))).toBeNull();
    expect(useProfileStore.getState().index.slots[0]).toBeNull();
    expect(loadProfileGameSave("profile-1")).toBeNull();
  });

  it("migrates the legacy global save to Profile 1 once and preserves the old key", () => {
    expect(createAndEnterProfile(1, "regular", "normal")).toBe(true);
    const legacySave = loadProfileGameSave("profile-1");
    expect(legacySave).not.toBeNull();
    returnToProfileSelect();
    localStorage.removeItem(PROFILE_INDEX_KEY);
    localStorage.removeItem(PROFILE_MIGRATION_KEY);
    localStorage.removeItem("combatbound-profile-1-save");
    localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(legacySave));

    const migrated = migrateLegacySingleSaveIfNeeded();
    expect(migrated.slots[0]?.id).toBe("profile-1");
    expect(loadProfileGameSave("profile-1")?.version).toBe(19);
    expect(localStorage.getItem(GAME_SAVE_KEY)).not.toBeNull();
    expect(localStorage.getItem(PROFILE_MIGRATION_KEY)).toBe("1");
    expect(localStorage.getItem(PROFILE_INDEX_KEY)).toContain("profile-1");
  });
});
