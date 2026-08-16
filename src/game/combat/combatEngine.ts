import { removeStackableItem } from "../items/itemOwnership";
import {
  calculateHunterCombatStats,
  type HunterCombatStats,
} from "../equipment/derivedStats";
import { stanceDefinitions } from "../data/stances";
import { techniqueDefinitions } from "../data/techniques";
import { spellById } from "../data/spells";
import { weaponSkillById } from "../data/weaponSkills";
import { effectById } from "../data/effects";
import { enemyById } from "../data/enemies";
import { combatLocationById } from "../data/world/combatLocations";
import { itemById } from "../data/items";
import { combatBalance, clamp } from "./combatBalance";
import {
  componentFromAttack,
  resolveDamage,
  applyBarrierToDamage,
  type DamagePacket,
} from "./combatDamage";
import {
  applyEffectById,
  absorbDamage,
  advanceEffectTimers,
  calculateOutgoingEffectDamageMultiplier,
  cleanseEffects,
  updateActiveEffects,
} from "./combatEffects";
import {
  awardCombatXp,
  clearEndedHuntEffects,
  clone,
  combatEvent as event,
  getEnemyStats,
  getPlayerStats,
  playerBaseStats,
  recoverOutOfCombatResources,
} from "./combatRuntime";
import { interruptAction, selectNextEnemyAction } from "./combatActions";
import { nextCombatRandom } from "./combatRng";
import { enemyActionTargets } from "./combatEnemyTargets";
import { applyEnemyHealthDamage, applyPlayerHealthDamage, type EnemyDamageApplication, type PlayerDamageApplication } from "./combatHealth";
import { applyEffectToGame, applyPlayerSuccessfulBlockHooks } from "./combatEffectRuntime";
export { applyEnemyHealthDamage, applyPlayerHealthDamage } from "./combatHealth";
import { instantiateEnemies } from "./combatState";
import { generateCombatGroup } from "./combatGroupGenerator";
import {
  firstLivingEnemy,
  livingEnemies,
  selectNextTarget,
} from "./combatTargeting";
import {
  resolveEnemyReward,
  resolveLocationClearReward,
} from "./combatRewards";
import {
  awardProficiencyXp,
  calculateProficiencyXpAward,
  discoverProficiency,
} from "../progression/proficiencyProgression";
import { masteryLevelForXp } from "../progression/masteryProgression";
import {
  getBarrierAbsorbResourceRestore,
  getEffectiveMagicModifiers,
  getMagicCleanseEffectHooks,
  getMagicCleanseHooks,
  getProficiencyXpMultiplier,
  getSpellCastEffectHooks,
  getSpellHitEffectHooks,
  getSpellHpDamageResourceHooks,
  getSpellLifeDrainFraction,
  getStanceSwitchCooldownMultiplier,
  getStanceSwitchEffectHooks,
  getSuccessfulInterruptHooks,
  getTechniqueStaminaDrainMultiplier,
  getWeaponAttackModifiers,
  getWeaponDamageMultiplier,
  getWeaponHitAdvanceHooks,
  getWeaponHitEffectHooks,
  getWeaponHitResourceHooks,
} from "../progression/perkProgression";
import { calculateEffectiveSpell } from "../progression/spellProgression";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import { perkById } from "../data/proficiencyPerks";
import { proficiencyById } from "../data/proficiencies";
import {
  calculateDefensiveTrainingAwards,
  getDefensiveEquipmentContext,
  type DefensiveTrainingEvent,
} from "../equipment/defensiveEquipment";
import { canToggleTechnique } from "../combatAbilities/combatAbilitySelectors";
import {
  evaluateAutomation,
  selectAutomationTarget,
} from "../automation/automationLogic";
import {
  buildEffectiveSpellContext,
  getEffectivePlayerActionCost,
  validatePlayerAction,
  potionAction,
} from "./playerActions";
import type { GameState } from "../gameState";
import type {
  ActiveEffectInstance,
  EffectDefinition,
} from "./combatEffectTypes";
import type {
  CombatContext,
  CombatState,
  CombatStats,
  CombatantRef,
  EnemyCombatInstance,
  StanceId,
  TechniqueId,
} from "./combatTypes";
import type {
  CombatProficiencyId,
  ProgressionCredit,
  ProgressionState,
  WeaponProficiencyId,
} from "../progression/progressionTypes";

export function createCombatContext(rng: CombatContext["rng"]): CombatContext {
  return {
    enemies: enemyById,
    locations: combatLocationById,
    spells: Object.fromEntries(
      Object.values(spellById).map((spell) => [spell.id, spell]),
    ),
    items: itemById,
    effects: effectById,
    rng,
  };
}

/** Read-only domain context for previews and editors; it contains no UI-fabricated data. */
export function createCombatPreviewContext(): CombatContext {
  return createCombatContext({ next: () => 0.5 });
}

/** Canonical defensive progression hook: invoke once after a direct enemy action resolves. */
export function resolveDefensiveTrainingForEnemyAction(
  game: GameState,
  trainingEvent: DefensiveTrainingEvent,
  items = itemById,
) {
  if (!trainingEvent.resolved) return game;
  const awards = calculateDefensiveTrainingAwards(
    getDefensiveEquipmentContext(game.equipment, game.inventory, items),
  );
  let next = game;
  for (const [proficiencyId, amount] of Object.entries(awards) as Array<
    [CombatProficiencyId, number]
  >) {
    if (amount > 0) next = awardCombatXp(next, proficiencyId, amount).game;
  }
  return next;
}

function applyEffectiveHealing(
  game: GameState,
  proficiencyId: CombatProficiencyId,
  requestedAmount: number,
  source: CombatantRef,
  label: string,
  awardProgression = true,
) {
  const effective = Math.min(
    Math.max(0, game.combat.maxPlayerHp - game.combat.playerHp),
    Math.max(0, requestedAmount),
  );
  if (effective <= 0) return game;
  let next = {
    ...game,
    combat: event(
      {
        ...game.combat,
        playerHp: game.combat.playerHp + effective,
        session: {
          ...game.combat.session,
          healing: game.combat.session.healing + effective,
        },
      },
      {
        text: `${label} restores ${effective} HP.`,
        type: "player",
        eventType: "healingDone",
        source,
        target: { kind: "player" },
        data: { amount: effective },
      },
    ),
  };
  if (awardProgression)
    next = awardCombatXp(
      next,
      proficiencyId,
      calculateProficiencyXpAward({
        type: "effective-healing",
        amount: effective,
      }),
    ).game;
  return next;
}

function discoverCombatProficiency(
  game: GameState,
  proficiencyId: CombatProficiencyId,
) {
  return game.progression.proficiencies[proficiencyId]
    ? game
    : {
        ...game,
        progression: discoverProficiency(game.progression, proficiencyId),
      };
}

function restoreBarrierResource(
  game: GameState,
  proficiencyId: CombatProficiencyId,
  absorbedAmount: number,
) {
  const resource = proficiencyId === "earth-magic" ? "stamina" : null;
  const magicProficiencyId =
    proficiencyId === "earth-magic"
      ? proficiencyId
      : undefined;
  if (!resource || !magicProficiencyId) return game;
  const restored =
    getBarrierAbsorbResourceRestore(
      game.progression,
      resource,
      perkById,
      magicProficiencyId,
    ) * absorbedAmount;
  if (restored <= 0) return game;
  return {
    ...game,
    combat: {
      ...game.combat,
      stamina: Math.min(game.combat.maxStamina, game.combat.stamina + restored),
    },
  };
}

