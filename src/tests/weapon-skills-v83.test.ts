import { describe, expect, it } from "vitest";
import { calculateHitChance } from "../game/combat/combatMath";
import { resolveDamage } from "../game/combat/combatDamage";
import {
  createCombatContext,
  executePlayerAction,
  startHunt,
} from "../game/combat/combatEngine";
import { instantiateEnemies } from "../game/combat/combatState";
import { combatBalance } from "../game/combat/combatBalance";
import { getPlayerActionDefinitions, validatePlayerAction } from "../game/combat/playerActions";
import { effectById } from "../game/data/effects";
import { weaponSkillDefinitions } from "../game/data/weaponSkills";
import { createInitialGameState } from "../game/gameState";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { evaluateAutomation } from "../game/automation/automationLogic";
import { normalizeCombatStats } from "../game/combat/combatStats";

const context = createCombatContext({ next: () => 0.5 });

function statsFor(game: ReturnType<typeof createInitialGameState>) {
  return calculateHunterCombatStats(
    game.equipment,
    game.inventory,
    game.progression,
  );
}

function activeGame(actionId: string) {
  const game = createInitialGameState();
  const started = startHunt(
    {
      ...game,
      combatAbilities: {
        ...game.combatAbilities,
        slots: [actionId, null, null, null, null],
      },
    },
    "location.wolf-den",
    statsFor(game),
    context,
  );
  return { game: started, stats: statsFor(started) };
}

