import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { EQUIPMENT_SLOT_IDS } from "../game/equipment/equipmentTypes";
import { useGameStore } from "../state/gameStore";
import { grantItem } from "../game/items/itemOwnership";

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
    expect(candidateButtons.every((button) => !button.disabled)).toBe(true);
    fireEvent.click(candidateButtons[0]);
    expect(screen.getByRole("button", { name: "EQUIP" })).toBeDisabled();
    expect(screen.getByText("LOCKED DURING COMBAT")).toBeInTheDocument();
  });

  it("previews gear without mutating equipment and commits only through EQUIP", () => {
    const store = useGameStore.getState();
    store.debug.setOwnedItemCount("item.hunter-sword", 1);
    store.debug.setMasteryLevel(5);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));

    const before = useGameStore.getState().game.equipment.slots.weapon;
    const candidate = document.querySelector('[data-debug-kind="equipment-candidate"][data-debug-item-id="item.hunter-sword"]') as HTMLButtonElement;
    expect(candidate).toBeInTheDocument();
    const candidateInstanceId = candidate.getAttribute("data-debug-instance-id");
    expect(candidateInstanceId).toMatch(/^item-instance-/);
    fireEvent.mouseEnter(candidate);
    expect(document.querySelector('[data-debug-kind="hero-combat-stats"]')).toHaveAttribute("data-debug-preview-item-id", "item.hunter-sword");
    expect(document.querySelector('[data-debug-stat="attackDamage"]')).toHaveAttribute("data-debug-delta-kind", "better");
    expect(document.querySelector('[data-debug-stat="attackInterval"]')).toHaveAttribute("data-debug-delta-kind", "better");
    expect(useGameStore.getState().game.equipment.slots.weapon).toBe(before);
    fireEvent.mouseLeave(candidate);
    expect(document.querySelector('[data-debug-kind="hero-combat-stats"]')).not.toHaveAttribute("data-debug-preview-item-id");

    fireEvent.click(candidate);
    expect(candidate).toHaveAttribute("data-debug-preview-selected", "true");
    expect(useGameStore.getState().game.equipment.slots.weapon).toBe(before);
    fireEvent.click(screen.getByRole("button", { name: "EQUIP" }));
    expect(useGameStore.getState().game.equipment.slots.weapon).toBe(candidateInstanceId);
    expect(document.querySelector('[data-debug-kind="hero-combat-stats"]')).not.toHaveAttribute("data-debug-preview-item-id");
  });

  it("allows mastery-locked preview while keeping EQUIP disabled", () => {
    useGameStore.getState().debug.setOwnedItemCount("item.vanguard-sword", 1);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    const candidate = document.querySelector('[data-debug-kind="equipment-candidate"][data-debug-item-id="item.vanguard-sword"]') as HTMLButtonElement;
    fireEvent.click(candidate);
    expect(candidate).toHaveAttribute("data-debug-preview-selected", "true");
    expect(screen.getAllByText("MASTERY 10 REQUIRED").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "EQUIP" })).toBeDisabled();
  });

  it("uses red deltas for lower defensive preview values and preserves collapsed categories", () => {
    const game = useGameStore.getState().game;
    const granted = grantItem(game.inventory, "item.vanguard-plate", 1).inventory;
    const plate = Object.values(granted.instances).find((instance) => instance.definitionId === "item.vanguard-plate")!;
    useGameStore.setState({ game: { ...game, equipment: { slots: { ...game.equipment.slots, armor: plate.id } }, inventory: granted } });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(document.querySelector('[data-debug-kind="equipment-slot"][data-debug-slot-id="armor"]') as HTMLElement);
    const defense = screen.getByRole("button", { name: /^DEFENSE/ });
    fireEvent.click(defense);
    const candidate = document.querySelector('[data-debug-kind="equipment-candidate"][data-debug-item-id="item.training-armor"]') as HTMLButtonElement;
    fireEvent.click(candidate);
    expect(document.querySelector('[data-debug-kind="hero-stat-category"][data-debug-category="defense"]')).toHaveAttribute("data-debug-expanded", "false");
    expect(document.querySelector('[data-debug-stat="armour"]')).toHaveAttribute("data-debug-delta-kind", "worse");
    expect(document.querySelector('[data-debug-stat="armour"]')).not.toBeVisible();
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