function awardBarrierCredits(
  game: GameState,
  absorptions: Array<{
    effectId: string;
    amount: number;
    progressionCredit?: ProgressionCredit;
  }>,
) {
  let next = game;
  for (const absorption of absorptions) {
    const credit = absorption.progressionCredit;
    if (credit?.mode !== "barrier-absorb") continue;
    next = awardCombatXp(
      next,
      credit.proficiencyId,
      calculateProficiencyXpAward({
        type: "barrier-absorption",
        amount: absorption.amount,
      }),
    ).game;
    next = restoreBarrierResource(
      next,
      credit.proficiencyId,
      absorption.amount,
    );
  }
  return next;
}

export function startHunt(
  game: GameState,
  locationId: string,
  stats: HunterCombatStats,
  context: CombatContext,
): GameState {
  const location = context.locations[locationId];
  if (!location) return game;
  const group = generateCombatGroup(
    location,
    context.rng,
    masteryLevelForXp(game.progression.masteryXp),
  );
  const session = {
    ...game.combat.session,
    elapsedSeconds: 0,
    groupClears: 0,
    enemiesDefeated: 0,
    damageDealt: 0,
    damageTaken: 0,
    healing: 0,
    proficiencyXpGained: {},
    masteryXpGained: 0,
    itemsGained: 0,
    lootGained: {},
    itemInstanceIdsGained: [],
    goldGained: 0,
    highestHit: 0,
  };
  const clean = clearEndedHuntEffects(
    { ...game.combat, session },
    context.effects,
  );
  const combat = createActiveCombat(clean, locationId, group, stats, 1, false);
  return { ...game, combat };
}

/** DEV-only entry point that still uses the canonical combat instance/session setup. */
export function startDebugEncounter(
  game: GameState,
  locationId: string,
  enemyIds: string[],
  stats: HunterCombatStats,
  context: CombatContext,
): GameState {
  if (!context.locations[locationId]) return game;
  const validEnemyIds = enemyIds.filter((enemyId) => Boolean(context.enemies[enemyId])).slice(0, 12);
  if (validEnemyIds.length === 0) return game;
  const session = { ...game.combat.session, elapsedSeconds: 0, groupClears: 0, enemiesDefeated: 0, damageDealt: 0, damageTaken: 0, healing: 0, proficiencyXpGained: {}, masteryXpGained: 0, itemsGained: 0, lootGained: {}, itemInstanceIdsGained: [], goldGained: 0, highestHit: 0 };
  const clean = clearEndedHuntEffects({ ...game.combat, session }, context.effects);
  return { ...game, combat: createActiveCombat(clean, locationId, validEnemyIds, stats, Math.max(1, game.combat.groupNumber + 1), false) };
}

function createActiveCombat(
  previous: CombatState,
  locationId: string,
  enemyIds: string[],
  stats: HunterCombatStats,
  groupNumber: number,
  resetResources = false,
): CombatState {
  const enemies = instantiateEnemies(enemyIds, groupNumber);
  const base = playerBaseStats(stats);
  return {
    ...previous,
    phase: "active",
    combatLocationId: locationId,
    groupNumber,
    enemies,
    selectedEnemyInstanceId: enemies[0]?.instanceId ?? null,
    maxPlayerHp: base.maxLife ?? 0,
    playerHp: resetResources
      ? base.maxLife ?? 0
      : Math.min(previous.playerHp, base.maxLife ?? 0),
    playerAttackInterval: base.attackInterval,
    playerAttackTimer: Math.min(
      previous.playerAttackTimer,
      base.attackInterval,
    ),
    stamina: resetResources
      ? base.maxStamina
      : clamp(previous.stamina, 0, base.maxStamina),
    maxStamina: base.maxStamina,
    mana: resetResources ? base.maxMana : clamp(previous.mana, 0, base.maxMana),
    maxMana: base.maxMana,
    actionCooldowns: {},
    globalCooldownRemaining: 0,
    recoveryRemaining: 0,
    stopReason: null,
    lastDamageSource: null,
  };
}

export function selectEnemy(combat: CombatState, instanceId: string) {
  return combat.enemies.some(
    (enemy) => enemy.instanceId === instanceId && !enemy.defeated,
  )
    ? { ...combat, selectedEnemyInstanceId: instanceId }
    : combat;
}

export function setStance(
  combat: CombatState,
  stance: StanceId,
  newStats: HunterCombatStats,
  progression?: ProgressionState,
  weaponProficiencyId: WeaponProficiencyId | null = null,
) {
  if (
    combat.stance === stance ||
    (combat.phase === "active" && combat.stanceCooldownRemaining > 0)
  )
    return combat;
  const progress =
    combat.playerAttackInterval > 0
      ? 1 - combat.playerAttackTimer / combat.playerAttackInterval
      : 0;
  const active = combat.phase === "active";
  const canonical = playerBaseStats(newStats);
  let next = {
    ...combat,
    stance,
    stanceCooldownRemaining: active
      ? combatBalance.stanceSwitchCooldown *
        (progression
          ? getStanceSwitchCooldownMultiplier(
              progression,
              weaponProficiencyId,
              perkById,
            )
          : 1)
      : 0,
    playerAttackInterval: canonical.attackInterval,
    playerAttackTimer: active
      ? Math.max(0, canonical.attackInterval * (1 - progress))
      : canonical.attackInterval,
    maxPlayerHp: canonical.maxLife ?? 0,
    playerHp: Math.min(combat.playerHp, canonical.maxLife ?? 0),
    maxStamina: canonical.maxStamina,
    stamina: Math.min(combat.stamina, canonical.maxStamina),
    maxMana: canonical.maxMana,
    mana: Math.min(combat.mana, canonical.maxMana),
  };
  if (progression && active)
    for (const hook of getStanceSwitchEffectHooks(
      progression,
      weaponProficiencyId,
      perkById,
    )) {
      const result = applyEffectById(
        next,
        hook.effectId,
        effectById,
        { kind: "player" },
        { kind: "player" },
        { targetStats: playerBaseStats(newStats) },
      );
      if (result.instance) next = result.combat;
    }
  return next;
}

export function toggleTechnique(game: GameState, technique: TechniqueId) {
  if (!canToggleTechnique(game, technique)) return game;
  return {
    ...game,
    combat: {
      ...game.combat,
      techniques: {
        ...game.combat.techniques,
        [technique]: !game.combat.techniques[technique],
      },
    },
  };
}

export function executePlayerAction(
  game: GameState,
  actionId: string,
  stats: HunterCombatStats,
  context: CombatContext,
  source: "manual" | "automation" = "manual",
): GameState {
  if (actionId.startsWith("spell."))
    return castSpell(game, actionId, stats, context, source);
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
    getPlayerStats(next.combat, stats, context, next.progression),
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
  );
}

