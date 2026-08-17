import { absorbDamage } from "./combatEffects";
import { cleanseEffects } from "./combatEffects";
import { applyBarrierToDamage, componentFromAttack, resolveDamageWithEffectModifiers, type DamagePacket } from "./combatDamage";
import { awardCombatXp, combatEvent as event, getEnemyStats, getPlayerStats } from "./combatRuntime";
import { nextCombatRandom } from "./combatRng";
import { applyEnemyHealthDamage } from "./combatHealth";
import { applyEffectToGame } from "./combatEffectRuntime";
import { removeStackableItem } from "../items/itemOwnership";
import { combatBalance } from "./combatBalance";
import { spellById } from "../data/spells";
import { weaponSkillById } from "../data/weaponSkills";
import { buildEffectiveSpellContext, getEffectivePlayerActionCost, potionAction, validatePlayerAction } from "./playerActions";
import { calculateEffectiveSpell } from "../progression/spellProgression";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import { perkById } from "../data/proficiencyPerks";
import { proficiencyById } from "../data/proficiencies";
import {
  getEffectiveMagicModifiers,
  getMagicCleanseEffectHooks,
  getMagicCleanseHooks,
  getSpellCastEffectHooks,
  getSpellHitEffectHooks,
  getSpellLifeDrainFraction,
  getSpellHpDamageResourceHooks,
  getWeaponAttackModifiers,
  getWeaponDamageMultiplier,
  getWeaponHitAdvanceHooks,
  getWeaponHitEffectHooks,
  getWeaponHitResourceHooks,
} from "../progression/perkProgression";
import {
  awardProficiencyXp,
  calculateProficiencyXpAward,
} from "../progression/proficiencyProgression";
import {
  getDefensiveEquipmentContext,
} from "../equipment/defensiveEquipment";
import type { GameState } from "../gameState";
import type { HunterCombatStats } from "../equipment/derivedStats";
import type {
  CombatContext,
  CombatStats,
  CombatantRef,
  EnemyCombatInstance,
} from "./combatTypes";
import type { CombatProficiencyId, ProgressionCredit } from "../progression/progressionTypes";

type BarrierAbsorption = {
  effectId: string;
  amount: number;
  progressionCredit?: ProgressionCredit;
};

export interface PlayerDamageRuntimeDependencies {
  awardBarrierCredits: (game: GameState, absorptions: BarrierAbsorption[]) => GameState;
  restoreBarrierResource: (game: GameState, proficiencyId: CombatProficiencyId, absorbedAmount: number) => GameState;
  resolveDefeatedEnemies: (game: GameState, context: CombatContext) => GameState;
}

export interface PlayerActionRuntimeDependencies extends PlayerDamageRuntimeDependencies {
  applyEffectiveHealing: (
    game: GameState,
    proficiencyId: CombatProficiencyId,
    requestedAmount: number,
    source: CombatantRef,
    label: string,
    awardProgression?: boolean,
  ) => GameState;
  discoverCombatProficiency: (game: GameState, proficiencyId: CombatProficiencyId) => GameState;
}

