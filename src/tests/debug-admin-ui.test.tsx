import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TooltipProvider } from "../app/components/tooltip/TooltipProvider";
import { DebugAdminPanel } from "../app/debug/admin/DebugAdminPanel";
import { calculateEarnedPerkPoints } from "../game/progression/masteryProgression";
import { useGameStore } from "../state/gameStore";

beforeEach(() => useGameStore.getState().resetGameplay());
afterEach(() => cleanup());

describe("debug progression toolkit", () => {
  it("shows derived perk points and removes direct perk rank editing", () => {
    render(<TooltipProvider><DebugAdminPanel onClose={() => undefined} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Progression" }));
    expect(screen.getByText("Mastery")).toBeInTheDocument();
    expect(screen.getByText("Perk Points")).toBeInTheDocument();
    expect(screen.getByText("Proficiencies")).toBeInTheDocument();
    expect(screen.getByText("Earned")).toBeInTheDocument();
    expect(screen.getByText("Spent")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.queryByText("MAX ALL PERKS")).not.toBeInTheDocument();
    expect(screen.queryByText("RESET ALL PERKS")).not.toBeInTheDocument();
    expect(screen.queryByText("FUND PURCHASED RANKS")).not.toBeInTheDocument();
    expect(screen.queryByText("DEBUG BYPASS")).not.toBeInTheDocument();
  });

  it("grants an arbitrary positive integer through the canonical Mastery threshold", () => {
    render(<TooltipProvider><DebugAdminPanel onClose={() => undefined} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Progression" }));
    const before = useGameStore.getState().game;
    const earnedBefore = calculateEarnedPerkPoints(before.progression.masteryXp);
    const input = screen.getByLabelText("Custom perk point amount");
    fireEvent.change(input, { target: { value: "17" } });
    fireEvent.click(screen.getByRole("button", { name: "GRANT" }));
    const after = useGameStore.getState().game;
    expect(calculateEarnedPerkPoints(after.progression.masteryXp)).toBe(earnedBefore + 17);
    expect(after.progression.purchasedPerks).toEqual(before.progression.purchasedPerks);
  });

  it("groups proficiency definitions by canonical category", () => {
    render(<TooltipProvider><DebugAdminPanel onClose={() => undefined} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Progression" }));
    for (const label of ["Melee", "Ranged", "Magic", "Defense"]) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText("One-Handed Sword")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Defense/ }));
    expect(screen.getByText("Light Armor")).toBeInTheDocument();
  });
});
