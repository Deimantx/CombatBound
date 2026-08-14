import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import {
  createInitialSpellbook,
  equipSpellToSlot,
  moveEquippedSpell,
  unequipSpellSlot,
} from "../game/spellbook/spellbookLogic";
import { useGameStore } from "../state/gameStore";

describe("Spellbook V8.1 domain operations", () => {
  it("equips a known spell into an empty slot without changing ownership", () => {
    const initial = createInitialSpellbook();
    const value = { ...initial, equippedSpellSlots: [initial.equippedSpellSlots[0], null, null, null, null] };
    const next = equipSpellToSlot(value, "spell.shadow-bolt", 1);
    expect(next.equippedSpellSlots).toEqual(["spell.flame-blast", "spell.shadow-bolt", null, null, null]);
    expect(next.knownSpellIds).toEqual(initial.knownSpellIds);
  });

  it("replaces an occupied slot while keeping the displaced spell known", () => {
    const initial = createInitialSpellbook();
    const next = equipSpellToSlot(initial, "spell.shadow-bolt", 0);
    expect(next.equippedSpellSlots[0]).toBe("spell.shadow-bolt");
    expect(next.equippedSpellSlots).not.toContain("spell.flame-blast");
    expect(next.knownSpellIds).toContain("spell.flame-blast");
    expect(next.equippedSpellSlots).toHaveLength(5);
  });

  it("moves into an empty slot and swaps with an occupied slot", () => {
    const initial = createInitialSpellbook();
    const value = { ...initial, equippedSpellSlots: ["spell.flame-blast", null, null, null, "spell.stone-spike"] };
    const moved = moveEquippedSpell(value, 0, 1);
    expect(moved.equippedSpellSlots).toEqual([null, "spell.flame-blast", null, null, "spell.stone-spike"]);
    const swapped = moveEquippedSpell(value, 0, 4, "spell.flame-blast");
    expect(swapped.equippedSpellSlots).toEqual(["spell.stone-spike", null, null, null, "spell.flame-blast"]);
  });

  it("unequips without removing the known spell and rejects invalid operations", () => {
    const initial = createInitialSpellbook();
    const unequipped = unequipSpellSlot(initial, 0);
    expect(unequipped.equippedSpellSlots[0]).toBeNull();
    expect(unequipped.knownSpellIds).toEqual(initial.knownSpellIds);
    expect(equipSpellToSlot(initial, "spell.unknown", 0)).toBe(initial);
    expect(moveEquippedSpell(initial, -1, 0)).toBe(initial);
    expect(unequipSpellSlot(initial, 5)).toBe(initial);
  });
});

describe("Spellbook V8.1 UI", () => {
  beforeEach(() => {
    useGameStore.getState().resetGameplay();
  });
  afterEach(() => {
    cleanup();
  });

  function openSpellbook() {
    render(createElement(App));
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /Spellbook/i }));
  }

  it("exposes the shared scroll body and drag/drop controls", () => {
    openSpellbook();
    expect(document.querySelector(".hero-window-body.combatbound-scroll")).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="spell-unequip-dropzone"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="spell-loadout-slot"][data-debug-drop-state="idle"]')).toBeInTheDocument();
    expect(screen.getByText(/Drag known Spells into slots/i)).toBeInTheDocument();
  });

  it("moves a known spell by drag/drop and unequips through the known list", () => {
    openSpellbook();
    const knownShadow = screen.getByRole("button", { name: /Shadow Bolt/i });
    const slotOne = document.querySelector('[data-debug-kind="spell-loadout-slot"][data-debug-slot="0"]') as HTMLElement;
    const knownList = document.querySelector('[data-debug-kind="spell-unequip-dropzone"]') as HTMLElement;
    fireEvent.dragStart(knownShadow, { dataTransfer: { effectAllowed: "move", setData: () => undefined } });
    fireEvent.drop(slotOne, { dataTransfer: { dropEffect: "move" } });
    expect(useGameStore.getState().game.spellbook.equippedSpellSlots[0]).toBe("spell.shadow-bolt");
    expect(useGameStore.getState().game.spellbook.knownSpellIds).toContain("spell.shadow-bolt");
    const movedSlot = document.querySelector('[data-debug-kind="spell-loadout-slot"][data-debug-slot="0"]') as HTMLElement;
    fireEvent.dragStart(movedSlot, { dataTransfer: { effectAllowed: "move", setData: () => undefined } });
    fireEvent.drop(knownList, { dataTransfer: { dropEffect: "move" } });
    expect(useGameStore.getState().game.spellbook.equippedSpellSlots[0]).toBeNull();
  });

  it("swaps two equipped slots through drag/drop", () => {
    openSpellbook();
    const slotOne = document.querySelector('[data-debug-kind="spell-loadout-slot"][data-debug-slot="0"]') as HTMLElement;
    const slotFive = document.querySelector('[data-debug-kind="spell-loadout-slot"][data-debug-slot="4"]') as HTMLElement;
    fireEvent.dragStart(slotOne, { dataTransfer: { effectAllowed: "move", setData: () => undefined } });
    fireEvent.drop(slotFive, { dataTransfer: { dropEffect: "move" } });
    expect(useGameStore.getState().game.spellbook.equippedSpellSlots[0]).toBe("spell.stone-spike");
    expect(useGameStore.getState().game.spellbook.equippedSpellSlots[4]).toBe("spell.flame-blast");
  });

  it("disables dragging while Combat is active", () => {
    render(createElement(App));
    fireEvent.click(screen.getByRole("button", { name: "Combat" }));
    fireEvent.click(screen.getByRole("button", { name: /Start hunt/i }));
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /Spellbook/i }));
    expect(document.querySelector('[data-debug-kind="spell-loadout-slot"]')).toHaveAttribute("draggable", "false");
    expect(screen.getByRole("button", { name: /Shadow Bolt/i })).toHaveAttribute("draggable", "false");
  });

  it("shows instructions and returns to the automation editor", () => {
    render(createElement(App));
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /Combat Automation/i }));
    fireEvent.click(screen.getByRole("button", { name: /INSTRUCTIONS/i }));
    expect(screen.getByRole("heading", { name: "Quick Start" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Priority" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Conditions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Target Priority" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Global Cooldown" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Example Setups" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Common Mistakes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Glossary" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /BACK TO RULES/i }));
    expect(screen.getByRole("button", { name: /INSTRUCTIONS/i })).toBeInTheDocument();
  });
});
