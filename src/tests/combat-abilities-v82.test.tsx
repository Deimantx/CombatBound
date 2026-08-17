import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { createCombatContext, startHunt } from "../game/combat/combatEngine";
import {
  equipCombatAbility,
  moveCombatAbility,
  normalizeCombatAbilityLoadout,
  unequipTechnique,
} from "../game/combatAbilities/combatAbilityLogic";
import { canToggleTechnique } from "../game/combatAbilities/combatAbilitySelectors";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { validatePlayerAction } from "../game/combat/playerActions";
import { migrateV5Save } from "../game/persistence/saveMigration";
import { useGameStore } from "../state/gameStore";

const context = createCombatContext({ next: () => 0.5 });

describe("Combat Abilities V8.2 domain", () => {
  it("normalizes slot counts, duplicates, and unknown entries", () => {
    const normalized = normalizeCombatAbilityLoadout({
      activeSlots: ["defense.guard", "defense.guard", "defense.unknown", "defense.brace", "extra"],
      techniqueSlots: ["careful-positioning", "careful-positioning", "unknown"],
    });
    expect(normalized.activeSlots).toEqual(["defense.guard", null, null, "defense.brace", null]);
    expect(normalized.techniqueSlots).toEqual(["careful-positioning", null]);
  });

  it("moves and unequips active abilities without duplicating them", () => {
    const initial = createInitialGameState().combatAbilities;
    const moved = moveCombatAbility(initial, 0, 3);
    expect(moved.activeSlots).toEqual([null, "defense.evasive-step", "defense.brace", "defense.guard", null]);
    const replaced = equipCombatAbility(moved, "defense.guard", 1);
    expect(replaced.activeSlots).toEqual([null, "defense.guard", "defense.brace", null, null]);
    const removed = unequipTechnique({ ...initial, techniqueSlots: ["careful-positioning", "heightened-reflexes"] }, 0);
    expect(removed.techniqueSlots).toEqual([null, "heightened-reflexes"]);
  });

  it("rejects an active action that is not equipped", () => {
    const game = createInitialGameState();
    const started = startHunt({ ...game, combatAbilities: { ...game.combatAbilities, activeSlots: ["defense.evasive-step", null, null, null] } }, "location.wolf-den", calculateHunterCombatStats(game.equipment, game.inventory, game.progression, game.combat.techniques), context);
    const result = validatePlayerAction(started, "defense.guard", calculateHunterCombatStats(game.equipment, game.inventory, game.progression, game.combat.techniques), context);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("ability-not-equipped");
  });

  it("allows only equipped techniques to toggle during an active hunt", () => {
    const game = createInitialGameState();
    const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression, game.combat.techniques);
    const active = startHunt(game, "location.wolf-den", stats, context);
    expect(canToggleTechnique(active, "careful-positioning")).toBe(true);
    const unavailable = { ...active, combatAbilities: { ...active.combatAbilities, techniqueSlots: [null, "heightened-reflexes"] as Array<"careful-positioning" | "heightened-reflexes" | null> } };
    expect(canToggleTechnique(unavailable, "careful-positioning")).toBe(false);
  });

  it("migrates a V5 save with the prototype abilities available", () => {
    const game = createInitialGameState();
    const migrated = migrateV5Save({
      version: 5,
      progression: game.progression,
      inventory: game.inventory,
      equipment: game.equipment,
      collection: game.collection,
      gold: game.gold,
      settings: { reducedMotion: false, showInspectorButton: true },
      spellbook: game.spellbook,
      combatAutomation: game.combatAutomation,
    });
    expect(migrated?.version).toBe(6);
    expect(migrated?.combatAbilities.activeSlots).toEqual(["defense.guard", "defense.evasive-step", "defense.brace", null, null]);
    expect(migrated?.combatAbilities.techniqueSlots).toEqual(["careful-positioning", "heightened-reflexes"]);
  });
});

describe("Combat Abilities V8.2 UI", () => {
  beforeEach(() => useGameStore.getState().resetGameplay());
  afterEach(() => cleanup());

  function openAbilities() {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /Combat Abilities/i }));
  }

  it("shows the two loadouts and canonical library", () => {
    openAbilities();
    expect(document.querySelectorAll('[data-debug-kind="combat-ability-slot"]')).toHaveLength(5);
    expect(document.querySelectorAll('[data-debug-kind="technique-loadout-slot"]')).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Weapon Attack/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Swift Cut/ })).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="combat-ability-library-entry"][data-debug-ability-kind="weapon-skill"][data-debug-proficiency-id="one-handed-sword"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="combat-ability-library-entry"][data-debug-ability-id="defense.guard"]')).toBeInTheDocument();
    expect(screen.getByText(/Requires Shield/i)).toBeInTheDocument();
  });

  it("supports active ability drag/drop and blocks cross-type drops", () => {
    openAbilities();
    const brace = document.querySelector('[data-debug-kind="combat-ability-library-entry"][data-debug-ability-id="defense.brace"]') as HTMLElement;
    const activeSlot = document.querySelector('[data-debug-kind="combat-ability-slot"][data-debug-slot="3"]') as HTMLElement;
    const techniqueSlot = document.querySelector('[data-debug-kind="technique-loadout-slot"][data-debug-slot="0"]') as HTMLElement;
    fireEvent.dragStart(brace, { dataTransfer: { effectAllowed: "move", setData: () => undefined } });
    fireEvent.drop(activeSlot, { dataTransfer: { dropEffect: "move" } });
    expect(useGameStore.getState().game.combatAbilities.activeSlots[3]).toBe("defense.brace");
    const guard = document.querySelector('[data-debug-kind="combat-ability-library-entry"][data-debug-ability-id="defense.guard"]') as HTMLElement;
    fireEvent.dragStart(guard, { dataTransfer: { effectAllowed: "move", setData: () => undefined } });
    fireEvent.drop(techniqueSlot, { dataTransfer: { dropEffect: "none" } });
    expect(useGameStore.getState().game.combatAbilities.techniqueSlots[0]).toBe("careful-positioning");
  });

  it("locks both loadouts while a hunt is active", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Combat" }));
    fireEvent.click(screen.getByRole("button", { name: /Start hunt/i }));
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /Combat Abilities/i }));
    expect(document.querySelector('[data-debug-kind="combat-ability-slot"]')).toHaveAttribute("draggable", "false");
    expect(screen.getByText(/Loadouts are locked/i)).toBeInTheDocument();
  });
});
