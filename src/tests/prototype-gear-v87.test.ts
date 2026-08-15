import { describe, expect, it } from "vitest";
import { createCombatContext, startHunt } from "../game/combat/combatEngine";
import { effectById } from "../game/data/effects";
import { enemyDefinitions } from "../game/data/enemies";
import {
  itemById,
  itemDefinitions,
  prototypeEquipmentDefinitions,
} from "../game/data/items";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import {
  getAvailableItemCopies,
  validateEquipmentChange,
} from "../game/equipment/equipmentRules";
import { getDefensiveEquipmentContext } from "../game/equipment/defensiveEquipment";
import { getEquipmentSlotDefinition } from "../game/equipment/equipmentTypes";
import {
  debugAddMasteryXp,
  debugApplyEffect,
  debugDiscoverAllItems,
  debugDiscoverAllTargets,
  debugFillAllResources,
  debugGrantItem,
  debugKillSelectedEnemy,
  debugResetPlayerCooldowns,
  debugRevivePlayer,
  debugSetItemQuantity,
  debugSetMasteryLevel,
  debugSetProficiencyLevel,
  debugSetResourcePercent,
} from "../game/debug/debugActions";
import { masteryLevelForXp } from "../game/progression/masteryProgression";
import { proficiencyXpForLevel } from "../game/progression/proficiencyProgression";
import { CURRENT_SAVE_VERSION } from "../game/persistence/saveGame";

const context = createCombatContext({ next: () => 0.5 });