export function castSpell(
  game: GameState,
  spellId: string,
  stats: HunterCombatStats,
  context: CombatContext,
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
    buildEffectiveSpellContext(game, spell),
  );
  if (combat.mana < effectiveSpell.manaCost) return game;
  const targetRef: CombatantRef = target
    ? { kind: "enemy", instanceId: target.instanceId }
    : { kind: "player" };
  const interruptActionDefinition =
    spell.interruptsAction && target?.currentAction
      ? context.enemies[target.enemyId]?.actions.find(
          (candidate) => candidate.id === target.currentAction?.actionId,
        )
      : undefined;
  const interruptResult = spell.interruptsAction
    ? interruptAction(target?.currentAction ?? null, interruptActionDefinition)
    : null;
  if (spell.interruptsAction && !interruptResult?.interrupted) return game;

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
      criticalDamageMultiplier: effectiveSpell.criticalDamageMultiplier,
      criticalBaseChance: effectiveSpell.criticalBaseChance,
      criticalChanceBonus: effectiveSpell.criticalChanceBonus,
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
    const hookStats =
      hookTarget.kind === "player"
        ? getPlayerStats(next.combat, stats, context, next.progression)
        : getEnemyStats(next.combat, target as EnemyCombatInstance, context);
    next = applyEffectToGame(
      next,
      hook.effectId,
      source,
      hookTarget,
      hookStats,
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
      next = applyEffectiveHealing(
        next,
        spell.magicProficiencyId,
        drainedHealing,
        source,
        `${spell.name} drain`,
        false,
      );
  }
  if (effectiveSpell.healing && spell.targetMode === "self")
    next = applyEffectiveHealing(
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
          getPlayerStats(next.combat, stats, context, next.progression),
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
      getPlayerStats(next.combat, stats, context, next.progression),
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
    next = discoverCombatProficiency(next, spell.magicProficiencyId);
  }
  if (spell.interruptsAction && target) {
    const action = interruptActionDefinition;
    const hooks = getSuccessfulInterruptHooks(
      next.progression,
      perkById,
      spell.magicProficiencyId,
    );
    const danger = action?.danger ?? "low";
    const baseXp = calculateProficiencyXpAward({
      type: "successful-interrupt",
      danger,
    });
    const xp =
      baseXp *
      getProficiencyXpMultiplier(
        next.progression,
        spell.magicProficiencyId,
        "successful-interrupt",
        perkById,
      );
    const awarded = awardCombatXp(next, spell.magicProficiencyId, xp);
    next = awarded.game;
    next.combat = {
      ...next.combat,
      enemies: next.combat.enemies.map((enemy) =>
        enemy.instanceId === target.instanceId
          ? {
              ...enemy,
              currentAction: null,
              actionCooldowns: {
                ...enemy.actionCooldowns,
                [action?.id ?? ""]:
                  (interruptResult?.cooldownSeconds ?? 0) *
                  hooks.cooldownMultiplier,
              },
            }
          : enemy,
      ),
    };
    next.combat = event(next.combat, {
      text: `${spell.name} interrupts ${target.displayName}'s ${action?.name ?? "action"}.`,
      type: "player",
      eventType: "actionInterrupted",
      source,
      target: targetRef,
      data: { proficiencyXp: awarded.result?.proficiencyXpGained ?? 0 },
    });
    if (hooks.restoreMana > 0)
      next.combat = {
        ...next.combat,
        mana: Math.min(
          next.combat.maxMana,
          next.combat.mana + hooks.restoreMana,
        ),
      };
    if (hooks.restoreStamina > 0)
      next.combat = {
        ...next.combat,
        stamina: Math.min(
          next.combat.maxStamina,
          next.combat.stamina + hooks.restoreStamina,
        ),
      };
    if (hooks.refundManaFraction > 0)
      next.combat = {
        ...next.combat,
        mana: Math.min(
          next.combat.maxMana,
          next.combat.mana + effectiveSpell.manaCost * hooks.refundManaFraction,
        ),
      };
    if (hooks.barrierAmount > 0)
      next = applyEffectToGame(
        next,
        "effect.disruptive-shield",
        source,
        source,
        getPlayerStats(next.combat, stats, context, next.progression),
        context,
        {
          absorbAmount: hooks.barrierAmount,
          power: hooks.barrierAmount,
          sourceProficiencyId: spell.magicProficiencyId,
          durationBonusSeconds: 0,
          durationMultiplier: 1,
        },
      );
    for (const hook of hooks.statEffects)
      next = applyEffectToGame(
        next,
        hook.effectId,
        source,
        source,
        getPlayerStats(next.combat, stats, context, next.progression),
        context,
        {
          sourceProficiencyId: spell.magicProficiencyId,
          durationBonusSeconds: hook.durationSeconds,
        },
      );
    if (
      hooks.reduceSpellCooldownFraction > 0 ||
      hooks.reduceSpellCooldownSeconds > 0
    )
      next.combat = {
        ...next.combat,
        actionCooldowns: {
          ...next.combat.actionCooldowns,
          [spellId]: Math.max(
            0,
            (next.combat.actionCooldowns[spellId] ?? 0) *
              (1 - hooks.reduceSpellCooldownFraction) -
              hooks.reduceSpellCooldownSeconds,
          ),
        },
      };
    for (const hook of hooks.effects) {
      const hookTarget =
        hook.effectId === "effect.disruptive-shield" ? source : targetRef;
      const hookStats =
        hookTarget.kind === "player"
          ? getPlayerStats(next.combat, stats, context, next.progression)
          : getEnemyStats(next.combat, target, context);
      next = applyEffectToGame(
        next,
        hook.effectId,
        source,
        hookTarget,
        hookStats,
        context,
        {
          sourceProficiencyId: spell.magicProficiencyId,
          durationMultiplier: hook.durationMultiplier,
        },
      );
    }
  }
  return next;
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
  next = awardBarrierCredits(next, barrierResult.absorptions);
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

function damageEnemy(
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
          game.combat.stance,
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
  const outgoingEffectMultiplier = packet.source.kind === "player"
    ? calculateOutgoingEffectDamageMultiplier(game.combat.playerEffects, context.effects, packet)
    : 1;
  let resolution = resolveDamage(
    {
      ...packet,
      damageMultiplier:
        (packet.damageMultiplier ?? 1) *
        conditionalMultiplier *
        outgoingEffectMultiplier *
        (isSecondary ? secondaryFraction : 1),
      armorPenetrationPercent,
      armorPenetrationFlat,
    },
    attackerStats,
    defenderStats,
    context.rng,
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
    next = restoreBarrierResource(
      next,
      credit.proficiencyId,
      absorption.amount,
    );
  }
  const message =
    resolution.outcome === "hit" || resolution.outcome === "block"
      ? `${prefix} for ${resolution.healthDamage} damage${resolution.critical ? " critical" : ""}${resolution.barrierAbsorbed > 0 ? ` (${resolution.barrierAbsorbed} absorbed)` : ""}.`
      : `${prefix} ${resolution.outcome}s against ${current.displayName}.`;
  const eventType = resolution.outcome === "evaded"
    ? "attackEvaded"
    : resolution.outcome === "block"
      ? "attackBlocked"
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
      critical: resolution.critical,
      absorbed: resolution.barrierAbsorbed,
      requestedDamage: damageApplication.requestedDamage,
      appliedDamage: damageApplication.appliedDamage,
      immortalPrevented: damageApplication.preventedLethalDamage,
    },
  });
  if (resolution.outcome === "hit" || resolution.outcome === "block") {
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
        const effectTargetStats =
          effectTarget.kind === "player" ? attackerStats : defenderStats;
        next = applyEffectToGame(
          next,
          applied.effectId,
          packet.source,
          effectTarget,
          effectTargetStats,
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
            defenderStats,
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
    (resolution.outcome === "hit" || resolution.outcome === "block")
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
        false,
        true,
      );
    }
  }
  if (
    allowSecondary &&
    packet.cleave &&
    effectiveHealthDamage > 0 &&
    (resolution.outcome === "hit" || resolution.outcome === "block")
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
  return resolveDefeatedEnemies(next, context);
}

