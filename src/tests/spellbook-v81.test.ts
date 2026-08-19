import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { createInitialSpellbook, normalizeSpellbook } from "../game/spellbook/spellbookLogic";
import { useGameStore } from "../state/gameStore";

describe("Spellbook V14 knowledge domain", () => {
  it("stores known spells without an equipped-slot projection", () => {
    const initial = createInitialSpellbook();
    expect(initial.knownSpellIds.length).toBeGreaterThan(0);
    expect(initial).not.toHaveProperty("equippedSpellSlots");
  });

  it("normalizes known spell ownership", () => {
    const normalized = normalizeSpellbook({ knownSpellIds: ["spell.shadow-bolt", "spell.shadow-bolt", "spell.unknown"] });
    expect(normalized).toEqual({ knownSpellIds: ["spell.shadow-bolt"] });
  });
});

describe("Spellbook V14 UI", () => {
  beforeEach(() => useGameStore.getState().resetGameplay());
  afterEach(() => cleanup());

  it("does not expose a separate Spellbook window", () => {
    render(createElement(App));
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    expect(screen.queryByRole("button", { name: /Spellbook/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Combat Abilities/i })).toBeInTheDocument();
  });
});
