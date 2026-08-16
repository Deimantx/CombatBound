import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InventoryCard } from "../app/screens/inventory/InventoryCard";
import { TooltipProvider } from "../app/components/tooltip/TooltipProvider";
import { createInitialGameState } from "../game/gameState";
import { grantItem } from "../game/items/itemOwnership";
import { addItemAffix, setItemQuality, setItemUpgradeLevel } from "../game/items/itemMutations";
import { selectInventoryEntries, type InventoryFilters } from "../game/inventory/inventorySelectors";
import { inventorySortOptions } from "../game/inventory/inventorySorting";
import { buildDebugItemInstanceTooltip, buildPlayerItemInstanceTooltip } from "../game/presentation/tooltipBuilders";
import { resolveItemInstance } from "../game/items/itemResolver";

afterEach(cleanup);

const equipmentFilters: InventoryFilters = {
  category: "equipment",
  rarity: "all",
  equipmentState: "all",
  modification: "all",
  availability: "all",
};

function buildModifiedInventory() {
  const game = createInitialGameState();
  const granted = grantItem(game.inventory, "item.hunter-sword", 3);
  const [affixedId, upgradedId, qualityId] = granted.createdInstanceIds;
  const withLocked = grantItem(granted.inventory, "item.vanguard-sword", 1);
  let inventory = withLocked.inventory;
  inventory = addItemAffix(inventory, affixedId, "affix.sharpened", "affix.sharpened.t1", { next: () => 0 }).inventory;
  inventory = setItemUpgradeLevel(inventory, upgradedId, 2).inventory;
  inventory = setItemQuality(inventory, qualityId, 12).inventory;
  return { game: { ...game, inventory }, ids: { affixedId, upgradedId, qualityId } };
}