export function useHealingPotion(
  game: GameState,
  stats: HunterCombatStats,
  context: CombatContext = createCombatContext({ next: () => Math.random() }),
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

export function advanceCombat(
  input: GameState,
  deltaSeconds: number,
  context: CombatContext,
  stats: HunterCombatStats,
): GameState {
  let game = clone(input);
  let remaining = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0);
  while (remaining > 0) {
    const step = Math.min(remaining, combatBalance.maxSimulationStepSeconds);
    game = advanceStep(game, step, context, stats);
    remaining -= step;
  }
  return game;
}

function advanceStep(
  game: GameState,
  step: number,
  context: CombatContext,
  stats: HunterCombatStats,
): GameState {
  let combat = game.combat;
  if (combat.phase === "recovery") {
    game = advanceCombatEffects(game, step, context, stats);
    combat = game.combat;
    const effective = getPlayerStats(combat, stats, context, game.progression);
    combat = {
      ...recoverOutOfCombatResources(combat, effective, step),
      recoveryRemaining: combat.recoveryRemaining - step,
      session: {
        ...combat.session,
        elapsedSeconds: combat.session.elapsedSeconds + step,
      },
    };
    if (
      combat.recoveryRemaining <= 0 &&
      combat.combatLocationId &&
      combat.playerHp / Math.max(1, effective.maxLife ?? 0) >= combatBalance.safetyStopThreshold
    ) {
      const location = context.locations[combat.combatLocationId];
      const group = location
        ? generateCombatGroup(
            location,
            context.rng,
            masteryLevelForXp(game.progression.masteryXp),
          )
        : [];
      combat =
        location && group.length > 0
          ? createActiveCombat(
              combat,
              location.id,
              group,
              stats,
              combat.groupNumber + 1,
            )
          : { ...combat, phase: "stopped", stopReason: "completed" };
    } else if (combat.recoveryRemaining <= 0)
      combat = { ...combat, phase: "stopped", stopReason: "safety" };
    return { ...game, combat };
  }
  if (combat.phase === "inactive" || combat.phase === "stopped") {
    const effective = getPlayerStats(combat, stats, context, game.progression);
    return {
      ...game,
      combat: recoverOutOfCombatResources(combat, effective, step),
    };
  }
  if (combat.phase !== "active") return game;
  combat = {
    ...combat,
    session: {
      ...combat.session,
      elapsedSeconds: combat.session.elapsedSeconds + step,
    },
    stanceCooldownRemaining: Math.max(0, combat.stanceCooldownRemaining - step),
    potionCooldownRemaining: Math.max(0, combat.potionCooldownRemaining - step),
    globalCooldownRemaining: Math.max(0, combat.globalCooldownRemaining - step),
    playerAttackTimer: combat.playerAttackTimer - step,
    stamina: clamp(
      combat.stamina +
        staminaDelta(
          combat,
          stats,
          context,
          game.progression,
          getEquippedWeaponProficiency(game.equipment, game.inventory),
        ) *
          step,
      0,
      combat.maxStamina,
    ),
    mana: clamp(
      combat.mana +
        (getPlayerStats(combat, stats, context, game.progression).manaRegenFlat ?? 0) *
          step,
      0,
      combat.maxMana,
    ),
    actionCooldowns: Object.fromEntries(
      Object.entries(combat.actionCooldowns).map(([id, remaining]) => [
        id,
        Math.max(0, remaining - step),
      ]),
    ),
  };
  game = { ...game, combat };
  game = advanceCombatEffects(game, step, context, stats);
  combat = game.combat;
  if (combat.phase !== "active") return game;
  const effective = getPlayerStats(combat, stats, context, game.progression);
  const requestedRegen = Math.max(0, effective.lifeRegenFlat ?? 0) * step;
  const effectiveHealing = Math.min(
    Math.max(0, (effective.maxLife ?? 0) - combat.playerHp),
    requestedRegen,
  );
  combat = {
    ...combat,
    maxPlayerHp: effective.maxLife ?? 0,
    playerHp: combat.playerHp + effectiveHealing,
    session:
      effectiveHealing > 0
        ? {
            ...combat.session,
            healing: combat.session.healing + effectiveHealing,
          }
        : combat.session,
  };
  game = { ...game, combat };
  if (
    combat.stamina <= 0 &&
    (combat.techniques["careful-positioning"] ||
      combat.techniques["heightened-reflexes"])
  ) {
    combat = event(
      {
        ...combat,
        stamina: 0,
        techniques: {
          "careful-positioning": false,
          "heightened-reflexes": false,
        },
      },
      { text: "Techniques deactivated: Stamina depleted.", type: "system" },
    );
  }
  game = advanceEnemySpecials(
    { ...game, combat },
    step,
    context,
    stats,
    "start",
  );
  combat = game.combat;
  if (combat.phase !== "active") return game;
  const automationTarget = game.combatAutomation.overrideManualTarget
    ? selectAutomationTarget(game, context)
    : undefined;
  if (
    automationTarget &&
    automationTarget.instanceId !== combat.selectedEnemyInstanceId
  ) {
    combat = {
      ...combat,
      selectedEnemyInstanceId: automationTarget.instanceId,
    };
    game = { ...game, combat };
  }
  const decision = evaluateAutomation(game, stats, context, context.debugHooks?.onAutomationTrace);
  if (decision.actionId) {
    const beforeGame = game;
    const executed = executePlayerAction(
      game,
      decision.actionId,
      stats,
      context,
      "automation",
    );
    const actionExecuted =
      executed !== beforeGame || executed.combat !== beforeGame.combat;
    game = executed;
    combat = game.combat;
    if (actionExecuted) {
      game = {
        ...game,
        combat: {
          ...game.combat,
          lastAutomationAction: {
            actionId: decision.actionId,
            elapsedSeconds: game.combat.session.elapsedSeconds,
          },
          lastAutomationFailure: undefined,
        },
      };
      combat = game.combat;
    }
  } else if (decision.invalid) {
    game = {
      ...game,
      combat: {
        ...game.combat,
        lastAutomationFailure: decision.invalid.reason,
      },
    };
  }
  game = advanceEnemySpecials(game, step, context, stats, "advance");
  combat = game.combat;
  if (combat.phase !== "active") return game;
  if (combat.playerAttackTimer <= 0) {
    const target =
      combat.enemies.find(
        (enemy) =>
          enemy.instanceId === combat.selectedEnemyInstanceId &&
          !enemy.defeated,
      ) ?? firstLivingEnemy(combat.enemies);
    if (target) {
      combat = {
        ...combat,
        playerAttackTimer: Math.max(
          combatBalance.minimumAttackInterval,
          effective.attackInterval,
        ),
      };
      const packet: DamagePacket = {
        ...componentFromAttack("physical", 1, true),
        source: { kind: "player" },
        target: { kind: "enemy", instanceId: target.instanceId },
        defensiveEligibility: {
          canMiss: true,
          canBeEvaded: true,
          blockable: true,
        },
        progressionSource: {
          type: "equippedWeapon",
          proficiencyEligible: true,
        },
      };
      game = damageEnemy(
        { ...game, combat },
        target,
        packet,
        effective,
        context,
        `You hit ${target.displayName}`,
      );
      combat = game.combat;
    }
  }
  game = resolveDefeatedEnemies({ ...game, combat }, context);
  combat = game.combat;
  if (combat.phase !== "active") return game;
  for (const enemy of combat.enemies) {
    if (enemy.defeated) continue;
    const current = combat.enemies.find(
      (candidate) => candidate.instanceId === enemy.instanceId,
    );
    if (!current || current.defeated) continue;
    const definition = context.enemies[current.enemyId];
    if (current.currentAction) continue;
    const updatedTimer = current.attackTimer - step;
    combat = {
      ...combat,
      enemies: combat.enemies.map((candidate) =>
        candidate.instanceId === current.instanceId
          ? { ...candidate, attackTimer: updatedTimer }
          : candidate,
      ),
    };
    if (updatedTimer <= 0) {
      const playerStats = getPlayerStats(
        combat,
        stats,
        context,
        game.progression,
      );
      const packet: DamagePacket = {
        ...componentFromAttack("physical", 1, true),
        source: { kind: "enemy", instanceId: current.instanceId },
        target: { kind: "player" },
        defensiveEligibility: {
          canMiss: true,
          canBeEvaded: true,
          blockable: true,
        },
      };
      const enemyStats = getEnemyStats(combat, current, context);
      const result = resolveDamage(
        packet,
        enemyStats,
        playerStats,
        context.rng,
      );
      const barrierResult = packet.ignoresBarrier
        ? {
            combat,
            absorbed: 0,
            remaining: result.mitigatedDamage,
            absorptions: [] as Array<{
              effectId: string;
              amount: number;
              progressionCredit?: ProgressionCredit;
            }>,
          }
        : absorbDamage(
            combat,
            packet.target,
            result.mitigatedDamage,
            context.effects,
          );
      let resolved = applyBarrierToDamage(result, barrierResult.absorbed);
      game = awardBarrierCredits(
        { ...game, combat: barrierResult.combat },
        barrierResult.absorptions,
      );
      const playerDamage = applyPlayerHealthDamage(game.combat, resolved.healthDamage, context);
      combat = {
        ...playerDamage.combat,
        enemies: game.combat.enemies,
        lastDamageSource: definition.name,
      };
      resolved = { ...resolved, healthDamage: playerDamage.appliedDamage };
      combat = {
        ...combat,
        enemies: combat.enemies.map((candidate) =>
          candidate.instanceId === current.instanceId
            ? { ...candidate, attackTimer: Math.max(combatBalance.minimumAttackInterval, enemyStats.attackInterval) }
            : candidate,
      ),
      };
      if (resolved.outcome === "block") {
        game = applyPlayerSuccessfulBlockHooks({ ...game, combat }, playerStats, context);
        combat = game.combat;
      }
      game = resolveDefensiveTrainingForEnemyAction(
        { ...game, combat },
        { source: "enemy-normal-attack", resolved: true },
        context.items,
      );
      combat = game.combat;
      const message =
        resolved.outcome === "hit" || resolved.outcome === "block"
          ? `${current.displayName} hits you for ${resolved.healthDamage}${resolved.barrierAbsorbed > 0 ? ` (${resolved.barrierAbsorbed} absorbed)` : ""}.`
          : `${current.displayName} ${resolved.outcome}s your attack.`;
      const type = resolved.outcome === "evaded"
        ? "attackEvaded"
        : resolved.outcome === "block"
          ? "attackBlocked"
          : "damageDealt";
      combat = event(combat, {
        text: message,
        type: "enemy",
        eventType: type,
        source: packet.source,
        target: packet.target,
        data: {
          damage: resolved.healthDamage,
          absorbed: resolved.barrierAbsorbed,
          requestedDamage: playerDamage.requestedDamage,
          appliedDamage: playerDamage.appliedDamage,
          immortalPrevented: playerDamage.preventedLethalDamage,
        },
      });
      if (combat.playerHp <= 0)
        return {
          ...game,
          combat: event(
            { ...combat, phase: "defeat", stopReason: "defeat" },
            {
              text: `Defeated by ${definition.name}.`,
              type: "system",
              eventType: "combatantDefeated",
              target: { kind: "player" },
            },
          ),
        };
    }
  }
  return { ...game, combat };
}

