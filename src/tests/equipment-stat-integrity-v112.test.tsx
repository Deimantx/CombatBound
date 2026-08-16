import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import { itemById, prototypeEquipmentDefinitions } from "../game/data/items";
import { validateEquipmentDefinitions } from "../game/data/validation/itemValidation";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { EQUIPMENT_SLOT_DEFINITIONS } from "../game/equipment/equipmentTypes";
import { applyEffect, calculateEffectDuration } from "../game/combat/combatEffects";
import type { EffectDefinition } from "../game/combat/combatEffectTypes";
import { buildItemTooltip } from "../game/presentation/tooltipBuilders";
import {
  formatCombatStatDelta,
  formatCombatStatValue,
  formatDamageRange,
  formatItemStat,
} from "../game/presentation/statFormatting";
import { useGameStore } from "../state/gameStore";

const emptyEquipment = { slots: {} };
const initial = createInitialGameState();
const neutralTechniques = initial.combat.techniques;

function statsFor(equipment: typeof emptyEquipment) {
  return calculateHunterCombatStats(equipment, initial.progression, "mid", neutralTechniques);
}

function canonicalValue(stats: ReturnType<typeof statsFor>, key: string) {
  if (key === "attack" || key === "attackDamage") return stats.attackDamage ?? 0;
  if (key === "baseDamageMin" || key === "baseDamageMax") return stats.attackDamage ?? 0;
  if (key === "baseAttackTime") return stats.baseAttackTime ?? 0;
  if (key === "defense" || key === "armour") return stats.armour ?? 0;
  if (key.endsWith("Resistance")) {
    return Number(stats[`${key.slice(0, -"Resistance".length)}Resistance` as keyof typeof stats] ?? 0);
  }
  return Number(stats[key as keyof typeof stats] ?? 0);
}

const harmfulTenSecondEffect: EffectDefinition = {
  id: "test.harmful-ten-second",
  name: "Test Hex",
  description: "A deterministic harmful test effect.",
  icon: "spark",
  kind: "debuff",
  tags: ["test"],
  durationSeconds: 10,
  stacking: { mode: "refresh", maxStacks: 1 },
  persistence: "enemy-life",
};
const ailmentTenSecondEffect: EffectDefinition = {
  ...harmfulTenSecondEffect,
  id: "test.ailment-ten-second",
  tags: ["test", "harmful", "ailment", "non-damaging-ailment"],
};