describe("Phase 4.3 inventory information hierarchy", () => {
  it("keeps player tooltips useful without training formulas or ownership/technical notes", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.hunter-armor", 1);
    const resolved = resolveItemInstance(granted.inventory, granted.createdInstanceIds[0])!;
    const player = buildPlayerItemInstanceTooltip(resolved, {
      equipped: true,
      masteryLevel: 5,
      defensiveContext: { lightArmorPieces: 0, mediumArmorPieces: 1, heavyArmorPieces: 0, shieldEquipped: false },
    });
    const text = JSON.stringify(player);
    expect(player.subtitle).toBe("Medium Armor · Uncommon");
    expect(text).not.toMatch(/Training|Current training|matching armor piece|Shield XP|Owned item|Currently equipped|item-instance-|item\.hunter-armor/);
    expect(text).toContain("Max Life");

    const debug = buildDebugItemInstanceTooltip(resolved);
    expect(JSON.stringify(debug)).toContain(resolved.instance.id);
    expect(debug.rows?.some((row) => row.label === "Instance")).toBe(true);
  });

  it("offers only truthful sort options for each inventory context", () => {
    expect(inventorySortOptions("equipment").map((option) => option.label)).toEqual([
      "Manual", "Name", "Rarity", "Mastery Level", "Quality", "Upgrade Level", "Affix Count", "Acquired",
    ]);
    expect(inventorySortOptions("materials").map((option) => option.label)).toEqual(["Manual", "Name", "Rarity", "Quantity"]);
    expect(inventorySortOptions("all").map((option) => option.label)).toEqual(["Manual", "Name", "Rarity", "Category"]);
  });

  it("sorts affix count in both directions with deterministic sequence ties", () => {
    const { game, ids } = buildModifiedInventory();
    let inventory = addItemAffix(game.inventory, ids.affixedId, "affix.swift", "affix.swift.t1", { next: () => 0 }).inventory;
    const entries = selectInventoryEntries({ ...game.inventory, ...inventory }, game.equipment, equipmentFilters, "", { key: "affix-count", direction: "desc" }, { masteryLevel: 5 })
      .filter((entry) => entry.definition.id === "item.hunter-sword");
    expect(entries.map((entry) => entry.instanceId)).toEqual([ids.affixedId, ids.upgradedId, ids.qualityId]);
    const ascending = selectInventoryEntries({ ...game.inventory, ...inventory }, game.equipment, equipmentFilters, "", { key: "affix-count", direction: "asc" }, { masteryLevel: 5 })
      .filter((entry) => entry.definition.id === "item.hunter-sword");
    expect(ascending.map((entry) => entry.instanceId)).toEqual([ids.upgradedId, ids.qualityId, ids.affixedId]);
  });

  it("filters equipment by mastery availability and each modification mode", () => {
    const { game, ids } = buildModifiedInventory();
    const available = selectInventoryEntries(game.inventory, game.equipment, { ...equipmentFilters, availability: "usable" }, "", { key: "name", direction: "asc" }, { masteryLevel: 5 });
    expect(available.some((entry) => entry.definition.id === "item.hunter-sword")).toBe(true);
    expect(available.some((entry) => entry.definition.id === "item.vanguard-sword")).toBe(false);
    const locked = selectInventoryEntries(game.inventory, game.equipment, { ...equipmentFilters, availability: "locked" }, "", { key: "name", direction: "asc" }, { masteryLevel: 5 });
    expect(locked.every((entry) => (entry.definition.requiredMasteryLevel ?? 0) > 5)).toBe(true);

    expect(selectInventoryEntries(game.inventory, game.equipment, { ...equipmentFilters, modification: "affixed" }, "", { key: "name", direction: "asc" }, { masteryLevel: 5 }).map((entry) => entry.instanceId)).toContain(ids.affixedId);
    expect(selectInventoryEntries(game.inventory, game.equipment, { ...equipmentFilters, modification: "upgraded" }, "", { key: "name", direction: "asc" }, { masteryLevel: 5 }).map((entry) => entry.instanceId)).toContain(ids.upgradedId);
    expect(selectInventoryEntries(game.inventory, game.equipment, { ...equipmentFilters, modification: "quality" }, "", { key: "name", direction: "asc" }, { masteryLevel: 5 }).map((entry) => entry.instanceId)).toContain(ids.qualityId);
    expect(selectInventoryEntries(game.inventory, game.equipment, { ...equipmentFilters, modification: "unmodified" }, "", { key: "name", direction: "asc" }, { masteryLevel: 5 }).some((entry) => entry.instanceId === ids.affixedId || entry.instanceId === ids.upgradedId || entry.instanceId === ids.qualityId)).toBe(false);
  });

  it("uses an icon-only affix marker and a mastery lock on cards", () => {
    const { game, ids } = buildModifiedInventory();
    const affixed = selectInventoryEntries(game.inventory, game.equipment, equipmentFilters, "", { key: "name", direction: "asc" }, { masteryLevel: 5 }).find((entry) => entry.instanceId === ids.affixedId)!;
    const lockedInventory = grantItem(game.inventory, "item.vanguard-sword", 1).inventory;
    const lockedGame = { ...game, inventory: lockedInventory };
    const locked = selectInventoryEntries(lockedGame.inventory, lockedGame.equipment, equipmentFilters, "", { key: "name", direction: "asc" }, { masteryLevel: 5 }).find((entry) => entry.definition.id === "item.vanguard-sword")!;
    render(<TooltipProvider><><InventoryCard entry={affixed} masteryLevel={5} selected={false} onSelect={() => undefined} /><InventoryCard entry={locked} masteryLevel={5} selected={false} onSelect={() => undefined} /></></TooltipProvider>);
    expect(document.querySelector('[data-debug-kind="item-affix-marker"]')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/\d+ Mods|\d+ Affixes/);
    expect(document.querySelector(".item-mastery-lock")).toHaveAttribute("aria-label", "Requires Mastery 10; Current Mastery 5");
  });
});