function staminaDelta(
  combat: CombatState,
  stats: HunterCombatStats,
  context: CombatContext,
  progression: ProgressionState,
  weaponProficiencyId: WeaponProficiencyId | null,
) {
  const stance = stanceDefinitions[combat.stance];
  const drain =
    Object.entries(combat.techniques).reduce(
      (sum, [id, active]) =>
        sum +
        (active
          ? techniqueDefinitions[id as TechniqueId].staminaDrainPerSecond
          : 0),
      0,
    ) * stance.staminaDrainMultiplier;
  return (
    getPlayerStats(combat, stats, context, progression).staminaRegen -
    drain *
      getTechniqueStaminaDrainMultiplier(
        progression,
        weaponProficiencyId,
        perkById,
      )
  );
}

function advanceCombatEffects(
  game: GameState,
  step: number,
  context: CombatContext,
  stats: HunterCombatStats,
): GameState {
  let combat = game.combat;
  const playerTimers = advanceEffectTimers(
    combat.playerEffects,
    step,
    context.effects,
    combat.playerHp > 0,
  );
  combat = updateActiveEffects(
    combat,
    { kind: "player" },
    playerTimers.effects,
  );
  for (const expired of playerTimers.expired)
    combat = event(combat, {
      text: `${context.effects[expired.effectId]?.name ?? expired.effectId} expired.`,
      type: "system",
      eventType: "effectExpired",
      target: expired.target,
      data: { effectId: expired.effectId },
    });
  let next: GameState = { ...game, combat };
  for (const tick of playerTimers.ticks)
    next = resolvePeriodicEffect(
      next,
      tick.effect,
      tick.definition,
      stats,
      context,
    );

  for (const enemy of next.combat.enemies) {
    if (enemy.defeated) continue;
    const timers = advanceEffectTimers(
      enemy.effects,
      step,
      context.effects,
      enemy.currentHealth > 0,
    );
    next.combat = updateActiveEffects(
      next.combat,
      { kind: "enemy", instanceId: enemy.instanceId },
      timers.effects,
    );
    for (const expired of timers.expired)
      next.combat = event(next.combat, {
        text: `${context.effects[expired.effectId]?.name ?? expired.effectId} expired on ${enemy.displayName}.`,
        type: "system",
        eventType: "effectExpired",
        target: expired.target,
        data: { effectId: expired.effectId },
      });
    for (const tick of timers.ticks)
      next = resolvePeriodicEffect(
        next,
        tick.effect,
        tick.definition,
        stats,
        context,
      );
  }
  return resolveDefeatedEnemies(next, context);
}