describe("One-Handed Sword Weapon Skills V8.3", () => {
  it("defines exactly five Stamina weapon skills without Bleed or DoT", () => {
    expect(weaponSkillDefinitions).toHaveLength(5);
    expect(weaponSkillDefinitions.map((skill) => skill.id)).toEqual([
      "weapon-skill.one-handed-sword.swift-cut",
      "weapon-skill.one-handed-sword.precision-thrust",
      "weapon-skill.one-handed-sword.flowing-step",
      "weapon-skill.one-handed-sword.sweeping-cut",
      "weapon-skill.one-handed-sword.opening-feint",
    ]);
    for (const skill of weaponSkillDefinitions) {
      expect(skill.proficiencyId).toBe("one-handed-sword");
      expect(skill.staminaCost).toBeGreaterThan(0);
      expect(skill.globalCooldown).toBe("standard");
      expect(skill.selfEffectId ?? skill.targetEffectId ?? "").not.toBe("effect.bleed");
      expect(skill.tags).not.toContain("bleed");
      expect(skill.tags).not.toContain("dot");
    }
  });

  it("uses weapon-skill actions and enforces the equipped weapon", () => {
    const game = createInitialGameState();
    const actions = getPlayerActionDefinitions(game, context).filter((action) => action.kind === "weapon-skill");
    expect(actions).toHaveLength(5);
    expect(actions.every((action) => action.sourceWeaponSkillId)).toBe(true);
    const { game: started, stats } = activeGame(weaponSkillDefinitions[0].id);
    expect(validatePlayerAction(started, weaponSkillDefinitions[0].id, stats, context).valid).toBe(true);
    const wrongWeapon = {
      ...started,
      equipment: { ...started.equipment, slots: { ...started.equipment.slots, weapon: "item.training-axe" } },
    };
    expect(validatePlayerAction(wrongWeapon, weaponSkillDefinitions[0].id, stats, context).reason).toBe("weapon-requirement");
  });

  it("keeps prototype level requirements authored but bypassed centrally", () => {
    const { game, stats } = activeGame("weapon-skill.one-handed-sword.precision-thrust");
    const mutableBalance = combatBalance as unknown as { enforceWeaponSkillLevelRequirements: boolean };
    const previous = mutableBalance.enforceWeaponSkillLevelRequirements;
    mutableBalance.enforceWeaponSkillLevelRequirements = false;
    expect(validatePlayerAction(game, "weapon-skill.one-handed-sword.precision-thrust", stats, context).valid).toBe(true);
    mutableBalance.enforceWeaponSkillLevelRequirements = true;
    expect(validatePlayerAction(game, "weapon-skill.one-handed-sword.precision-thrust", stats, context).reason).toBe("proficiency-level-requirement");
    mutableBalance.enforceWeaponSkillLevelRequirements = previous;
  });

  it("uses canonical Accuracy and the normal crit/damage pipeline", () => {
    const normal = calculateHitChance(10, 70);
    const precision = calculateHitChance(15, 70);
    expect(precision).toBeGreaterThan(normal);
    const resolution = resolveDamage({
      damageType: "physical",
      baseDamage: 100,
      canCrit: true,
      attackerAccuracy: 115,
      source: { kind: "player" },
      target: { kind: "enemy", instanceId: "enemy" },
      defensiveEligibility: { canMiss: true, blockable: false },
    }, normalizeCombatStats({
      maxLife: 100, attackDamage: 100, accuracyRating: 70, baseAttackTime: 1, armour: 0, evasionRating: 0, criticalStrikeChance: 0, criticalStrikeMultiplier: 1.5, maxStamina: 0, staminaRegen: 0, maxMana: 0, manaRegenFlat: 0, resistances: {},
    }), normalizeCombatStats({
      maxLife: 100, attackDamage: 0, accuracyRating: 0, baseAttackTime: 1, armour: 0, evasionRating: 0, criticalStrikeChance: 0, criticalStrikeMultiplier: 1.5, maxStamina: 0, staminaRegen: 0, maxMana: 0, manaRegenFlat: 0, resistances: {},
    }), context.rng);
    expect(resolution.outcome).toBe("hit");
    expect(resolution.healthDamage).toBeGreaterThan(0);
  });

  it("executes Swift Cut with its Stamina cost, cooldown, GCD and damage basis", () => {
    const { game, stats } = activeGame("weapon-skill.one-handed-sword.swift-cut");
    const next = executePlayerAction(game, "weapon-skill.one-handed-sword.swift-cut", stats, context);
    expect(next.combat.stamina).toBe(game.combat.stamina - 12);
    expect(next.combat.actionCooldowns["weapon-skill.one-handed-sword.swift-cut"]).toBe(2.5);
    expect(next.combat.globalCooldownRemaining).toBe(combatBalance.standardGlobalCooldown);
    expect(next.combat.session.damageDealt).toBeGreaterThan(0);
    expect(next.combat.events.some((event) => event.data?.actionId === "weapon-skill.one-handed-sword.swift-cut")).toBe(true);
  });

  it("does not inherit the legacy Sword Bleed proc policy", () => {
    const setup = activeGame("weapon-skill.one-handed-sword.swift-cut");
    const game = {
      ...setup.game,
      progression: {
        ...setup.game.progression,
        purchasedPerks: { "perk.one-handed-sword.deep-cuts": 3 },
      },
    };
    const next = executePlayerAction(game, "weapon-skill.one-handed-sword.swift-cut", setup.stats, context);
    const target = next.combat.enemies.find((enemy) => enemy.instanceId === next.combat.selectedEnemyInstanceId);
    expect(target?.effects.some((effect) => effect.effectId === "effect.bleed")).toBe(false);
  });

  it("applies Flowing Step and Opening Feint only after HP damage", () => {
    const flowing = activeGame("weapon-skill.one-handed-sword.flowing-step");
    const flowingNext = executePlayerAction(flowing.game, "weapon-skill.one-handed-sword.flowing-step", flowing.stats, context);
    expect(flowingNext.combat.playerEffects.some((effect) => effect.effectId === "effect.flowing-step")).toBe(true);
    expect(flowingNext.combat.playerEffects.find((effect) => effect.effectId === "effect.flowing-step")?.remainingSeconds).toBe(4);

    const feint = activeGame("weapon-skill.one-handed-sword.opening-feint");
    const feintNext = executePlayerAction(feint.game, "weapon-skill.one-handed-sword.opening-feint", feint.stats, context);
    const target = feintNext.combat.enemies.find((enemy) => enemy.instanceId === feintNext.combat.selectedEnemyInstanceId);
    expect(target?.effects.some((effect) => effect.effectId === "effect.opening-feint")).toBe(true);
    expect(effectById["effect.opening-feint"].statModifiers?.[0].value).toBe(-12);
  });

  it("resolves Sweeping Cut as deterministic derived cleave on at most two targets", () => {
    const setup = activeGame("weapon-skill.one-handed-sword.sweeping-cut");
    const enemies = instantiateEnemies(["enemy.grey-wolf", "enemy.grey-wolf", "enemy.grey-wolf", "enemy.grey-wolf"], 1);
    const game = { ...setup.game, combat: { ...setup.game.combat, enemies, selectedEnemyInstanceId: enemies[0].instanceId } };
    const next = executePlayerAction(game, "weapon-skill.one-handed-sword.sweeping-cut", setup.stats, context);
    const cleaves = next.combat.events.filter((event) => event.data?.derived === true);
    expect(cleaves).toHaveLength(2);
    expect(cleaves.map((event) => event.target && event.target.kind === "enemy" ? event.target.instanceId : "")).toEqual([enemies[1].instanceId, enemies[2].instanceId]);
    expect(cleaves.every((event) => event.data?.critical === false)).toBe(true);
    expect(next.combat.session.proficiencyXpGained["one-handed-sword"]).toBe(next.combat.session.damageDealt);
  });

  it("resolves a cleave kill and rewards the secondary exactly once", () => {
    const setup = activeGame("weapon-skill.one-handed-sword.sweeping-cut");
    const enemies = instantiateEnemies(["enemy.grey-wolf", "enemy.grey-wolf", "enemy.grey-wolf"], 1);
    const weakened = enemies.map((enemy, index) => index === 1 ? { ...enemy, currentHealth: 1 } : enemy);
    const game = { ...setup.game, combat: { ...setup.game.combat, enemies: weakened, selectedEnemyInstanceId: weakened[0].instanceId } };
    const next = executePlayerAction(game, "weapon-skill.one-handed-sword.sweeping-cut", setup.stats, context);
    const secondary = next.combat.enemies.find((enemy) => enemy.instanceId === weakened[1].instanceId);
    expect(secondary?.defeated).toBe(true);
    expect(secondary?.rewardResolved).toBe(true);
    expect(next.combat.session.enemiesDefeated).toBe(1);
  });

  it("lets Automation choose a weapon skill and skips it when unequipped", () => {
    const { game, stats } = activeGame("weapon-skill.one-handed-sword.opening-feint");
    const configured = {
      ...game,
      combatAutomation: {
        ...game.combatAutomation,
        rules: [{ id: "rule.feint", actionId: "weapon-skill.one-handed-sword.opening-feint", priority: 10, enabled: true, conditions: [{ type: "target-missing-effect" as const, effectId: "effect.opening-feint" }] }],
      },
    };
    expect(evaluateAutomation(configured, stats, context).actionId).toBe("weapon-skill.one-handed-sword.opening-feint");
    const unequipped = { ...configured, combatAbilities: { ...configured.combatAbilities, slots: [null, null, null, null, null] } };
    expect(evaluateAutomation(unequipped, stats, context).invalid?.reason).toBe("ability-not-equipped");
  });
});
