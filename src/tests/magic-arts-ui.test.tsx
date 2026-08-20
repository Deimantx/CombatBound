import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { useGameStore } from "../state/gameStore";

beforeEach(() => useGameStore.getState().resetGameplay());
afterEach(() => cleanup());

describe("Magic Arts browser", () => {
  it("keeps the Magic Arts workspace in-panel while switching to the skill tree", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Proficiencies" }));
    fireEvent.click(document.querySelector('[data-debug-kind="proficiency-tile"][data-debug-proficiency-id="magic-arts"]') as HTMLElement);
    const workspace = document.querySelector('[data-debug-kind="magic-arts-workspace"]') as HTMLElement;
    const inspector = document.querySelector('[data-debug-kind="magic-arts-inspector"]') as HTMLElement;
    expect(workspace).toBeInTheDocument();
    expect(workspace).toHaveAttribute("data-debug-view", "browser");
    expect(document.querySelectorAll('[data-debug-kind="magic-art-node"]')).toHaveLength(16);
    fireEvent.click(screen.getByRole("button", { name: "Earth Shield, Magic Art" }));
    expect(within(inspector).getByText("Wrap yourself in an earthen barrier that absorbs incoming damage.")).toBeInTheDocument();
    expect(within(inspector).getByText("35", { exact: true })).toBeInTheDocument();
    expect(within(inspector).getByText("10s", { exact: true })).toBeInTheDocument();
    expect(within(inspector).getByText("12s", { exact: true })).toBeInTheDocument();
    expect(within(inspector).getByText("80", { exact: true })).toBeInTheDocument();
    expect(within(inspector).getByText("Self", { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "OPEN SKILL TREE" }));
    expect(document.querySelector('[data-debug-screen="proficiencies"]')).toBeInTheDocument();
    expect(document.querySelector('[data-ui-panel="proficiencyList"]')).toBeInTheDocument();
    expect(document.querySelector('[data-ui-panel="selectedMagicArts"]')).toBeInTheDocument();
    expect(workspace).toHaveAttribute("data-debug-view", "skill-tree");
    expect(workspace.querySelector('[data-debug-kind="magic-arts-primary-stage"]')).toHaveClass("magic-arts-atlas-stage", "is-skill-tree");
    expect(workspace.querySelector('[data-debug-kind="magic-arts-inspector"]')).toBe(inspector);
    expect(screen.getByRole("button", { name: "Back to Magic Arts" })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-debug-kind="magic-art-specialization-node"]')).toHaveLength(23);
    fireEvent.click(screen.getByRole("button", { name: "Earth Shield base Magic Art" }));
    expect(within(inspector).getByText("BASE MAGIC ART", { exact: true })).toBeInTheDocument();
    const before = JSON.stringify(useGameStore.getState().game);
    fireEvent.click(screen.getByRole("button", { name: "Future Perk 1" }));
    expect(JSON.stringify(useGameStore.getState().game)).toBe(before);
    expect(within(inspector).getByText("Future Perk", { exact: true })).toBeInTheDocument();
    expect(within(inspector).getByText("Not available yet.", { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Magic Arts" }));
    expect(workspace).toHaveAttribute("data-debug-view", "browser");
    expect(workspace.querySelector('[data-debug-kind="magic-arts-primary-stage"]')).toHaveClass("magic-arts-atlas-stage", "is-browser");
    expect(screen.getByRole("button", { name: "Earth Shield, Magic Art" })).toHaveAttribute("aria-pressed", "true");
  });
});