function applyDerivedCleaveDamage(
  game: GameState,
  target: EnemyCombatInstance,
  amount: number,
  source: CombatantRef,
  sourceActionId: string,
  proficiencyId: CombatProficiencyId | null,
  context: CombatContext,
  prefix: string,
  dependencies: PlayerDamageRuntimeDependencies,
) {
  const current = game.combat.enemies.find(
    (enemy) => enemy.instanceId === target.instanceId,
  );
  if (!current || current.defeated)
    return {
      game,
      progressionResult: null as ReturnType<typeof awardProficiencyXp> | null,
    };
  const targetRef: CombatantRef = {
    kind: "enemy",
    instanceId: current.instanceId,
  };
  const barrierResult = absorbDamage(
    game.combat,
    targetRef,
    Math.max(0, amount),
    context.effects,
  );
  const healthDamage = Math.max(0, amount - barrierResult.absorbed);
  const damageApplication = applyEnemyHealthDamage(
    barrierResult.combat,
    current.instanceId,
    healthDamage,
    context,
  );
  const appliedHealthDamage = damageApplication.appliedDamage;
  let next: GameState = {
    ...game,
    combat: damageApplication.combat,
  };
  next = dependencies.awardBarrierCredits(next, barrierResult.absorptions);
  let progressionResult: ReturnType<typeof awardProficiencyXp> | null = null;
  if (proficiencyId && appliedHealthDamage > 0) {
    const awarded = awardCombatXp(
      next,
      proficiencyId,
      calculateProficiencyXpAward({
        type: "effective-hp-damage",
        amount: appliedHealthDamage,
      }),
    );
    next = awarded.game;
    progressionResult = awarded.result;
  }
  next.combat = event(next.combat, {
    text:
      `${prefix} for ${appliedHealthDamage} damage${barrierResult.absorbed > 0 ? ` (${barrierResult.absorbed} absorbed)` : ""}.`,
    type: "player",
    eventType: appliedHealthDamage > 0 ? "damageDealt" : "damageAbsorbed",
    source,
    target: targetRef,
    data: {
      actionId: sourceActionId,
      damage: appliedHealthDamage,
      absorbed: barrierResult.absorbed,
      requestedDamage: healthDamage,
      appliedDamage: appliedHealthDamage,
      immortalPrevented: damageApplication.preventedLethalDamage,
      derived: true,
      critical: false,
    },
  });
  return { game: next, progressionResult };
}

