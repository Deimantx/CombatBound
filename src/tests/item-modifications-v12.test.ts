import { describe, expect, it } from "vitest";
import { itemAffixById } from "../game/data/itemAffixes";
import { itemById } from "../game/data/items";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { equipItemInstance, previewEquipmentChange } from "../game/equipment/equipmentRules";
import { createInitialGameState } from "../game/gameState";
import { addItemAffix, rerollItemAffix, setItemQuality, setItemUpgradeLevel } from "../game/items/itemMutations";
import { allocateItemInstanceId, grantItem } from "../game/items/itemOwnership";
import { resolveItemInstance } from "../game/items/itemResolver";
import { MAX_ITEM_QUALITY } from "../game/items/itemQuality";
import { validateItemInstance } from "../game/items/itemInstanceValidation";
import { migrateV10Save, migrateV11Save } from "../game/persistence/saveMigration";
import { parseGameSaveJson } from "../game/persistence/saveGame";
import { isGameSave } from "../game/persistence/saveValidation";
import { buildStatBreakdown } from "../game/presentation/statBreakdown";
import { buildItemInstanceTooltip } from "../game/presentation/tooltipBuilders";
import { debugGrantItem, debugSetItemQuality, debugSetOwnedItemCount } from "../game/debug/debugActions";
import type { InventoryState } from "../game/inventory/inventoryTypes";

const midpointRng = { next: () => 0.5 };

function twoSwords() {
  const game = createInitialGameState();
  const inventory = grantItem(game.inventory, "item.hunter-sword", 2).inventory;
  const swords = Object.values(inventory.instances).filter((instance) => instance.definitionId === "item.hunter-sword");
  return { game: { ...game, inventory }, first: swords[0], second: swords[1] };
}

function saveFor(game: ReturnType<typeof createInitialGameState>, inventory = game.inventory, equipment = game.equipment) {
  return { version: 12 as const, progression: game.progression, inventory, equipment, collection: game.collection, gold: game.gold, settings: { reducedMotion: false, showInspectorButton: true }, spellbook: game.spellbook, combatAutomation: game.combatAutomation, combatAutomationPresets: game.combatAutomationPresets, combatAbilities: game.combatAbilities };
}

