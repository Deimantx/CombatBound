import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { itemById, type ItemDefinition } from "../game/data/items";
import { createInitialGameState } from "../game/gameState";
import {
  calculateHunterCombatStats,
} from "../game/equipment/derivedStats";
import {
  canEquipItemToSlot,
  getAvailableItemCopies,
  normalizeEquipmentState,
} from "../game/equipment/equipmentRules";
import {
  ARMOR_TRAINING_SLOT_IDS,
  EQUIPMENT_SLOT_DEFINITIONS,
  EQUIPMENT_SLOT_IDS,
} from "../game/equipment/equipmentTypes";
import { getDefensiveEquipmentContext } from "../game/equipment/defensiveEquipment";
import { migrateV7Save } from "../game/persistence/saveMigration";
import { useGameStore } from "../state/gameStore";
import { HERO_EQUIPMENT_LAYOUT } from "../app/screens/hero/components/HeroEquipmentWorkspace";

const accessory = (
  id: string,
  equipmentSlotKind: "belt" | "cape" | "necklace" | "ring" | "earring",
  stats: NonNullable<ItemDefinition["stats"]> = { armor: 1 },
): ItemDefinition => ({
  id,
  name: id,
  category: "accessory",
  rarity: "common",
  description: id,
  icon: "ring",
  equipmentSlotKind,
  stats,
});

const testItems = {
  ...itemById,
  ...Object.fromEntries([
    accessory("test.belt", "belt"),
    accessory("test.cape", "cape"),
    accessory("test.necklace", "necklace"),
    accessory("test.ring", "ring"),
    accessory("test.earring", "earring"),
  ].map((item) => [item.id, item])),
} as Record<string, ItemDefinition>;

describe("Equipment V8.6 domain", () => {
  it("uses exactly the thirteen canonical concrete slots and only four armor-training slots", () => {
    expect(EQUIPMENT_SLOT_IDS).toEqual([
      "weapon", "offhand", "head", "armor", "gloves", "boots", "belt",
      "cape", "necklace", "ring1", "ring2", "earring1", "earring2",
    ]);
    expect(EQUIPMENT_SLOT_DEFINITIONS.filter((slot) => slot.kind === "ring").map((slot) => slot.id)).toEqual(["ring1", "ring2"]);
    expect(EQUIPMENT_SLOT_DEFINITIONS.filter((slot) => slot.kind === "earring").map((slot) => slot.id)).toEqual(["earring1", "earring2"]);
    expect(ARMOR_TRAINING_SLOT_IDS).toEqual(["head", "armor", "gloves", "boots"]);
    expect(EQUIPMENT_SLOT_IDS).not.toEqual(expect.arrayContaining(["chest", "hands", "feet", "legs"]));
  });

  it("enforces shared ring and earring kinds while respecting owned copy counts", () => {
    const oneCopy = { quantities: { "test.ring": 1 } };
    const twoCopies = { quantities: { "test.ring": 2 } };
    const duplicated = normalizeEquipmentState(
      { slots: { ring1: "test.ring", ring2: "test.ring" } },
      oneCopy.quantities,
      testItems,
    );
    const doubled = normalizeEquipmentState(
      { slots: { ring1: "test.ring", ring2: "test.ring" } },
      twoCopies.quantities,
      testItems,
    );

    expect(canEquipItemToSlot(testItems["test.ring"], "ring1")).toBe(true);
    expect(canEquipItemToSlot(testItems["test.ring"], "earring1")).toBe(false);
    expect(duplicated.slots).toEqual({ ring1: "test.ring" });
    expect(doubled.slots).toEqual({ ring1: "test.ring", ring2: "test.ring" });
    expect(getAvailableItemCopies(oneCopy, duplicated, "test.ring", "ring1")).toBe(1);
    expect(getAvailableItemCopies(oneCopy, duplicated, "test.ring", "ring2")).toBe(0);
  });

  it("treats equipping the item already in the target slot as a no-op", () => {
    const state = useGameStore.getState();
    state.resetGameplay();
    const resetState = useGameStore.getState();
    const before = resetState.game;
    resetState.equipItem("item.training-sword", "weapon");
    expect(useGameStore.getState().game).toBe(before);
  });

  it("aggregates stats from every canonical slot but keeps belt and cape out of armor training", () => {
    const initial = createInitialGameState();
    const emptyStats = calculateHunterCombatStats(
      { slots: {} },
      initial.progression,
      "mid",
      { "careful-positioning": false, "heightened-reflexes": false },
      testItems,
    );
    const allAccessories = calculateHunterCombatStats(
      {
        slots: {
          belt: "test.belt",
          cape: "test.cape",
          necklace: "test.necklace",
          ring1: "test.ring",
          ring2: "test.ring",
          earring1: "test.earring",
          earring2: "test.earring",
        },
      },
      initial.progression,
      "mid",
      { "careful-positioning": false, "heightened-reflexes": false },
      testItems,
    );
    const context = getDefensiveEquipmentContext({ slots: { belt: "test.belt", cape: "test.cape" } }, testItems);

    expect(allAccessories.armor - emptyStats.armor).toBe(7);
    expect(context.lightArmorPieces).toBe(0);
    expect(context.mediumArmorPieces).toBe(0);
    expect(context.heavyArmorPieces).toBe(0);
  });

  it("migrates V7 historical chest, hands, and feet into canonical slots", () => {
    const game = createInitialGameState();
    const migrated = migrateV7Save({
      version: 7,
      progression: game.progression,
      inventory: game.inventory,
      equipment: {
        slots: {
          weapon: "item.training-sword",
          chest: "item.training-armor",
          hands: "item.training-gloves",
          feet: "item.training-boots",
        },
      },
      collection: game.collection,
      gold: game.gold,
      settings: { reducedMotion: false, showInspectorButton: true },
      spellbook: game.spellbook,
      combatAutomation: game.combatAutomation,
      combatAutomationPresets: game.combatAutomationPresets,
      combatAbilities: game.combatAbilities,
    });

    expect(migrated?.version).toBe(8);
    expect(migrated?.equipment.slots).toEqual({
      weapon: "item.training-sword",
      armor: "item.training-armor",
      gloves: "item.training-gloves",
      boots: "item.training-boots",
    });
    expect(Object.keys(migrated?.equipment.slots ?? {})).not.toEqual(expect.arrayContaining(["chest", "hands", "feet"]));
  });
});

describe("Equipment V8.6 UI", () => {
  beforeEach(() => useGameStore.getState().resetGameplay());
  afterEach(() => cleanup());

  it("renders the thirteen slots in the V11.1 body layout without legacy group headings", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));

    expect(document.querySelectorAll('[data-debug-kind="equipment-slot"]')).toHaveLength(13);
    expect(Array.from(document.querySelectorAll('[data-debug-kind="equipment-slot"]')).map((slot) => slot.getAttribute("data-debug-slot-id"))).toEqual(HERO_EQUIPMENT_LAYOUT.flat().filter(Boolean));
    expect(screen.queryByText("WEAPONS")).not.toBeInTheDocument();
    expect(screen.queryByText("ARMOR & GEAR")).not.toBeInTheDocument();
    expect(screen.queryByText("ACCESSORIES")).not.toBeInTheDocument();
    const ringOne = document.querySelector('[data-debug-kind="equipment-slot"][data-debug-slot-id="ring1"]') as HTMLElement;
    fireEvent.click(ringOne);
    expect(document.querySelector(".hero-equipment-options")).toHaveAttribute("data-debug-slot-id", "ring1");
    expect(document.querySelector(".hero-comparison-box")).not.toBeInTheDocument();
  });
});