export function damageEnemy(
  game: GameState,
  target: EnemyCombatInstance,
  packet: DamagePacket,
  attackerStats: CombatStats,
  context: CombatContext,
  prefix: string,
  effectsToApply: Array<{
    effectId: string;
    chance: number;
    options?: {
      progressionCredit?: ProgressionCredit;
      sourceProficiencyId?: CombatProficiencyId;
      secondaryOnly?: boolean;
      targetMode?: "source" | "target";
      requireHpDamage?: boolean;
      durationBonusSeconds?: number;
      durationMultiplier?: number;
      periodicPowerMultiplier?: number;
      maxStacksBonus?: number;
    };
  }> = [],
  dependencies: PlayerDamageRuntimeDependencies,
  allowSecondary = true,
  isSecondary = false,
) {
  const current = game.combat.enemies.find(
    (enemy) => enemy.instanceId === target.instanceId,
  );
  if (!current || current.defeated) return game;
  const defenderStats = getEnemyStats(game.combat, current, context);
  const weaponProficiencyId =
    packet.progressionSource?.type === "equippedWeapon" &&
    packet.progressionSource.proficiencyEligible
      ? getEquippedWeaponProficiency(game.equipment, game.inventory)
      : null;
  const proficiencyId =
    packet.progressionSource?.type === "spell" &&
    packet.progressionSource.proficiencyEligible
      ? packet.progressionSource.proficiencyId
      : weaponProficiencyId;
  const equipmentContext = getDefensiveEquipmentContext(game.equipment, game.inventory);
  const conditionalMultiplier =
    packet.progressionSource?.proficiencyEligible &&
    packet.progressionSource.type === "equippedWeapon"
      ? getWeaponDamageMultiplier(
          game.progression,
          weaponProficiencyId,
          current.currentHealth / current.maxHealth,
          current.effects.map((effect) => effect.effectId),
          perkById,
          equipmentContext,
        )
      : 1;
  const weaponAttack = getWeaponAttackModifiers(
    game.progression,
    weaponProficiencyId,
    perkById,
    equipmentContext,
  );
  const magicAttack =
    packet.progressionSource?.type === "spell" &&
    packet.progressionSource.proficiencyEligible
      ? getEffectiveMagicModifiers(
          game.progression,
          packet.progressionSource.proficiencyId,
          perkById,
          equipmentContext,
        )
      : null;
  const secondaryFraction =
    magicAttack?.spellSecondaryTargetFraction ??
    (packet.weaponSkillId ? 0 : weaponAttack.secondaryTargetFraction);
  const secondaryCount =
    magicAttack?.spellSecondaryTargetCount ??
    (packet.weaponSkillId ? 0 : weaponAttack.secondaryTargetCount);
  const armorPenetrationPercent =
    magicAttack?.spellArmorPenetrationPercent ??
    weaponAttack.armorPenetrationPercent;
  const armorPenetrationFlat =
    magicAttack?.spellArmorPenetrationFlat ?? weaponAttack.armorPenetrationFlat;
  let resolution = resolveDamageWithEffectModifiers(
    {
      ...packet,
      damageMultiplier:
        (packet.damageMultiplier ?? 1) *
        conditionalMultiplier *
        (isSecondary ? secondaryFraction : 1),
      armorPenetrationPercent,
      armorPenetrationFlat,
    },
    attackerStats,
    defenderStats,
    context.rng,
    packet.source.kind === "player" ? game.combat.playerEffects : current.effects,
    current.effects,
    context.effects,
  );
  const barrierResult = packet.ignoresBarrier
    ? {
        combat: game.combat,
        absorbed: 0,
        remaining: resolution.mitigatedDamage,
        absorptions: [] as Array<{
          effectId: string;
          amount: number;
          progressionCredit?: ProgressionCredit;
        }>,
      }
    : absorbDamage(
        game.combat,
        packet.target,
        resolution.mitigatedDamage,
        context.effects,
      );
  resolution = applyBarrierToDamage(resolution, barrierResult.absorbed);
  const damageApplication = applyEnemyHealthDamage(
    barrierResult.combat,
    current.instanceId,
    resolution.healthDamage,
    context,
  );
  const effectiveHealthDamage = damageApplication.appliedDamage;
  resolution = {
    ...resolution,
    healthDamage: effectiveHealthDamage,
    targetDied: damageApplication.targetDied,
  };
  let next: GameState = {
    ...game,
    combat: damageApplication.combat,
  };
  let progressionResults: Array<ReturnType<typeof awardProficiencyXp>> = [];
  if (proficiencyId && effectiveHealthDamage > 0) {
    const awarded = awardCombatXp(
      next,
      proficiencyId,
      calculateProficiencyXpAward({
        type: "effective-hp-damage",
        amount: effectiveHealthDamage,
      }),
    );
    next = awarded.game;
    if (awarded.result) progressionResults.push(awarded.result);
  }
  if (
    packet.progressionSource?.type === "spell" &&
    packet.progressionSource.proficiencyEligible &&
    effectiveHealthDamage > 0
  ) {
    for (const hook of getSpellHpDamageResourceHooks(
      next.progression,
      packet.progressionSource.proficiencyId,
      perkById,
    ))
      if (hook.chance >= 1 || nextCombatRandom(context.rng, "effect") < hook.chance)
        next.combat =
          hook.resource === "mana"
            ? {
                ...next.combat,
                mana: Math.min(
                  next.combat.maxMana,
                  next.combat.mana + hook.amount,
                ),
              }
            : {
                ...next.combat,
                stamina: Math.min(
                  next.combat.maxStamina,
                  next.combat.stamina + hook.amount,
                ),
              };
  }
  for (const absorption of barrierResult.absorptions) {
    const credit = absorption.progressionCredit;
    if (credit?.mode !== "barrier-absorb") continue;
    const awarded = awardCombatXp(
      next,
      credit.proficiencyId,
      calculateProficiencyXpAward({
        type: "barrier-absorption",
        amount: absorption.amount,
      }),
    );
    next = awarded.game;
    if (awarded.result) progressionResults.push(awarded.result);
    next = dependencies.restoreBarrierResource(
      next,
      credit.proficiencyId,
      absorption.amount,
    );
  }
  if (resolution.blocked) {
    next.combat = event(next.combat, {
      text: `${current.displayName} blocks ${resolution.blockedDamage} damage.`,
      type: "player",
      eventType: "attackBlocked",
      source: packet.source,
      target: packet.target,
      data: { blockedDamage: resolution.blockedDamage },
    });
  }
  const message = resolution.outcome === "hit"
    ? `${prefix} for ${resolution.healthDamage} damage${resolution.critical ? " critical" : ""}${resolution.barrierAbsorbed > 0 ? ` (${resolution.barrierAbsorbed} absorbed)` : ""}.`
    : `${prefix} ${resolution.outcome}s against ${current.displayName}.`;
  const eventType = resolution.outcome === "evaded"
    ? "attackEvaded"
    : resolution.critical
      ? "criticalHit"
      : "damageDealt";
  next.combat = event(next.combat, {
    text: message,
    type: "player",
    eventType,
    source: packet.source,
    target: packet.target,
    data: {
      damage: resolution.healthDamage,
      blockedDamage: resolution.blockedDamage,
      critical: resolution.critical,
      absorbed: resolution.barrierAbsorbed,
      requestedDamage: damageApplication.requestedDamage,
      appliedDamage: damageApplication.appliedDamage,
      immortalPrevented: damageApplication.preventedLethalDamage,
    },
  });
  if (resolution.outcome === "hit") {
    for (const applied of effectsToApply)
      if (
        !(applied.options?.secondaryOnly && !isSecondary) &&
        (!applied.options?.requireHpDamage || effectiveHealthDamage > 0) &&
        (applied.chance >= 1 || nextCombatRandom(context.rng, "effect") < applied.chance)
      ) {
        const effectTarget =
          applied.options?.targetMode === "source"
            ? packet.source
            : packet.target;
        next = applyEffectToGame(
          next,
          applied.effectId,
          packet.source,
          effectTarget,
          context,
          applied.options,
        );
      }
    if (
      packet.progressionSource?.type === "equippedWeapon" &&
      packet.progressionSource.proficiencyEligible &&
      effectiveHealthDamage > 0 &&
      !packet.weaponSkillId
    ) {
      for (const applied of getWeaponHitEffectHooks(
        next.progression,
        weaponProficiencyId,
        perkById,
      ))
        if (applied.chance >= 1 || nextCombatRandom(context.rng, "effect") < applied.chance)
          next = applyEffectToGame(
            next,
            applied.effectId,
            packet.source,
            packet.target,
            context,
          );
      for (const hook of getWeaponHitResourceHooks(
        next.progression,
        weaponProficiencyId,
        perkById,
      ))
        if (hook.chance >= 1 || nextCombatRandom(context.rng, "effect") < hook.chance)
          next.combat =
            hook.resource === "mana"
              ? {
                  ...next.combat,
                  mana: Math.min(
                    next.combat.maxMana,
                    next.combat.mana + hook.amount,
                  ),
                }
              : {
                  ...next.combat,
                  stamina: Math.min(
                    next.combat.maxStamina,
                    next.combat.stamina + hook.amount,
                  ),
                };
      for (const hook of getWeaponHitAdvanceHooks(
        next.progression,
        weaponProficiencyId,
        perkById,
      ))
        if (hook.chance >= 1 || nextCombatRandom(context.rng, "effect") < hook.chance)
          next.combat = {
            ...next.combat,
            playerAttackTimer: Math.max(
              0,
              next.combat.playerAttackTimer -
                next.combat.playerAttackInterval * hook.fraction,
            ),
          };
    }
  }
  if (
    allowSecondary &&
    !packet.cleave &&
    !packet.weaponSkillId &&
    (weaponProficiencyId || magicAttack) &&
    secondaryCount > 0 &&
    resolution.outcome === "hit"
  ) {
    const secondaryTargets = next.combat.enemies
      .filter(
        (enemy) => enemy.instanceId !== current.instanceId && !enemy.defeated,
      )
      .slice(0, secondaryCount);
    for (const secondaryTarget of secondaryTargets) {
        next = damageEnemy(
        next,
        secondaryTarget,
        {
          ...packet,
          target: { kind: "enemy", instanceId: secondaryTarget.instanceId },
        },
        attackerStats,
        context,
        `${prefix} (secondary)`,
        magicAttack ? effectsToApply : [],
        dependencies,
        false,
        true,
      );
    }
  }
  if (
    allowSecondary &&
    packet.cleave &&
    effectiveHealthDamage > 0 &&
    resolution.outcome === "hit"
  ) {
    const secondaryTargets = next.combat.enemies
      .filter(
        (enemy) => enemy.instanceId !== current.instanceId && !enemy.defeated,
      )
      .slice(0, Math.max(0, Math.floor(packet.cleave.maxSecondaryTargets)));
    const derivedDamage =
      effectiveHealthDamage * packet.cleave.primaryResolvedDamageFraction;
    for (const secondaryTarget of secondaryTargets) {
      const derived = applyDerivedCleaveDamage(
        next,
        secondaryTarget,
        derivedDamage,
        packet.source,
        packet.sourceActionId ?? packet.weaponSkillId ?? "weapon-skill",
        proficiencyId,
        context,
        `${prefix} (cleave)`,
        dependencies,
      );
      next = derived.game;
      if (derived.progressionResult)
        progressionResults.push(derived.progressionResult);
    }
  }
  for (const progressionResult of progressionResults) {
    if (
      progressionResult.newProficiencyLevel >
      progressionResult.oldProficiencyLevel
    )
      next.combat = event(next.combat, {
        text: `${proficiencyById[progressionResult.proficiencyId].name} reached Proficiency Lv ${progressionResult.newProficiencyLevel}.`,
        type: "system",
      });
    if (progressionResult.newMasteryLevel > progressionResult.oldMasteryLevel)
      next.combat = event(next.combat, {
        text: `Mastery Level increased to ${progressionResult.newMasteryLevel}.`,
        type: "system",
      });
  }
  return dependencies.resolveDefeatedEnemies(next, context);
}
export function executePlayerAction(
  game: GameState,
  actionId: string,
  stats: HunterCombatStats,
  context: CombatContext,
  dependencies: PlayerActionRuntimeDependencies,
  source: "manual" | "automation" = "manual",
): GameState {
  if (actionId.startsWith("spell."))
    return castSpell(game, actionId, stats, context, dependencies, source);
  if (actionId === potionAction.id)
    return useHealingPotion(game, stats, context, source);
  const validation = validatePlayerAction(game, actionId, stats, context);
  if (!validation.valid || !validation.action) return game;
  const action = validation.action;
  if (action.kind === "weapon-skill" && action.sourceWeaponSkillId)
    return executeWeaponSkill(
      game,
      action,
      weaponSkillById[action.sourceWeaponSkillId],
      stats,
      context,
      dependencies,
      source,
    );
  const effectId =
    actionId === "defense.guard"
      ? "effect.guarding"
      : actionId === "defense.evasive-step"
        ? "effect.evasive-step"
        : actionId === "defense.brace"
          ? "effect.braced"
          : undefined;
  if (!effectId) return game;
  const cost = getEffectivePlayerActionCost(game, action, stats, context);
  const manaCost = cost.mana;
  const staminaCost = cost.stamina;
  let next = {
    ...game,
    combat: {
      ...game.combat,
      stamina: game.combat.stamina - staminaCost,
      actionCooldowns: {
        ...game.combat.actionCooldowns,
        [action.id]: action.cooldown,
      },
      globalCooldownRemaining:
        typeof action.globalCooldown === "number"
          ? action.globalCooldown
          : action.globalCooldown === "standard"
              ? combatBalance.standardGlobalCooldown
            : 0,
    },
  };
  next = applyEffectToGame(
    next,
    effectId,
    { kind: "player" },
    { kind: "player" },
    context,
  );
  next.combat = event(next.combat, {
    text: `${action.name} activated.`,
    type: "player",
    eventType:
      source === "automation" ? "automationActionUsed" : "playerActionUsed",
    source: { kind: "player" },
    target: { kind: "player" },
    data: { actionId: action.id, manaCost },
  });
  return next;
}

