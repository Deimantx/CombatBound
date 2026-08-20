import { describe, expect, it } from "vitest";
import { createCombatContext } from "../game/combat/combatEngine";
import { resolveEnemyCombatAbilityResult, type EnemyRuntimeDependencies } from "../game/combat/combatEnemyRuntime";
import { instantiateEnemies } from "../game/combat/combatState";
import { isPlayerStunned } from "../game/combat/combatCrowdControl";
import { getPlayerHealingReceivedMultiplier } from "../game/combat/combatHealing";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { enemyCombatAbilityById } from "../game/data/enemyCombatAbilities";
import { enemyById } from "../game/data/enemies";
import { effectById } from "../game/data/effects";

const dependencies: EnemyRuntimeDependencies = {
  applyEffectiveHealing: (game) => game,
  awardBarrierCredits: (game) => game,
  resolveDefensiveTrainingForEnemyAction: (game) => game,
};

function combatFixture(nextFor: (kind: string) => number = () => 0) {
  const base = createInitialGameState();
  const enemies = instantiateEnemies(["enemy.grey-wolf"], 1);
  const enemy = enemies[0];
  return {
    game: {
      ...base,
      combat: {
        ...base.combat,
        phase: "active" as const,
        playerHp: 100,
        maxPlayerHp: 100,
        enemies,
        selectedEnemyInstanceId: enemy.instanceId,
      },
    },
    context: createCombatContext({ next: () => 0, nextFor }),
  };
}

describe("enemy combat ability stabilization", () => {
  it("resolves a single hit into a structured result and starts cooldown", () => {
    const { game, context } = combatFixture();
    const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
    const result = resolveEnemyCombatAbilityResult(game, game.combat.enemies[0].instanceId, enemyCombatAbilityById["enemy-ability.heavy-slam"], context, stats, dependencies);

    expect(result.resolution.totalHits).toBe(1);
    expect(result.resolution.successfulHits).toBe(1);
    expect(result.resolution.hpDamageDealt).toBeGreaterThan(0);
    expect(result.game.combat.enemies[0].abilityCooldowns["enemy-ability.heavy-slam"]).toBe(10);
  });

  it("keeps multi-hit proc ownership per hit", () => {
    const hitRolls = [0, 1, 0];
    const { game, context } = combatFixture((kind) => kind === "hit" ? (hitRolls.shift() ?? 0) : 0);
    const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
    const result = resolveEnemyCombatAbilityResult(game, game.combat.enemies[0].instanceId, enemyCombatAbilityById["enemy-ability.triple-rend"], context, stats, dependencies);

    expect(result.resolution.totalHits).toBe(3);
    expect(result.resolution.successfulHits).toBe(2);
    expect(result.resolution.effectsApplied).toEqual(["effect.bleed"]);
    expect(result.game.combat.playerEffects.find((effect) => effect.effectId === "effect.bleed")?.stacks).toBe(2);
  });

  it("does not apply an on-hit effect after an evade and exposes canonical Stun", () => {
    const { game, context } = combatFixture((kind) => kind === "hit" ? 1 : 0);
    const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
    const result = resolveEnemyCombatAbilityResult(game, game.combat.enemies[0].instanceId, enemyCombatAbilityById["enemy-ability.headlong-charge"], context, stats, dependencies);

    expect(result.resolution.successfulHits).toBe(0);
    expect(result.resolution.effectsApplied).toEqual([]);
    expect(result.game.combat.playerEffects).toEqual([]);
    expect(effectById["effect.stunned"].tags).toEqual(["harmful", "hard-cc", "stun", "enemy-ability"]);
    expect(isPlayerStunned({ ...game.combat, playerEffects: [{ effectId: "effect.stunned" } as never] }, context.effects)).toBe(true);
  });

  it("composes healing reduction from the effect and Diseased trait", () => {
    const { game, context } = combatFixture();
    const enemy = game.combat.enemies[0];
    const healingEffect = { effectId: "effect.enemy-healing-reduction", instanceId: "healing#1", source: { kind: "enemy", instanceId: enemy.instanceId }, target: { kind: "player" }, stacks: 1, remainingSeconds: 10, nextTickRemaining: null, appliedSequence: 1 } as never;
    const traitContext = { ...context, enemies: { ...context.enemies, [enemy.enemyId]: { ...enemyById[enemy.enemyId], traits: [{ traitId: "trait.diseased" as const, rank: 1 as const }] } } };
    expect(getPlayerHealingReceivedMultiplier({ ...game.combat, playerEffects: [healingEffect] }, traitContext, enemy)).toBeCloseTo(.5525);
  });
});
