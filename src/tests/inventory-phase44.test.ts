import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { grantItem } from "../game/items/itemOwnership";
import { loadInventoryManualOrder, manualOrderStorageKey, normalizeInventoryManualOrder, reorderVisibleInventoryEntries, saveInventoryManualOrder } from "../game/inventory/inventoryManualOrder";
import { buildEquipmentComparisonRows } from "../game/presentation/equipmentComparison";
import { buildItemTooltip, buildPlayerItemInstanceTooltip } from "../game/presentation/tooltipBuilders";
import { itemById } from "../game/data/items";
import { resolveItemInstance } from "../game/items/itemResolver";
import { purchaseItemUpgradeNode } from "../game/items/itemUpgradeLogic";

describe("current inventory architecture", () => {
  it("merges a filtered drag reorder without moving hidden entries", () => {
    expect(reorderVisibleInventoryEntries(["A", "B", "C", "D", "E", "F"], ["B", "D", "F"], "F", "B", "before")).toEqual(["A", "F", "C", "B", "E", "D"]);
  });

  it("normalizes exact instance and stack keys and isolates profiles", () => {
    const owned = ["instance:item-instance-00000001", "stack:item.wolf-fang", "instance:item-instance-00000002"];
    expect(normalizeInventoryManualOrder({ version: 1, keys: ["stack:unknown", "instance:item-instance-00000002", "instance:item-instance-00000002", "malformed"] }, owned)).toEqual(["instance:item-instance-00000002", "instance:item-instance-00000001", "stack:item.wolf-fang"]);
    const profileA = manualOrderStorageKey("profile-a");
    const profileB = manualOrderStorageKey("profile-b");
    saveInventoryManualOrder(profileA, [owned[2], owned[0]]);
    saveInventoryManualOrder(profileB, [owned[1], owned[0]]);
    expect(loadInventoryManualOrder(profileA, owned)).toEqual([owned[2], owned[0], owned[1]]);
    expect(loadInventoryManualOrder(profileB, owned)).toEqual([owned[1], owned[0], owned[2]]);
  });

  it("keeps the player tooltip focused on deterministic specialization contributions", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.iron-sword", 1);
    let inventory = grantItem(granted.inventory, "item.iron-bar", 2).inventory;
    inventory = grantItem(inventory, "item.weapon-scrap", 2).inventory;
    inventory = purchaseItemUpgradeNode({ inventory, instanceId: granted.createdInstanceIds[0], nodeId: "upgrade-node.iron-sword.tempered-edge-1" }).inventory;
    const resolved = resolveItemInstance(inventory, granted.createdInstanceIds[0])!;
    const tooltip = buildPlayerItemInstanceTooltip(resolved, { equipped: true, hunterRank: 1 });
    const text = JSON.stringify(tooltip);
    expect(text).toContain("Tempered");
    expect(text).toContain("1 / 4");
    expect(text).not.toMatch(/quality|upgradeLevel|affix/i);
  });

  it("renders authored static item stats without truncation", () => {
    const tooltip = buildItemTooltip(itemById["item.iron-sword"]);
    expect(JSON.stringify(tooltip)).toContain("Physical Damage");
    expect(JSON.stringify(tooltip)).not.toContain("More stats");
  });

  it("uses canonical comparison coverage and direction-aware tone", () => {
    const rows = buildEquipmentComparisonRows({ attackDamageMin: 24, attackDamageMax: 32, attackInterval: 2, blockChance: 0.1, blockEffect: 0.2, fireResistance: 0.1 }, { attackDamageMin: 30, attackDamageMax: 38, attackInterval: 1.8, blockChance: 0.15, blockEffect: 0.25, fireResistance: 0.15, armour: 12 });
    expect(rows.filter((row) => row.key === "physicalDamageRange")).toHaveLength(1);
    expect(rows.find((row) => row.key === "attackInterval")?.tone).toBe("is-positive");
  });
});