function resolvePeriodicEffect(
  game: GameState,
  effect: ActiveEffectInstance,
  definition: EffectDefinition,
  stats: HunterCombatStats,
  context: CombatContext,
): GameState {
  if (!definition.periodic) return game;
  const operation = definition.periodic.operation;
  if (operation.type === "heal") {
    const amount = Math.max(0, operation.baseAmount * effect.stacks);
    if (effect.target.kind === "player") {
      const effective = getPlayerStats(
        game.combat,
        stats,
        context,
        game.progression,
      );
      const healed = Math.min(
        (effective.maxLife ?? 0) - game.combat.playerHp,
        amount,
      );
      if (healed > 0 && effect.sourceProficiencyId)
        return applyEffectiveHealing(
          game,
          effect.sourceProficiencyId,
          healed,
          effect.source,
          "Regeneration",
        );
      return {
        ...game,
        combat: event(
          {
            ...game.combat,
            playerHp: game.combat.playerHp + healed,
            session: {
              ...game.combat.session,
              healing: game.combat.session.healing + healed,
            },
          },
          {
            text: `Regeneration restores ${healed} HP.`,
            type: "system",
            eventType: "healingDone",
            target: effect.target,
            data: { amount: healed },
          },
        ),
      };
    }
    return game;
  }
  const targetId =
    effect.target.kind === "enemy" ? effect.target.instanceId : undefined;
  const target = targetId
    ? game.combat.enemies.find((enemy) => enemy.instanceId === targetId)
    : undefined;
  if (effect.target.kind === "enemy" && (!target || target.defeated))
    return game;
  const attacker =
    effect.source.kind === "player"
      ? getPlayerStats(game.combat, stats, context, game.progression)
      : target
        ? getEnemyStats(game.combat, target, context)
        : playerBaseStats(stats);
  const defender =
    effect.target.kind === "player"
      ? getPlayerStats(game.combat, stats, context, game.progression)
      : target
        ? getEnemyStats(game.combat, target, context)
        : playerBaseStats(stats);
  const packet: DamagePacket = {
    ...componentFromAttack(operation.damageType, 0, operation.canCrit ?? false),
    sourceKind: effect.source.kind === "player" ? "spell" : "secondary",
    deliveryKind: "damage-over-time",
    source: effect.source,
    target: effect.target,
    baseDamage:
      operation.baseAmount *
      effect.stacks *
      (effect.snapshot?.periodicPowerMultiplier ?? 1),
    minMultiplier: 1,
    maxMultiplier: 1,
    ignoresArmour: operation.damageType === "physical",
    defensiveEligibility: {
      canMiss: false,
      canBeEvaded: false,
      blockable: false,
    },
  };
  const result = resolveDamage(packet, attacker, defender, context.rng);
  const barrierResult = absorbDamage(
    game.combat,
    effect.target,
    result.mitigatedDamage,
    context.effects,
  );
  let resolved = applyBarrierToDamage(result, barrierResult.absorbed);
  let next = { ...game, combat: barrierResult.combat };
  let playerDamage: PlayerDamageApplication | null = null;
  let enemyDamage: EnemyDamageApplication | null = null;
  if (effect.target.kind === "enemy" && target) {
    enemyDamage = applyEnemyHealthDamage(
      next.combat,
      target.instanceId,
      resolved.healthDamage,
      context,
    );
    next.combat = enemyDamage.combat;
    resolved = {
      ...resolved,
      healthDamage: enemyDamage.appliedDamage,
      targetDied: enemyDamage.targetDied,
    };
    if (
      effect.progressionCredit?.mode === "hp-damage" &&
      enemyDamage.appliedDamage > 0
    )
      next = awardCombatXp(
        next,
        effect.progressionCredit.proficiencyId,
        calculateProficiencyXpAward({
          type: "effective-hp-damage",
          amount: enemyDamage.appliedDamage,
        }),
      ).game;
  } else if (effect.target.kind === "player") {
    playerDamage = applyPlayerHealthDamage(next.combat, resolved.healthDamage, context);
    resolved = { ...resolved, healthDamage: playerDamage.appliedDamage };
    next = { ...next, combat: playerDamage.combat };
  }
  for (const absorption of barrierResult.absorptions) {
    if (absorption.progressionCredit?.mode !== "barrier-absorb") continue;
    next = awardCombatXp(
      next,
      absorption.progressionCredit.proficiencyId,
      calculateProficiencyXpAward({
        type: "barrier-absorption",
        amount: absorption.amount,
      }),
    ).game;
    next = restoreBarrierResource(
      next,
      absorption.progressionCredit.proficiencyId,
      absorption.amount,
    );
  }
  next.combat = event(next.combat, {
    text: `${definition.name} deals ${resolved.healthDamage} damage${resolved.barrierAbsorbed > 0 ? ` (${resolved.barrierAbsorbed} absorbed)` : ""}.`,
    type: effect.source.kind === "player" ? "player" : "enemy",
    eventType: "effectTicked",
    source: effect.source,
    target: effect.target,
    data: {
      effectId: effect.effectId,
      damage: resolved.healthDamage,
      absorbed: resolved.barrierAbsorbed,
      requestedDamage: playerDamage?.requestedDamage ?? enemyDamage?.requestedDamage ?? resolved.healthDamage,
      appliedDamage: playerDamage?.appliedDamage ?? enemyDamage?.appliedDamage ?? resolved.healthDamage,
      immortalPrevented: playerDamage?.preventedLethalDamage ?? enemyDamage?.preventedLethalDamage ?? 0,
    },
  });
  return next;
}

