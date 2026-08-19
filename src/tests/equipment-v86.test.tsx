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
  getCompatibleItemInstances,
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
  stats: NonNullable<ItemDefinition["stats"]> = { armour: 1 },
): ItemDefinition => ({
  id,
  name: id,
  category: "accessory",
  rarity: "common",
  description: id,
  icon: "ring",
  inventoryMode: "instance",
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

function inventoryFor(definitionIds: string[]) {
  const instances: Record<string, { id: string; definitionId: string; version: 2; quality: number; upgradeLevel: number; affixes: never[] }> = {};
  definitionIds.forEach((definitionId, index) => {
    const id = `item-instance-${String(index + 1).padStart(8, "0")}`;
    instances[id] = { id, definitionId, version: 2, quality: 0, upgradeLevel: 0, affixes: [] };
  });
  return { stackables: {}, instances, nextInstanceSequence: definitionIds.length + 1 };
}

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
    const oneCopy = inventoryFor(["test.ring"]);
    const twoCopies = inventoryFor(["test.ring", "test.ring"]);
    const oneId = Object.keys(oneCopy.instances)[0];
    const [firstId, secondId] = Object.keys(twoCopies.instances);
    const duplicated = normalizeEquipmentState(
      { slots: { ring1: oneId, ring2: firstId } },
      oneCopy,
      testItems,
    );
    const doubled = normalizeEquipmentState(
      { slots: { ring1: firstId, ring2: secondId } },
      twoCopies,
      testItems,
    );

    expect(canEquipItemToSlot(testItems["test.ring"], "ring1")).toBe(true);
    expect(canEquipItemToSlot(testItems["test.ring"], "earring1")).toBe(false);
    expect(duplicated.slots).toEqual({ ring1: oneId });
    expect(doubled.slots).toEqual({ ring1: firstId, ring2: secondId });
    expect(getCompatibleItemInstances(oneCopy, "ring1", testItems)).toHaveLength(1);
    expect(getCompatibleItemInstances(twoCopies, "ring2", testItems)).toHaveLength(2);
  });

  it("treats equipping the item already in the target slot as a no-op", () => {
    const state = useGameStore.getState();
    state.resetGameplay();
    const resetState = useGameStore.getState();
    const before = resetState.game;
    resetState.equipItemInstance(resetState.game.equipment.slots.weapon!, "weapon");
    expect(useGameStore.getState().game).toBe(before);
  });

  it("aggregates stats from every canonical slot but keeps belt and cape out of armor training", () => {
    const initial = createInitialGameState();
    const emptyStats = calculateHunterCombatStats(
      { slots: {} },
      { stackables: {}, instances: {}, nextInstanceSequence: 1 },
      initial.progression,
      testItems,
    );
    const allAccessoriesEquipment = {
      slots: {
        belt: "item-instance-00000001",
        cape: "item-instance-00000002",
        necklace: "item-instance-00000003",
        ring1: "item-instance-00000004",
        ring2: "item-instance-00000005",
        earring1: "item-instance-00000006",
        earring2: "item-instance-00000007",
      },
    };
    const allAccessories = calculateHunterCombatStats(
      allAccessoriesEquipment,
      inventoryFor(["test.belt", "test.cape", "test.necklace", "test.ring", "test.ring", "test.earring", "test.earring"]),
      initial.progression,
      testItems,
    );
    const context = getDefensiveEquipmentContext({ slots: { belt: "item-instance-00000001", cape: "item-instance-00000002" } }, inventoryFor(["test.belt", "test.cape"]), testItems);

    expect((allAccessories.armour ?? 0) - (emptyStats.armour ?? 0)).toBe(7);
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
