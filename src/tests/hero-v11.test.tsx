import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { EQUIPMENT_SLOT_IDS } from "../game/equipment/equipmentTypes";
import { useGameStore } from "../state/gameStore";

describe("Hero Build Workspace V11", () => {
  beforeEach(() => {
    cleanup();
    useGameStore.getState().resetGameplay();
    localStorage.removeItem("combatbound-hero-stats-v1");
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem("combatbound-hero-stats-v1");
  });

  it("renders inline canonical equipment, live stats, and exactly three build-system launchers", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));

    expect(document.querySelector('[data-debug-kind="hero-build-workspace"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="hero-equipment"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-debug-kind="equipment-slot"]')).toHaveLength(EQUIPMENT_SLOT_IDS.length);
    expect(document.querySelectorAll('[data-debug-kind="hero-stat-category"]')).toHaveLength(4);
    expect(document.querySelectorAll('[data-debug-kind="hero-build-system"]')).toHaveLength(3);
    expect(document.querySelector('[data-debug-system="equipment"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-debug-system="stats"]')).not.toBeInTheDocument();
  });

  it("uses safe persisted disclosure defaults and survives corrupt preferences", () => {
    localStorage.setItem("combatbound-hero-stats-v1", "not-json");
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));

    expect(document.querySelector('[data-debug-kind="hero-combat-stats"]')).toHaveAttribute("data-debug-expanded", "true");
    expect(document.querySelector('[data-debug-kind="hero-stat-category"][data-debug-category="offense"]')).toHaveAttribute("data-debug-expanded", "true");
    expect(document.querySelector('[data-debug-kind="hero-stat-category"][data-debug-category="defense"]')).toHaveAttribute("data-debug-expanded", "true");
    expect(document.querySelector('[data-debug-kind="hero-stat-category"][data-debug-category="resources"]')).toHaveAttribute("data-debug-expanded", "false");
    expect(document.querySelector('[data-debug-kind="hero-stat-category"][data-debug-category="resistances"]')).toHaveAttribute("data-debug-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: /^RESOURCES & REGEN/ }));
    expect(JSON.parse(localStorage.getItem("combatbound-hero-stats-v1") ?? "{}")).toMatchObject({ resources: true });
  });

  it("keeps equipment changes locked while combat is active", () => {
    const game = useGameStore.getState().game;
    useGameStore.setState({ game: { ...game, combat: { ...game.combat, phase: "active" } } });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));

    const candidateButtons = Array.from(document.querySelectorAll('[data-debug-kind="equipment-candidate"]')) as HTMLButtonElement[];
    expect(candidateButtons.length).toBeGreaterThan(0);
    expect(candidateButtons.every((button) => button.disabled)).toBe(true);
    expect(screen.getByText("LOCKED DURING COMBAT")).toBeInTheDocument();
  });

  it("keeps deep links to the three full build-system windows", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /COMBAT ABILITIES/ }));
    expect(document.querySelector('[data-debug-kind="hero-window"][data-debug-window="abilities"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Close COMBAT ABILITIES/ }));
    fireEvent.click(screen.getByRole("button", { name: /SPELLBOOK/ }));
    expect(document.querySelector('[data-debug-kind="hero-window"][data-debug-window="spellbook"]')).toBeInTheDocument();
  });
});
