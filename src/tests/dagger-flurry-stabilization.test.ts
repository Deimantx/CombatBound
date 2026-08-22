import { describe, expect, it } from "vitest";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { equipItemInstance } from "../game/equipment/equipmentRules";
import { createCombatContext, startCombatTarget } from "../game/combat/combatEngine";
import { damageEnemy, type PlayerDamageRuntimeDependencies } from "../game/combat/combatPlayerActionsRuntime";
import { createInitialGameState } from "../game/gameState";
import { grantItem } from "../game/items/itemOwnership";
import type { BasicWeaponAttackSummary } from "../game/weapons/weaponMechanicTypes";

const opportunistNodes = [
  "upgrade-node.iron-dagger.nimble-foot",
  "upgrade-node.iron-dagger.opening-window",
  "upgrade-node.iron-dagger.backstab",
  "upgrade-node.iron-dagger.perfect-opening",
];

const noOpDamageDependencies: PlayerDamageRuntimeDependencies = {
  awardBarrierCredits: (game) => game,
  restoreBarrierResource: (game) => game,
  resolveDefeatedEnemies: (game) => game,
};

function fixture({ unlockedUpgradeNodeIds = [], combo = 0, rng = 0, health = 1000 }: { unlockedUpgradeNodeIds?: string[]; combo?: number; rng?: number; health?: number } = {}) {
  const initial = createInitialGameState();
  const granted = grantItem(initial.inventory, "item.iron-dagger", 1);
  const instanceId = granted.createdInstanceIds[0]!;
  const inventory = {
    ...granted.inventory,
    instances: {
      ...granted.inventory.instances,
      [instanceId]: { ...granted.inventory.instances[instanceId], unlockedUpgradeNodeIds },
    },
  };
  const equipped = equipItemInstance({ inventory, equipment: { slots: {} }, instanceId, slotId: "weapon", hunterRank: 1, progression: initial.progression, ignoreRequirements: true });
  const equippedGame = { ...initial, inventory, equipment: equipped.equipment, progression: equipped.progression ?? initial.progression };
  const context = createCombatContext({ next: () => rng, nextFor: () => rng });
  const stats = calculateHunterCombatStats(equippedGame.equipment, equippedGame.inventory, equippedGame.progression);
  const started = startCombatTarget(equippedGame, "location.wolf-den", "enemy.grey-wolf", stats, context);
  const enemy = started.combat.enemy!;
  return {
    game: {
      ...started,
      combat: {
        ...started.combat,
        enemy: { ...enemy, currentHealth: health },
        weaponRuntime: {
          ...started.combat.weaponRuntime,
          counters: { ...started.combat.weaponRuntime.counters, "weapon-mechanic.dagger-combo": combo },
          timers: { ...started.combat.weaponRuntime.timers, "weapon-mechanic.dagger-opportunist": 4 },
        },
      },
    },
    stats,
    context,
  };
}

function basicPacket(instanceId: string) {
  return {
    source: { kind: "player" as const },
    target: { kind: "enemy" as const, instanceId },
    sourceKind: "attack" as const,
    sourceCategory: "melee" as const,
    deliveryKind: "hit" as const,
    damageType: "physical" as const,
    canCrit: false,
    baseDamage: 10,
    attackerAccuracy: 1000,
    defensiveEligibility: { canMiss: true, canBeEvaded: true, blockable: false },
    sourceActionId: "basic.weapon-attack",
    progressionSource: { type: "equippedWeapon" as const, proficiencyEligible: false },
  };
}

function execute(fixtureState: ReturnType<typeof fixture>) {
  let summary: BasicWeaponAttackSummary | undefined;
  const target = fixtureState.game.combat.enemy!;
  const game = damageEnemy(fixtureState.game, target, basicPacket(target.instanceId), fixtureState.stats, fixtureState.context, "Test Basic", [], noOpDamageDependencies, undefined, (nextSummary) => { summary = nextSummary; });
  return { game, summary: summary! };
}

describe("Dagger Opportunist and Flurry action resolution", () => {
  it("grants normal Perfect Opening Combo once after a successful Opportunist Basic", () => {
    const result = execute(fixture({ unlockedUpgradeNodeIds: opportunistNodes }));
    expect(result.summary.attemptedHits).toBe(1);
    expect(result.summary.successfulHits).toBe(1);
    expect(result.game.combat.weaponRuntime.timers["weapon-mechanic.dagger-opportunist"]).toBe(0);
    expect(result.game.combat.weaponRuntime.counters["weapon-mechanic.dagger-combo"]).toBe(2);
  });

  it("applies Perfect Opening once after a successful Opportunist Flurry", () => {
    const result = execute(fixture({ unlockedUpgradeNodeIds: opportunistNodes, combo: 5 }));
    expect(result.summary.attemptedHits).toBe(2);
    expect(result.summary.successfulHits).toBeGreaterThan(0);
    expect(result.game.combat.weaponRuntime.timers["weapon-mechanic.dagger-opportunist"]).toBe(0);
    expect(result.game.combat.weaponRuntime.counters["weapon-mechanic.dagger-combo"]).toBe(2);
  });

  it("keeps an all-miss Opportunist Flurry at zero Combo", () => {
    const result = execute(fixture({ unlockedUpgradeNodeIds: opportunistNodes, combo: 5, rng: 1 }));
    expect(result.summary.attemptedHits).toBe(2);
    expect(result.summary.successfulHits).toBe(0);
    expect(result.game.combat.weaponRuntime.timers["weapon-mechanic.dagger-opportunist"]).toBe(0);
    expect(result.game.combat.weaponRuntime.counters["weapon-mechanic.dagger-combo"]).toBe(0);
  });

  it("keeps base Flurry at one Combo without Perfect Opening", () => {
    const result = execute(fixture({ combo: 5 }));
    expect(result.summary.attemptedHits).toBe(2);
    expect(result.summary.successfulHits).toBeGreaterThan(0);
    expect(result.game.combat.weaponRuntime.counters["weapon-mechanic.dagger-combo"]).toBe(1);
  });

  it("stops after a lethal first Flurry hit while preserving the successful action result", () => {
    const result = execute(fixture({ unlockedUpgradeNodeIds: opportunistNodes, combo: 5, health: 1 }));
    expect(result.summary.attemptedHits).toBe(1);
    expect(result.summary.successfulHits).toBe(1);
    expect(result.summary.targetDied).toBe(true);
    expect(result.game.combat.weaponRuntime.counters["weapon-mechanic.dagger-combo"]).toBe(2);
  });
});
