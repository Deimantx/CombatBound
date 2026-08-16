import { describe, expect, it } from "vitest";
import { itemDefinitions } from "../game/data/items";
import { createInitialGameState } from "../game/gameState";
import { chooseEquipmentTargetSlot, defaultInventoryFilters, paginateInventoryEntries, selectInventoryEntries } from "../game/inventory/inventorySelectors";
import { addItemAffix } from "../game/items/itemMutations";
import { getItemInstances, grantItem } from "../game/items/itemOwnership";
import { buildEquipmentComparisonRows } from "../game/presentation/equipmentComparison";
import { buildItemTaxonomy, findItemTaxonomyNode } from "../game/presentation/itemTaxonomy";
import { EQUIPMENT_SLOT_DEFINITIONS } from "../game/equipment/equipmentTypes";
import { debugDeleteItemInstance } from "../game/debug/debugActions";

describe("Phase 4 inventory contracts", () => {
  it("enumerates inventory instances once even when definitions are numerous", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.hunter-sword", 40);
    let enumerationCount = 0;
    const entries = selectInventoryEntries(granted.inventory, game.equipment, defaultInventoryFilters, "", "name", (inventory) => {
      enumerationCount += 1;
      return getItemInstances(inventory);
    });
    expect(enumerationCount).toBe(1);
    expect(entries.filter((entry) => entry.definition.id === "item.hunter-sword")).toHaveLength(40);
  });

  it("uses the shared taxonomy for the required equipment hierarchy", () => {
    const taxonomy = buildItemTaxonomy(itemDefinitions);
    expect(findItemTaxonomyNode(taxonomy, "items.equipment.weapons.one-handed.one-handed-swords")?.definitionIds).toEqual(["item.training-sword", "item.hunter-sword", "item.vanguard-sword"]);
    expect(findItemTaxonomyNode(taxonomy, "items.equipment.armor.light-armor.head")?.definitionIds).toEqual(["item.training-hood"]);
    expect(findItemTaxonomyNode(taxonomy, "items.materials")?.label).toBe("Materials");
    expect(findItemTaxonomyNode(taxonomy, "debug.items.equipment")).toBeUndefined();
  });

  it("chooses the current shared slot, then an empty slot, then the first slot", () => {
    const rings = EQUIPMENT_SLOT_DEFINITIONS.filter((slot) => slot.kind === "ring");
    const earrings = EQUIPMENT_SLOT_DEFINITIONS.filter((slot) => slot.kind === "earring");
    expect(chooseEquipmentTargetSlot(rings, { slots: { ring2: "copy" } }, "copy")).toBe("ring2");
    expect(chooseEquipmentTargetSlot(earrings, { slots: { earring2: "other" } }, "copy")).toBe("earring1");
    expect(chooseEquipmentTargetSlot(rings, { slots: { ring1: "other", ring2: "copy" } }, "new-copy")).toBe("ring1");
  });

  it("represents physical damage as one structured comparison row", () => {
    const rows = buildEquipmentComparisonRows(
      { attackDamage: 28, attackDamageMin: 24, attackDamageMax: 32, armour: 10 },
      { attackDamage: 34, attackDamageMin: 30, attackDamageMax: 38, armour: 12 },
    );
    expect(rows.map((row) => row.key)).toEqual(["physicalDamageRange", "armour"]);
    expect(rows[0]).toMatchObject({ label: "Physical Damage", before: "24–32", after: "30–38" });
    expect(rows.some((row) => ["attackDamage", "attackDamageMin", "attackDamageMax"].includes(row.key))).toBe(false);
  });

  it("deletes only the requested unequipped copy and preserves sequence and collection", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.hunter-sword", 3);
    const withCopies = { ...game, inventory: granted.inventory };
    const ids = granted.createdInstanceIds;
    const next = debugDeleteItemInstance(withCopies, ids[1]);
    expect(next.inventory.instances[ids[0]]).toBeDefined();
    expect(next.inventory.instances[ids[1]]).toBeUndefined();
    expect(next.inventory.instances[ids[2]]).toBeDefined();
    expect(next.inventory.nextInstanceSequence).toBe(withCopies.inventory.nextInstanceSequence);
    expect(next.collection).toBe(withCopies.collection);
    const regrown = grantItem(next.inventory, "item.hunter-sword", 1);
    expect(regrown.createdInstanceIds[0]).not.toBe(ids[1]);
  });

  it("protects equipped copies and removes modified copies through the domain action", () => {
    const initial = createInitialGameState();
    const equippedId = initial.equipment.slots.weapon;
    expect(equippedId).toBeDefined();
    expect(debugDeleteItemInstance(initial, equippedId!)).toBe(initial);
    const granted = grantItem(initial.inventory, "item.hunter-sword", 1);
    const id = granted.createdInstanceIds[0];
    const modified = addItemAffix(granted.inventory, id, "affix.sharpened", "affix.sharpened.t1", { next: () => 0 });
    const deleted = debugDeleteItemInstance({ ...initial, inventory: modified.inventory }, id);
    expect(deleted.inventory.instances[id]).toBeUndefined();
  });

  it("caps visible inventory entries incrementally", () => {
    const entries = Array.from({ length: 250 }, (_, index) => ({ sequence: index, quantity: 1 } as never));
    expect(paginateInventoryEntries(entries, 120)).toHaveLength(120);
    expect(paginateInventoryEntries(entries, 240)).toHaveLength(240);
    expect(paginateInventoryEntries(entries, 500)).toHaveLength(250);
  });
});