function executeWeaponSkill(
  game: GameState,
  action: NonNullable<ReturnType<typeof validatePlayerAction>["action"]>,
  skill: (typeof weaponSkillById)[string] | undefined,
  stats: HunterCombatStats,
  context: CombatContext,
  dependencies: PlayerActionRuntimeDependencies,
  source: "manual" | "automation",
): GameState {
  if (!skill) return game;
  const target = game.combat.enemies.find(
    (enemy) =>
      enemy.instanceId === game.combat.selectedEnemyInstanceId &&
      !enemy.defeated,
  );
  if (!target) return game;
  const cost = getEffectivePlayerActionCost(game, action, stats, context);
  const attackerStats = getPlayerStats(
    game.combat,
    stats,
    context,
    game.progression,
  );
  let next: GameState = {
    ...game,
    combat: {
      ...game.combat,
      stamina: game.combat.stamina - cost.stamina,
      actionCooldowns: {
        ...game.combat.actionCooldowns,
        [action.id]: action.cooldown,
      },
      globalCooldownRemaining:
        typeof action.globalCooldown === "number"
          ? action.globalCooldown
          : action.globalCooldown === "standard"
            ? combatBalance.standardGlobalCooldown
            : 0,
    },
  };
  const sourceRef: CombatantRef = { kind: "player" };
  const targetRef: CombatantRef = {
    kind: "enemy",
    instanceId: target.instanceId,
  };
  next.combat = event(next.combat, {
    text: `${skill.name} used.`,
    type: "player",
    eventType:
      source === "automation" ? "automationActionUsed" : "playerActionUsed",
    source: sourceRef,
    target: targetRef,
    data: { actionId: action.id, staminaCost: cost.stamina },
  });
  const effectsToApply: Array<{
    effectId: string;
    chance: number;
    options?: {
      targetMode?: "source" | "target";
      requireHpDamage?: boolean;
      sourceProficiencyId?: CombatProficiencyId;
    };
  }> = [];
  if (skill.selfEffectId)
    effectsToApply.push({
      effectId: skill.selfEffectId,
      chance: 1,
      options: {
        targetMode: "source",
        requireHpDamage: true,
        sourceProficiencyId: skill.proficiencyId,
      },
    });
  if (skill.targetEffectId)
    effectsToApply.push({
      effectId: skill.targetEffectId,
      chance: 1,
      options: {
        targetMode: "target",
        requireHpDamage: true,
        sourceProficiencyId: skill.proficiencyId,
      },
    });
  return damageEnemy(
    next,
    target,
    {
      ...componentFromAttack("physical", 1, skill.canCrit),
      source: sourceRef,
      target: targetRef,
      sourceActionId: skill.id,
      weaponSkillId: skill.id,
      damageMultiplier: skill.damageMultiplier,
      attackerAccuracy: (attackerStats.accuracyRating ?? 0) + skill.accuracyModifier,
      cleave: skill.cleave,
      defensiveEligibility: {
        canMiss: true,
        canBeEvaded: true,
        blockable: true,
      },
      progressionSource: {
        type: "equippedWeapon",
        proficiencyEligible: true,
      },
    },
    attackerStats,
    context,
    `You use ${skill.name} on ${target.displayName}`,
    effectsToApply,
    dependencies,
  );
}

