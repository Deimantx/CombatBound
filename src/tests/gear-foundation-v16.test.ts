import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { gameStateToSaveV14, gameStateToSaveV17, parseGameSaveJson } from "../game/persistence/saveGame";
import { isGameSaveV17 } from "../game/persistence/saveValidation";
import { grantItem } from "../game/items/itemOwnership";
import { getItemUpgradeSpecialization, getUpgradeNodeState, purchaseItemUpgradeNode } from "../game/items/itemUpgradeLogic";
import { normalizeItemInstance, validateItemInstance } from "../game/items/itemInstanceValidation";
import { resolveItemInstance } from "../game/items/itemResolver";
import { validateEquipmentChange } from "../game/equipment/equipmentRules";
import { getProficiencyLevel } from "../game/progression/proficiencyProgression";
import { ironSwordUpgradeBranches, ironSwordUpgradeTree, itemUpgradeNodeById } from "../game/data/gear/itemUpgradeTrees";
import { itemById } from "../game/data/items";
import { debugGrantIronSwordMaterials } from "../game/debug/debugActions";
import { resolveWeaponMechanicParameters } from "../game/weapons/weaponMechanicResolver";
import { applySuccessfulPlayerBlock, advanceWeaponMechanicRuntime, consumeRiposteForBasicAttempt, observeBasicWeaponResult, syncPlayerWeaponRuntime, weaponMechanicStatModifiers } from "../game/weapons/weaponMechanicRuntime";
import type { DamagePacket, DamageResolution } from "../game/combat/combatDamage";

const settings = { reducedMotion: false, showInspectorButton: true };
const p1 = "upgrade-node.iron-sword.tempered-edge-1";
const p2 = "upgrade-node.iron-sword.tempered-edge-2";
const r1 = "upgrade-node.iron-sword.balanced-grip";
const r2 = "upgrade-node.iron-sword.honed-point";
const r3 = "upgrade-node.iron-sword.duelist-flow";
const r4 = "upgrade-node.iron-sword.perfect-rhythm";
const g1 = "upgrade-node.iron-sword.guarded-hilt";

