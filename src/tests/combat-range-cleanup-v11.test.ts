import { describe, expect, it } from "vitest";
import { resolveDamage, rollDamage } from "../game/combat/combatDamage";
import { calculateOutgoingEffectDamageMultiplier } from "../game/combat/combatEffects";
import { applyCombatStatModifiers, normalizeCombatStats } from "../game/combat/combatStats";
import { effectById } from "../game/data/effects";
import { itemById } from "../game/data/items";
import { proficiencyPerkDefinitions } from "../game/data/proficiencyPerks";
import { spellById } from "../game/data/spells";
import { buildEffectTooltip, buildEnemyDefinitionTooltip, buildItemTooltip, buildSpellTooltip } from "../game/presentation/tooltipBuilders";
import { formatDamageRange, formatItemStats } from "../game/presentation/statFormatting";
import { enemyById } from "../game/data/enemies";

const fixedRng = (value: number) => ({ next: () => value });
const attacker = (overrides: Record<string, unknown> = {}) => normalizeCombatStats({
  maxLife: 100,
  attackDamage: 28,
  attackDamageMin: 24,
  attackDamageMax: 32,
  accuracyRating: 100,
  evasionRating: 0,
  armour: 0,
  baseAttackTime: 2,
  maxStamina: 100,
  staminaRegen: 1,
  maxMana: 100,
  manaRegenFlat: 1,
  baseCritChance: 0,
  criticalStrikeMultiplier: 1.5,
  ...overrides,
});

describe("Combat Rework 1.1 explicit damage ranges", () => {
  it("rolls the lower endpoint, midpoint, and upper endpoint exactly", () => {
    const component = { damageType: "physical" as const, scaling: { sourceStat: "attackDamage" as const, multiplier: 1 }, canCrit: false };
    expect(rollDamage(component, attacker(), fixedRng(0))).toBe(24);
    expect(rollDamage(component, attacker(), fixedRng(0.5))).toBe(28);
    expect(rollDamage(component, attacker(), fixedRng(1))).toBe(32);
  });

  it("treats equal endpoints as fixed damage with no implicit variance", () => {
    const component = { damageType: "physical" as const, scaling: { sourceStat: "attackDamage" as const, multiplier: 1 }, canCrit: false };
    const fixed = attacker({ attackDamage: 28, attackDamageMin: 28, attackDamageMax: 28 });
    expect(rollDamage(component, fixed, fixedRng(0))).toBe(28);
    expect(rollDamage(component, fixed, fixedRng(0.5))).toBe(28);
    expect(rollDamage(component, fixed, fixedRng(1))).toBe(28);
  });

  it("applies generic attack-damage modifiers to both endpoints and recomputes the average", () => {
    const modified = applyCombatStatModifiers(attacker(), [{ stat: "attackDamage", operation: "increased", value: 0.2 }]);
    expect(modified.attackDamageMin).toBeCloseTo(28.8);
    expect(modified.attackDamageMax).toBeCloseTo(38.4);
    expect(modified.attackDamage).toBeCloseTo(33.6);
  });

  it("criticals the rolled hit rather than the maximum endpoint", () => {
    const packet = {
      damageType: "physical" as const,
      scaling: { sourceStat: "attackDamage" as const, multiplier: 1 },
      canCrit: true,
      criticalBaseChance: 1,
      source: { kind: "player" as const },
      target: { kind: "enemy" as const, instanceId: "target" },
      guaranteedHit: true,
      defensiveEligibility: { canMiss: false, canBeEvaded: false, blockable: false },
    };
    const result = resolveDamage(packet, attacker(), attacker(), fixedRng(0.5));
    expect(result.rolledDamage).toBe(28);
    expect(result.rawDamage).toBe(42);
  });

  it("keeps prototype weapon and spell averages while authoring visible ranges", () => {
    expect(itemById["item.training-sword"].stats).toMatchObject({ baseDamageMin: 24, baseDamageMax: 32 });
    expect(itemById["item.hunter-sword"].stats).toMatchObject({ baseDamageMin: 29, baseDamageMax: 39 });
    expect(itemById["item.vanguard-sword"].stats).toMatchObject({ baseDamageMin: 34, baseDamageMax: 46 });
    expect(formatDamageRange(24, 32)).toBe("24–32");
    expect((itemById["item.training-sword"].stats!.baseDamageMin! + itemById["item.training-sword"].stats!.baseDamageMax!) / 2).toBe(28);
    expect((itemById["item.hunter-sword"].stats!.baseDamageMin! + itemById["item.hunter-sword"].stats!.baseDamageMax!) / 2).toBe(34);
    expect((itemById["item.vanguard-sword"].stats!.baseDamageMin! + itemById["item.vanguard-sword"].stats!.baseDamageMax!) / 2).toBe(40);
    expect(spellById["spell.flame-blast"]).toMatchObject({ baseDamageMin: 30, baseDamageMax: 40 });
    expect(spellById["spell.ice-shard"]).toMatchObject({ baseDamageMin: 24, baseDamageMax: 32 });
    expect(spellById["spell.stone-spike"]).toMatchObject({ baseDamageMin: 27, baseDamageMax: 37 });
    expect(spellById["spell.shadow-bolt"]).toMatchObject({ baseDamageMin: 25, baseDamageMax: 35 });
    expect(spellById["spell.disrupting-pulse"]).toMatchObject({ baseDamageMin: 0, baseDamageMax: 0 });
  });
});