describe("ItemInstance V2 modification foundation", () => {
  it("creates clean V2 defaults and keeps duplicate definitions independent", () => {
    const { first, second, game } = twoSwords();
    expect(first).toMatchObject({ version: 2, quality: 0, upgradeLevel: 0, affixes: [] });
    const changed = setItemQuality(game.inventory, first.id, 12);
    expect(changed.changed).toBe(true);
    expect(changed.inventory.instances[first.id].quality).toBe(12);
    expect(changed.inventory.instances[second.id].quality).toBe(0);
    expect(itemById[first.definitionId].stats?.baseDamageMin).toBe(29);
  });

  it("applies quality, upgrade, and local physical damage additively", () => {
    const { first, game } = twoSwords();
    let inventory = setItemQuality(game.inventory, first.id, 10).inventory;
    inventory = setItemUpgradeLevel(inventory, first.id, 6).inventory;
    inventory = addItemAffix(inventory, first.id, "affix.sharpened", "affix.sharpened.t1", { next: () => 1 / 3 }).inventory;
    const resolved = resolveItemInstance(inventory, first.id)!;
    expect(resolved.contributions.filter((entry) => entry.target === "physicalDamage").map((entry) => entry.value)).toEqual([0.1, 0.18, 0.14]);
    expect(resolved.effectiveStats.baseDamageMin).toBeCloseTo(29 * 1.42, 10);
    expect(resolved.effectiveStats.baseDamageMax).toBeCloseTo(39 * 1.42, 10);
  });

  it("uses inverse local attack speed and supports global stats on a statless base", () => {
    const { first, game } = twoSwords();
    const swift = addItemAffix(game.inventory, first.id, "affix.swift", "affix.swift.t1", midpointRng);
    const stalwart = addItemAffix(swift.inventory, first.id, "affix.stalwart", "affix.stalwart.t1", midpointRng);
    const precise = addItemAffix(stalwart.inventory, first.id, "affix.precise", "affix.precise.t1", midpointRng);
    const resolved = resolveItemInstance(precise.inventory, first.id)!;
    expect(resolved.effectiveStats.baseAttackTime).toBeCloseTo(2.2 / 1.06, 10);
    expect(resolved.effectiveStats.maxLife).toBe(17);
    expect(resolved.effectiveStats.accuracyRating).toBe(18);
  });

  it("feeds the exact modified instance into combat and leaves the sibling at base", () => {
    const { first, second, game } = twoSwords();
    const modifiedInventory = addItemAffix(setItemQuality(game.inventory, first.id, 20).inventory, first.id, "affix.sharpened", "affix.sharpened.t1", { next: () => 1 }).inventory;
    const firstStats = calculateHunterCombatStats({ slots: { weapon: first.id } }, modifiedInventory, game.progression, game.combat.techniques);
    const secondStats = calculateHunterCombatStats({ slots: { weapon: second.id } }, modifiedInventory, game.progression, game.combat.techniques);
    expect(firstStats.attackDamageMin).toBeCloseTo(29 * 1.38, 10);
    expect(secondStats.attackDamageMin).toBe(29);
    const breakdown = buildStatBreakdown({ equipment: { slots: { weapon: first.id } }, inventory: modifiedInventory, progression: game.progression, techniques: game.combat.techniques, playerEffects: [], combatPhase: "inactive" }, "attackDamage", "build");
    expect(breakdown.finalValue).toBeCloseTo(firstStats.attackDamage, 10);
    expect(breakdown.contributions.some((entry) => entry.sourceId === first.id)).toBe(true);
  });

  it("rejects invalid applicability, duplicates, capacities, tiers, and rolls", () => {
    const { first, game } = twoSwords();
    const ringGrant = grantItem(game.inventory, "item.copper-signet", 1);
    const ring = ringGrant.createdInstanceIds[0];
    expect(addItemAffix(ringGrant.inventory, ring, "affix.sharpened", "affix.sharpened.t1", midpointRng)).toMatchObject({ changed: false, reason: "affix-not-applicable" });
    const one = addItemAffix(game.inventory, first.id, "affix.sharpened", "affix.sharpened.t1", midpointRng);
    expect(addItemAffix(one.inventory, first.id, "affix.sharpened", "affix.sharpened.t1", midpointRng)).toMatchObject({ changed: false, reason: "duplicate-affix" });
    const invalid = { ...one.inventory.instances[first.id], affixes: [{ affixId: "affix.sharpened", tierId: "affix.sharpened.t1", rolls: { "local-physical": 9 } }] };
    expect(validateItemInstance({ ...invalid, id: first.id })).toMatchObject({ valid: false });
    expect(validateItemInstance({ ...one.inventory.instances[first.id], affixes: [{ affixId: "affix.sharpened", tierId: "affix.swift.t1", rolls: { "local-physical": 0.15 } }] })).toMatchObject({ valid: false });
    expect(itemAffixById["affix.sharpened"]).toBeDefined();
  });

  it("rerolls only selected rolls while preserving instance and affix identity", () => {
    const { first, game } = twoSwords();
    const added = addItemAffix(game.inventory, first.id, "affix.sharpened", "affix.sharpened.t1", { next: () => 0 });
    const rerolled = rerollItemAffix(added.inventory, first.id, "affix.sharpened", { next: () => 1 });
    expect(rerolled.inventory.instances[first.id]).toMatchObject({ id: first.id, affixes: [{ affixId: "affix.sharpened", tierId: "affix.sharpened.t1", rolls: { "local-physical": 0.18 } }] });
    expect(rerolled.inventory.instances[first.id].definitionId).toBe("item.hunter-sword");
  });

  it("keeps definition tooltips base while instance tooltips expose modifications", () => {
    const { first, game } = twoSwords();
    const inventory = addItemAffix(setItemQuality(game.inventory, first.id, 12).inventory, first.id, "affix.sharpened", "affix.sharpened.t1", { next: () => 0 }).inventory;
    const resolved = resolveItemInstance(inventory, first.id)!;
    const tooltip = buildItemInstanceTooltip(resolved);
    expect(tooltip.rows?.map((row) => row.label)).toEqual(expect.arrayContaining(["Instance", "Quality", "Upgrade", expect.stringContaining("Prefix: Sharpened")]));
    expect(resolved.definition.stats?.baseDamageMin).toBe(29);
  });

  it("preserves exact item identity through V11 migration and V12 round trip", () => {
    const game = createInitialGameState();
    const v11 = migrateV10Save({ version: 10, progression: game.progression, inventory: { quantities: { "item.hunter-sword": 2 } }, equipment: { slots: { weapon: "item.hunter-sword" } }, collection: game.collection, gold: 0, settings: { reducedMotion: false, showInspectorButton: true }, spellbook: game.spellbook, combatAutomation: game.combatAutomation, combatAutomationPresets: game.combatAutomationPresets, combatAbilities: game.combatAbilities })!;
    const migrated = migrateV11Save(v11)!;
    const id = migrated.equipment.slots.weapon!;
    expect(migrated.version).toBe(12);
    expect(migrated.inventory.instances[id]).toMatchObject({ id, version: 2, quality: 0, upgradeLevel: 0, affixes: [] });
    expect(migrated.inventory.nextInstanceSequence).toBe(v11.inventory.nextInstanceSequence);
    const modifiedInventory = setItemQuality(migrated.inventory, id, MAX_ITEM_QUALITY).inventory;
    const modified = { ...migrated, inventory: modifiedInventory };
    const loaded = parseGameSaveJson(JSON.stringify(modified))!;
    expect(loaded.inventory.instances[id]).toEqual(modifiedInventory.instances[id]);
    expect(loaded.equipment.slots.weapon).toBe(id);
  });

  it("migrates duplicate ring ownership one-to-one and drops over-equipped copies", () => {
    const game = createInitialGameState();
    const migrated = migrateV10Save({ version: 10, progression: game.progression, inventory: { quantities: { "item.copper-signet": 2 } }, equipment: { slots: { ring1: "item.copper-signet", ring2: "item.copper-signet" } }, collection: game.collection, gold: 0, settings: { reducedMotion: false, showInspectorButton: true }, spellbook: game.spellbook, combatAutomation: game.combatAutomation, combatAutomationPresets: game.combatAutomationPresets, combatAbilities: game.combatAbilities })!;
    expect(new Set(Object.values(migrated.inventory.instances).map((instance) => instance.id)).size).toBe(2);
    expect(new Set(Object.values(migrated.equipment.slots))).toHaveLength(2);
    const corrupt = migrateV10Save({ version: 10, progression: game.progression, inventory: { quantities: { "item.copper-signet": 1 } }, equipment: { slots: { ring1: "item.copper-signet", ring2: "item.copper-signet" } }, collection: game.collection, gold: 0, settings: { reducedMotion: false, showInspectorButton: true }, spellbook: game.spellbook, combatAutomation: game.combatAutomation, combatAutomationPresets: game.combatAutomationPresets, combatAbilities: game.combatAbilities })!;
    expect(Object.values(corrupt.equipment.slots)).toHaveLength(1);
  });

  it("rejects malformed current saves and preserves collision safety", () => {
    const inventory: InventoryState = { stackables: {}, instances: { "item-instance-00000015": { id: "item-instance-00000015", definitionId: "item.hunter-sword", version: 2, quality: 0, upgradeLevel: 0, affixes: [] } }, nextInstanceSequence: 15 };
    const allocated = allocateItemInstanceId(inventory);
    expect(allocated.id).toBe("item-instance-00000016");
    expect(allocated.nextInstanceSequence).toBe(17);
    const game = createInitialGameState();
    const bad = saveFor(game, { ...game.inventory, instances: { ...game.inventory.instances, [game.equipment.slots.weapon!]: { ...game.inventory.instances[game.equipment.slots.weapon!], quality: 21 } } });
    expect(isGameSave(bad)).toBe(false);
  });

  it("moves exact instances in preview and committed equipment without double counting", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.copper-signet", 2);
    const ids = granted.createdInstanceIds;
    const firstEquip = equipItemInstance({ inventory: granted.inventory, equipment: game.equipment, instanceId: ids[0], slotId: "ring1", masteryLevel: 10 });
    const bothEquip = equipItemInstance({ inventory: granted.inventory, equipment: firstEquip.equipment, instanceId: ids[1], slotId: "ring2", masteryLevel: 10 });
    const preview = previewEquipmentChange({ inventory: granted.inventory, equipment: bothEquip.equipment, instanceId: ids[0], slotId: "ring2", masteryLevel: 10 });
    expect(preview.equipment.slots.ring1).toBeUndefined();
    expect(preview.equipment.slots.ring2).toBe(ids[0]);
    const stats = calculateHunterCombatStats(preview.equipment, granted.inventory, game.progression, game.combat.techniques);
    expect(stats.accuracyRating).toBe(78);
  });

  it("debug mutation targets one exact instance", () => {
    const { first, second, game } = twoSwords();
    const changed = debugSetItemQuality(game, first.id, 15);
    expect(changed.inventory.instances[first.id].quality).toBe(15);
    expect(changed.inventory.instances[second.id].quality).toBe(0);
    expect(changed.inventory.instances[first.id].definitionId).toBe(second.definitionId);
  });

  it("keeps equipped gear when debug owned-count cleanup removes siblings", () => {
    const game = createInitialGameState();
    const granted = debugGrantItem(game, "item.hunter-cap", 2);
    const ids = Object.values(granted.inventory.instances).filter((instance) => instance.definitionId === "item.hunter-cap").map((instance) => instance.id);
    const equipped = equipItemInstance({ inventory: granted.inventory, equipment: granted.equipment, instanceId: ids[0], slotId: "head", masteryLevel: 10 });
    const reduced = debugSetOwnedItemCount({ ...granted, equipment: equipped.equipment }, "item.hunter-cap", 1);
    expect(reduced.inventory.instances[ids[0]]).toBeDefined();
    expect(Object.values(reduced.inventory.instances).filter((instance) => instance.definitionId === "item.hunter-cap")).toHaveLength(1);
  });
});