describe("CombatBound V8.7 prototype gear", () => {
  it("defines exactly three tiers for each of the eleven shared equipment kinds", () => {
    expect(prototypeEquipmentDefinitions).toHaveLength(33);

    const byKind = new Map<string, typeof prototypeEquipmentDefinitions>();
    for (const item of prototypeEquipmentDefinitions) {
      const kind = item.equipmentSlotKind!;
      byKind.set(kind, [...(byKind.get(kind) ?? []), item]);
    }

    expect([...byKind.keys()].sort()).toEqual([
      "armor",
      "belt",
      "boots",
      "cape",
      "earring",
      "gloves",
      "head",
      "necklace",
      "offhand",
      "ring",
      "weapon",
    ]);
    for (const items of byKind.values()) {
      expect(items).toHaveLength(3);
      expect(items.map((item) => item.requiredMasteryLevel).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([1, 5, 10]);
      expect(items.map((item) => item.rarity).sort()).toEqual(["common", "rare", "uncommon"]);
    }

    expect(prototypeEquipmentDefinitions.some((item) => (item.equipmentSlotKind as string) === "legs")).toBe(false);
    expect(prototypeEquipmentDefinitions.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(["item.ring1", "item.ring2", "item.earring1", "item.earring2"]),
    );
  });

  it("enforces mastery requirements without changing shared slot-copy rules", () => {
    const game = createInitialGameState();
    const inventory = { quantities: { "item.vanguard-sword": 1, "item.ring-of-precision": 2 } };
    const equipment = game.equipment;

    expect(validateEquipmentChange({
      item: itemById["item.vanguard-sword"],
      slotId: "weapon",
      inventory,
      equipment,
      masteryLevel: 1,
    })).toEqual({ valid: false, reason: "mastery-level" });
    expect(validateEquipmentChange({
      item: itemById["item.vanguard-sword"],
      slotId: "weapon",
      inventory,
      equipment,
      masteryLevel: 10,
    })).toEqual({ valid: true });

    const oneRingEquipped = { slots: { ring1: "item.ring-of-precision" } };
    expect(getAvailableItemCopies(inventory, oneRingEquipped, "item.ring-of-precision", "ring2")).toBe(1);
    expect(validateEquipmentChange({
      item: itemById["item.ring-of-precision"],
      slotId: "ring2",
      inventory,
      equipment: oneRingEquipped,
      masteryLevel: 10,
    })).toEqual({ valid: true });
    expect(validateEquipmentChange({
      item: itemById["item.ring-of-precision"],
      slotId: "ring2",
      inventory: { quantities: { "item.ring-of-precision": 1 } },
      equipment: oneRingEquipped,
      masteryLevel: 10,
    })).toEqual({ valid: false, reason: "no-spare-copy" });
    expect(getEquipmentSlotDefinition("ring1").kind).toBe("ring");
  });

  it("applies representative accessory, armor, resource and precision stats", () => {
    const game = createInitialGameState();
    const empty = calculateHunterCombatStats({ slots: {} }, game.progression, "mid", game.combat.techniques);
    const equipped = {
      slots: {
        belt: "item.war-belt",
        necklace: "item.arcane-necklace",
        armor: "item.vanguard-plate",
        ring1: "item.duelist-ring",
      },
    };
    const stats = calculateHunterCombatStats(equipped, game.progression, "mid", game.combat.techniques);

    expect(stats.maxHealth - empty.maxHealth).toBe(85);
    expect(stats.armor - empty.armor).toBe(24);
    expect((stats.healthRegen ?? 0) - (empty.healthRegen ?? 0)).toBeCloseTo(0.5);
    expect(stats.maxStamina - empty.maxStamina).toBe(20);
    expect(stats.staminaRegen - empty.staminaRegen).toBeCloseTo(0.6);
    expect(stats.maxMana - empty.maxMana).toBe(22);
    expect(stats.manaRegen - empty.manaRegen).toBeCloseTo(0.6);
    expect(stats.accuracy - empty.accuracy).toBe(5);
    expect(stats.evasion - empty.evasion).toBe(2);
    expect(stats.critChance - empty.critChance).toBeCloseTo(0.02);
  });

  it("keeps tier identities aligned with Light, Medium and Heavy armor training", () => {
    const equipment = {
      slots: {
        head: "item.training-hood",
        armor: "item.hunter-armor",
        gloves: "item.vanguard-gauntlets",
        boots: "item.training-boots",
      },
    };
    expect(getDefensiveEquipmentContext(equipment)).toMatchObject({
      lightArmorPieces: 2,
      mediumArmorPieces: 1,
      heavyArmorPieces: 1,
    });
  });

  it("grants and normalizes shared gear through the debug domain", () => {
    const initial = createInitialGameState();
    const granted = debugGrantItem(initial, "item.ring-of-precision", 2);
    expect(granted.inventory.quantities["item.ring-of-precision"]).toBe(2);
    expect(granted.collection.discoveredItems).toContain("item.ring-of-precision");

    const equipped = {
      ...granted,
      equipment: { slots: { ring1: "item.ring-of-precision", ring2: "item.ring-of-precision" } },
    };
    const reduced = debugSetItemQuantity(equipped, "item.ring-of-precision", 1);
    expect(reduced.equipment.slots).toEqual({ ring1: "item.ring-of-precision" });
  });

  it("keeps debug mastery, proficiency, collection and resource changes on canonical state", () => {
    const initial = createInitialGameState();
    const mastery = debugSetMasteryLevel(initial, 10);
    expect(masteryLevelForXp(mastery.progression.masteryXp)).toBe(10);
    expect(mastery.progression.proficiencies["one-handed-sword"]?.totalXp).toBe(0);

    const proficiency = debugSetProficiencyLevel(initial, "one-handed-sword", 50);
    expect(proficiency.progression.proficiencies["one-handed-sword"]?.totalXp).toBe(proficiencyXpForLevel(50));
    expect(proficiency.progression.masteryXp).toBe(initial.progression.masteryXp);

    const collection = debugDiscoverAllTargets(debugDiscoverAllItems(initial));
    expect(collection.collection.discoveredItems).toHaveLength(itemDefinitions.length);
    expect(Object.values(collection.collection.targets).every((target) => target.discovered)).toBe(true);
    expect(Object.values(collection.collection.targets).every((target) => target.defeats === 0)).toBe(true);

    const partial = debugSetResourcePercent(debugSetResourcePercent(debugSetResourcePercent(initial, "health", 25), "stamina", 0), "mana", 0);
    const filled = debugFillAllResources(partial);
    expect(filled.combat.playerHp).toBe(filled.combat.maxPlayerHp);
    expect(filled.combat.stamina).toBe(filled.combat.maxStamina);
    expect(filled.combat.mana).toBe(filled.combat.maxMana);
  });

  it("uses canonical effects, defeat rewards, cooldown reset and revive paths", () => {
    const initial = createInitialGameState();
    const stats = calculateHunterCombatStats(initial.equipment, initial.progression, "mid", initial.combat.techniques);
    const active = startHunt(initial, "location.wolf-den", stats, context);
    const withBurn = debugApplyEffect(active, "effect.burn", "selected-enemy");
    const selected = withBurn.combat.enemies.find((enemy) => enemy.instanceId === withBurn.combat.selectedEnemyInstanceId);
    expect(selected?.effects.some((effect) => effect.effectId === "effect.burn")).toBe(true);
    expect(effectById["effect.burn"]).toBeDefined();

    const defeated = debugKillSelectedEnemy(withBurn);
    expect(defeated.combat.events.some((event) => event.type === "enemyDefeated")).toBe(true);
    expect(defeated.combat.enemies.find((enemy) => enemy.instanceId === selected?.instanceId)?.rewardResolved).toBe(true);

    const cooldowns = debugResetPlayerCooldowns({
      ...initial,
      combat: { ...initial.combat, globalCooldownRemaining: 3, potionCooldownRemaining: 2, actionCooldowns: { "spell.flame-blast": 4 } },
    });
    expect(cooldowns.combat.globalCooldownRemaining).toBe(0);
    expect(cooldowns.combat.potionCooldownRemaining).toBe(0);
    expect(cooldowns.combat.actionCooldowns).toEqual({});

    const defeatedPlayer = debugSetResourcePercent(active, "health", 0);
    expect(defeatedPlayer.combat.phase).toBe("defeat");
    expect(defeatedPlayer.combat.events.some((event) => event.type === "combatantDefeated")).toBe(true);
    expect(debugRevivePlayer(defeatedPlayer).combat.phase).toBe("stopped");
  });

  it("uses the V9 persistent save schema", () => {
    expect(CURRENT_SAVE_VERSION).toBe(9);
    expect(itemDefinitions.every((item) => item.requiredMasteryLevel === undefined || item.requiredMasteryLevel > 0)).toBe(true);
    expect(enemyDefinitions.length).toBeGreaterThan(0);
  });
});
