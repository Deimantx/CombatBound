import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import type { GameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { advanceCombatStep, createCombatContext, startCombatTarget } from "../game/combat/combatEngine";
import { advanceEnemyActions, type EnemyRuntimeDependencies } from "../game/combat/combatEnemyRuntime";
import { createDeterministicOfflineRng } from "../game/offline/offlineActivityContract";
import { simulateCombatHuntOffline } from "../game/offline/offlineCombatSimulation";
import { getNextOfflineCombatBoundary } from "../game/offline/offlineCombatScheduler";

const dependencies: EnemyRuntimeDependencies = {
  applyEffectiveHealing: (game) => game,
  awardBarrierCredits: (game) => game,
  resolveDefensiveTrainingForCombatEvent: (game) => game,
};

function active(locationId = "location.bandit-camp", enemyId = "enemy.bandit-archer", next = () => 0) {
  const initial = createInitialGameState();
  const configured = { ...initial, progression: { ...initial.progression, hunterRankPoints: 10 } };
  const stats = calculateHunterCombatStats(configured.equipment, configured.inventory, configured.progression);
  const context = createCombatContext({ next });
  const started = startCombatTarget(configured, locationId, enemyId, stats, context);
  return { game: { ...started, combat: { ...started.combat, playerAttackTimer: 100 } }, stats, context };
}

describe("enemy action scheduler", () => {
  it("keeps a ready Special waiting behind an active Basic", () => {
    const { game, stats, context } = active();
    const enemy = game.combat.enemy!;
    const current = { ...enemy, attackTimer: 1, abilityCooldowns: { ...enemy.abilityCooldowns, "enemy-ability.charged-shot": 0 } };
    const next = advanceCombatStep({ ...game, combat: { ...game.combat, enemy: current } }, 0.1, context, stats);
    expect(next.combat.enemy?.preparedAbility).toBeNull();
    expect(next.combat.enemy?.attackTimer).toBeCloseTo(0.9, 6);
  });

  it("freezes the Basic lane while a Special prepares", () => {
    const { game, stats, context } = active();
    const enemy = game.combat.enemy!;
    const atBoundary = { ...enemy, attackTimer: enemy.attackInterval, abilityCooldowns: { ...enemy.abilityCooldowns, "enemy-ability.charged-shot": 0 } };
    const preparing = advanceCombatStep({ ...game, combat: { ...game.combat, enemy: atBoundary } }, 0.1, context, stats);
    expect(preparing.combat.enemy?.preparedAbility?.abilityId).toBe("enemy-ability.charged-shot");
    expect(preparing.combat.enemy?.attackTimer).toBe(preparing.combat.enemy?.attackInterval);
    const progressed = advanceCombatStep(preparing, 0.5, context, stats);
    expect(progressed.combat.enemy?.attackTimer).toBe(progressed.combat.enemy?.attackInterval);
    expect(progressed.combat.enemy?.preparedAbility?.remainingSeconds).toBeCloseTo(2.4, 6);
  });

  it("ticks the reset Special cooldown through the remainder of its step", () => {
    const { game, stats, context } = active();
    const enemy = game.combat.enemy!;
    const prepared = {
      abilityId: "enemy-ability.charged-shot",
      remainingSeconds: 0.06,
      totalSeconds: 3,
      source: { kind: "enemy", instanceId: enemy.instanceId },
      target: { kind: "player" },
      startedSequence: game.combat.eventSequence,
    } as never;
    const next = advanceEnemyActions({
      ...game,
      combat: {
        ...game.combat,
        enemy: {
          ...enemy,
          preparedAbility: prepared,
          abilityCooldowns: { ...enemy.abilityCooldowns, "enemy-ability.charged-shot": 0 },
        },
      },
    }, 0.1, context, stats, dependencies);
    expect(next.combat.enemy?.preparedAbility).toBeNull();
    expect(next.combat.enemy?.abilityCooldowns["enemy-ability.charged-shot"]).toBeCloseTo(9.96, 6);
  });

  it("carries elapsed time past a Basic resolution into the next Basic lane", () => {
    const { game, stats, context } = active();
    const enemy = game.combat.enemy!;
    const next = advanceEnemyActions({
      ...game,
      combat: {
        ...game.combat,
        enemy: { ...enemy, attackTimer: 0.03 },
      },
    }, 0.1, context, stats, dependencies);
    expect(next.combat.enemy?.attackTimer).toBeCloseTo(enemy.attackInterval - 0.07, 6);
    expect(next.combat.enemy?.preparedAbility).toBeNull();
    expect(next.combat.events.some((event) => event.type === "enemyAbilityResolved")).toBe(false);
  });

  it("keeps live and offline action timing aligned across a non-round boundary", () => {
    const { game, stats } = active();
    const enemy = game.combat.enemy!;
    const prepared = {
      abilityId: "enemy-ability.charged-shot",
      remainingSeconds: 0.06,
      totalSeconds: 3,
      source: { kind: "enemy", instanceId: enemy.instanceId },
      target: { kind: "player" },
      startedSequence: game.combat.eventSequence,
    } as never;
    const snapshot: GameState = {
      ...game,
      combat: {
        ...game.combat,
        enemy: {
          ...enemy,
          preparedAbility: prepared,
          abilityCooldowns: { ...enemy.abilityCooldowns, "enemy-ability.charged-shot": 0 },
        },
      },
    };
    const liveContext = createCombatContext(createDeterministicOfflineRng(1234));
    let live = snapshot;
    for (let index = 0; index < 340; index += 1) live = advanceCombatStep(live, 0.01, liveContext, stats);
    const offline = simulateCombatHuntOffline(snapshot, { requestedSeconds: 3.4 }, createDeterministicOfflineRng(1234));
    const liveEnemy = live.combat.enemy!;
    const offlineEnemy = offline.state.combat.enemy!;
    expect(offline.summary.virtualElapsedSeconds).toBeCloseTo(3.4, 6);
    expect(live.combat.playerHp).toBeCloseTo(offline.state.combat.playerHp, 6);
    expect(liveEnemy.currentHealth).toBeCloseTo(offlineEnemy.currentHealth, 6);
    expect(liveEnemy.attackTimer).toBeCloseTo(offlineEnemy.attackTimer, 6);
    expect(liveEnemy.preparedAbility).toEqual(offlineEnemy.preparedAbility);
    expect(Object.keys(liveEnemy.abilityCooldowns)).toEqual(Object.keys(offlineEnemy.abilityCooldowns));
    for (const abilityId of Object.keys(liveEnemy.abilityCooldowns) as Array<keyof typeof liveEnemy.abilityCooldowns>)
      expect(liveEnemy.abilityCooldowns[abilityId]).toBeCloseTo(offlineEnemy.abilityCooldowns[abilityId], 10);
    expect(liveEnemy.abilityRuntime.usedThisFight).toEqual(offlineEnemy.abilityRuntime.usedThisFight);
    expect(live.combat.events.map((event) => event.type)).toEqual(offline.state.combat.events.map((event) => event.type));
  });

  it("resets Basic progress during stun and gives the Special priority after stun", () => {
    const { game, stats, context } = active("location.wolf-den", "enemy.grey-wolf");
    const enemy = game.combat.enemy!;
    const stunned = { ...enemy, attackTimer: enemy.attackInterval / 2, abilityCooldowns: { ...enemy.abilityCooldowns, "enemy-ability.savage-bite": 0 }, effects: [{ effectId: "effect.stunned" }] as never };
    const held = advanceEnemyActions({ ...game, combat: { ...game.combat, enemy: stunned } }, 0.1, context, stats, dependencies);
    expect(held.combat.enemy?.attackTimer).toBe(held.combat.enemy?.attackInterval);
    const recovered = advanceEnemyActions({ ...held, combat: { ...held.combat, enemy: held.combat.enemy ? { ...held.combat.enemy, effects: [] } : null } }, 0.1, context, stats, dependencies);
    expect(recovered.combat.enemy?.preparedAbility?.abilityId).toBe("enemy-ability.savage-bite");
  });

  it("can chain Specials at action boundaries without parallel Basic damage", () => {
    const { game, stats, context } = active("location.fallen-watch-ruins", "enemy.fallen-watch-captain", () => 0);
    const enemy = game.combat.enemy!;
    const ready = { ...enemy, attackTimer: enemy.attackInterval, abilityCooldowns: { ...enemy.abilityCooldowns, "enemy-ability.battle-cry": 0, "enemy-ability.armour-breaker": 0 } };
    const next = advanceEnemyActions({ ...game, combat: { ...game.combat, enemy: ready } }, 2.5, context, stats, dependencies);
    expect(next.combat.events.filter((event) => event.type === "enemyAbilityResolved").length).toBe(1);
    expect(next.combat.enemy?.preparedAbility).not.toBeNull();
  });

  it("does not wake offline simulation for ready cooldowns while Basic is active", () => {
    const { game, stats, context } = active();
    const enemy = game.combat.enemy!;
    const basic = { ...enemy, attackTimer: 1, abilityCooldowns: { ...enemy.abilityCooldowns, "enemy-ability.charged-shot": 0 } };
    const boundary = getNextOfflineCombatBoundary({ ...game, combat: { ...game.combat, enemy: basic } }, stats, context);
    expect(boundary).toBeCloseTo(1, 6);
  });
});
