import { describe, expect, it } from "vitest";
import type { EnemyCombatInstance } from "../game/combat/combatTypes";
import { getEnemyActionCooldownMultiplier, getEnemyTraitCriticalDamageResistance, getEnemyTraitIncomingDamageMultiplier, getEnemyTraitStatModifiers, normalizeEnemyTraitRuntimeState, processEnemyTraitEvent } from "../game/enemyTraits/enemyTraitRuntime";
import { enemyTraitById } from "../game/data/enemyTraits";
import { createCombatContext } from "../game/combat/combatEngine";
import { createInitialGameState } from "../game/gameState";

const createEnemy = (currentHealth = 50): EnemyCombatInstance => ({
  instanceId: "trait-test#1", enemyId: "trait-test", displayName: "Trait Test", currentHealth, maxHealth: 100,
  attackTimer: 1, attackInterval: 1, actionCooldowns: {}, abilityCooldowns: {}, abilityRuntime: { usedThisFight: {} }, phaseId: null, currentAction: null, effects: [], defeated: false,
  rewardResolved: false, traitRuntime: normalizeEnemyTraitRuntimeState(undefined),
});

describe("enemy Trait runtime", () => {
  it("applies static and conditional stat primitives without Trait-ID branches", () => {
    const instance = createEnemy();
    const definitions = { "trait-test": { traits: [{ traitId: "trait.bloodied-fury" as const, rank: 2 as const }, { traitId: "trait.fireborn" as const, rank: 1 as const }] } };
    const modifiers = getEnemyTraitStatModifiers(instance, .8, definitions, enemyTraitById);
    expect(modifiers.some((modifier) => modifier.stat === "attackDamage")).toBe(false);
    expect(getEnemyTraitStatModifiers(instance, .8, definitions, enemyTraitById).some((modifier) => modifier.stat === "fireResistance" && modifier.value === .25)).toBe(true);
    expect(getEnemyTraitStatModifiers(createEnemy(20), .2, definitions, enemyTraitById).some((modifier) => modifier.stat === "attackDamage" && modifier.value === .3)).toBe(true);
  });

  it("distinguishes Magic from Melee incoming damage and reduces only critical bonus damage", () => {
    const instance = createEnemy();
    const definitions = { "trait-test": { traits: [{ traitId: "trait.arcane-ward" as const, rank: 3 as const }, { traitId: "trait.critical-guard" as const, rank: 3 as const }] } };
    expect(getEnemyTraitIncomingDamageMultiplier(instance, { damageType: "physical", deliveryKind: "hit", sourceCategory: "melee" }, 1, definitions, enemyTraitById)).toBe(1);
    expect(getEnemyTraitIncomingDamageMultiplier(instance, { damageType: "fire", deliveryKind: "hit", sourceCategory: "magic" }, 1, definitions, enemyTraitById)).toBeCloseTo(.25);
    expect(getEnemyTraitCriticalDamageResistance(instance, definitions, enemyTraitById)).toBeCloseTo(.75);
  });

  it("normalizes missing runtime state for old instances", () => {
    expect(normalizeEnemyTraitRuntimeState(undefined)).toEqual({ elapsedSeconds: 0, byTraitId: {} });
  });

  it("uses the deterministic trait channel for proc events", () => {
    const game = createInitialGameState();
    const context = createCombatContext({ nextFor: (kind) => kind === "trait" ? 0 : .5, next: () => .5 });
    const withEnemy = { ...game, combat: { ...game.combat, phase: "active" as const, maxPlayerHp: 100, playerHp: 100, enemies: [createEnemy()] } };
    const contextWithEnemy = { ...context, enemies: { ...context.enemies, "trait-test": { ...context.enemies["enemy.grey-wolf"], id: "trait-test", traits: [{ traitId: "trait.venomous-fangs" as const, rank: 1 as const }] } } };
    const result = processEnemyTraitEvent(withEnemy, "trait-test#1", "enemy-normal-attack-resolved", { successful: true }, contextWithEnemy);
    expect(result.combat.playerEffects.some((effect) => effect.effectId === "effect.poison")).toBe(true);
  });

  it("tracks per-action cooldown use through a generic action-use mechanic", () => {
    const game = createInitialGameState();
    const context = createCombatContext({ nextFor: () => 0, next: () => 0 });
    const withEnemy = { ...game, combat: { ...game.combat, phase: "active" as const, enemies: [createEnemy()] } };
    const contextWithEnemy = { ...context, enemies: { ...context.enemies, "trait-test": { ...context.enemies["enemy.grey-wolf"], id: "trait-test", traits: [{ traitId: "trait.accelerating-assault" as const, rank: 1 as const }] } } };
    const afterFirst = processEnemyTraitEvent(withEnemy, "trait-test#1", "enemy-action-resolved", { actionId: "action.test", successful: true }, contextWithEnemy);
    const afterSecond = processEnemyTraitEvent(afterFirst, "trait-test#1", "enemy-action-resolved", { actionId: "action.test", successful: true }, contextWithEnemy);
    const updatedEnemy = afterSecond.combat.enemies[0];
    expect(getEnemyActionCooldownMultiplier(updatedEnemy, "action.test", contextWithEnemy.enemies, context.enemyTraits)).toBeCloseTo(.9);
  });
});