export function castSpell(
  game: GameState,
  spellId: string,
  stats: HunterCombatStats,
  context: CombatContext,
  dependencies: PlayerActionRuntimeDependencies,
  actionSource: "manual" | "automation" = "manual",
): GameState {
  const spell = context.spells[spellId] ?? spellById[spellId];
  const combat = game.combat;
  if (!spell) return game;
  const validation = validatePlayerAction(game, spellId, stats, context);
  if (!validation.valid) return game;
  const target = combat.enemies.find(
    (enemy) =>
      enemy.instanceId === combat.selectedEnemyInstanceId && !enemy.defeated,
  );
  if (spell.targetMode === "selectedEnemy" && !target) return game;
  const equipmentContext = getDefensiveEquipmentContext(game.equipment, game.inventory);
  const effectiveSpell = calculateEffectiveSpell(
    spell,
    game.progression,
    buildEffectiveSpellContext(game, spell, stats),
  );
  if (combat.mana < effectiveSpell.manaCost) return game;
  const targetRef: CombatantRef = target
    ? { kind: "enemy", instanceId: target.instanceId }
    : { kind: "player" };
  let next: GameState = {
    ...game,
    combat: {
      ...combat,
      mana: combat.mana - effectiveSpell.manaCost,
      actionCooldowns: {
        ...combat.actionCooldowns,
        [spellId]: effectiveSpell.cooldownSeconds,
      },
      globalCooldownRemaining: combatBalance.standardGlobalCooldown,
    },
  };
  next.combat = event(next.combat, {
    text: `${spell.name} used.`,
    type: "player",
    eventType:
      actionSource === "automation"
        ? "automationActionUsed"
        : "playerActionUsed",
    source: { kind: "player" },
    target: targetRef,
    data: { actionId: spellId },
  });
  const source: CombatantRef = { kind: "player" };

  const magicModifiers = getEffectiveMagicModifiers(
    next.progression,
    spell.magicProficiencyId,
    perkById,
    equipmentContext,
  );
  if (effectiveSpell.baseDamageMin > 0 && target) {
    const packet: DamagePacket = {
      ...componentFromAttack(
        spell.damageType ?? "fire",
        0,
        effectiveSpell.canCrit,
      ),
      sourceKind: "spell",
      deliveryKind: "hit",
      source,
      target: targetRef,
      sourceActionId: spell.id,
      minDamage: effectiveSpell.baseDamageMin,
      maxDamage: effectiveSpell.baseDamageMax,
      criticalStrikeMultiplier: effectiveSpell.criticalStrikeMultiplier,
      criticalStrikeChance: effectiveSpell.criticalStrikeChance,
      attackerAccuracy: getPlayerStats(next.combat, stats, context, next.progression).accuracyRating,
      minMultiplier: 1,
      maxMultiplier: 1,
      defensiveEligibility: {
        canMiss: false,
        canBeEvaded: false,
        blockable: spell.blockable ?? false,
      },
      armorPenetrationPercent: magicModifiers.spellArmorPenetrationPercent,
      armorPenetrationFlat: magicModifiers.spellArmorPenetrationFlat,
      progressionSource: {
        type: "spell",
        proficiencyId: spell.magicProficiencyId,
        proficiencyEligible: true,
      },
    };
    const effects = [
      ...(spell.applyEffects ?? []).map((applied) => ({
        ...applied,
        options: {
          sourceProficiencyId: spell.magicProficiencyId,
          progressionCredit: applied.progressionCredit
            ? {
                proficiencyId: spell.magicProficiencyId,
                mode: applied.progressionCredit,
              }
            : undefined,
          durationBonusSeconds:
            effectiveSpell.effectDurationModifiers[applied.effectId]
              ?.durationBonusSeconds,
          durationMultiplier:
            effectiveSpell.effectDurationModifiers[applied.effectId]
              ?.durationMultiplier,
          periodicPowerMultiplier:
            effectiveSpell.effectPeriodicPowerModifiers[applied.effectId],
          maxStacksBonus:
            effectiveSpell.effectMaxStacksModifiers[applied.effectId],
        },
      })),
      ...getSpellHitEffectHooks(
        next.progression,
        spell.magicProficiencyId,
        perkById,
      ).map((hook) => ({
        effectId: hook.effectId,
        chance: hook.chance,
        options: {
          sourceProficiencyId: spell.magicProficiencyId,
          secondaryOnly: hook.secondaryOnly,
          durationBonusSeconds:
            effectiveSpell.effectDurationModifiers[hook.effectId]
              ?.durationBonusSeconds,
          durationMultiplier:
            effectiveSpell.effectDurationModifiers[hook.effectId]
              ?.durationMultiplier,
          periodicPowerMultiplier:
            effectiveSpell.effectPeriodicPowerModifiers[hook.effectId],
          maxStacksBonus:
            effectiveSpell.effectMaxStacksModifiers[hook.effectId],
        },
      })),
    ];
    next = damageEnemy(
      next,
      target,
      packet,
      getPlayerStats(next.combat, stats, context, next.progression),
      context,
      `You cast ${spell.name}`,
      effects,
      dependencies,
    );
    if (next.combat.phase !== "active") return next;
  }
  for (const hook of getSpellCastEffectHooks(
    next.progression,
    spell.magicProficiencyId,
    perkById,
  )) {
    const definition = context.effects[hook.effectId];
    const hookTarget =
      definition?.beneficial ||
      definition?.kind === "buff" ||
      definition?.kind === "barrier"
        ? source
        : targetRef;
    if (hookTarget.kind === "enemy" && !target) continue;
    next = applyEffectToGame(
      next,
      hook.effectId,
      source,
      hookTarget,
      context,
      {
        sourceProficiencyId: spell.magicProficiencyId,
        durationBonusSeconds: hook.durationSeconds,
      },
    );
  }
  const castDamage = Math.max(
    0,
    next.combat.session.damageDealt - game.combat.session.damageDealt,
  );
  if (castDamage > 0 && spell.baseDamageMin > 0) {
    const manaRestore =
      castDamage * magicModifiers.damageBasedManaRestoreFraction;
    if (manaRestore > 0)
      next.combat = {
        ...next.combat,
        mana: Math.min(next.combat.maxMana, next.combat.mana + manaRestore),
      };
    const drainFraction = getSpellLifeDrainFraction(
      next.progression,
      spell.magicProficiencyId,
      perkById,
    );
    const drainedHealing = Math.min(
      next.combat.maxPlayerHp - next.combat.playerHp,
      castDamage * drainFraction,
    );
    if (drainedHealing > 0)
      next = dependencies.applyEffectiveHealing(
        next,
        spell.magicProficiencyId,
        drainedHealing,
        source,
        `${spell.name} drain`,
        false,
      );
  }
  if (effectiveSpell.healing && spell.targetMode === "self")
    next = dependencies.applyEffectiveHealing(
      next,
      spell.magicProficiencyId,
      effectiveSpell.healing.flatAmount,
      source,
      spell.name,
    );
  if (spell.cleanseTags?.length) {
    const cleansed = cleanseEffects(
      next.combat,
      source,
      { tags: spell.cleanseTags, maxEffects: spell.cleanseMaxEffects },
      context.effects,
    );
    next = { ...next, combat: cleansed.combat };
    if (cleansed.removed > 0) {
      next = awardCombatXp(
        next,
        spell.magicProficiencyId,
        calculateProficiencyXpAward({
          type: "successful-cleanse",
          weight: cleansed.removed,
        }),
      ).game;
      next.combat = event(next.combat, {
        text: `${spell.name} cleansed ${cleansed.removed} harmful effect${cleansed.removed === 1 ? "" : "s"}.`,
        type: "player",
        eventType: "effectCleansed",
        source,
        target: source,
        data: { removed: cleansed.removed },
      });
      for (const hook of getMagicCleanseHooks(
        next.progression,
        spell.magicProficiencyId,
        perkById,
      ))
        next.combat =
          hook.resource === "mana"
            ? {
                ...next.combat,
                mana: Math.min(
                  next.combat.maxMana,
                  next.combat.mana + hook.amount,
                ),
              }
            : {
                ...next.combat,
                stamina: Math.min(
                  next.combat.maxStamina,
                  next.combat.stamina + hook.amount,
                ),
              };
      for (const hook of getMagicCleanseEffectHooks(
        next.progression,
        spell.magicProficiencyId,
        perkById,
      ))
        next = applyEffectToGame(
          next,
          hook.effectId,
          source,
          source,
          context,
          {
            sourceProficiencyId: spell.magicProficiencyId,
            durationBonusSeconds: hook.durationSeconds,
          },
        );
    }
  }
  if (spell.barrierAmount !== undefined) {
    const barrierEffectId = spell.barrierEffectId ?? "effect.earth-barrier";
    const duration = effectiveSpell.effectDurationModifiers[barrierEffectId];
    next = applyEffectToGame(
      next,
      barrierEffectId,
      source,
      source,
      context,
      {
        absorbAmount: effectiveSpell.barrierAmount,
        power: effectiveSpell.barrierAmount,
        sourceProficiencyId: spell.magicProficiencyId,
        progressionCredit: {
          proficiencyId: spell.magicProficiencyId,
          mode: "barrier-absorb",
        },
        durationBonusSeconds: duration?.durationBonusSeconds,
        durationMultiplier: duration?.durationMultiplier,
      },
    );
    next = dependencies.discoverCombatProficiency(next, spell.magicProficiencyId);
  }
  return next;
}
export function useHealingPotion(
  game: GameState,
  stats: HunterCombatStats,
  context: CombatContext,
  source: "manual" | "automation" = "manual",
) {
  const validation = validatePlayerAction(
    game,
    potionAction.id,
    stats,
    context,
  );
  if (!validation.valid || game.combat.potionCooldownRemaining > 0) return game;
  const amount = Math.min(
    combatBalance.healingPotionAmount,
    (stats.maxLife ?? 0) - game.combat.playerHp,
  );
  return {
    ...game,
    inventory: removeStackableItem(game.inventory, "item.healing-potion", 1),
    combat: event(
      {
        ...game.combat,
        playerHp: game.combat.playerHp + amount,
        potionCooldownRemaining: combatBalance.potionCooldown,
        actionCooldowns: {
          ...game.combat.actionCooldowns,
          [potionAction.id]: potionAction.cooldown,
        },
        session: {
          ...game.combat.session,
          healing: game.combat.session.healing + amount,
        },
      },
      {
        text: `Healing Potion restored ${amount} HP.`,
        type: "player",
        eventType:
          source === "automation" ? "automationActionUsed" : "healingDone",
        source: { kind: "player" },
        target: { kind: "player" },
        data: { amount, actionId: potionAction.id },
      },
    ),
  };
}

