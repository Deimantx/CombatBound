import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { grantItem } from "../game/items/itemOwnership";
import { addItemAffix, setItemQuality, setItemUpgradeLevel } from "../game/items/itemMutations";
import {
  loadInventoryManualOrder,
  manualOrderStorageKey,
  normalizeInventoryManualOrder,
  reorderVisibleInventoryEntries,
  saveInventoryManualOrder,
} from "../game/inventory/inventoryManualOrder";
import { buildEquipmentComparisonRows } from "../game/presentation/equipmentComparison";
import { buildItemTooltip, buildPlayerItemInstanceTooltip } from "../game/presentation/tooltipBuilders";
import { itemById } from "../game/data/items";
import { resolveItemInstance } from "../game/items/itemResolver";

describe("Phase 4.4 inventory architecture", () => {
  it("merges a filtered drag reorder without moving hidden entries", () => {
    expect(reorderVisibleInventoryEntries(
      ["A", "B", "C", "D", "E", "F"],
      ["B", "D", "F"],
      "F",
      "B",
      "before",
    )).toEqual(["A", "F", "C", "B", "E", "D"]);
    expect(reorderVisibleInventoryEntries(["A", "B", "C", "D"], ["A", "B", "C", "D"], "D", "B", "before")).toEqual(["A", "D", "B", "C"]);
    expect(reorderVisibleInventoryEntries(["A", "B", "C", "D"], ["A", "B", "C", "D"], "A", "C", "after")).toEqual(["B", "C", "A", "D"]);
  });

  it("normalizes exact instance and stack keys, appends new ownership, and isolates profiles", () => {
    const owned = ["instance:item-instance-00000001", "stack:item.wolf-fang", "instance:item-instance-00000002"];
    expect(normalizeInventoryManualOrder({ version: 1, keys: ["stack:unknown", "instance:item-instance-00000002", "instance:item-instance-00000002", "malformed"] }, owned)).toEqual([
      "instance:item-instance-00000002",
      "instance:item-instance-00000001",
      "stack:item.wolf-fang",
    ]);
    const profileA = manualOrderStorageKey("profile-a");
    const profileB = manualOrderStorageKey("profile-b");
    saveInventoryManualOrder(profileA, [owned[2], owned[0]]);
    saveInventoryManualOrder(profileB, [owned[1], owned[0]]);
    expect(loadInventoryManualOrder(profileA, owned)).toEqual([owned[2], owned[0], owned[1]]);
    expect(loadInventoryManualOrder(profileB, owned)).toEqual([owned[1], owned[0], owned[2]]);
    localStorage.setItem(profileA, "{not-json");
    expect(loadInventoryManualOrder(profileA, owned)).toEqual(owned);
  });

  it("keeps complete player item information separate from debug identity", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.hunter-sword", 1);
    const id = granted.createdInstanceIds[0];
    let inventory = setItemQuality(granted.inventory, id, 12).inventory;
    inventory = setItemUpgradeLevel(inventory, id, 3).inventory;
    inventory = addItemAffix(inventory, id, "affix.sharpened", "affix.sharpened.t1", { next: () => 0.15 }).inventory;
    const resolved = resolveItemInstance(inventory, id)!;
    const tooltip = buildPlayerItemInstanceTooltip(resolved, { equipped: true, masteryLevel: 5 });
    const text = JSON.stringify(tooltip);
    expect(tooltip.sections?.map((section) => section.id)).toEqual(["requirements", "modifications", "item-stats"]);
    expect(text).toContain("Quality");
    expect(text).toContain("Upgrade");
    expect(text).toContain("Sharpened");
    expect(text).not.toContain(id);
    expect(text).not.toContain("affix.sharpened");
    expect(text).not.toMatch(/More stats|Current training|Shield XP|matching armor piece/);
  });

  it("renders all authored static stats without a more-stats truncation", () => {
    const item = {
      ...itemById["item.training-armor"],
      stats: {
        maxLife: 20,
        armour: 8,
        maxMana: 10,
        manaRegenFlat: 0.2,
        maxStamina: 4,
        staminaRegen: 0.3,
        fireResistance: 0.05,
        attackBlockChance: 0.1,
      },
    };
    const tooltip = buildItemTooltip(item);
    expect(tooltip.rows?.map((row) => row.label)).toEqual([
      "Mastery", "Max Life", "Armour", "Max Mana", "Mana Regeneration", "Max Stamina", "Stamina Regeneration", "Fire Resistance", "Attack Block Chance",
    ]);
    expect(JSON.stringify(tooltip)).not.toContain("More stats");
  });

  it("uses canonical comparison coverage, composite damage, epsilon, and direction-aware tone", () => {
    const rows = buildEquipmentComparisonRows(
      { attackDamageMin: 24, attackDamageMax: 32, attackInterval: 2, attackBlockChance: 0.1, spellSuppressionChance: 0.2, fireResistance: 0.1 },
      { attackDamageMin: 30, attackDamageMax: 38, attackInterval: 1.8, attackBlockChance: 0.15, spellSuppressionChance: 0.25, fireResistance: 0.15, armour: 12 },
    );
    expect(rows.filter((row) => row.key === "physicalDamageRange")).toHaveLength(1);
    expect(rows.map((row) => row.key)).not.toEqual(expect.arrayContaining(["attackDamage", "attackDamageMin", "attackDamageMax", "attacksPerSecond"]));
    expect(rows.map((row) => row.key)).toEqual(expect.arrayContaining(["attackInterval", "attackBlockChance", "spellSuppressionChance", "fireResistance", "armour"]));
    expect(rows.find((row) => row.key === "attackInterval")?.tone).toBe("is-positive");
    expect(buildEquipmentComparisonRows({ armour: 10 }, { armour: 10 + 1e-10 })).toEqual([]);
  });
});
