
import { describe, expect, it } from "vitest";
import { itemById } from "../game/data/items";
import { validateItemAffixDefinitions } from "../game/data/validation/itemAffixValidation";
import { createInitialGameState } from "../game/gameState";
import { createDeterministicItemRng } from "../game/items/itemRandom";
import { isAffixTierApplicable, validateItemAffixInstance } from "../game/items/itemInstanceValidation";
import { addItemAffix, rerollItemAffix } from "../game/items/itemMutations";
import { grantItem } from "../game/items/itemOwnership";
import { rollItemModifier } from "../game/items/itemModifierTypes";
import { selectInventoryEntries } from "../game/inventory/inventorySelectors";
import { buildPlayerItemInstanceTooltip } from "../game/presentation/tooltipBuilders";
import { resolveItemInstance } from "../game/items/itemResolver";
import type { ItemAffixDefinition } from "../game/items/itemModifierTypes";

describe("Phase 3 item cleanup contracts", () => {
  it("uses a reproducible evolving debug RNG stream", () => {
    const first = createDeterministicItemRng(1234);
    const second = createDeterministicItemRng(1234);
    const firstValues = [first.next(), first.next(), first.next()];
    expect(firstValues[0]).not.toBe(firstValues[1]);
    expect([second.next(), second.next(), second.next()]).toEqual(firstValues);
  });

  it("checks applicability against the selected exact tier", () => {
    const definition = itemById["item.copper-signet"];
    const affix: ItemAffixDefinition = {
      id: "test.mixed-tier",
      name: "Mixed Tier",
      kind: "prefix",
      appliesTo: { categories: ["accessory"] },
      tiers: [
        { id: "test.mixed-tier.t1", tier: 1, modifiers: [{ id: "life", scope: "global", stat: "maxLife", operation: "flat", roll: { min: 10, max: 10, valueType: "integer" } }] },
        { id: "test.mixed-tier.t2", tier: 2, modifiers: [{ id: "physical", scope: "local", target: "physicalDamage", operation: "increased", roll: { min: .1, max: .1, step: .1, valueType: "decimal" } }] },
      ],
    };
    expect(isAffixTierApplicable(definition, affix, affix.tiers[0])).toBe(true);
    expect(isAffixTierApplicable(definition, affix, affix.tiers[1])).toBe(false);
    expect(validateItemAffixInstance(definition, { affixId: affix.id, tierId: affix.tiers[1].id, rolls: { physical: .1 } }, [], { [affix.id]: affix })).toEqual(expect.arrayContaining([expect.stringContaining("not applicable")]));
  });

  it("rolls stepped decimals from their minimum and integers as inclusive discrete values", () => {
    const stepped = { min: .12, max: .18, step: .01, valueType: "decimal" as const };
    expect(rollItemModifier(stepped, { next: () => 0 })).toBe(.12);
    expect(rollItemModifier(stepped, { next: () => .999999 })).toBe(.18);
    const integer = { min: 2, max: 4, valueType: "integer" as const };
    expect(rollItemModifier(integer, { next: () => 0 })).toBe(2);
    expect(rollItemModifier(integer, { next: () => .999999 })).toBe(4);
    expect(rollItemModifier(integer, { next: () => 1 })).toBe(4);
  });

  it("rejects a reroll when the resulting full instance is invalid", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.hunter-sword", 1);
    const id = granted.createdInstanceIds[0];
    const added = addItemAffix(granted.inventory, id, "affix.sharpened", "affix.sharpened.t1", { next: () => 0 });
    const broken = {
      ...added.inventory,
      instances: { ...added.inventory.instances, [id]: { ...added.inventory.instances[id], affixes: [...added.inventory.instances[id].affixes, { affixId: "affix.swift", tierId: "affix.swift.t1", rolls: { wrong: 1 } }] } },
    };
    expect(rerollItemAffix(broken, id, "affix.sharpened", { next: () => 1 })).toMatchObject({ changed: false, reason: "invalid-roll-data", inventory: broken });
  });

  it("validates authored affixes beyond duplicate IDs and ranges", () => {
    const result = validateItemAffixDefinitions([{
      id: "",
      name: "Bad",
      kind: "invalid" as "prefix",
      appliesTo: {},
      tiers: [{ id: "", tier: 0, requiredHunterRank: 0, modifiers: [{ id: "", scope: "global", stat: "attackInterval" as "maxLife", operation: "flat", roll: { min: 1.5, max: 4, step: 3, valueType: "integer" } }] }],
    } as ItemAffixDefinition]);
    expect(result.errors.join(" ")).toMatch(/nonempty|kind|applicability|tier number|modifier id|derived|integer|legal/);
  });

  it("builds human inventory entries for exact copies, affix search, filters, and stacks", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.hunter-sword", 2);
    const first = granted.createdInstanceIds[0];
    const modified = addItemAffix(granted.inventory, first, "affix.sharpened", "affix.sharpened.t1", { next: () => 0 });
    const inventory = { ...game.inventory, ...modified.inventory };
    const all = selectInventoryEntries(inventory, game.equipment);
    expect(all.filter((entry) => entry.definition.id === "item.hunter-sword")).toHaveLength(2);
    expect(selectInventoryEntries(inventory, game.equipment, undefined, "Sharpened")).toHaveLength(1);
    expect(selectInventoryEntries(inventory, game.equipment, { category: "equipment", rarity: "all", equipmentState: "all", modification: "modified", nodeId: "items.equipment.weapons" })).toHaveLength(1);
    expect(selectInventoryEntries(inventory, game.equipment, { category: "all", rarity: "all", equipmentState: "all", modification: "unmodified" }).some((entry) => entry.instanceId === first)).toBe(false);
    expect(selectInventoryEntries(inventory, game.equipment).some((entry) => entry.definition.id === "item.healing-potion")).toBe(true);
  });

  it("keeps normal owned-item presentation free of technical IDs and raw modifier keys", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.hunter-sword", 1);
    const id = granted.createdInstanceIds[0];
    const modified = addItemAffix(granted.inventory, id, "affix.sharpened", "affix.sharpened.t1", { next: () => 0 });
    const resolved = resolveItemInstance(modified.inventory, id)!;
    const tooltip = buildPlayerItemInstanceTooltip(resolved);
    const text = JSON.stringify(tooltip);
    expect(text).not.toContain(id);
    expect(text).not.toContain("affix.sharpened");
    expect(text).not.toContain("physicalDamage");
    expect(text).toContain("Physical Damage");
  });
});
