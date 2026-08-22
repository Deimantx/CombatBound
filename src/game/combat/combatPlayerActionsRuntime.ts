import { absorbDamage } from "./combatEffects";
import { applyBarrierToDamage, componentFromAttack, getDamageSourceCategory, resolveDamageWithEffectModifiers, type DamagePacket } from "./combatDamage";
import { awardCombatXp, combatEvent as event, getEnemyStats, getPlayerStats } from "./combatRuntime";
import { nextCombatRandom } from "./combatRng";
import { applyEnemyHealthDamage, applyPlayerHealthDamage } from "./combatHealth";
import { applyEffectToGame } from "./combatEffectRuntime";
import { removeStackableItem } from "../items/itemOwnership";
import { combatBalance } from "./combatBalance";
import { weaponSkillById } from "../data/weaponSkills";
import { getEffectivePlayerActionCost, potionAction, validatePlayerAction } from "./playerActions";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import { perkById } from "../data/proficiencyPerks";
import { proficiencyById } from "../data/proficiencies";
import { getMagicArt } from "../magicArts/magicArtLogic";
import { calculateMagicArtsXp } from "../magicArts/magicArtProgression";
import {
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
import { getEnemyTraitCriticalDamageResistance, getEnemyTraitIncomingDamageMultiplier, getEnemyTraitReflectionFraction, processEnemyTraitEvent, applyEnemyTraitHealthTriggers } from "../enemyTraits/enemyTraitRuntime";
import { getPlayerHealingReceivedMultiplier } from "./combatHealing";
import { consumeRiposteForBasicAttempt, equippedWeaponMechanic, observeBasicWeaponResult, prepareBasicWeaponAttempt } from "../weapons/weaponMechanicRuntime";

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
      targetMode?: "source" | "target";
      requireHpDamage?: boolean;
      durationBonusSeconds?: number;
      durationMultiplier?: number;
      periodicPowerMultiplier?: number;
      maxStacksBonus?: number;
    };
  }> = [],
  dependencies: PlayerDamageRuntimeDependencies,
) {
  const preparedWeaponAttempt = prepareBasicWeaponAttempt(game, packet);
  game = preparedWeaponAttempt.game;
  packet = preparedWeaponAttempt.packet;
  const equippedMechanic = packet.sourceActionId === "basic.weapon-attack" ? equippedWeaponMechanic(game) : null;
  const flurry = equippedMechanic?.parameters.mechanics["weapon-mechanic.dagger-flurry"];
  const comboStacks = game.combat.weaponRuntime.counters["weapon-mechanic.dagger-combo"] ?? 0;
  if (flurry && !packet.weaponSubHit && comboStacks >= (flurry.threshold ?? 5)) {
    let next: GameState = {
      ...game,
      combat: {
        ...game.combat,
        weaponRuntime: {
          ...game.combat.weaponRuntime,
          counters: { ...game.combat.weaponRuntime.counters, "weapon-mechanic.dagger-combo": 0 },
        },
      },
    };
    let successful = false;
    for (let index = 0; index < Math.max(1, Math.floor(flurry.hitCount ?? 2)); index += 1) {
      if (!next.combat.enemy || next.combat.enemy.defeated) break;
      const beforeEvent = next.combat.eventSequence;
      next = damageEnemy(next, next.combat.enemy, { ...packet, weaponSubHit: true, damageMultiplier: (packet.damageMultiplier ?? 1) * (flurry.hitDamageMultiplier ?? 0.65) }, attackerStats, context, `${prefix} with Flurry`, effectsToApply, dependencies);
      successful = successful || next.combat.events.some((entry) => entry.id > beforeEvent && entry.type !== "attackEvaded");
    }
    return {
      ...next,
      combat: {
        ...next.combat,
        weaponRuntime: {
          ...next.combat.weaponRuntime,
          counters: { ...next.combat.weaponRuntime.counters, "weapon-mechanic.dagger-combo": successful ? 1 : 0 },
        },
      },
    };
  }
  const riposteAttempt = consumeRiposteForBasicAttempt(game, packet);
  game = riposteAttempt.game;
  packet = riposteAttempt.packet;
  const current = game.combat.enemy?.instanceId === target.instanceId ? game.combat.enemy : undefined;
  if (!current || current.defeated) return game;
  const defenderStats = getEnemyStats(game.combat, current, context);
  const weaponProficiencyId =
    packet.progressionSource?.type === "equippedWeapon" &&
    packet.progressionSource.proficiencyEligible
      ? getEquippedWeaponProficiency(game.equipment, game.inventory)
      : null;
  const proficiencyId =
    packet.progressionSource?.type === "magic-art" &&
    packet.progressionSource.proficiencyEligible
      ? "magic-arts"
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
  const armorPenetrationPercent = (packet.armorPenetrationPercent ?? 0) + weaponAttack.armorPenetrationPercent;
  const armorPenetrationFlat = (packet.armorPenetrationFlat ?? 0) + weaponAttack.armorPenetrationFlat;
  let resolution = resolveDamageWithEffectModifiers(
    {
      ...packet,
      sourceCategory: getDamageSourceCategory(packet),
      incomingDamageMultiplier: (packet.incomingDamageMultiplier ?? 1) * getEnemyTraitIncomingDamageMultiplier(current, { damageType: packet.damageType, deliveryKind: packet.deliveryKind, sourceCategory: getDamageSourceCategory(packet) }, game.combat.maxPlayerHp > 0 ? game.combat.playerHp / game.combat.maxPlayerHp : 1, context.enemies, context.enemyTraits),
      criticalDamageResistance: getEnemyTraitCriticalDamageResistance(current, context.enemies, context.enemyTraits),
       damageMultiplier: (packet.damageMultiplier ?? 1) * conditionalMultiplier,
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
  next = observeBasicWeaponResult(next, packet, resolution, riposteAttempt.consumed, preparedWeaponAttempt.attempt);
  next.combat = applyEnemyTraitHealthTriggers(next.combat, current.instanceId, current.currentHealth, context);
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
  const sourceCategory = getDamageSourceCategory(packet);
  if (resolution.outcome === "hit") {
    next = processEnemyTraitEvent(next, current.instanceId, "enemy-damaged", { sourceCategory, actualDamage: effectiveHealthDamage, critical: resolution.critical, successful: true }, context);
    if (resolution.critical) next = processEnemyTraitEvent(next, current.instanceId, "enemy-critical-hit-taken", { sourceCategory, critical: true, actualDamage: effectiveHealthDamage }, context);
    if (resolution.blocked) next = processEnemyTraitEvent(next, current.instanceId, "enemy-successful-block", { sourceCategory }, context);
    const reflectionFraction = resolution.healthDamage > 0 ? getEnemyTraitReflectionFraction(current, sourceCategory, context.enemies, context.enemyTraits) : 0;
    if (reflectionFraction > 0) {
      const reflected = resolution.healthDamage * reflectionFraction;
      const reflectedBarrier = absorbDamage(next.combat, { kind: "player" }, reflected, context.effects);
      const reflectedDamage = applyPlayerHealthDamage(reflectedBarrier.combat, reflectedBarrier.remaining, context);
      next = { ...next, combat: reflectedDamage.combat };
    }
  } else if (resolution.outcome === "evaded") {
    next = processEnemyTraitEvent(next, current.instanceId, "enemy-successful-evade", { sourceCategory }, context);
  } else if (resolution.blocked) {
    next = processEnemyTraitEvent(next, current.instanceId, "enemy-successful-block", { sourceCategory }, context);
  }
  if (resolution.outcome === "hit") {
    for (const applied of effectsToApply)
      if (
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
  for (const progressionResult of progressionResults) {
    if (
      progressionResult.newProficiencyLevel >
      progressionResult.oldProficiencyLevel
    )
      next.combat = event(next.combat, {
        text: `${proficiencyById[progressionResult.proficiencyId].name} reached Proficiency Lv ${progressionResult.newProficiencyLevel}.`,
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
  if (actionId.startsWith("magic-art."))
    return castMagicArt(game, actionId, stats, context, dependencies, source);
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

/**
 * Current Magic Arts execution authority. Earth Shield deliberately has no
 * dependency on the retired Spell/Magic School modifier pipeline.
 */
export function castMagicArt(
  game: GameState,
  artId: string,
  stats: HunterCombatStats,
  context: CombatContext,
  dependencies: PlayerActionRuntimeDependencies,
  actionSource: "manual" | "automation" = "manual",
): GameState {
  const art = context.magicArts?.[artId] ?? getMagicArt(artId);
  if (!art) return game;
  const validation = validatePlayerAction(game, artId, stats, context);
  if (!validation.valid || !validation.action) return game;

  const action = validation.action;
  const cost = getEffectivePlayerActionCost(game, action, stats, context);
  if (game.combat.mana < cost.mana) return game;
  const source: CombatantRef = { kind: "player" };
  let next: GameState = {
    ...game,
    combat: {
      ...game.combat,
      mana: game.combat.mana - cost.mana,
      actionCooldowns: {
        ...game.combat.actionCooldowns,
        [art.id]: art.cooldownSeconds,
      },
      globalCooldownRemaining: combatBalance.standardGlobalCooldown,
    },
  };
  next.combat = event(next.combat, {
    text: `${art.name} used.`,
    type: "player",
    eventType: actionSource === "automation" ? "automationActionUsed" : "playerActionUsed",
    source,
    target: source,
    data: { actionId: art.id, manaCost: cost.mana },
  });

  if (art.barrier) {
    next = applyEffectToGame(next, art.barrier.effectId, source, source, context, {
      absorbAmount: art.barrier.absorbAmount,
      power: art.barrier.absorbAmount,
    });
  }
  if (art.damage) {
    const target = next.combat.enemy && !next.combat.enemy.defeated ? next.combat.enemy : undefined;
    if (target) {
      const targetRef: CombatantRef = { kind: "enemy", instanceId: target.instanceId };
      next = damageEnemy(
        next,
        target,
        {
          ...componentFromAttack(art.damage.damageType, 0, art.damage.canCrit ?? false),
          sourceKind: "magic-art",
          sourceCategory: "magic",
          source,
          target: targetRef,
          sourceActionId: art.id,
          minDamage: art.damage.min,
          maxDamage: art.damage.max,
          defensiveEligibility: { canMiss: false, canBeEvaded: false, blockable: art.damage.blockable ?? false },
          progressionSource: { type: "magic-art", proficiencyEligible: true },
        },
        getPlayerStats(next.combat, stats, context, next.progression),
        context,
        `You use ${art.name} on ${target.displayName}`,
        [],
        dependencies,
      );
    }
  }
  next = dependencies.discoverCombatProficiency(next, "magic-arts");
  const xp = calculateMagicArtsXp(cost.mana, 0);
  if (xp > 0) next = awardCombatXp(next, "magic-arts", xp).game;
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
  const target = game.combat.enemy && !game.combat.enemy.defeated ? game.combat.enemy : undefined;
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
      sourceCategory: proficiencyById[skill.proficiencyId]?.category === "ranged" ? "ranged" : "melee",
      source: sourceRef,
      target: targetRef,
      sourceActionId: skill.id,
      weaponSkillId: skill.id,
      damageMultiplier: skill.damageMultiplier,
      attackerAccuracy: (attackerStats.accuracyRating ?? 0) + skill.accuracyModifier,
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
  const engagedEnemy = game.combat.enemy && !game.combat.enemy.defeated ? game.combat.enemy : undefined;
  const healingMultiplier = getPlayerHealingReceivedMultiplier(game.combat, context, engagedEnemy);
  const missingHealth = Math.max(0, (stats.maxLife ?? 0) - game.combat.playerHp);
  const amount = Math.min(
    missingHealth,
    combatBalance.healingPotionAmount,
  ) * healingMultiplier;
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
