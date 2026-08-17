import { describe, expect, it } from "vitest";
import { calculateArmorMitigation } from "../game/combat/combatMath";
import { resolveDamage } from "../game/combat/combatDamage";
import { applyEffect } from "../game/combat/combatEffects";
import { createCombatState } from "../game/combat/combatState";
import { effectById } from "../game/data/effects";
import { normalizeCombatStats } from "../game/combat/combatStats";

const stats = (overrides: Record<string, unknown> = {}) => normalizeCombatStats({ maxLife: 100, attackDamage: 100, attackDamageMin: 100, attackDamageMax: 100, accuracyRating: 100, evasionRating: 0, armour: 0, baseAttackTime: 2, baseCastTime: 4, maxStamina: 100, staminaRegen: 1, maxMana: 100, manaRegenFlat: 1, ...overrides });
const fixedRng = (value: number) => ({ next: () => value });

describe("Combat Systems 2.0 runtime contracts", () => {
  it("uses a stable defender-only Armour curve", () => {
    expect(calculateArmorMitigation(Number.NaN)).toBe(0);
    expect(calculateArmorMitigation(Number.POSITIVE_INFINITY)).toBe(0);
    expect(calculateArmorMitigation(100)).toBeLessThan(calculateArmorMitigation(1000));
    expect(calculateArmorMitigation(1e12)).toBeLessThanOrEqual(.9);
  });

  it("uses one universal partial Block for blockable hits and never for DoTs", () => {
    const attacker = stats();
    const defender = stats({ blockChance: .5, blockEffect: .5 });
    const hit = resolveDamage({ damageType: "physical", baseDamage: 100, canCrit: false, guaranteedHit: true, source: { kind: "player" }, target: { kind: "enemy", instanceId: "target" }, defensiveEligibility: { canMiss: false, blockable: true } }, attacker, defender, fixedRng(.1));
    expect(hit.blocked).toBe(true);
    expect(hit.blockedDamage).toBe(50);
    expect(hit.healthDamage).toBe(50);
    const dot = resolveDamage({ damageType: "chaos", baseDamage: 100, deliveryKind: "damage-over-time", canCrit: false, guaranteedHit: true, source: { kind: "player" }, target: { kind: "enemy", instanceId: "target" }, defensiveEligibility: { canMiss: false, blockable: true } }, attacker, defender, fixedRng(.1));
    expect(dot.blocked).toBe(false);
    expect(dot.blockedDamage).toBe(0);
  });

  it("applies Shock and Withered as incoming damage modifiers", () => {
    const combat = createCombatState();
    const player = { kind: "player" as const };
    const shocked = applyEffect(combat, effectById["effect.shocked"], { kind: "enemy", instanceId: "enemy" }, player, { targetStats: stats(), rng: fixedRng(.5) });
    expect(shocked.instance).not.toBeNull();
    expect(effectById["effect.shocked"].incomingDamageModifiers).toHaveLength(1);
    expect(effectById["effect.withered"].incomingDamageModifiers?.[0].damageType).toBe("chaos");
  });

  it("keeps the canonical speed split", () => {
    const separate = stats({ increasedAttackSpeed: .5, increasedCastSpeed: .25 });
    expect(separate.attackInterval).toBeCloseTo(2 / 1.5);
    expect(separate.castTime).toBeCloseTo(4 / 1.25);
  });
});
