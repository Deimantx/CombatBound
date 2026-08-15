import { describe, expect, it } from "vitest";
import {
  calculateEffectiveAvoidanceChance,
  calculateHitChance,
} from "../game/combat/combatMath";
import {
  advanceCombat,
  castSpell,
  createCombatContext,
  startHunt,
} from "../game/combat/combatEngine";
import { getBarrierAmount } from "../game/combat/combatEffects";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { validatePlayerAction } from "../game/combat/playerActions";
import { effectById } from "../game/data/effects";
import {
  normalizeCombatStats,
  calculateEffectiveCombatStats,
} from "../game/combat/combatStats";

const context = createCombatContext({ next: () => 0.5 });
const statsFor = (game: ReturnType<typeof createInitialGameState>) =>
  calculateHunterCombatStats(
    game.equipment,
    game.progression,
    game.combat.stance,
    game.combat.techniques,
  );

describe("Combat Systems V7", () => {
  it("uses the piecewise hit chance curve", () => {
    expect(calculateHitChance(100, 100)).toBeCloseTo(0.75);
    expect(calculateHitChance(70, 30)).toBeCloseTo(0.842);
    expect(calculateHitChance(30, 70)).toBeCloseTo(0.51);
  });

  it("applies avoidance diminishing returns by category", () => {
    expect(calculateEffectiveAvoidanceChance(0.25, "dodge")).toBeCloseTo(0.25);
    expect(calculateEffectiveAvoidanceChance(0.5, "dodge")).toBeCloseTo(0.375);
    expect(calculateEffectiveAvoidanceChance(1, "block")).toBeCloseTo(0.7);
  });

  it("preserves current resources when starting or switching a hunt", () => {
    const game = createInitialGameState();
    const stats = statsFor(game);
    const prepared = {
      ...game,
      combat: { ...game.combat, playerHp: 80, stamina: 23, mana: 19 },
    };
    const started = startHunt(prepared, "location.wolf-den", stats, context);
    expect(started.combat.playerHp).toBe(80);
    expect(started.combat.stamina).toBe(23);
    expect(started.combat.mana).toBe(19);
  });

  it("blocks a second standard-GCD spell until the GCD expires", () => {
    const game = createInitialGameState();
    const stats = statsFor(game);
    const started = startHunt(game, "location.wolf-den", stats, context);
    const first = castSpell(
      { ...started, combat: { ...started.combat, mana: 100 } },
      "spell.flame-blast",
      stats,
      context,
    );
    const blocked = castSpell(first, "spell.ice-shard", stats, context);
    expect(blocked.combat.mana).toBe(first.combat.mana);
    const ready = advanceCombat(first, 0.75, context, stats);
    const second = castSpell(ready, "spell.ice-shard", stats, context);
    expect(second.combat.mana).toBeLessThan(ready.combat.mana);
  });

  it("requires an equipped spell slot for combat spell actions", () => {
    const game = createInitialGameState();
    const stats = statsFor(game);
    const started = startHunt(game, "location.wolf-den", stats, context);
    const unequipped = {
      ...started,
      spellbook: {
        ...started.spellbook,
        equippedSpellSlots: [
          null,
          ...started.spellbook.equippedSpellSlots.slice(1),
        ],
      },
    };
    expect(
      validatePlayerAction(unequipped, "spell.flame-blast", stats, context)
        .reason,
    ).toBe("spell-not-equipped");
  });

  it("runs the default Protective Sign automation rule", () => {
    const game = createInitialGameState();
    const stats = statsFor(game);
    const started = startHunt(
      { ...game, combat: { ...game.combat, playerHp: 80, mana: 100 } },
      "location.wolf-den",
      stats,
      context,
    );
    const advanced = advanceCombat(started, 0.1, context, stats);
    expect(
      getBarrierAmount(advanced.combat.playerEffects, effectById),
    ).toBeGreaterThan(0);
  });

  it("keeps Chilled when Flame Blast is cast and does not trigger a reaction", () => {
    const game = createInitialGameState();
    const stats = statsFor(game);
    const started = startHunt(game, "location.wolf-den", stats, context);
    const chilled = castSpell(
      { ...started, combat: { ...started.combat, mana: 100 } },
      "spell.ice-shard",
      stats,
      context,
    );
    const afterGcd = advanceCombat(chilled, 0.75, context, stats);
    const fire = castSpell(afterGcd, "spell.flame-blast", stats, context);
    const target = fire.combat.enemies.find(
      (enemy) => enemy.instanceId === fire.combat.selectedEnemyInstanceId,
    );
    expect(target?.effects.some((effect) => effect.effectId === "effect.chilled")).toBe(true);
    expect(fire.combat.events.some((event) => String(event.type) === "interactionTriggered")).toBe(false);
  });

  it("resolves the same Flame Blast damage on a normal and Chilled target", () => {
    const game = createInitialGameState();
    const stats = statsFor(game);
    const started = startHunt(game, "location.wolf-den", stats, context);
    const normal = castSpell(
      { ...started, combat: { ...started.combat, mana: 100 } },
      "spell.flame-blast",
      stats,
      context,
    );
    const chilledBeforeFire = advanceCombat(
      castSpell(
        { ...started, combat: { ...started.combat, mana: 100 } },
        "spell.ice-shard",
        stats,
        context,
      ),
      0.75,
      context,
      stats,
    );
    const chilled = castSpell(chilledBeforeFire, "spell.flame-blast", stats, context);
    const normalTarget = normal.combat.enemies[0];
    const chilledTarget = chilled.combat.enemies[0];
    expect(normalTarget.maxHealth - normalTarget.currentHealth).toBe(
      chilledBeforeFire.combat.enemies[0].currentHealth - chilledTarget.currentHealth,
    );
    expect(chilledTarget.effects.some((effect) => effect.effectId === "effect.chilled")).toBe(true);
    expect(chilledTarget.effects.some((effect) => effect.effectId === "effect.burn")).toBe(true);
  });

  it("does not consume Burn or add a reaction when Ice Shard hits", () => {
    const game = createInitialGameState();
    const stats = statsFor(game);
    const started = startHunt(game, "location.wolf-den", stats, context);
    const burning = castSpell(
      { ...started, combat: { ...started.combat, mana: 100 } },
      "spell.flame-blast",
      stats,
      context,
    );
    const afterGcd = advanceCombat(burning, 0.75, context, stats);
    const afterIce = castSpell(afterGcd, "spell.ice-shard", stats, context);
    const target = afterIce.combat.enemies[0];
    expect(target.effects.some((effect) => effect.effectId === "effect.burn")).toBe(true);
    expect(target.effects.some((effect) => effect.effectId === "effect.chilled")).toBe(true);
    expect(target.effects.some((effect) => effect.effectId === "effect.exposed")).toBe(false);
  });

  it("applies resistance modifiers through the canonical stat boundary", () => {
    const base = normalizeCombatStats({
      maxHealth: 100,
      resistances: { air: 0, light: 0 },
    });
    const shocked = calculateEffectiveCombatStats(
      base,
      [
        {
          effectId: "effect.shocked",
          instanceId: "x",
          source: { kind: "enemy", instanceId: "e" },
          target: { kind: "player" },
          stacks: 1,
          remainingSeconds: 5,
          nextTickRemaining: null,
          appliedSequence: 1,
        },
      ],
      effectById,
    );
    expect(shocked.resistances.air).toBeCloseTo(-0.1);
  });
});