describe("Equipment stat integrity V11.2", () => {
  beforeEach(() => {
    cleanup();
    useGameStore.getState().resetGameplay();
    localStorage.removeItem("combatbound-hero-stats-v1");
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem("combatbound-hero-stats-v1");
  });

  it("formats fractional regen with raw compact decimals across all regen keys", () => {
    for (const key of ["lifeRegenFlat", "staminaRegen", "manaRegenFlat"]) {
      expect(formatItemStat(key, 0.1).value).toBe("+0.1 / sec");
      expect(formatItemStat(key, 0.15).value).toBe("+0.15 / sec");
      expect(formatItemStat(key, 0.2).value).toBe("+0.2 / sec");
      expect(formatItemStat(key, 0.3).value).toBe("+0.3 / sec");
      expect(formatItemStat(key, 0.35).value).toBe("+0.35 / sec");
      expect(formatItemStat(key, 0.5).value).toBe("+0.5 / sec");
      expect(formatItemStat(key, 0.6).value).toBe("+0.6 / sec");
    }
    expect(formatCombatStatValue("staminaRegen", 5.55)).toBe("5.6 / sec");
    expect(formatCombatStatValue("staminaRegen", 5.55, "comparison")).toBe("5.55 / sec");
    expect(formatCombatStatValue("staminaRegen", 5.75, "comparison")).toBe("5.75 / sec");
    expect(formatCombatStatDelta("staminaRegen", 0.2)).toBe("+0.2 / sec");
  });

  it("keeps raw Wind Earring tooltip semantics", () => {
    const tooltip = buildItemTooltip(itemById["item.wind-earring"]);
    expect(tooltip.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Evasion Rating", value: "+3" }),
      expect.objectContaining({ label: "Stamina Regeneration", value: "+0.2 / sec" }),
    ]));
  });

  it("keeps Vanguard Helm raw percentage and decimal tooltip semantics", () => {
    const tooltip = buildItemTooltip(itemById["item.vanguard-helm"]);
    expect(tooltip.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Armour", value: "+9" }),
      expect.objectContaining({ label: "Max Life", value: "+15" }),
      expect.objectContaining({ label: "Life Regen", value: "+0.2 / sec" }),
      expect.objectContaining({ label: "Ailment Duration Reduction", value: "+3%" }),
    ]));
  });

  it("uses explicit signed percentage semantics for crit damage and resistances", () => {
    expect(formatItemStat("criticalStrikeMultiplier", 0.1).value).toBe("+10%");
    expect(formatItemStat("fireResistance", 0.03).value).toBe("+3%");
    expect(formatItemStat("ailmentDurationReduction", 0.03).value).toBe("+3%");
    expect(formatItemStat("baseAttackTime", 2.2)).toMatchObject({ label: "Weapon Base Attack Time", value: "2.2s" });
  });

  it("validates every authored equipment item and every tooltip stat row", () => {
    const validation = validateEquipmentDefinitions(prototypeEquipmentDefinitions);
    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual([]);

    for (const item of prototypeEquipmentDefinitions) {
      const tooltip = buildItemTooltip(item);
      for (const [key, value] of Object.entries(item.stats ?? {})) {
        if (key === "baseDamageMin" || key === "baseDamageMax") continue;
        const expected = formatItemStat(key, value);
        expect(tooltip.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ label: expected.label, value: expected.value }),
        ]));
      }
      if (item.stats?.baseDamageMin !== undefined || item.stats?.baseDamageMax !== undefined) {
        expect(tooltip.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ label: "Physical Damage", value: formatDamageRange(item.stats.baseDamageMin ?? item.stats.baseDamageMax!, item.stats.baseDamageMax ?? item.stats.baseDamageMin!) }),
        ]));
        expect(tooltip.rows?.some((row) => row.label === "Base Damage Min" || row.label === "Base Damage Max")).toBe(false);
      }
    }
  });

  it("shows every direct equipment stat in the canonical build", () => {
    for (const item of prototypeEquipmentDefinitions) {
      const slot = EQUIPMENT_SLOT_DEFINITIONS.find((definition) => definition.kind === item.equipmentSlotKind);
      expect(slot, item.id).toBeDefined();
      if (!slot) continue;
      const before = statsFor(emptyEquipment);
      const after = statsFor({ slots: { [slot.id]: item.id } });
      for (const [key, value] of Object.entries(item.stats ?? {})) {
        const beforeValue = canonicalValue(before, key);
        const afterValue = canonicalValue(after, key);
        if (key === "baseAttackTime" && value === 2.4) expect(afterValue).toBeCloseTo(beforeValue, 10);
        else expect(afterValue, `${item.id} ${key}`).not.toBeCloseTo(beforeValue, 10);
      }
    }
  });

  it("keeps ailment duration reduction in the canonical stat field and sums multiple items", () => {
    const before = statsFor(emptyEquipment);
    const after = statsFor({ slots: {
      head: "item.vanguard-helm",
      armor: "item.vanguard-plate",
      cape: "item.vanguard-cape",
      necklace: "item.arcane-necklace",
    } });
    expect(before.ailmentDurationReduction).toBe(0);
    expect(after.ailmentDurationReduction ?? 0).toBeCloseTo(0.17, 10);
    expect((after.ailmentDurationReduction ?? 0) - (before.ailmentDurationReduction ?? 0)).toBeCloseTo(0.17, 10);
    expect(after.additionalPhysicalDamageReduction).toBeCloseTo(0, 10);
    expect(statsFor({ slots: { cape: "item.warden-cape" } }).additionalPhysicalDamageReduction).toBeCloseTo(0.03, 10);
  });

  it("applies ailment duration reduction only to ailment effects", () => {
    expect(calculateEffectDuration(harmfulTenSecondEffect, { ...statsFor(emptyEquipment), ailmentDurationReduction: 0 })).toBe(10);
    expect(calculateEffectDuration(harmfulTenSecondEffect, { ...statsFor(emptyEquipment), ailmentDurationReduction: 0.03 })).toBe(10);
    expect(calculateEffectDuration(ailmentTenSecondEffect, { ...statsFor(emptyEquipment), ailmentDurationReduction: 0.03 })).toBeCloseTo(9.7, 10);

    const game = createInitialGameState();
    const result = applyEffect(
      game.combat,
      ailmentTenSecondEffect,
      { kind: "enemy", instanceId: "enemy.test" },
      { kind: "player" },
      { targetStats: { ...statsFor(emptyEquipment), ailmentDurationReduction: 0.03 } },
    );
    expect(result.instance?.remainingSeconds).toBeCloseTo(9.7, 10);
  });

  it("uses canonical preview values and keeps them equal to the committed build", () => {
    const before = statsFor({ slots: { weapon: "item.training-sword" } });
    const preview = statsFor({ slots: { weapon: "item.training-sword", earring1: "item.wind-earring" } });
    const actual = statsFor({ slots: { weapon: "item.training-sword", earring1: "item.wind-earring" } });
    for (const key of ["evasionRating", "staminaRegen", "maxLife", "ailmentDurationReduction", "attackInterval", "criticalStrikeMultiplier"] as const)
      expect(preview[key]).toBeCloseTo(actual[key] as number, 10);
    expect(preview.staminaRegen - before.staminaRegen).toBeCloseTo(0.2, 10);
  });

  it("previews and equips Vanguard Helm without losing Ailment Duration Reduction in Hero", () => {
    useGameStore.getState().debug.setItemQuantity("item.vanguard-helm", 1);
    useGameStore.getState().debug.setMasteryLevel(10);
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Hero" }));
    fireEvent.click(document.querySelector('[data-debug-kind="equipment-slot"][data-debug-slot-id="head"]') as HTMLElement);
    const candidate = document.querySelector('[data-debug-kind="equipment-candidate"][data-debug-item-id="item.vanguard-helm"]') as HTMLButtonElement;
    fireEvent.click(candidate);

    expect(document.querySelector('[data-debug-stat="statusResistance"]')).not.toBeInTheDocument();
    expect(statsFor({ slots: { head: "item.vanguard-helm" } }).ailmentDurationReduction ?? 0).toBeCloseTo(0.03);

    fireEvent.click(screen.getByRole("button", { name: "EQUIP" }));
    expect(useGameStore.getState().game.equipment.slots.head).toBe("item.vanguard-helm");
    expect(document.querySelector('[data-debug-kind="hero-combat-stats"]')).not.toHaveAttribute("data-debug-preview-item-id");
    expect(statsFor({ slots: { head: "item.vanguard-helm" } }).ailmentDurationReduction ?? 0).toBeCloseTo(0.03);
  });
});
