import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InventoryCard } from "../app/screens/inventory/InventoryCard";
import { TooltipProvider } from "../app/components/tooltip/TooltipProvider";
import { createInitialGameState } from "../game/gameState";
import { grantItem } from "../game/items/itemOwnership";
import { purchaseItemUpgradeNode } from "../game/items/itemUpgradeLogic";
import { selectInventoryEntries, type InventoryFilters } from "../game/inventory/inventorySelectors";
import { inventorySortOptions } from "../game/inventory/inventorySorting";
import { buildPlayerItemInstanceTooltip } from "../game/presentation/tooltipBuilders";
import { resolveItemInstance } from "../game/items/itemResolver";

afterEach(cleanup);

const filters: InventoryFilters = { category: "equipment", rarity: "all", equipmentState: "all", modification: "all", availability: "all" };

function buildCopies() {
  const game = createInitialGameState();
  let inventory = grantItem(game.inventory, "item.iron-sword", 2).inventory;
  for (const [itemId, quantity] of [["item.iron-bar", 20], ["item.weapon-scrap", 2], ["item.wolf-fang", 3]] as const) inventory = grantItem(inventory, itemId, quantity).inventory;
  const ids = Object.values(inventory.instances).map((instance) => instance.id);
  inventory = purchaseItemUpgradeNode({ inventory, instanceId: ids[0], nodeId: "upgrade-node.iron-sword.tempered-edge-1" }).inventory;
  inventory = purchaseItemUpgradeNode({ inventory, instanceId: ids[1], nodeId: "upgrade-node.iron-sword.balanced-grip" }).inventory;
  return { game: { ...game, inventory }, ids };
}

describe("current inventory information hierarchy", () => {
  it("shows exact specialization and progress without retired modifier language", () => {
    const { game, ids } = buildCopies();
    const resolved = resolveItemInstance(game.inventory, ids[1])!;
    const tooltip = buildPlayerItemInstanceTooltip(resolved, { equipped: false, hunterRank: 1 });
    const text = JSON.stringify(tooltip);
    expect(text).toContain("Duelist");
    expect(text).toContain("1 / 4");
    expect(text).not.toMatch(/quality|upgradeLevel|affix/i);
  });

  it("offers current truthful equipment sort options", () => {
    expect(inventorySortOptions("equipment").map((option) => option.label)).toEqual(["Manual", "Name", "Rarity", "Hunter Rank", "Upgrade Nodes", "Acquired"]);
  });

  it("filters and sorts exact copies by deterministic upgrade progress", () => {
    const { game, ids } = buildCopies();
    const entries = selectInventoryEntries(game.inventory, game.equipment, filters, "", { key: "upgrade", direction: "desc" }, { hunterRank: 1 }).filter((entry) => entry.definition.id === "item.iron-sword");
    expect(entries.map((entry) => entry.instanceId)).toEqual([ids[0], ids[1], ids[2]]);
    expect(selectInventoryEntries(game.inventory, game.equipment, { ...filters, modification: "upgraded" }, "", { key: "name", direction: "asc" }, { hunterRank: 1 })).toHaveLength(2);
  });

  it("renders an upgrade marker rather than an affix marker", () => {
    const { game, ids } = buildCopies();
    const entry = selectInventoryEntries(game.inventory, game.equipment, filters, "", { key: "name", direction: "asc" }, { hunterRank: 1 }).find((candidate) => candidate.instanceId === ids[1])!;
    render(<TooltipProvider><InventoryCard entry={entry} hunterRank={1} selected={false} onSelect={() => undefined} /></TooltipProvider>);
    expect(document.querySelector(".item-upgrade-marker")).toBeInTheDocument();
    expect(document.querySelector(".item-affix-marker")).toBeNull();
  });
});
