import { describe, expect, it } from "vitest";
import { itemById } from "../game/data/items";
import { itemUpgradeTreeDefinitions } from "../game/data/gear/itemUpgradeTrees";
import { EQUIPMENT_SLOT_IDS } from "../game/equipment/equipmentTypes";
import { equipItemInstance, normalizeEquipmentState } from "../game/equipment/equipmentRules";
import { grantItem } from "../game/items/itemOwnership";
import { normalizeItemInstance } from "../game/items/itemInstanceValidation";
import { createInitialGameState } from "../game/gameState";
import { gameStateToSaveV17, parseGameSaveJson } from "../game/persistence/saveGame";
import { weaponArchetypeById } from "../game/data/gear/weaponArchetypes";
import { resolveWeaponMechanicParameters } from "../game/weapons/weaponMechanicResolver";
import { validateItemUpgradeTrees } from "../game/items/itemUpgradeValidation";
import { itemUpgradeNodeById } from "../game/data/gear/itemUpgradeTrees";
import { debugGrantSelectedGearMaterials } from "../game/debug/debugActions";
import { prepareBasicWeaponAttempt, observeBasicWeaponResult, syncPlayerWeaponRuntime } from "../game/weapons/weaponMechanicRuntime";
import type { DamagePacket, DamageResolution } from "../game/combat/combatDamage";