describe("Combat Rework 1.1 range presentation and cleanup", () => {
  it("combines item damage endpoints into one player-facing row", () => {
    const rows = formatItemStats(itemById["item.training-sword"].stats!);
    expect(rows).toEqual(expect.arrayContaining([{ label: "Physical Damage", value: "24–32", tone: "gold" }]));
    expect(rows.some((row) => row.label === "Base Damage Min" || row.label === "Base Damage Max")).toBe(false);
    expect(buildItemTooltip(itemById["item.training-sword"]).rows?.filter((row) => row.label === "Physical Damage")).toHaveLength(1);
  });

  it("uses damage type and range in spell and enemy tooltips", () => {
    const spell = buildSpellTooltip(spellById["spell.flame-blast"]);
    expect(spell.rows).toEqual(expect.arrayContaining([{ label: "Fire Damage", value: "30–40", tone: "red" }]));
    expect(buildSpellTooltip(spellById["spell.disrupting-pulse"]).rows?.some((row) => row.label.endsWith("Damage"))).toBe(false);
    const enemy = buildEnemyDefinitionTooltip(enemyById["enemy.grey-wolf"]);
    expect(enemy.rows?.find((row) => row.label === "Attack Damage")?.value).toBe(formatDamageRange(enemyById["enemy.grey-wolf"].baseAttackDamageMin, enemyById["enemy.grey-wolf"].baseAttackDamageMax));
  });

  it("makes Afterglow a Fire spell damage effect without changing Accuracy", () => {
    const afterglow = effectById["effect.afterglow"];
    const active = [{ instanceId: "effect.afterglow#1", effectId: afterglow.id, source: { kind: "player" as const }, target: { kind: "player" as const }, stacks: 1, remainingSeconds: 3, nextTickRemaining: null, appliedSequence: 1 }];
    expect(afterglow.statModifiers).toBeUndefined();
    expect(buildEffectTooltip(active[0], afterglow).rows).toEqual(expect.arrayContaining([{ label: "Fire Spell Damage", value: "+10%", tone: "green" }]));
    expect(calculateOutgoingEffectDamageMultiplier(active, effectById, { sourceKind: "spell", deliveryKind: "hit", damageType: "fire" })).toBeCloseTo(1.1);
    for (const damageType of ["cold", "lightning", "physical", "chaos"] as const)
      expect(calculateOutgoingEffectDamageMultiplier(active, effectById, { sourceKind: "spell", deliveryKind: "hit", damageType })).toBe(1);
    const normal = resolveDamage({ damageType: "fire", baseDamage: 100, canCrit: false, guaranteedHit: true, defensiveEligibility: { canMiss: false, canBeEvaded: false, blockable: false }, source: { kind: "player" }, target: { kind: "enemy", instanceId: "target" } }, attacker(), attacker(), fixedRng(0.5));
    const buffed = resolveDamage({ damageType: "fire", baseDamage: 100, damageMultiplier: 1.1, canCrit: false, guaranteedHit: true, defensiveEligibility: { canMiss: false, canBeEvaded: false, blockable: false }, source: { kind: "player" }, target: { kind: "enemy", instanceId: "target" } }, attacker(), attacker(), fixedRng(0.5));
    expect(buffed.healthDamage).toBeGreaterThan(normal.healthDamage);
  });

  it("removes orphan effects and the known magic self-debuffs", () => {
    for (const id of ["effect.reactive-weave", "effect.unbroken-cycle", "effect.absorptive-discipline", "effect.reactive-fortification"])
      expect(effectById[id]).toBeUndefined();
    for (const name of ["Freezing Pressure", "Earthquake", "Blackened Wound"]) {
      const perk = proficiencyPerkDefinitions.find((candidate) => candidate.name === name);
      expect(perk, name).toBeDefined();
      expect(perk?.effects.some((effect) => effect.type === "statModifier" && effect.stat === "evasionRating" && effect.valuePerRank < 0)).toBe(false);
    }
  });
});
