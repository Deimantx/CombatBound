import { describe, expect, it } from "vitest";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { createInitialGameState } from "../game/gameState";
import { createCombatContext, castSpell, startHunt } from "../game/combat/combatEngine";
import { normalizeCombatStats } from "../game/combat/combatStats";
import { resolveDamage, resolveDamageWithEffectModifiers, type DamagePacket } from "../game/combat/combatDamage";
import type { ActiveEffectInstance } from "../game/combat/combatEffectTypes";
import { combatBalance } from "../game/combat/combatBalance";
import { effectById } from "../game/data/effects";
import { itemById } from "../game/data/items";
import { spellById } from "../game/data/spells";
import { calculateEffectiveSpell } from "../game/progression/spellProgression";

const fixedRng = (value: number) => ({ next: () => value });

function equipmentStats(slots: Record<string, string> = {}) {
  const instances: Record<string, { id: string; definitionId: string; version: 2; quality: number; upgradeLevel: number; affixes: never[] }> = {};
  const resolvedSlots: Record<string, string> = {};
  let sequence = 1;
  for (const [slot, definitionId] of Object.entries(slots)) {
    const id = `item-instance-${String(sequence).padStart(8, "0")}`;
    instances[id] = { id, definitionId, version: 2, quality: 0, upgradeLevel: 0, affixes: [] };
    resolvedSlots[slot] = id;
    sequence += 1;
  }
  const game = createInitialGameState();
  return calculateHunterCombatStats(
    { slots: resolvedSlots },
    { stackables: {}, instances, nextInstanceSequence: sequence },
    game.progression,
    game.combat.techniques,
    itemById,
  );
}

function activeEffect(effectId: string, target: ActiveEffectInstance["target"] = { kind: "enemy", instanceId: "target" }): ActiveEffectInstance {
  return {
    instanceId: `${effectId}#test`,
    effectId,
    source: { kind: "player" },
    target,
    stacks: 1,
    remainingSeconds: 5,
    nextTickRemaining: null,
    appliedSequence: 1,
  };
}

const attacker = normalizeCombatStats({ attackDamage: 100, attackDamageMin: 100, attackDamageMax: 100, accuracyRating: 100, evasionRating: 0, criticalStrikeChance: 0, criticalStrikeMultiplier: 1.5, armour: 0, maxLife: 100, maxStamina: 100, maxMana: 100 });
const defender = normalizeCombatStats({ attackDamage: 100, attackDamageMin: 100, attackDamageMax: 100, accuracyRating: 100, evasionRating: 0, criticalStrikeChance: 0, criticalStrikeMultiplier: 1.5, armour: 0, maxLife: 100, maxStamina: 100, maxMana: 100 });