describe("Iron melee roster and V17 foundation", () => {
  it("authors the complete eight-weapon roster and 96-node tree set", () => {
    const ids = ["sword", "axe", "mace", "dagger", "greatsword", "great-axe", "warhammer", "spear"];
    expect(ids.map((family) => itemById[`item.iron-${family}`]?.weaponFamilyId)).toEqual(ids);
    expect(itemUpgradeTreeDefinitions).toHaveLength(13);
    expect(itemUpgradeTreeDefinitions.reduce((count, tree) => count + tree.nodeIds.length, 0)).toBe(156);
    expect(itemUpgradeTreeDefinitions.every((tree) => tree.branchIds.length === 3 && tree.nodeIds.length === 12)).toBe(true);
  });

  it("keeps current V17 loads conservative", () => {
    const initial = createInitialGameState();
    const swordId = Object.values(initial.inventory.instances).find((instance) => instance.definitionId === "item.iron-sword")?.id;
    const save = gameStateToSaveV17({ ...initial, inventory: { ...initial.inventory, instances: {} }, equipment: { slots: {} } }, { reducedMotion: false, showInspectorButton: false });
    const loaded = parseGameSaveJson(JSON.stringify(save));
    expect(swordId).toBeDefined();
    expect(Object.values(loaded?.inventory.instances ?? {}).some((instance) => instance.definitionId === "item.iron-sword")).toBe(false);
    expect(loaded?.equipment.slots.tool).toBeDefined();
  });

  it("selects the valid branch after filtering orphaned upgrade nodes", () => {
    const initial = createInitialGameState();
    const sword = Object.values(initial.inventory.instances).find((instance) => instance.definitionId === "item.iron-sword")!;
    const normalized = normalizeItemInstance({ ...sword, unlockedUpgradeNodeIds: ["upgrade-node.iron-sword.tempered-edge-2", "upgrade-node.iron-sword.balanced-grip", "upgrade-node.iron-sword.honed-point"] });
    expect(normalized?.unlockedUpgradeNodeIds).toEqual(["upgrade-node.iron-sword.balanced-grip", "upgrade-node.iron-sword.honed-point"]);
  });

  it("discovers an undiscovered base Iron proficiency atomically with equip", () => {
    const initial = createInitialGameState();
    const granted = grantItem(initial.inventory, "item.iron-axe", 1).inventory;
    const axe = Object.values(granted.instances).find((instance) => instance.definitionId === "item.iron-axe")!;
    const progression = { ...initial.progression, proficiencies: {} };
    const result = equipItemInstance({ inventory: granted, equipment: { slots: {} }, instanceId: axe.id, slotId: "weapon", hunterRank: 1, progression });
    expect(result.validation.valid).toBe(true);
    expect(result.validation.willDiscoverProficiency).toBe(true);
    expect(result.progression?.proficiencies["one-handed-axe"]).toEqual({ proficiencyId: "one-handed-axe", totalXp: 0 });
  });

  it("normalizes a malformed two-handed offhand conflict deterministically", () => {
    const initial = createInitialGameState();
    const granted = grantItem(initial.inventory, "item.iron-greatsword", 1).inventory;
    const greatsword = Object.values(granted.instances).find((instance) => instance.definitionId === "item.iron-greatsword")!;
    const shieldId = "item-instance-999";
    const shieldInventory = { ...granted, instances: { ...granted.instances, [shieldId]: { id: shieldId, definitionId: "test.shield", version: 3 as const, unlockedUpgradeNodeIds: [] } } };
    const shield: typeof itemById[string] = { id: "test.shield", name: "Test Shield", category: "accessory", rarity: "common", description: "Test", icon: "shield", inventoryMode: "instance", equipmentSlotKind: "offhand", defensiveProficiencyId: "shield" };
    const equipment = normalizeEquipmentState({ slots: { weapon: greatsword.id, offhand: shieldId } }, shieldInventory, { ...itemById, "test.shield": shield });
    expect(equipment.slots.weapon).toBe(greatsword.id);
    expect(equipment.slots.offhand).toBeUndefined();
  });

  it("keeps the canonical fourteen equipment slot IDs stable", () => {
    expect(EQUIPMENT_SLOT_IDS).toEqual(["weapon", "offhand", "head", "armor", "gloves", "boots", "belt", "cape", "necklace", "ring1", "ring2", "earring1", "earring2", "tool"]);
  });

  it("resolves the complete authored mechanic membership for every weapon", () => {
    const expected: Record<string, string[]> = {
      sword: ["weapon-mechanic.duelist-rhythm", "weapon-mechanic.riposte"],
      axe: ["weapon-mechanic.axe-wounds", "weapon-mechanic.axe-momentum", "weapon-mechanic.axe-execution"],
      mace: ["weapon-mechanic.mace-crushed", "weapon-mechanic.mace-impact"],
      dagger: ["weapon-mechanic.dagger-combo", "weapon-mechanic.dagger-flurry", "weapon-mechanic.dagger-opportunist"],
      greatsword: ["weapon-mechanic.greatsword-heavy-rhythm"],
      "great-axe": ["weapon-mechanic.great-axe-execution", "weapon-mechanic.great-axe-bloodlust"],
      warhammer: ["weapon-mechanic.warhammer-shatter", "weapon-mechanic.warhammer-charged-impact"],
      spear: ["weapon-mechanic.spear-mark", "weapon-mechanic.spear-precision-chain", "weapon-mechanic.spear-counter-thrust"],
    };
    for (const [family, mechanicIds] of Object.entries(expected)) {
      const item = itemById[`item.iron-${family}`];
      const game = grantItem(createInitialGameState().inventory, item.id, 1);
      const instance = game.inventory.instances[game.createdInstanceIds[0]]!;
      const resolved = resolveWeaponMechanicParameters(item, instance);
      expect(weaponArchetypeById[item.weaponArchetypeId!].mechanicIds).toEqual(mechanicIds);
      expect(Object.keys(resolved?.mechanics ?? {})).toEqual(mechanicIds);
    }
  });

  it("rejects unattached mechanic effects and keeps penetration semantics explicit", () => {
    expect(validateItemUpgradeTrees().valid).toBe(true);
    expect(itemUpgradeNodeById["upgrade-node.iron-mace.total-crush"]?.effects).toEqual(expect.arrayContaining([expect.objectContaining({ modifier: "heavyArmorPenetrationPercent" })]));
    expect(itemUpgradeNodeById["upgrade-node.iron-warhammer.pulverize"]?.effects).toEqual(expect.arrayContaining([expect.objectContaining({ modifier: "armorPenetrationPercent" })]));
    expect(itemUpgradeNodeById["upgrade-node.iron-spear.armour-gap"]?.effects).toEqual(expect.arrayContaining([expect.objectContaining({ modifier: "armorPenetrationPercent" })]));
    expect(itemUpgradeNodeById["upgrade-node.iron-mace.total-crush"]?.effects.some((effect) => effect.type === "weaponMechanicModifier" && effect.modifier.endsWith("Flat"))).toBe(false);
  });

  it("derives debug material grants from the selected weapon upgrade tree", () => {
    const initial = createInitialGameState();
    const next = debugGrantSelectedGearMaterials(initial, "item.iron-spear");
    const spearTree = itemUpgradeTreeDefinitions.find((tree) => tree.itemDefinitionId === "item.iron-spear")!;
    const materialIds = new Set(spearTree.nodeIds.flatMap((nodeId) => itemUpgradeNodeById[nodeId]!.costs.map((cost) => cost.itemId)));
    for (const materialId of materialIds) expect(next.inventory.stackables[materialId] ?? 0).toBeGreaterThan(0);
  });

  it("applies Greatsword pre-hit stacks and Spear maximum-Mark bonuses", () => {
    const packet: DamagePacket = { source: { kind: "player" }, target: { kind: "enemy", instanceId: "enemy-1" }, sourceKind: "attack", deliveryKind: "hit", damageType: "physical", canCrit: true, sourceActionId: "basic.weapon-attack", damageMultiplier: 1 };
    const equipped = (itemId: string, unlockedUpgradeNodeIds: string[], counters: Record<string, number>) => {
      const base = createInitialGameState();
      const granted = grantItem(base.inventory, itemId, 1);
      const instanceId = granted.createdInstanceIds[0]!;
      const inventory = { ...granted.inventory, instances: { ...granted.inventory.instances, [instanceId]: { ...granted.inventory.instances[instanceId], unlockedUpgradeNodeIds } } };
      const result = equipItemInstance({ inventory, equipment: { slots: {} }, instanceId, slotId: "weapon", hunterRank: 1, progression: base.progression, ignoreRequirements: true });
      return { ...base, inventory, equipment: result.equipment, progression: result.progression ?? base.progression, combat: { ...base.combat, weaponRuntime: { ...syncPlayerWeaponRuntime(base.combat, result.equipment, inventory), counters } } };
    };
    const greatsword = equipped("item.iron-greatsword", [], { "weapon-mechanic.greatsword-heavy-rhythm": 3 });
    const heavy = prepareBasicWeaponAttempt(greatsword, packet);
    expect(heavy.packet.damageMultiplier).toBeCloseTo(1.09 * 1.25);
    expect(heavy.attempt.special).toBe("perfect-swing");
    const spear = equipped("item.iron-spear", ["upgrade-node.iron-spear.hunters-focus", "upgrade-node.iron-spear.quarry-master", "upgrade-node.iron-spear.impaler"], { "weapon-mechanic.spear-mark": 3 });
    const marked = prepareBasicWeaponAttempt(spear, packet);
    expect(marked.packet.damageMultiplier).toBeCloseTo(1.1);
    expect(marked.packet.criticalStrikeChance).toBeCloseTo(0.05);
  });

  it("applies successful special post-hit grants exactly once", () => {
    const base = createInitialGameState();
    const granted = grantItem(base.inventory, "item.iron-spear", 1);
    const instanceId = granted.createdInstanceIds[0]!;
    const inventory = { ...granted.inventory, instances: { ...granted.inventory.instances, [instanceId]: { ...granted.inventory.instances[instanceId], unlockedUpgradeNodeIds: ["upgrade-node.iron-spear.master-counter"] } } };
    const result = equipItemInstance({ inventory, equipment: { slots: {} }, instanceId, slotId: "weapon", hunterRank: 1, progression: base.progression, ignoreRequirements: true });
    const game = { ...base, inventory, equipment: result.equipment, progression: result.progression ?? base.progression, combat: { ...base.combat, weaponRuntime: { ...syncPlayerWeaponRuntime(base.combat, result.equipment, inventory), counters: { "weapon-mechanic.spear-mark": 1, "weapon-mechanic.spear-precision-chain": 1 } } } };
    const hit = { outcome: "hit", critical: false } as DamageResolution;
    const packet: DamagePacket = { source: { kind: "player" }, target: { kind: "enemy", instanceId: "enemy-1" }, sourceKind: "attack", deliveryKind: "hit", damageType: "physical", canCrit: true, sourceActionId: "basic.weapon-attack" };
    const next = observeBasicWeaponResult(game, packet, hit, { special: "counter-thrust", mechanicId: "weapon-mechanic.spear-counter-thrust" });
    expect(next.combat.weaponRuntime.counters["weapon-mechanic.spear-mark"]).toBe(3);
    expect(next.combat.weaponRuntime.counters["weapon-mechanic.spear-precision-chain"]).toBe(3);
  });
});
