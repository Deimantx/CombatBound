import { describe, expect, it } from "vitest";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { createInitialGameState, type GameState } from "../game/gameState";
import {
  advanceCombatStep,
  createCombatContext,
  startHunt,
} from "../game/combat/combatEngine";
import {
  createDeterministicOfflineRng,
} from "../game/offline/offlineActivityContract";
import { simulateCombatHuntOffline } from "../game/offline/offlineCombatSimulation";
import { combatHuntActivityAdapter } from "../game/offline/combatHuntActivity";

function activeHunt(): GameState {
  const game = createInitialGameState();
  const context = createCombatContext(createDeterministicOfflineRng(1234));
  const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression, game.combat.techniques);
  return startHunt(game, "location.wolf-den", stats, context);
}

function liveReference(snapshot: GameState, seconds: number): GameState {
  let game = snapshot;
  const context = createCombatContext(createDeterministicOfflineRng(991));
  const steps = Math.round(seconds * 10);
  for (let index = 0; index < steps; index += 1) {
    const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression, game.combat.techniques);
    game = advanceCombatStep(game, 0.1, context, stats);
    if (game.combat.phase !== "active" && game.combat.phase !== "recovery") break;
  }
  return game;
}

describe("Offline Combat Simulation 1.0", () => {
  it("only accepts active or recovery Hunts", () => {
    const active = activeHunt();
    expect(combatHuntActivityAdapter.getEligibility(active).eligible).toBe(true);
    expect(combatHuntActivityAdapter.getEligibility({ ...active, combat: { ...active.combat, phase: "stopped" } }).eligible).toBe(false);
    expect(combatHuntActivityAdapter.getEligibility({ ...active, combat: { ...active.combat, phase: "defeat" } }).eligible).toBe(false);
  });

  it("stops and bills only actual time for death and safety", () => {
    const deathSnapshot = activeHunt();
    const death = simulateCombatHuntOffline({
      ...deathSnapshot,
      combat: {
        ...deathSnapshot.combat,
        playerHp: 1,
        enemies: deathSnapshot.combat.enemies.map((enemy) => ({ ...enemy, attackTimer: 0 })),
      },
    }, { requestedSeconds: 60 }, createDeterministicOfflineRng(991));
    expect(death.stopReason).toBe("death");
    expect(death.simulatedSeconds).toBeGreaterThan(0);
    expect(death.simulatedSeconds).toBeLessThan(60);

    const safetySnapshot = activeHunt();
    const safety = simulateCombatHuntOffline({
      ...safetySnapshot,
      combat: {
        ...safetySnapshot.combat,
        playerHp: 1,
        enemies: safetySnapshot.combat.enemies.map((enemy) => ({ ...enemy, currentHealth: 0, defeated: true })),
      },
    }, { requestedSeconds: 60 }, createDeterministicOfflineRng(991));
    expect(safety.stopReason).toBe("safety-stop");
    expect(safety.simulatedSeconds).toBeGreaterThan(0);
    expect(safety.simulatedSeconds).toBeLessThan(60);
  });

  it("preserves periodic effects, Enemy Actions, automation, and Technique depletion", () => {
    const snapshot = activeHunt();
    const source = snapshot.combat.enemies[0];
    const withEffect = {
      ...snapshot,
      combat: {
        ...snapshot.combat,
        playerEffects: [{
          instanceId: "effect.ignite#offline-test",
          effectId: "effect.ignite",
          source: { kind: "enemy" as const, instanceId: source.instanceId },
          target: { kind: "player" as const },
          stacks: 1,
          remainingSeconds: 4,
          nextTickRemaining: 2,
          appliedSequence: 1,
        }],
      },
    };
    const result = simulateCombatHuntOffline(withEffect, { requestedSeconds: 5 }, createDeterministicOfflineRng(991));
    expect(result.state.combat.events.some((event) => event.type === "effectTicked")).toBe(true);
    const combatResult = simulateCombatHuntOffline(snapshot, { requestedSeconds: 30 }, createDeterministicOfflineRng(991));
    expect(combatResult.state.combat.events.some((event) => event.type === "actionStarted" || event.type === "actionResolved")).toBe(true);
    expect(combatResult.state.combat.events.some((event) => event.type === "automationActionUsed")).toBe(true);

    const technique = simulateCombatHuntOffline({
      ...snapshot,
      combat: {
        ...snapshot.combat,
        stamina: 1,
        techniques: { "careful-positioning": true, "heightened-reflexes": true },
      },
    }, { requestedSeconds: 5 }, createDeterministicOfflineRng(991));
    expect(technique.state.combat.techniques["careful-positioning"]).toBe(false);
    expect(technique.state.combat.techniques["heightened-reflexes"]).toBe(false);
  });

  it("allows active and recovery Hunts and completes requested time without a fixed tick loop", () => {
    const snapshot = activeHunt();
    const result = simulateCombatHuntOffline(snapshot, { requestedSeconds: 10 }, createDeterministicOfflineRng(991));
    expect(result.stopReason).toBe("requested-time-complete");
    expect(result.simulatedSeconds).toBe(10);
    expect(result.summary.eventSteps).toBeLessThan(100);
    expect(result.summary.virtualElapsedSeconds).toBe(10);
  });

  it("matches the canonical 0.1-second reference through longer combat transitions", () => {
    const snapshot = activeHunt();
    const offline = simulateCombatHuntOffline(snapshot, { requestedSeconds: 60 }, createDeterministicOfflineRng(991));
    const live = liveReference(snapshot, 60);
    expect(offline.state.combat.phase).toBe(live.combat.phase);
    expect(offline.state.combat.playerHp).toBeCloseTo(live.combat.playerHp, 8);
    expect(offline.state.combat.stamina).toBeCloseTo(live.combat.stamina, 8);
    expect(offline.state.combat.mana).toBeCloseTo(live.combat.mana, 8);
    expect(offline.state.combat.groupNumber).toBe(live.combat.groupNumber);
    expect(offline.state.combat.enemies.map((enemy) => ({ id: enemy.instanceId, hp: enemy.currentHealth, defeated: enemy.defeated }))).toEqual(
      live.combat.enemies.map((enemy) => ({ id: enemy.instanceId, hp: enemy.currentHealth, defeated: enemy.defeated })),
    );
    expect(offline.state.combat.session.enemiesDefeated).toBe(live.combat.session.enemiesDefeated);
    expect(offline.state.combat.session.damageDealt).toBeCloseTo(live.combat.session.damageDealt, 8);
    expect(offline.state.gold).toBe(live.gold);
    expect(offline.state.inventory).toEqual(live.inventory);
    expect(offline.summary.eventSteps).toBeLessThan(600);
  });
});
