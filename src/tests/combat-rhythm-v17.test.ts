import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { getPlayerEffectiveCombatStats } from "../game/combat/combatSelectors";
import { advanceCombat, advanceCombatStep, createCombatContext, startCombatTarget } from "../game/combat/combatEngine";
import { RHYTHM_COUNTER_KEY } from "../game/weapons/weaponMechanicTypes";

function setup(rng: () => number) {
  const game = createInitialGameState();
  const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
  const context = createCombatContext({ next: rng });
  const started = startCombatTarget(game, "location.wolf-den", "enemy.grey-wolf", stats, context);
  return {
    game: {
      ...started,
      combat: {
        ...started.combat,
        playerAttackTimer: 0,
        enemy: started.combat.enemy ? { ...started.combat.enemy, attackTimer: 100 } : null,
      },
    },
    stats,
    context,
  };
}

describe("V17 Rhythm timing", () => {
  it("uses the post-hit one-stack interval for the next attack", () => {
    const { game, stats, context } = setup(() => 0);
    const next = advanceCombatStep(game, 0, context, stats);
    expect(next.combat.weaponRuntime.counters[RHYTHM_COUNTER_KEY]).toBe(1);
    const expected = getPlayerEffectiveCombatStats(next.combat, stats, next.progression, context.effects).attackInterval;
    expect(next.combat.playerAttackInterval).toBeCloseTo(expected, 8);
    expect(next.combat.playerAttackInterval).toBeLessThan(stats.attackInterval);
    expect(next.combat.playerAttackTimer).toBeGreaterThan(0);
  });

  it("uses the base interval immediately after a three-stack miss", () => {
    const { game, stats, context } = setup(() => 1);
    const primed = {
      ...game,
      combat: {
        ...game.combat,
        weaponRuntime: {
          ...game.combat.weaponRuntime,
          counters: { ...game.combat.weaponRuntime.counters, [RHYTHM_COUNTER_KEY]: 3 },
        },
      },
    };
    const next = advanceCombatStep(primed, 0, context, stats);
    expect(next.combat.weaponRuntime.counters[RHYTHM_COUNTER_KEY]).toBe(0);
    expect(next.combat.playerAttackInterval).toBeCloseTo(stats.attackInterval, 8);
    expect(next.combat.playerAttackTimer).toBeCloseTo(stats.attackInterval, 8);
  });

  it("does not rewrite elapsed progress or create negative/zero timers", () => {
    const { game, stats, context } = setup(() => 0);
    const halfway = { ...game, combat: { ...game.combat, playerAttackTimer: -0.5 } };
    const next = advanceCombatStep(halfway, 0, context, stats);
    expect(next.combat.playerAttackTimer).toBeGreaterThan(0);
    expect(next.combat.playerAttackTimer).toBeLessThan(next.combat.playerAttackInterval);
    expect(next.combat.playerAttackInterval).toBeGreaterThan(0);
  });

  it("keeps live and offline stepping deterministic for the same attempt", () => {
    const liveInput = setup(() => 0);
    const offlineInput = setup(() => 0);
    const live = advanceCombatStep(liveInput.game, 0.1, liveInput.context, liveInput.stats);
    const offline = advanceCombat(offlineInput.game, 0.1, offlineInput.context, offlineInput.stats);
    expect(offline.combat.weaponRuntime).toEqual(live.combat.weaponRuntime);
    expect(offline.combat.playerAttackTimer).toBeCloseTo(live.combat.playerAttackTimer, 8);
    expect(offline.combat.playerAttackInterval).toBeCloseTo(live.combat.playerAttackInterval, 8);
  });

  it("applies weapon mechanic modifiers when progression is omitted", () => {
    const game = createInitialGameState();
    const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
    expect(stats.weaponMechanicParameters?.rhythm).toBeDefined();
    const withRhythm = {
      ...game.combat,
      weaponRuntime: {
        ...game.combat.weaponRuntime,
        counters: { ...game.combat.weaponRuntime.counters, [RHYTHM_COUNTER_KEY]: 1 },
      },
    };
    const withoutRhythm = getPlayerEffectiveCombatStats(game.combat, stats);
    const withRhythmStats = getPlayerEffectiveCombatStats(withRhythm, stats);
    expect(withRhythmStats.accuracyRating).toBe((withoutRhythm.accuracyRating ?? 0) + 3);
    expect(withRhythmStats.attackInterval).toBeLessThan(withoutRhythm.attackInterval);
  });
});
