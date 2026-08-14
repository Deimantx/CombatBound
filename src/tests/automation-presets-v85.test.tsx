import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { createInitialCombatAutomation } from "../game/automation/automationTypes";
import {
  automationPresetConfigEquals,
  clearAutomationPreset,
  createInitialCombatAutomationPresets,
  loadAutomationPreset,
  normalizeCombatAutomationPresets,
  renameAutomationPreset,
  saveCurrentAutomationToPreset,
  snapshotAutomationConfig,
} from "../game/automation/automationPresets";
import { updateAutomationRule } from "../game/automation/automationLogic";
import { createInitialGameState } from "../game/gameState";
import { migrateV6Save } from "../game/persistence/saveMigration";
import { useGameStore } from "../state/gameStore";

describe("Automation preset domain V8.5", () => {
  it("keeps exactly ten slots and saves a deep configuration snapshot without the master switch", () => {
    const initial = createInitialCombatAutomation();
    const automation = { ...initial, enabled: false, overrideManualTarget: true };
    const presets = saveCurrentAutomationToPreset(
      createInitialCombatAutomationPresets(),
      0,
      automation,
      "  Emergency Setup  ",
      100,
    );

    expect(presets.slots).toHaveLength(10);
    expect(presets.slots[0]).toMatchObject({ name: "Emergency Setup", createdAt: 100, updatedAt: 100 });
    expect(presets.slots[0]?.config).not.toHaveProperty("enabled");
    expect(presets.slots[0]?.config.overrideManualTarget).toBe(true);

    const changed = updateAutomationRule(automation, automation.rules[0].id, { priority: 99 });
    expect(changed.rules[0].priority).toBe(99);
    expect(presets.slots[0]?.config.rules[0].priority).not.toBe(99);
  });

  it("loads only the saved automation config and preserves the current enabled state", () => {
    const initial = createInitialCombatAutomation();
    const saved = saveCurrentAutomationToPreset(createInitialCombatAutomationPresets(), 0, {
      ...initial,
      enabled: true,
      overrideManualTarget: true,
    }, undefined, 200);
    const current = { ...initial, enabled: false, overrideManualTarget: false };
    const loaded = loadAutomationPreset(saved, 0, current);

    expect(loaded.enabled).toBe(false);
    expect(loaded.overrideManualTarget).toBe(true);
    expect(automationPresetConfigEquals(snapshotAutomationConfig(loaded), saved.slots[0]!.config)).toBe(true);
    loaded.rules[0].conditions[0] = { type: "always" };
    expect(saved.slots[0]!.config.rules[0].conditions).not.toBe(loaded.rules[0].conditions);
  });

  it("normalizes malformed slot collections and keeps rename/clear operations bounded", () => {
    const normalized = normalizeCombatAutomationPresets({
      slots: [
        { id: "fixture", name: "x".repeat(80), config: {}, createdAt: Infinity, updatedAt: -1 },
        null,
        { id: "second", name: "Second", config: { rules: [] } },
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        { id: "ignored", name: "Ignored", config: {} },
      ],
    });
    expect(normalized.slots).toHaveLength(10);
    expect(normalized.slots[0]?.name).toHaveLength(32);
    expect(normalized.slots[0]?.createdAt).toBe(0);
    expect(normalized.slots[0]?.updatedAt).toBe(0);
    const renamed = renameAutomationPreset(normalized, 0, "Renamed", 300);
    expect(renamed.slots[0]?.name).toBe("Renamed");
    expect(clearAutomationPreset(renamed, 10)).toBe(renamed);
    expect(clearAutomationPreset(renamed, 0).slots[0]).toBeNull();
  });

  it("migrates the actual V6 save shape to V7 with empty preset slots", () => {
    const game = createInitialGameState();
    const migrated = migrateV6Save({
      version: 6,
      progression: game.progression,
      inventory: game.inventory,
      equipment: game.equipment,
      collection: game.collection,
      gold: game.gold,
      settings: { reducedMotion: false, showInspectorButton: true },
      spellbook: game.spellbook,
      combatAutomation: game.combatAutomation,
      combatAbilities: game.combatAbilities,
    });
    expect(migrated?.version).toBe(7);
    expect(migrated?.combatAutomationPresets.slots).toHaveLength(10);
    expect(migrated?.combatAutomationPresets.slots.every((slot) => slot === null)).toBe(true);
  });
});

describe("Automation preset UI V8.5", () => {
  beforeEach(() => useGameStore.getState().resetGameplay());
  afterEach(() => cleanup());

  it("shows ten inspector-addressable slots and supports save, load confirmation, and delete confirmation", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(screen.getByRole("button", { name: /Combat Automation/i }));

    expect(document.querySelectorAll('[data-debug-kind="automation-preset"]')).toHaveLength(10);
    const firstEmpty = document.querySelector('[data-debug-kind="automation-preset"][data-debug-slot="0"] [data-debug-action="save-preset"]') as HTMLElement;
    fireEvent.click(firstEmpty);
    expect(document.querySelector('[data-debug-kind="automation-preset"][data-debug-slot="0"]')).toHaveAttribute("data-debug-empty", "false");

    fireEvent.click(document.querySelector('[data-debug-kind="automation-preset"][data-debug-slot="0"] button') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "LOAD" }));
    expect(screen.getAllByRole("dialog").find((dialog) => dialog.classList.contains("confirm-dialog"))).toHaveTextContent("Load automation preset?");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.querySelector(".confirm-dialog")).not.toBeInTheDocument();

    fireEvent.click(document.querySelector('[data-debug-action="delete-preset"]') as HTMLElement);
    expect(document.querySelector(".confirm-dialog")).toHaveTextContent("Delete automation preset?");
  });
});
