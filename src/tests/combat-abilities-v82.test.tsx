import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { createCombatContext, startHunt } from "../game/combat/combatEngine";
import {
  equipCombatAbility,
  moveCombatAbility,
  normalizeCombatAbilityLoadout,
  unequipCombatAbility,
} from "../game/combatAbilities/combatAbilityLogic";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { validatePlayerAction } from "../game/combat/playerActions";
import { migrateV13Save } from "../game/persistence/saveMigration";
import { gameStateToSaveV14 } from "../game/persistence/saveGame";
import { useGameStore } from "../state/gameStore";

const context = createCombatContext({ next: () => 0.5 });

describe("Combat Abilities V14 domain", () => {
  it("normalizes exactly five shared slots, duplicates, unknown entries, and unknown spells", () => {
    const normalized = normalizeCombatAbilityLoadout({
      slots: ["defense.guard", "defense.guard", "defense.unknown", "spell.shadow-bolt", "spell.unknown", "defense.brace"],
    }, ["spell.shadow-bolt"]);
    expect(normalized.slots).toEqual(["defense.guard", null, null, "spell.shadow-bolt", null]);
    expect(normalized.slots).toHaveLength(5);
  });

  it("moves, equips, and unequips any slottable combat ability", () => {
    const initial = createInitialGameState().combatAbilities;
    const moved = moveCombatAbility(initial, 0, 3);
    expect(moved.slots).toEqual(["spell.flame-blast", "defense.evasive-step", "defense.brace", "defense.guard", "spell.lightning-pulse"]);
    const replaced = equipCombatAbility(moved, "defense.guard", 1);
    expect(replaced.slots).toEqual(["spell.flame-blast", "defense.guard", "defense.brace", null, "spell.lightning-pulse"]);
    const removed = unequipCombatAbility(replaced, 1);
    expect(removed.slots[1]).toBeNull();
  });

  it("requires one shared slot for every active action kind", () => {
    const game = createInitialGameState();
    const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
    const active = startHunt({ ...game, combatAbilities: { slots: ["defense.evasive-step", null, null, null, null] } }, "location.wolf-den", stats, context);
    const result = validatePlayerAction(active, "defense.guard", stats, context);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("ability-not-equipped");
  });

  it("migrates V13 active and spell slots into one V14 loadout", () => {
    const game = createInitialGameState();
    const old = {
      ...gameStateToSaveV14(game, { reducedMotion: false, showInspectorButton: true }),
      version: 13 as const,
      spellbook: { knownSpellIds: ["spell.flame-blast", "spell.shadow-bolt"], equippedSpellSlots: ["spell.shadow-bolt", null, null, null, null] },
      combatAbilities: { activeSlots: ["defense.guard", "defense.brace", null, null, null], techniqueSlots: ["careful-positioning", "heightened-reflexes"] },
    };
    const migrated = migrateV13Save(old);
    expect(migrated?.version).toBe(14);
    expect(migrated?.spellbook).toEqual({ knownSpellIds: ["spell.flame-blast", "spell.shadow-bolt"] });
    expect(migrated?.combatAbilities.slots).toEqual(["defense.guard", "defense.brace", "spell.shadow-bolt", null, null]);
    expect((migrated?.combatAbilities as unknown as Record<string, unknown>).techniqueSlots).toBeUndefined();
  });
});

describe("Combat Abilities V14 UI", () => {
  beforeEach(() => useGameStore.getState().resetGameplay());
  afterEach(() => cleanup());

  function openAbilities() {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /Combat Abilities/i }));
  }

  it("shows one shared five-slot loadout and the canonical library", () => {
    openAbilities();
    expect(document.querySelectorAll('[data-debug-kind="combat-ability-slot"]')).toHaveLength(5);
    expect(screen.getByRole("button", { name: /Weapon Attack/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Swift Cut/ })).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="combat-ability-library-entry"][data-debug-ability-kind="weapon-skill"][data-debug-proficiency-id="one-handed-sword"]')).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="combat-ability-library-entry"][data-debug-ability-id="defense.guard"]')).toBeInTheDocument();
    expect(screen.getByText(/Requires Shield/i)).toBeInTheDocument();
  });

  it("supports moving a defense into an empty shared slot", () => {
    openAbilities();
    const brace = document.querySelector('[data-debug-kind="combat-ability-library-entry"][data-debug-ability-id="defense.brace"]') as HTMLElement;
    const slot = document.querySelector('[data-debug-kind="combat-ability-slot"][data-debug-slot="3"]') as HTMLElement;
    fireEvent.dragStart(brace, { dataTransfer: { effectAllowed: "move", setData: () => undefined } });
    fireEvent.drop(slot, { dataTransfer: { dropEffect: "move" } });
    expect(useGameStore.getState().game.combatAbilities.slots[3]).toBe("defense.brace");
  });

  it("locks the shared loadout while a hunt is active", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Combat" }));
    fireEvent.click(screen.getByRole("button", { name: /Start hunt/i }));
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /Combat Abilities/i }));
    expect(document.querySelector('[data-debug-kind="combat-ability-slot"]')).toHaveAttribute("draggable", "false");
    expect(screen.getByText(/Loadout editing is locked/i)).toBeInTheDocument();
  });
});
