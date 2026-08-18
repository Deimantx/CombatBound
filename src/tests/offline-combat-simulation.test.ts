import { describe, expect, it } from "vitest";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { createInitialGameState, type GameState } from "../game/gameState";
import { createItemInstance } from "../game/items/itemOwnership";
import { enemyById } from "../game/data/enemies";
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
import type { AutomationCondition } from "../game/automation/automationTypes";

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

function stableCombat(snapshot: GameState): GameState {
  return {
    ...snapshot,
    combat: {
      ...snapshot.combat,
      enemies: snapshot.combat.enemies.map((enemy) => ({
        ...enemy,
        maxHealth: 100_000,
        currentHealth: 100_000,
        attackTimer: 1_000_000,
        actionCooldowns: Object.fromEntries(
          (enemyById[enemy.enemyId]?.actions ?? []).map((action) => [action.id, 1_000_000]),
        ),
      })),
    },
  };
}

function thresholdHunt(
  condition: AutomationCondition,
  actionId: string,
  combatPatch: Partial<GameState["combat"]> = {},
): GameState {
  const base = stableCombat(activeHunt());
  return {
    ...base,
    combat: { ...base.combat, ...combatPatch },
    combatAutomation: {
      ...base.combatAutomation,
      rules: [{ id: "threshold-test", actionId, priority: 1, enabled: true, conditions: [condition] }],
    },
    combatAbilities: {
      ...base.combatAbilities,
      activeSlots: ["weapon-skill.one-handed-sword.swift-cut", ...base.combatAbilities.activeSlots.slice(1)],
    },
  };
}

function firstAutomationEvent(game: GameState, actionId: string) {
  return game.combat.events.find(
    (event) => event.type === "automationActionUsed" && event.data?.actionId === actionId,
  )?.id;
}

function addRegenerationGear(snapshot: GameState): GameState {
  const head = createItemInstance(snapshot.inventory, "item.vanguard-helm");
  const armor = createItemInstance(head.inventory, "item.vanguard-plate");
  if (!head.instance || !armor.instance) return snapshot;
  const inventory = armor.inventory;
  const equipment = {
    ...snapshot.equipment,
    slots: { ...snapshot.equipment.slots, head: head.instance.id, armor: armor.instance.id },
  };
  const stats = calculateHunterCombatStats(
    equipment,
    inventory,
    snapshot.progression,
    snapshot.combat.techniques,
  );
  return {
    ...snapshot,
    inventory,
    equipment,
    combat: {
      ...snapshot.combat,
      maxPlayerHp: stats.maxLife ?? snapshot.combat.maxPlayerHp,
      playerHp: (stats.maxLife ?? snapshot.combat.maxPlayerHp) * 0.5,
    },
  };
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

  it("matches live threshold crossings for continuous automation resources", () => {
    const cases: Array<{ snapshot: GameState; actionId: string; seconds: number }> = [
      {
        snapshot: thresholdHunt(
          { type: "mana-above", fraction: 0.8 },
          "spell.flame-blast",
          { mana: 0 },
        ),
        actionId: "spell.flame-blast",
        seconds: 90,
      },
      {
        snapshot: thresholdHunt(
          { type: "stamina-above", fraction: 0.5 },
          "weapon-skill.one-handed-sword.swift-cut",
          { stamina: 0 },
        ),
        actionId: "weapon-skill.one-handed-sword.swift-cut",
        seconds: 20,
      },
      {
        snapshot: thresholdHunt(
          { type: "stamina-below", fraction: 0.5 },
          "weapon-skill.one-handed-sword.swift-cut",
          { stamina: 100, techniques: { "careful-positioning": true, "heightened-reflexes": true } },
        ),
        actionId: "weapon-skill.one-handed-sword.swift-cut",
        seconds: 55,
      },
      {
        snapshot: addRegenerationGear(thresholdHunt(
          { type: "player-hp-above", fraction: 0.55 },
          "weapon-skill.one-handed-sword.swift-cut",
        )),
        actionId: "weapon-skill.one-handed-sword.swift-cut",
        seconds: 30,
      },
    ];

    for (const testCase of cases) {
      const offline = simulateCombatHuntOffline(
        testCase.snapshot,
        { requestedSeconds: testCase.seconds },
        createDeterministicOfflineRng(991),
      );
      const live = liveReference(testCase.snapshot, testCase.seconds);
      expect(firstAutomationEvent(offline.state, testCase.actionId)).toBeDefined();
      expect(firstAutomationEvent(offline.state, testCase.actionId)).toBe(
        firstAutomationEvent(live, testCase.actionId),
      );
      expect(offline.state.combat.playerHp).toBeCloseTo(live.combat.playerHp, 8);
      expect(offline.state.combat.mana).toBeCloseTo(live.combat.mana, 8);
      expect(offline.state.combat.stamina).toBeCloseTo(live.combat.stamina, 8);
    }
  });
});