function advanceEnemySpecials(
  game: GameState,
  step: number,
  context: CombatContext,
  stats: HunterCombatStats,
  mode: "both" | "start" | "advance" = "both",
): GameState {
  let combat = game.combat;
  const startedThisStep = combat.enemyActionsStartedThisStep ?? [];
  for (const enemy of [...combat.enemies]) {
    if (enemy.defeated) continue;
    const definition = context.enemies[enemy.enemyId];
    let current =
      combat.enemies.find(
        (candidate) => candidate.instanceId === enemy.instanceId,
      ) ?? enemy;
    const source: CombatantRef = {
      kind: "enemy",
      instanceId: current.instanceId,
    };
    const phases = [...(definition.phases ?? [])].sort(
      (a, b) => b.hpThreshold - a.hpThreshold,
    );
    const currentPhaseIndex = current.phaseId
      ? phases.findIndex((candidate) => candidate.phaseId === current.phaseId)
      : -1;
    const desiredPhaseIndex = phases.reduce(
      (deepest, candidate, index) =>
        current.currentHealth / Math.max(1, current.maxHealth) <=
          candidate.hpThreshold
          ? index
          : deepest,
      -1,
    );
    const phase =
      desiredPhaseIndex > currentPhaseIndex
        ? phases[desiredPhaseIndex]
        : undefined;
    if (phase) {
      current = {
        ...current,
        phaseId: phase.phaseId,
        phaseStatModifiers: phase.statModifiers ?? [],
      };
      combat = event(combat, {
        text: current.displayName + " enters " + phase.phaseId + ".",
        type: "enemy",
        eventType: "enemyPhaseChanged",
        source,
        target: source,
        data: { phaseId: phase.phaseId },
      });
      game = { ...game, combat };
      for (const effectId of phase.onEnterEffectIds ?? [])
        game = applyEffectToGame(
          game,
          effectId,
          source,
          source,
          getEnemyStats(game.combat, current, context),
          context,
        );
      combat = game.combat;
    }
    const actionDefinition = current.currentAction
      ? definition.actions.find(
          (action) => action.id === current.currentAction?.actionId,
        )
      : undefined;
    if (current.currentAction && !actionDefinition) {
      current = { ...current, currentAction: null };
    } else if (
      current.currentAction &&
      actionDefinition &&
      mode !== "start" &&
      !(mode === "advance" && startedThisStep.includes(current.instanceId))
    ) {
      const action = {
        ...current.currentAction,
        remainingSeconds: current.currentAction.remainingSeconds - step,
      };
      current = { ...current, currentAction: action };
      if (action.remainingSeconds <= 0) {
        const playerStats = getPlayerStats(
          combat,
          stats,
          context,
          game.progression,
        );
        const enemyStats = getEnemyStats(combat, current, context);
        const actionTargets = enemyActionTargets(
          actionDefinition,
          current,
          combat,
          context.rng,
        );
        const components = actionDefinition.damage?.length
          ? actionDefinition.damage
          : [
              componentFromAttack(
                "physical",
                actionDefinition.damageMultiplier,
                true,
              ),
            ];
        let totalDamage = 0;
        let totalAbsorbed = 0;
        let requestedDamage = 0;
        let lastOutcome: string = "hit";
        let playerBlockedAction = false;
        for (const component of components) {
          const packet: DamagePacket = {
            ...component,
            source,
            target: { kind: "player" },
            defensiveEligibility: {
              canMiss: true,
              canBeEvaded: true,
              blockable: actionDefinition.blockable,
            },
          };
          const result = resolveDamage(
            packet,
            enemyStats,
            playerStats,
            context.rng,
          );
          const barrierResult = absorbDamage(
            combat,
            packet.target,
            result.mitigatedDamage,
            context.effects,
          );
          const resolved = applyBarrierToDamage(result, barrierResult.absorbed);
          requestedDamage += resolved.healthDamage;
          game = awardBarrierCredits(
            { ...game, combat: barrierResult.combat },
            barrierResult.absorptions,
          );
          const playerDamage = applyPlayerHealthDamage(
            game.combat,
            resolved.healthDamage,
            context,
          );
          const appliedResolved = {
            ...resolved,
            healthDamage: playerDamage.appliedDamage,
          };
          totalDamage += appliedResolved.healthDamage;
          totalAbsorbed += appliedResolved.barrierAbsorbed;
          lastOutcome = result.outcome;
          playerBlockedAction = playerBlockedAction || result.outcome === "block";
          combat = {
            ...playerDamage.combat,
            lastDamageSource: definition.name,
          };
        }
        current = {
          ...current,
          currentAction: null,
          actionCooldowns: {
            ...current.actionCooldowns,
            [actionDefinition.id]: Math.max(
              0,
              actionDefinition.cooldownSeconds,
            ),
          },
        };
        combat = {
          ...combat,
          enemies: combat.enemies.map((candidate) =>
            candidate.instanceId === current.instanceId ? current : candidate,
          ),
        };
        if (playerBlockedAction) {
          game = applyPlayerSuccessfulBlockHooks({ ...game, combat }, playerStats, context);
          combat = game.combat;
        }
        game = resolveDefensiveTrainingForEnemyAction(
          { ...game, combat },
          { source: "enemy-direct-action", resolved: true },
          context.items,
        );
        combat = event(game.combat, {
          text: `${current.displayName} resolves ${actionDefinition.name}: ${lastOutcome}${totalDamage > 0 ? ` for ${totalDamage} damage` : ""}.`,
          type: "enemy",
          eventType: "actionResolved",
          source,
          target: { kind: "player" },
          data: {
            damage: totalDamage,
            absorbed: totalAbsorbed,
            components: components.length,
            requestedDamage,
            appliedDamage: totalDamage,
            immortalPrevented: Math.max(0, requestedDamage - totalDamage),
          },
        });
        game = { ...game, combat };
        if (
          (lastOutcome === "hit" || lastOutcome === "block") &&
          actionDefinition.applyEffects
        )
          for (const applied of actionDefinition.applyEffects)
            if (applied.chance >= 1 || nextCombatRandom(context.rng, "effect") < applied.chance)
              game = applyEffectToGame(
                game,
                applied.effectId,
                source,
                { kind: "player" },
                playerStats,
                context,
              );
        combat = game.combat;
        if (
          actionDefinition.healing &&
          actionTargets.some((target) => target.kind === "player")
        ) {
          game = applyEffectiveHealing(
            game,
            "water-magic",
            Math.max(0, actionDefinition.healing),
            source,
            actionDefinition.name,
            false,
          );
          combat = game.combat;
        }
        if (
          actionDefinition.healing &&
          actionTargets.some(
            (target) =>
              target.kind === "enemy" &&
              target.instanceId !== current.instanceId,
          )
        )
          for (const healingTarget of actionTargets) {
            if (healingTarget.kind !== "enemy") continue;
            const ally = combat.enemies.find(
              (candidate) => candidate.instanceId === healingTarget.instanceId,
            );
            if (!ally || ally.defeated) continue;
            const healed = Math.min(
              ally.maxHealth - ally.currentHealth,
              Math.max(0, actionDefinition.healing),
            );
            if (healed <= 0) continue;
            combat = {
              ...combat,
              enemies: combat.enemies.map((candidate) =>
                candidate.instanceId === ally.instanceId
                  ? {
                      ...candidate,
                      currentHealth: candidate.currentHealth + healed,
                    }
                  : candidate,
              ),
            };
            combat = event(combat, {
              text: ally.displayName + " heals for " + healed + ".",
              type: "enemy",
              eventType: "enemyHealed",
              source,
              target: healingTarget,
              data: { amount: healed },
            });
            game = { ...game, combat };
          }
        if (
          actionDefinition.healing &&
          actionTargets.some(
            (target) =>
              target.kind === "enemy" &&
              target.instanceId === current.instanceId,
          )
        ) {
          const healed = Math.min(
            current.maxHealth - current.currentHealth,
            Math.max(0, actionDefinition.healing),
          );
          if (healed > 0) {
            current = {
              ...current,
              currentHealth: current.currentHealth + healed,
            };
            combat = event(game.combat, {
              text: `${current.displayName} heals for ${healed}.`,
              type: "enemy",
              eventType: "enemyHealed",
              source,
              target: source,
              data: { amount: healed },
            });
            game = { ...game, combat };
          }
        }
        if (actionDefinition.effects)
          for (const applied of actionDefinition.effects)
            for (const selectedTarget of applied.targetMode === "self"
              ? [source]
              : actionTargets)
            if (applied.chance >= 1 || nextCombatRandom(context.rng, "effect") < applied.chance)
                game = applyEffectToGame(
                  game,
                  applied.effectId,
                  source,
                  selectedTarget,
                  selectedTarget.kind === "player"
                    ? playerStats
                    : getEnemyStats(
                        game.combat,
                        game.combat.enemies.find(
                          (candidate) =>
                            candidate.instanceId === selectedTarget.instanceId,
                        ) ?? current,
                        context,
                      ),
                  context,
                );
        combat = game.combat;
      }
    } else if (!current.currentAction && mode !== "advance") {
      const actionCooldowns = Object.fromEntries(
        Object.entries(current.actionCooldowns).map(([id, remaining]) => [
          id,
          Math.max(0, remaining - step),
        ]),
      );
      current = { ...current, actionCooldowns };
      const activePhase = definition.phases?.find(
        (candidate) => candidate.phaseId === current.phaseId,
      );
      const phaseDefinition = activePhase?.actionIds
        ? {
            ...definition,
            actions: definition.actions.filter((action) =>
              activePhase.actionIds!.includes(action.id),
            ),
          }
        : definition;
      const availableDefinition = {
        ...phaseDefinition,
        actions: phaseDefinition.actions.filter((action) =>
          (action.conditions ?? []).every((condition) => {
            const value = condition.value;
            if (condition.type === "player-hp-below")
              return (
                game.combat.maxPlayerHp > 0 &&
                game.combat.playerHp / game.combat.maxPlayerHp < Number(value)
              );
            if (condition.type === "self-hp-below")
              return (
                current.maxHealth > 0 &&
                current.currentHealth / current.maxHealth < Number(value)
              );
            if (condition.type === "has-effect")
              return current.effects.some(
                (effect) => effect.effectId === value,
              );
            if (condition.type === "missing-effect")
              return !current.effects.some(
                (effect) => effect.effectId === value,
              );
            if (condition.type === "allies-at-least")
              return (
                combat.enemies.filter((ally) => !ally.defeated).length >=
                Number(value)
              );
            if (condition.type === "phase") return current.phaseId === value;
            return true;
          }),
        ),
      };
      const selected = selectNextEnemyAction(
        availableDefinition,
        actionCooldowns,
        context.rng,
      );
      if (selected) {
        const preparation = Math.max(0, selected.preparationSeconds);
        current = {
          ...current,
          currentAction: {
            actionId: selected.id,
            remainingSeconds: preparation,
            totalSeconds: preparation,
            source,
            target: { kind: "player" },
            startedSequence: combat.eventSequence + 1,
          },
        };
        combat = event(combat, {
          text: `${current.displayName} begins ${selected.name}.`,
          type: "enemy",
          eventType: "actionStarted",
          source,
          target: { kind: "player" },
        });
        combat = {
          ...combat,
          enemyActionsStartedThisStep: [
            ...(combat.enemyActionsStartedThisStep ?? []),
            current.instanceId,
          ],
        };
      }
    }
    combat = {
      ...combat,
      enemies: combat.enemies.map((candidate) =>
        candidate.instanceId === current.instanceId ? current : candidate,
      ),
    };
    if (combat.playerHp <= 0)
      return {
        ...game,
        combat: event(
          { ...combat, phase: "defeat", stopReason: "defeat" },
          {
            text: `Defeated by ${definition.name}'s special action.`,
            type: "system",
            eventType: "combatantDefeated",
            target: { kind: "player" },
          },
        ),
      };
  }
  return {
    ...game,
    combat:
      mode === "advance"
        ? { ...combat, enemyActionsStartedThisStep: [] }
        : combat,
  };
}

