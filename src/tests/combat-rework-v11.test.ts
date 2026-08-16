import { describe, expect, it } from "vitest";
import { resolveDefensiveOutcome } from "../game/combat/combatMath";
import { resolveDamage, rollDamage } from "../game/combat/combatDamage";
import { applyEffect } from "../game/combat/combatEffects";
import { createCombatState } from "../game/combat/combatState";
import { effectById } from "../game/data/effects";
import { calculateEffectiveCombatStats, calculateEffectiveResistance, getResistance, getUncappedResistance, normalizeCombatStats } from "../game/combat/combatStats";

const stats = (overrides: Record<string, unknown> = {}) => normalizeCombatStats({ maxLife: 100, attackDamage: 100, attackDamageMin: 100, attackDamageMax: 100, accuracyRating: 100, evasionRating: 0, armour: 0, baseAttackTime: 2, baseCastTime: 4, maxStamina: 100, staminaRegen: 1, maxMana: 100, manaRegenFlat: 1, ...overrides });
const fixedRng = (value: number) => ({ next: () => value });

describe("Combat Rework 1.1 runtime contracts", () => {
  it("uses independent attack and spell block maxima with a 90% hard cap", () => {
    const defender = stats({ attackBlockChance: 1, spellBlockChance: 1, maxAttackBlockChance: 0.8, maxSpellBlockChance: 0.95 });
    expect(resolveDefensiveOutcome(0, 0, defender, { canMiss: false, blockable: true }, fixedRng(0.85), { blockKind: "attack" })).toBe("hit");
    expect(resolveDefensiveOutcome(0, 0, defender, { canMiss: false, blockable: true }, fixedRng(0.75), { blockKind: "attack" })).toBe("block");
    expect(resolveDefensiveOutcome(0, 0, defender, { canMiss: false, blockable: true }, fixedRng(0.89), { blockKind: "spell" })).toBe("block");
    expect(resolveDefensiveOutcome(0, 0, stats({ attackBlockChance: 1, maxAttackBlockChance: 1 }), { canMiss: false, blockable: true }, fixedRng(0.9), { blockKind: "attack" })).toBe("hit");
  });

  it("keeps attack speed and cast speed separate while Action Speed affects both", () => {
    const separate = stats({ increasedAttackSpeed: 0.5, increasedCastSpeed: 0.25 });
    expect(separate.attackInterval).toBeCloseTo(2 / 1.5);
    expect(separate.castTime).toBeCloseTo(4 / 1.25);
    const slowed = stats({ actionSpeed: 0.8 });
    expect(slowed.attackInterval).toBeCloseTo(2 / 0.8);
    expect(slowed.castTime).toBeCloseTo(4 / 0.8);
  });

  it("preserves resistance overcap and applies Exposure before local penetration", () => {
    const defender = stats({ fireResistance: 1.1, maxFireResistance: 0.75 });
    expect(getUncappedResistance(defender, "fire")).toBeCloseTo(1.1);
    expect(getResistance(defender, "fire")).toBeCloseTo(0.75);
    expect(calculateEffectiveResistance(defender, "fire", 0, -0.4)).toBeCloseTo(0.7);
    expect(calculateEffectiveResistance(defender, "fire", 0.2, 0)).toBeCloseTo(0.55);
  });

  it("uses explicit damage ranges and reduces only the extra critical portion", () => {
    const attacker = stats({ attackDamageMin: 50, attackDamageMax: 150, baseCritChance: 0, criticalStrikeMultiplier: 2 });
    expect(rollDamage({ damageType: "physical", scaling: { sourceStat: "attackDamage", multiplier: 1 }, canCrit: false }, attacker, fixedRng(0))).toBe(50);
    const packet = { damageType: "physical" as const, baseDamage: 100, minMultiplier: 1, maxMultiplier: 1, canCrit: true, criticalBaseChance: 1, source: { kind: "player" as const }, target: { kind: "enemy" as const, instanceId: "target" }, guaranteedHit: true, defensiveEligibility: { canMiss: false, blockable: false } };
    const normal = resolveDamage(packet, attacker, { ...stats(), reducedExtraDamageTakenFromCriticalStrikes: 0 }, fixedRng(0));
    const reduced = resolveDamage(packet, attacker, { ...stats(), reducedExtraDamageTakenFromCriticalStrikes: 0.5 }, fixedRng(0));
    expect(normal.rawDamage).toBe(200);
    expect(reduced.rawDamage).toBe(150);
  });

  it("avoids elemental ailments deterministically and snapshots non-damaging magnitude", () => {
    const combat = createCombatState();
    const player = { kind: "player" as const };
    const avoided = applyEffect(combat, effectById["effect.ignite"], { kind: "enemy", instanceId: "enemy" }, player, { targetStats: stats({ elementalAilmentAvoidance: 1 }), rng: fixedRng(0.5) });
    expect(avoided.outcome).toBe("avoided");
    expect(avoided.instance).toBeNull();
    const applied = applyEffect(combat, effectById["effect.shocked"], { kind: "enemy", instanceId: "enemy" }, player, { targetStats: stats({ nonDamagingAilmentEffectReduction: 0.4 }), rng: fixedRng(0.5) });
    expect(applied.instance?.snapshot?.effectMagnitudeMultiplier).toBeCloseTo(0.6);
    const effective = calculateEffectiveCombatStats(stats(), [applied.instance!], effectById);
    expect(effective.increasedDamageTaken).toBeCloseTo(0.06);
  });
});