describe("Iron Sword gear foundation V17", () => {
  it("bootstraps one clean sword, ten potions, and equips the sword", () => {
    const game = createInitialGameState();
    const instances = Object.values(game.inventory.instances);
    expect(instances).toHaveLength(1);
    expect(instances[0]).toEqual({ id: instances[0].id, definitionId: "item.iron-sword", version: 3, unlockedUpgradeNodeIds: [] });
    expect(game.inventory.stackables["item.healing-potion"]).toBe(10);
    expect(game.equipment.slots).toEqual({ weapon: instances[0].id });
  });

  it("purchases one node atomically on one exact sword instance", () => {
    const game = createInitialGameState();
    const instanceId = Object.keys(game.inventory.instances)[0];
    let inventory = grantItem(game.inventory, "item.iron-bar", 2).inventory;
    inventory = grantItem(inventory, "item.weapon-scrap", 2).inventory;
    expect(getUpgradeNodeState(inventory, instanceId, p1)).toBe("available");
    const purchased = purchaseItemUpgradeNode({ inventory, instanceId, nodeId: p1 });
    expect(purchased.outcome).toBe("purchased");
    expect(purchased.inventory.stackables["item.iron-bar"]).toBe(0);
    expect(purchased.inventory.stackables["item.weapon-scrap"]).toBe(0);
    expect(purchased.inventory.instances[instanceId].unlockedUpgradeNodeIds).toEqual([p1]);
    const duplicate = purchaseItemUpgradeNode({ inventory: purchased.inventory, instanceId, nodeId: p1 });
    expect(duplicate.outcome).toBe("already-unlocked");
    expect(duplicate.inventory).toBe(purchased.inventory);
  });

  it("migrates V15 retired instances to one Iron Sword and is idempotent", () => {
    const game = createInitialGameState();
    const base = gameStateToSaveV14(game, settings);
    const legacy = {
      ...base,
      inventory: {
        stackables: { "item.healing-potion": 7, "item.wolf-fang": 3 },
        instances: { "item-instance-00000009": { id: "item-instance-00000009", definitionId: "item.hunter-sword", version: 2, quality: 20, upgradeLevel: 4, affixes: [] } },
        nextInstanceSequence: 10,
      },
      equipment: { slots: { weapon: "item-instance-00000009" } },
    };
    const migrated = parseGameSaveJson(JSON.stringify(legacy));
    expect(migrated?.version).toBe(17);
    expect(migrated && isGameSaveV17(migrated)).toBe(true);
    expect(Object.values(migrated!.inventory.instances)).toHaveLength(1);
    expect(Object.values(migrated!.inventory.instances)[0]).toMatchObject({ definitionId: "item.iron-sword", version: 3, unlockedUpgradeNodeIds: [] });
    expect(Object.values(migrated!.inventory.instances)[0]).not.toHaveProperty("quality");
    expect(migrated!.inventory.stackables["item.healing-potion"]).toBe(7);
    expect(migrated!.inventory.stackables["item.wolf-fang"]).toBe(3);
    expect(migrated!.equipment.slots.weapon).toBe(Object.keys(migrated!.inventory.instances)[0]);
    expect(parseGameSaveJson(JSON.stringify(migrated))).toEqual(migrated);
  });

  it("keeps two fresh swords identical and upgrades only the purchased instance", () => {
    const game = createInitialGameState();
    const granted = grantItem(game.inventory, "item.iron-sword", 1).inventory;
    const swordIds = Object.keys(granted.instances);
    const first = resolveItemInstance(granted, swordIds[0]);
    const second = resolveItemInstance(granted, swordIds[1]);
    expect(first?.baseStats).toEqual(second?.baseStats);
    expect(first?.effectiveStats).toEqual(second?.effectiveStats);
    expect(first?.contributions).toEqual([]);

    let inventory = grantItem(granted, "item.iron-bar", 2).inventory;
    inventory = grantItem(inventory, "item.weapon-scrap", 2).inventory;
    const purchased = purchaseItemUpgradeNode({ inventory, instanceId: swordIds[0], nodeId: p1 });
    const upgraded = resolveItemInstance(purchased.inventory, swordIds[0]);
    const untouched = resolveItemInstance(purchased.inventory, swordIds[1]);
    expect(upgraded?.instance.unlockedUpgradeNodeIds).toEqual([p1]);
    expect(untouched?.instance.unlockedUpgradeNodeIds).toEqual([]);
    expect(upgraded?.effectiveStats.baseDamageMin).toBeGreaterThan(untouched?.effectiveStats.baseDamageMin ?? 0);
    expect(untouched?.effectiveStats).toEqual(second?.effectiveStats);
  });

  it("rejects invalid ancestry and discards descendants during normalization", () => {
    const game = createInitialGameState();
    const instance = Object.values(game.inventory.instances)[0];
    const invalid = { ...instance, unlockedUpgradeNodeIds: ["upgrade-node.iron-sword.tempered-edge-2"] };
    expect(validateItemInstance(invalid).valid).toBe(false);
    expect(normalizeItemInstance(invalid)?.unlockedUpgradeNodeIds).toEqual([]);
    expect(itemUpgradeNodeById[p1].treeId).toBe(ironSwordUpgradeTree.id);
  });

  it("uses discovered zero-XP proficiency as Level 1 for domain equip validation", () => {
    const game = createInitialGameState();
    const swordId = Object.keys(game.inventory.instances)[0];
    expect(getProficiencyLevel({ ...game.progression, proficiencies: {} }, "one-handed-sword")).toBe(0);
    expect(getProficiencyLevel(game.progression, "one-handed-sword")).toBe(1);
    expect(validateEquipmentChange({ instanceId: swordId, slotId: "weapon", inventory: game.inventory, equipment: game.equipment, hunterRank: 1, progression: { ...game.progression, proficiencies: {} } }).reason).toBe("proficiency-level");
    expect(validateEquipmentChange({ instanceId: swordId, slotId: "weapon", inventory: game.inventory, equipment: game.equipment, hunterRank: 1, progression: game.progression }).valid).toBe(true);
  });

  it("authors exactly three single-branch specializations with four nodes each", () => {
    expect(ironSwordUpgradeTree.selectionMode).toBe("single-branch");
    expect(ironSwordUpgradeTree.branchIds).toEqual(ironSwordUpgradeBranches.map((branch) => branch.id));
    expect(ironSwordUpgradeBranches.map((branch) => branch.name)).toEqual(["Tempered", "Duelist", "Counterguard"]);
    expect(ironSwordUpgradeTree.nodeIds).toHaveLength(12);
    for (const branch of ironSwordUpgradeBranches) {
      expect(ironSwordUpgradeTree.nodeIds.filter((nodeId) => itemUpgradeNodeById[nodeId].branchId === branch.id)).toHaveLength(4);
    }
  });

  it("makes all roots available before specialization and permanently locks other branches after the first purchase", () => {
    const game = debugGrantIronSwordMaterials(createInitialGameState());
    const instanceId = Object.keys(game.inventory.instances)[0];
    expect(getUpgradeNodeState(game.inventory, instanceId, p1)).toBe("available");
    expect(getUpgradeNodeState(game.inventory, instanceId, r1)).toBe("available");
    expect(getUpgradeNodeState(game.inventory, instanceId, g1)).toBe("available");
    const purchased = purchaseItemUpgradeNode({ inventory: game.inventory, instanceId, nodeId: r1 });
    expect(getItemUpgradeSpecialization(purchased.inventory.instances[instanceId], ironSwordUpgradeTree)).toEqual({ state: "specialized", branchId: "upgrade-branch.iron-sword.duelist" });
    expect(getUpgradeNodeState(purchased.inventory, instanceId, p1)).toBe("branch-locked");
    expect(getUpgradeNodeState(purchased.inventory, instanceId, g1)).toBe("branch-locked");
    const beforeMaterials = purchased.inventory.stackables["item.iron-bar"];
    const rejected = purchaseItemUpgradeNode({ inventory: purchased.inventory, instanceId, nodeId: p1 });
    expect(rejected.outcome).toBe("branch-locked");
    expect(rejected.inventory).toBe(purchased.inventory);
    expect(rejected.inventory.stackables["item.iron-bar"]).toBe(beforeMaterials);
  });

  it("progresses only the selected branch to four nodes and rejects cross-branch current instances", () => {
    const game = debugGrantIronSwordMaterials(createInitialGameState());
    const instanceId = Object.keys(game.inventory.instances)[0];
    let inventory = game.inventory;
    for (const nodeId of [r1, r2, r3, r4]) inventory = purchaseItemUpgradeNode({ inventory, instanceId, nodeId }).inventory;
    expect(inventory.instances[instanceId].unlockedUpgradeNodeIds).toEqual([r1, r2, r3, r4]);
    expect(getItemUpgradeSpecialization(inventory.instances[instanceId], ironSwordUpgradeTree)).toEqual({ state: "specialized", branchId: "upgrade-branch.iron-sword.duelist" });
    expect(inventory.instances[instanceId].unlockedUpgradeNodeIds).toHaveLength(4);
    expect(validateItemInstance({ ...inventory.instances[instanceId], unlockedUpgradeNodeIds: [p1, r1] }).valid).toBe(false);
  });

  it("keeps specialization, stats, and mechanic parameters isolated per exact copy", () => {
    const game = debugGrantIronSwordMaterials(createInitialGameState());
    const granted = grantItem(game.inventory, "item.iron-sword", 1);
    let inventory = granted.inventory;
    const first = Object.keys(inventory.instances)[0]!;
    const second = granted.createdInstanceIds[0]!;
    inventory = purchaseItemUpgradeNode({ inventory, instanceId: first, nodeId: p1 }).inventory;
    inventory = purchaseItemUpgradeNode({ inventory, instanceId: second, nodeId: r1 }).inventory;
    const tempered = resolveItemInstance(inventory, first)!;
    const fresh = resolveItemInstance(inventory, second)!;
    expect(tempered.effectiveStats.baseDamageMin ?? 0).toBeGreaterThan(fresh.effectiveStats.baseDamageMin ?? 0);
    expect(resolveWeaponMechanicParameters(itemById["item.iron-sword"], inventory.instances[first]!)?.rhythm?.maxStacks).toBe(3);
    expect(resolveWeaponMechanicParameters(itemById["item.iron-sword"], inventory.instances[second]!)?.rhythm?.maxStacks).toBe(3);
    expect(getItemUpgradeSpecialization(inventory.instances[first], ironSwordUpgradeTree).branchId).not.toBe(getItemUpgradeSpecialization(inventory.instances[second], ironSwordUpgradeTree).branchId);
  });

  it("migrates V16 multi-branch nodes with deterministic winning-branch preservation", () => {
    const game = createInitialGameState();
    const current = gameStateToSaveV17(game, settings);
    const swordId = Object.keys(game.inventory.instances)[0];
    const legacy = { ...current, version: 16 as const, inventory: { ...current.inventory, instances: { [swordId]: { ...current.inventory.instances[swordId], unlockedUpgradeNodeIds: [p1, p2, r1, g1] } } } };
    const migrated = parseGameSaveJson(JSON.stringify(legacy));
    expect(migrated?.version).toBe(17);
    expect(migrated?.inventory.instances[swordId].unlockedUpgradeNodeIds).toEqual([p1, p2]);
    expect(getItemUpgradeSpecialization(migrated!.inventory.instances[swordId], ironSwordUpgradeTree).branchId).toBe("upgrade-branch.iron-sword.tempered");
  });

  it("resolves Longsword mechanics by archetype and keeps transient state simulation-time only", () => {
    const base = createInitialGameState();
    const swordId = Object.keys(base.inventory.instances)[0];
    const synced = { ...base, combat: { ...base.combat, weaponRuntime: syncPlayerWeaponRuntime(base.combat, base.equipment, base.inventory) } };
    const packet: DamagePacket = { source: { kind: "player" }, target: { kind: "enemy", instanceId: "enemy-1" }, sourceKind: "attack", deliveryKind: "hit", damageType: "physical", canCrit: true, sourceActionId: "basic.weapon-attack" };
    const hit = { outcome: "hit" } as DamageResolution;
    const miss = { outcome: "evaded" } as DamageResolution;
    let next = synced;
    for (let count = 0; count < 4; count += 1) next = observeBasicWeaponResult(next, packet, hit, false);
    expect(next.combat.weaponRuntime.counters["weapon-mechanic.duelist-rhythm"]).toBe(3);
    next = observeBasicWeaponResult(next, packet, miss, false);
    expect(next.combat.weaponRuntime.counters["weapon-mechanic.duelist-rhythm"]).toBe(0);

    const prepared = applySuccessfulPlayerBlock(synced);
    expect(prepared.combat.weaponRuntime.timers["weapon-mechanic.riposte"]).toBe(5);
    const riposte = consumeRiposteForBasicAttempt(prepared, packet);
    expect(riposte.consumed).toBe(true);
    expect(riposte.packet.damageMultiplier).toBeCloseTo(1.15);
    expect(riposte.packet.criticalStrikeChance).toBeCloseTo(0.1);
    expect(riposte.game.combat.weaponRuntime.timers["weapon-mechanic.riposte"]).toBe(0);
    expect(advanceWeaponMechanicRuntime(prepared.combat, 2, base.equipment, base.inventory).weaponRuntime.timers["weapon-mechanic.riposte"]).toBe(3);

    const parameters = resolveWeaponMechanicParameters(itemById["item.iron-sword"], base.inventory.instances[swordId]);
    expect(parameters?.rhythm?.maxStacks).toBe(3);
    expect(weaponMechanicStatModifiers(next.combat, parameters ?? undefined)).toEqual([
      { stat: "accuracyRating", operation: "flat", value: 0 },
      { stat: "moreAttackSpeed", operation: "more", value: 0 },
    ]);
  });
});
