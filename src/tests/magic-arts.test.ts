import { describe, expect, it } from "vitest";
import { absorbDamage, getBarrierAmount } from "../game/combat/combatEffects";
import { castMagicArt, createCombatContext, startHunt } from "../game/combat/combatEngine";
import { effectById } from "../game/data/effects";
import { getMagicArt } from "../game/magicArts/magicArtLogic";
import { calculateMagicArtsXp } from "../game/magicArts/magicArtProgression";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";

const context = createCombatContext({ next: () => 0.5 });

function activeGame() {
  const game = createInitialGameState();
  const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
  return { game: startHunt({ ...game, combat: { ...game.combat, mana: 100 } }, "location.wolf-den", stats, context, "enemy.grey-wolf"), stats };
}

describe("Magic Arts", () => {
  it("authors Earth Shield with the locked base values", () => {
    const art = getMagicArt("magic-art.earth-shield");
    expect(art).toMatchObject({ manaCost: 35, cooldownSeconds: 10, durationSeconds: 12, targetMode: "self", barrier: { absorbAmount: 80, effectId: "effect.earth-shield" } });
    expect(art?.damage).toBeUndefined();
  });

  it("casts, absorbs, refreshes, and awards only mana XP", () => {
    const { game, stats } = activeGame();
    const first = castMagicArt(game, "magic-art.earth-shield", stats, context);
    expect(first.combat.mana).toBe(65);
    expect(first.progression.proficiencies["magic-arts"]?.totalXp).toBe(35);
    expect(first.combat.playerEffects[0]?.effectId).toBe("effect.earth-shield");
    expect(getBarrierAmount(first.combat.playerEffects, effectById)).toBe(80);

    const partial = absorbDamage(first.combat, { kind: "player" }, 50, effectById).combat;
    expect(getBarrierAmount(partial.playerEffects, effectById)).toBe(30);
    const ready = { ...first, combat: { ...partial, mana: 65, globalCooldownRemaining: 0, actionCooldowns: { ...partial.actionCooldowns, "magic-art.earth-shield": 0 } } };
    const refreshed = castMagicArt(ready, "magic-art.earth-shield", stats, context);
    expect(refreshed.combat.mana).toBe(30);
    expect(getBarrierAmount(refreshed.combat.playerEffects, effectById)).toBe(80);
    expect(refreshed.progression.proficiencies["magic-arts"]?.totalXp).toBe(70);
    expect(refreshed.combat.playerEffects.filter((effect) => effect.effectId === "effect.earth-shield")).toHaveLength(1);
  });

  it("does not award XP for failed casts or absorbed damage", () => {
    const { game, stats } = activeGame();
    const first = castMagicArt(game, "magic-art.earth-shield", stats, context);
    const blocked = castMagicArt(first, "magic-art.earth-shield", stats, context);
    expect(blocked.combat.mana).toBe(first.combat.mana);
    expect(blocked.progression.proficiencies["magic-arts"]?.totalXp).toBe(35);
    const absorbed = absorbDamage(first.combat, { kind: "player" }, 80, effectById).combat;
    expect(absorbed.playerHp).toBe(first.combat.playerHp);
    expect(absorbed.playerEffects).toHaveLength(0);
    expect(calculateMagicArtsXp(10, 20)).toBe(30);
  });
});