function resolveDefeatedEnemies(
  game: GameState,
  context: CombatContext,
): GameState {
  let next = game;
  for (const enemy of next.combat.enemies) {
    if (!enemy.defeated || enemy.rewardResolved) continue;
    const reward = resolveEnemyReward(next, next.combat, enemy, context);
    next = reward.game;
    next.combat = {
      ...reward.combat,
      enemies: next.combat.enemies.map((candidate) =>
        candidate.instanceId === enemy.instanceId
          ? {
              ...candidate,
              currentHealth: 0,
              defeated: true,
              rewardResolved: true,
              currentAction: null,
              effects: [],
            }
          : candidate,
      ),
    };
    next.combat = event(next.combat, {
      text: `${enemy.displayName} was defeated.`,
      type: "system",
      eventType: "enemyDefeated",
      target: { kind: "enemy", instanceId: enemy.instanceId },
      data: { enemyId: enemy.enemyId },
    });
    for (const itemId of reward.droppedItemIds)
      next.combat = event(next.combat, {
        text: `Received ${context.items[itemId]?.name ?? itemId}.`,
        type: "system",
      });
  }
  const alive = livingEnemies(next.combat.enemies);
  if (
    next.combat.phase === "active" &&
    alive.length === 0 &&
    next.combat.enemies.length > 0
  ) {
    const location = next.combat.combatLocationId
      ? context.locations[next.combat.combatLocationId]
      : undefined;
    if (location) {
      const locationReward = resolveLocationClearReward(
        next,
        next.combat,
        location,
        context,
      );
      next = locationReward.game;
      next.combat = locationReward.combat;
      for (const itemId of locationReward.droppedItemIds)
        next.combat = event(next.combat, {
          text: `Location bonus: ${context.items[itemId]?.name ?? itemId}.`,
          type: "system",
        });
    }
    const cleared = {
      ...next.combat,
      selectedEnemyInstanceId: null,
      session: {
        ...next.combat.session,
        groupClears: next.combat.session.groupClears + 1,
      },
    };
    next.combat =
      cleared.playerHp / cleared.maxPlayerHp < combatBalance.safetyStopThreshold
        ? event(
            { ...cleared, phase: "stopped", stopReason: "safety" },
            {
              text: "Group cleared. Safety rule stopped the hunt below 20% HP.",
              type: "system",
              eventType: "groupCleared",
            },
          )
        : event(
            {
              ...cleared,
              phase: "recovery",
              recoveryRemaining: combatBalance.recoverySeconds,
            },
            {
              text: `Group ${cleared.groupNumber} cleared. Recovery begins.`,
              type: "system",
              eventType: "recoveryStarted",
            },
          );
  } else if (
    next.combat.phase === "active" &&
    (!next.combat.selectedEnemyInstanceId ||
      !alive.some(
        (enemy) => enemy.instanceId === next.combat.selectedEnemyInstanceId,
      ))
  )
    next.combat = {
      ...next.combat,
      selectedEnemyInstanceId: selectNextTarget(next.combat.enemies),
    };
  return next;
}

/** Debug-only entry point that still resolves rewards and group state canonically. */
export function forceDefeatEnemiesForDebug(
  game: GameState,
  instanceIds: string[],
  context: CombatContext,
): GameState {
  const ids = new Set(instanceIds);
  if (!ids.size) return game;
  const marked = {
    ...game,
    combat: {
      ...game.combat,
      enemies: game.combat.enemies.map((enemy) =>
        ids.has(enemy.instanceId) && !enemy.defeated
          ? {
              ...enemy,
              currentHealth: 0,
              defeated: true,
              currentAction: null,
            }
          : enemy,
      ),
    },
  };
  return resolveDefeatedEnemies(marked, context);
}

/** Debug-only player defeat that emits the same canonical defeat event as combat. */
export function forceDefeatPlayerForDebug(game: GameState): GameState {
  if (game.combat.phase === "defeat") return game;
  return {
    ...game,
    combat: event(
      {
        ...game.combat,
        playerHp: 0,
        phase: "defeat",
        stopReason: "defeat",
        recoveryRemaining: 0,
        enemies: game.combat.enemies.map((enemy) => ({
          ...enemy,
          currentAction: null,
        })),
      },
      {
        text: "The Hunter was defeated by a debug action.",
        type: "system",
        eventType: "combatantDefeated",
        target: { kind: "player" },
      },
    ),
  };
}

export function stopHunt(
  combat: CombatState,
  definitions: Record<string, EffectDefinition> = effectById,
) {
  const shouldKeep = (effect: ActiveEffectInstance) =>
    definitions[effect.effectId]?.persistence !== "hunt" &&
    definitions[effect.effectId]?.persistence !== "between-enemies";
  return {
    ...combat,
    phase: "stopped" as const,
    stopReason: "manual" as const,
    recoveryRemaining: 0,
    playerEffects: combat.playerEffects.filter(shouldKeep),
    enemies: combat.enemies.map((enemy) => ({
      ...enemy,
      currentAction: null,
      effects: [],
    })),
  };
}

export function syncCombatStats(game: GameState): GameState {
  const stats = calculateHunterCombatStats(
    game.equipment,
    game.inventory,
    game.progression,
    game.combat.stance,
    game.combat.techniques,
  );
  const canonical = playerBaseStats(stats);
  const fraction = (value: number, maximum: number) =>
    maximum > 0 ? clamp(value / maximum, 0, 1) : 0;
  const healthFraction = fraction(game.combat.playerHp, game.combat.maxPlayerHp);
  const staminaFraction = fraction(game.combat.stamina, game.combat.maxStamina);
  const manaFraction = fraction(game.combat.mana, game.combat.maxMana);
  return {
    ...game,
    combat: {
      ...game.combat,
      maxPlayerHp: canonical.maxLife ?? 0,
      playerHp: (canonical.maxLife ?? 0) * healthFraction,
      playerAttackInterval: canonical.attackInterval,
      maxStamina: canonical.maxStamina,
      stamina: canonical.maxStamina * staminaFraction,
      maxMana: canonical.maxMana,
      mana: canonical.maxMana * manaFraction,
    },
  };
}
