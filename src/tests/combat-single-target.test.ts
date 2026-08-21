import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { advanceCombatStep, createCombatContext, startCombatTarget, switchCombatTarget } from "../game/combat/combatEngine";
import { combatBalance } from "../game/combat/combatBalance";
import { combatLocationById } from "../game/data/world/combatLocations";
import { totalHunterRankPointsForRank } from "../game/progression/hunterRankProgression";

function setup(locationId = "location.wolf-den", enemyId = "enemy.grey-wolf", rng = () => 0.5) {
  const initial = createInitialGameState();
  const game = locationId === "location.bandit-camp"
    ? { ...initial, progression: { ...initial.progression, hunterRankPoints: 10 } }
    : initial;
  const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
  const context = createCombatContext({ next: rng });
  return { game: startCombatTarget(game, locationId, enemyId, stats, context), stats, context };
}

describe("single-target combat foundation", () => {
  it("starts only the explicitly selected location target", () => {
    const { game } = setup();
    expect(game.combat.targetEnemyId).toBe("enemy.grey-wolf");
    expect(game.combat.enemy?.enemyId).toBe("enemy.grey-wolf");
    expect(game.combat.phase).toBe("active");
    expect(game.combat.enemy).not.toHaveProperty("actions");
  });

  it("starts fresh, respawned, and switched enemies with full valid ability cooldowns", () => {
    const { game, stats, context } = setup();
    expect(game.combat.enemy?.abilityCooldowns["enemy-ability.savage-bite"]).toBe(10);
    const defeated = { ...game, combat: { ...game.combat, enemy: game.combat.enemy ? { ...game.combat.enemy, currentHealth: 0, defeated: true } : null } };
    const recovering = advanceCombatStep(defeated, 0.1, context, stats);
    const respawned = advanceCombatStep(recovering, combatBalance.recoverySeconds, context, stats);
    expect(respawned.combat.enemy?.abilityCooldowns["enemy-ability.savage-bite"]).toBe(10);
    const switched = switchCombatTarget(game, "location.wolf-den", "enemy.wolf-stalker", stats, context);
    expect(switched.combat.enemy?.abilityCooldowns["enemy-ability.rending-bite"]).toBe(9);
  });

  it("enforces arena rank in the combat domain for start and switch", () => {
    const { game, stats, context } = setup();
    expect(startCombatTarget(game, "location.hollow-bell-temple", "enemy.bound-wraith", stats, context)).toBe(game);
    const rankEight = { ...game, progression: { ...game.progression, hunterRankPoints: totalHunterRankPointsForRank(8) } };
    const active = startCombatTarget(rankEight, "location.hollow-bell-temple", "enemy.bound-wraith", stats, context);
    expect(active.combat.enemy?.enemyId).toBe("enemy.bound-wraith");
    expect(switchCombatTarget(game, "location.hollow-bell-temple", "enemy.bound-wraith", stats, context)).toBe(game);
  });

  it("validates the location target list and rejects a target from another location", () => {
    const { game, stats, context } = setup();
    expect(startCombatTarget(game, "location.wolf-den", "enemy.bandit-archer", stats, context)).toBe(game);
    expect(combatLocationById["location.wolf-den"].targets.map((target) => target.enemyId)).toEqual([
      "enemy.grey-wolf", "enemy.wolf-stalker", "enemy.wolf-ravager", "enemy.alpha-wolf",
    ]);
  });

  it("uses preparation, resolution, and cooldown for an enemy Combat Ability", () => {
    const { game, stats, context } = setup("location.bandit-camp", "enemy.bandit-archer");
    const isolated = { ...game, combat: { ...game.combat, playerAttackTimer: 100, enemy: game.combat.enemy ? { ...game.combat.enemy, attackTimer: game.combat.enemy.attackInterval, abilityCooldowns: { ...game.combat.enemy.abilityCooldowns, "enemy-ability.charged-shot": 0 } } : null } };
    const preparing = advanceCombatStep(isolated, 0.1, context, stats);
    expect(preparing.combat.enemy?.preparedAbility?.abilityId).toBe("enemy-ability.charged-shot");
    expect(preparing.combat.enemy?.preparedAbility?.remainingSeconds).toBeCloseTo(2.9, 6);
    const resolved = advanceCombatStep(preparing, 3, context, stats);
    expect(resolved.combat.enemy?.preparedAbility).toBeNull();
    expect(resolved.combat.enemy?.abilityCooldowns["enemy-ability.charged-shot"]).toBeCloseTo(9.9, 6);
  });

  it("does not interrupt an active Basic attack for a ready Combat Ability", () => {
    const { game, stats, context } = setup("location.bandit-camp", "enemy.bandit-archer");
    const isolated = { ...game, combat: { ...game.combat, playerAttackTimer: 100, enemy: game.combat.enemy ? { ...game.combat.enemy, attackTimer: 1, abilityCooldowns: { ...game.combat.enemy.abilityCooldowns, "enemy-ability.charged-shot": 0 } } : null } };
    const next = advanceCombatStep(isolated, 0.1, context, stats);
    expect(next.combat.enemy?.preparedAbility).toBeNull();
    expect(next.combat.enemy?.attackTimer).toBeCloseTo(0.9, 6);
  });

  it("respawns the same target after recovery and records per-kill rewards", () => {
    const { game, stats, context } = setup("location.wolf-den", "enemy.grey-wolf", () => 0);
    const defeated = { ...game, combat: { ...game.combat, enemy: game.combat.enemy ? { ...game.combat.enemy, currentHealth: 0, defeated: true } : null } };
    const recovering = advanceCombatStep(defeated, 0.1, context, stats);
    expect(recovering.combat.phase).toBe("recovery");
    expect(recovering.combat.enemy).toBeNull();
    expect(recovering.combat.targetEnemyId).toBe("enemy.grey-wolf");
    expect(recovering.combat.session.enemiesDefeated).toBe(1);
    const respawned = advanceCombatStep(recovering, combatBalance.recoverySeconds, context, stats);
    expect(respawned.combat.phase).toBe("active");
    expect(respawned.combat.enemy?.enemyId).toBe("enemy.grey-wolf");
    expect(respawned.combat.enemy?.instanceId).not.toBe(game.combat.enemy?.instanceId);
    expect(respawned.combat.session.lootGained["item.wolf-fang"]).toBeGreaterThan(0);
    expect(respawned.combat.session.lootGained["item.wolf-pelt"]).toBeGreaterThan(0);
  });

  it("switches targets without rewarding the unfinished encounter or resetting player cooldowns", () => {
    const { game, stats, context } = setup();
    const prepared = { ...game, combat: { ...game.combat, mana: 12, stamina: 8, actionCooldowns: { "action.test": 4 }, enemy: game.combat.enemy ? { ...game.combat.enemy, currentHealth: 1, preparedAbility: null } : null } };
    const switched = switchCombatTarget(prepared, "location.wolf-den", "enemy.wolf-stalker", stats, context);
    expect(switched.combat.targetEnemyId).toBe("enemy.wolf-stalker");
    expect(switched.combat.enemy?.enemyId).toBe("enemy.wolf-stalker");
    expect(switched.combat.enemy?.currentHealth).toBe(switched.combat.enemy?.maxHealth);
    expect(switched.combat.mana).toBe(12);
    expect(switched.combat.stamina).toBe(8);
    expect(switched.combat.actionCooldowns["action.test"]).toBe(4);
    expect(switched.combat.session.enemiesDefeated).toBe(0);
  });
});