describe("Combat Systems 2.0.1 hardening", () => {
  it("counts each equipped critical chance contribution exactly once", () => {
    const base = equipmentStats().criticalStrikeChance ?? 0;
    expect(base).toBe(combatBalance.baseCriticalStrikeChance);
    expect((equipmentStats({ weapon: "item.vanguard-sword" }).criticalStrikeChance ?? 0) - base).toBeCloseTo(.02);
    expect((equipmentStats({ ring1: "item.duelist-ring" }).criticalStrikeChance ?? 0) - base).toBeCloseTo(.02);
    expect((equipmentStats({ weapon: "item.vanguard-sword", ring1: "item.duelist-ring" }).criticalStrikeChance ?? 0) - base).toBeCloseTo(.04);
    expect((equipmentStats({ ring1: "item.ring-of-precision" }).criticalStrikeChance ?? 0) - base).toBeCloseTo(.03);
  });

  it("never reports a Block when Block Effect is zero", () => {
    const result = resolveDamage({
      damageType: "physical",
      baseDamage: 100,
      canCrit: false,
      guaranteedHit: true,
      source: { kind: "player" },
      target: { kind: "enemy", instanceId: "target" },
      defensiveEligibility: { canMiss: false, blockable: true },
    }, attacker, { ...defender, blockChance: .9, blockEffect: 0 }, fixedRng(.01));
    expect(result.blocked).toBe(false);
    expect(result.blockedDamage).toBe(0);
    expect(result.healthDamage).toBe(100);
  });

  it("applies incoming Shock and Withered modifiers to hits and periodic damage", () => {
    const hitPacket: DamagePacket = { damageType: "fire", baseDamage: 100, sourceKind: "attack", deliveryKind: "hit", canCrit: false, guaranteedHit: true, source: { kind: "player" }, target: { kind: "enemy", instanceId: "target" }, defensiveEligibility: { canMiss: false, blockable: false } };
    const dotPacket: DamagePacket = { ...hitPacket, damageType: "chaos", deliveryKind: "damage-over-time" };
    const normalHit = resolveDamageWithEffectModifiers(hitPacket, attacker, defender, fixedRng(.5), [], [], effectById);
    const shockedHit = resolveDamageWithEffectModifiers(hitPacket, attacker, defender, fixedRng(.5), [], [activeEffect("effect.shocked")], effectById);
    const shockedDot = resolveDamageWithEffectModifiers(dotPacket, attacker, defender, fixedRng(.5), [], [activeEffect("effect.shocked")], effectById);
    const witheredDot = resolveDamageWithEffectModifiers(dotPacket, attacker, defender, fixedRng(.5), [], [activeEffect("effect.withered")], effectById);
    expect(shockedHit.mitigatedDamage).toBeGreaterThan(normalHit.mitigatedDamage);
    expect(shockedDot.mitigatedDamage).toBeGreaterThan(normalHit.mitigatedDamage);
    expect(witheredDot.mitigatedDamage).toBe(110);
  });

  it("keeps Shadow Bolt limited to Withered without Decay and grants Decay from its first perk", () => {
    const base = createInitialGameState();
    const spellbook = { ...base.spellbook, equippedSpellSlots: ["spell.shadow-bolt", ...base.spellbook.equippedSpellSlots.slice(1)] };
    const started = startHunt({ ...base, combat: { ...base.combat, playerHp: 1000 } }, "location.wolf-den", attacker, createCombatContext(fixedRng(.5)));
    const target = started.combat.enemies[0];
    const castBase = castSpell({ ...started, spellbook, combat: { ...started.combat, selectedEnemyInstanceId: target.instanceId, mana: 100 } }, "spell.shadow-bolt", attacker, createCombatContext(fixedRng(.01)));
    expect(castBase.combat.enemies[0].effects.map((effect) => effect.effectId)).toEqual(["effect.withered"]);

    const progression = { ...started.progression, purchasedPerks: { "perk.darkness-magic.shadow-decay": 1 } };
    const castWithDecay = castSpell({ ...started, progression, spellbook, combat: { ...started.combat, selectedEnemyInstanceId: target.instanceId, mana: 100 } }, "spell.shadow-bolt", attacker, createCombatContext(fixedRng(.01)));
    expect(castWithDecay.combat.enemies[0].effects.map((effect) => effect.effectId)).toEqual(expect.arrayContaining(["effect.withered", "effect.shadow-decay"]));
  });

  it("exposes later Shadow Decay duration, stack, and periodic modifiers", () => {
    const progression = {
      ...createInitialGameState().progression,
      purchasedPerks: {
        "perk.darkness-magic.shadow-decay": 1,
        "perk.darkness-magic.lingering-rot": 1,
        "perk.darkness-magic.deep-corruption": 1,
        "perk.darkness-magic.blackened-wound": 1,
      },
    };
    const effective = calculateEffectiveSpell(spellById["spell.shadow-bolt"], progression);
    expect(effective.effectDurationModifiers["effect.shadow-decay"]?.durationBonusSeconds).toBeGreaterThan(0);
    expect(effective.effectMaxStacksModifiers["effect.shadow-decay"]).toBeGreaterThan(0);
    expect(effective.effectPeriodicPowerModifiers["effect.shadow-decay"]).toBeGreaterThan(1);
  });

  it("uses global crit values for eligible spells", () => {
    const progression = { ...createInitialGameState().progression, purchasedPerks: { "perk.fire-magic.pyromancers-focus": 1 } };
    const effective = calculateEffectiveSpell(spellById["spell.flame-blast"], progression, { globalCriticalStrikeChance: .2, globalCriticalStrikeMultiplier: 1.7 });
    expect(effective.canCrit).toBe(true);
    expect(effective.criticalStrikeChance).toBeCloseTo(.2);
    expect(effective.criticalStrikeMultiplier).toBeCloseTo(1.7);
  });
});
