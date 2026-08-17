import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { useGameStore } from "../state/gameStore";

describe("Equipment 2.0 Hero workspace", () => {
  beforeEach(() => {
    cleanup();
    useGameStore.getState().resetGameplay();
  });

  afterEach(() => cleanup());

  it("keeps the loadout and slot inspector as a stable two-pane workspace", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));

    expect(document.querySelector('[data-debug-kind="hero-equipment-two-pane"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="hero-equipment-loadout"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="hero-equipment-selected"]')).toHaveAttribute("data-debug-expanded", "true");
    expect(document.querySelector('[data-debug-kind="equipment-candidate-browser"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="hero-build-snapshot"]')).toBeInTheDocument();
    expect(screen.queryByText("ARMOR TRAINING")).not.toBeInTheDocument();
  });

  it("exposes the loadout, slot workspace, and build stats as explicit zones", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));

    expect(document.querySelector('[data-debug-kind="hero-build-workspace"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="equipment-loadout"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="equipment-slot-workspace"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="hero-build-stats"]')).toBeInTheDocument();
  });

  it("keeps candidate filters behind one control and exposes active filter chips", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));

    expect(screen.getByRole("textbox", { name: "Search compatible equipment" })).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="equipment-candidate-sort"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Filters/ })).toBeInTheDocument();
    expect(document.querySelector('[data-debug-filter="rarity"]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    expect(screen.getByRole("combobox", { name: "Rarity" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Modification" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Availability" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Equipment state" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Rarity" }), { target: { value: "rare" } });
    expect(screen.getByRole("button", { name: "Remove Rare filter" })).toBeInTheDocument();
  });

  it("filters exact compatible instances without equipping a candidate", () => {
    const store = useGameStore.getState();
    store.debug.setOwnedItemCount("item.hunter-sword", 2);
    store.debug.setMasteryLevel(5);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));

    const before = useGameStore.getState().game.equipment.slots.weapon;
    expect(document.querySelectorAll('[data-debug-kind="equipment-candidate"][data-debug-item-id="item.hunter-sword"]')).toHaveLength(2);
    fireEvent.change(screen.getByRole("textbox", { name: "Search compatible equipment" }), { target: { value: "hunter" } });
    expect(document.querySelectorAll('[data-debug-kind="equipment-candidate"]')).toHaveLength(2);
    fireEvent.click(document.querySelector('[data-debug-kind="equipment-candidate"][data-debug-item-id="item.hunter-sword"]') as HTMLElement);
    expect(useGameStore.getState().game.equipment.slots.weapon).toBe(before);
    expect(document.querySelector('[data-debug-kind="equipment-item-comparison"]')).toHaveTextContent("ITEM DIFFERENCES");
  });

  it("preserves a hovered preview after hover leaves when the candidate is pinned", () => {
    const store = useGameStore.getState();
    store.debug.setOwnedItemCount("item.hunter-sword", 1);
    store.debug.setMasteryLevel(5);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    const candidate = document.querySelector('[data-debug-kind="equipment-candidate"][data-debug-item-id="item.hunter-sword"]') as HTMLElement;
    fireEvent.mouseEnter(candidate);
    expect(document.querySelector('[data-debug-kind="hero-combat-stats"]')).toHaveAttribute("data-debug-preview-item-id", "item.hunter-sword");
    fireEvent.click(candidate);
    fireEvent.mouseLeave(candidate);
    expect(document.querySelector('[data-debug-kind="hero-combat-stats"]')).toHaveAttribute("data-debug-preview-item-id", "item.hunter-sword");
    expect(useGameStore.getState().game.equipment.slots.weapon).not.toBe(candidate.getAttribute("data-debug-instance-id"));
  });

  it("unequips the selected slot while keeping the owned instance", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    const instanceId = useGameStore.getState().game.equipment.slots.weapon!;
    fireEvent.click(screen.getByRole("button", { name: "UNEQUIP" }));
    expect(useGameStore.getState().game.equipment.slots.weapon).toBeUndefined();
    expect(useGameStore.getState().game.inventory.instances[instanceId]).toBeDefined();
  });
});
