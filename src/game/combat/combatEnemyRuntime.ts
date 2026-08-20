import { absorbDamage } from "./combatEffects";
import { applyBarrierToDamage, componentFromAttack, resolveDamageWithEffectModifiers, type DamagePacket } from "./combatDamage";
import { combatEvent as event, getEnemyStats, getPlayerStats } from "./combatRuntime";
import { selectNextEnemyAction } from "./combatActions";
import { enemyActionTargets } from "./combatEnemyTargets";
import { nextCombatRandom } from "./combatRng";
import { applyPlayerHealthDamage } from "./combatHealth";
import { applyEffectToGame, applyEffectToGameResult, applyPlayerSuccessfulBlockHooks } from "./combatEffectRuntime";
import { combatBalance } from "./combatBalance";
import { enemyCombatAbilityConditionMatches, selectNextEnemyCombatAbility, tickEnemyCombatAbilityCooldowns } from "../enemyAbilities/enemyAbilityRuntime";
import type { EnemyCombatAbilityDefinition, EnemyCombatAbilityDamageMechanic, EnemyCombatAbilityApplyEffectMechanic, EnemyCombatAbilityResolution } from "../enemyAbilities/enemyAbilityTypes";
import type { GameState } from "../gameState";
import type { CombatContext, CombatantRef, EnemyCombatInstance } from "./combatTypes";
import type { HunterCombatStats } from "../equipment/derivedStats";
import type { DefensiveTrainingEvent } from "../equipment/defensiveEquipment";
import type { CombatProficiencyId, ProgressionCredit } from "../progression/progressionTypes";
import { consumeEnemyNormalAttackEmpowerment, getEnemyActionCooldownMultiplier, getEnemyActionCooldownReduction, getEnemyActionDamageMultiplier, getEnemyCombatAbilityCooldownMultiplier, getEnemyCombatAbilityCooldownReduction, getEnemyCombatAbilityDamageMultiplier, getEnemyTraitOutgoingDamageMultiplier, prepareEnemyNormalAttack, processEnemyTraitEvent, reduceEnemyActionRemainingCooldowns, reduceEnemyCombatAbilityCooldowns } from "../enemyTraits/enemyTraitRuntime";
import { getEnemyPhaseSequence } from "../enemyAbilities/enemyAbilityRuntime";

type BarrierAbsorption = { effectId: string; amount: number; progressionCredit?: ProgressionCredit };

export interface EnemyRuntimeDependencies {
  applyEffectiveHealing: (
    game: GameState,
    proficiencyId: CombatProficiencyId,
    requestedAmount: number,
    source: CombatantRef,
    label: string,
    awardProgression?: boolean,
  ) => GameState;
  awardBarrierCredits: (game: GameState, absorptions: BarrierAbsorption[]) => GameState;
  resolveDefensiveTrainingForEnemyAction: (
    game: GameState,
    trainingEvent: DefensiveTrainingEvent,
    items: CombatContext["items"],
  ) => GameState;
}

function abilityTarget(source: CombatantRef, target: "player" | "self"): CombatantRef {
  return target === "self" ? source : { kind: "player" };
}

function abilityConditionMatches(mechanic: EnemyCombatAbilityDamageMechanic, enemy: EnemyCombatInstance, game: GameState, context: CombatContext) {
  const override = mechanic.conditionalMultiplierOverride;
  if (!override) return mechanic.attackDamageMultiplier;
  return enemyCombatAbilityConditionMatches(override.condition, enemy, game, context)
    ? override.attackDamageMultiplier
    : mechanic.attackDamageMultiplier;
}

function applyAbilityEffect(game: GameState, mechanic: EnemyCombatAbilityApplyEffectMechanic, source: CombatantRef, context: CombatContext, successfulHit: boolean) {
  const requiresHit = mechanic.requireSuccessfulHit ?? mechanic.target === "player";
  if (requiresHit && !successfulHit) return { game, applied: [] as string[] };
  let next = game;
  const applied: string[] = [];
  const stacks = Math.max(1, mechanic.stacks ?? 1);
  for (let index = 0; index < stacks; index++) {
    if (mechanic.chance < 1 && nextCombatRandom(context.rng, "enemyAbilityEffect") >= mechanic.chance) continue;
    const result = applyEffectToGameResult(next, mechanic.effectId, source, abilityTarget(source, mechanic.target), context, {
      durationMultiplier: mechanic.durationMultiplier,
      durationOverrideSeconds: mechanic.durationOverrideSeconds,
      magnitudeMultiplier: mechanic.magnitudeMultiplier,
    });
    next = result.game;
    if (result.applied) applied.push(mechanic.effectId);
  }
  return { game: next, applied };
}

function emptyAbilityResolution(ability: EnemyCombatAbilityDefinition, enemyId: string): EnemyCombatAbilityResolution {
  return { abilityId: ability.id, sourceEnemyInstanceId: enemyId, target: ability.target, successfulHits: 0, totalHits: 0, hpDamageDealt: 0, barrierDamageAbsorbed: 0, healingDone: 0, effectsApplied: [] };
}

export function enterEnemyPhase(game: GameState, enemyId: string, phaseId: string, context: CombatContext): GameState {
  const enemy = game.combat.enemies.find((candidate) => candidate.instanceId === enemyId);
  if (!enemy) return game;
  const definition = context.enemies[enemy.enemyId];
  const phase = definition ? getEnemyPhaseSequence(definition).find((candidate) => candidate.phaseId === phaseId) : undefined;
  if (!phase) return game;
  const source: CombatantRef = { kind: "enemy", instanceId: enemyId };
  let next = { ...game, combat: { ...game.combat, enemies: game.combat.enemies.map((candidate) => candidate.instanceId === enemyId ? { ...candidate, phaseId: phase.phaseId, phaseStatModifiers: phase.statModifiers ?? [] } : candidate) } };
  next = { ...next, combat: event(next.combat, { text: `${enemy.displayName} enters ${phase.phaseId}.`, type: "enemy", eventType: "enemyPhaseChanged", source, target: source, data: { phaseId: phase.phaseId } }) };
  next = processEnemyTraitEvent(next, enemyId, "enemy-phase-entered", { phaseId: phase.phaseId }, context);
  for (const effectId of phase.onEnterEffectIds ?? []) next = applyEffectToGame(next, effectId, source, source, context);
  return next;
}

export function advanceEnemyPhase(game: GameState, enemyId: string, context: CombatContext): GameState {
  const enemy = game.combat.enemies.find((candidate) => candidate.instanceId === enemyId);
  if (!enemy) return game;
  const phases = getEnemyPhaseSequence(context.enemies[enemy.enemyId] ?? {});
  const index = enemy.phaseId ? phases.findIndex((phase) => phase.phaseId === enemy.phaseId) : -1;
  const next = phases[index + 1];
  return next ? enterEnemyPhase(game, enemyId, next.phaseId, context) : game;
}

function resolveEnemyAbilityDamageHit(
  game: GameState,
  enemyId: string,
  ability: EnemyCombatAbilityDefinition,
  mechanic: EnemyCombatAbilityDamageMechanic,
  context: CombatContext,
  stats: HunterCombatStats,
  dependencies: EnemyRuntimeDependencies,
) {
  const enemy = game.combat.enemies.find((candidate) => candidate.instanceId === enemyId);
  if (!enemy || enemy.defeated || game.combat.playerHp <= 0) return { game, outcome: "evaded" as const, hpDamage: 0, barrierAbsorbed: 0, blocked: false };
  const source: CombatantRef = { kind: "enemy", instanceId: enemyId };
  const playerStats = getPlayerStats(game.combat, stats, context, game.progression);
  const enemyStats = getEnemyStats(game.combat, enemy, context);
  const packet: DamagePacket = {
    ...componentFromAttack(mechanic.damageType, abilityConditionMatches(mechanic, enemy, game, context), mechanic.canCrit),
    sourceCategory: mechanic.sourceCategory,
    source,
    target: { kind: "player" },
    attackerAccuracy: (enemyStats.accuracyRating ?? 0) * (mechanic.accuracyMultiplier ?? 1),
    criticalStrikeChance: (enemyStats.criticalStrikeChance ?? 0) + (mechanic.flatCriticalChanceBonus ?? 0),
    armorPenetrationPercent: mechanic.armourPenetrationPercent,
    targetBlockEffectMultiplier: mechanic.targetBlockEffectMultiplier,
    defensiveEligibility: { canMiss: true, canBeEvaded: true, blockable: true },
    damageMultiplier: getEnemyCombatAbilityDamageMultiplier(enemy, context.enemies, context.enemyTraits) * getEnemyTraitOutgoingDamageMultiplier(enemy, { damageType: mechanic.damageType, sourceCategory: mechanic.sourceCategory, deliveryKind: "hit" }, game.combat.maxPlayerHp > 0 ? game.combat.playerHp / game.combat.maxPlayerHp : 1, context.enemies, context.enemyTraits, false),
  };
  const result = resolveDamageWithEffectModifiers(packet, enemyStats, playerStats, context.rng, enemy.effects, game.combat.playerEffects, context.effects);
  const barrierResult = absorbDamage(game.combat, packet.target, result.mitigatedDamage, context.effects);
  const resolved = applyBarrierToDamage(result, barrierResult.absorbed);
  let next = dependencies.awardBarrierCredits({ ...game, combat: barrierResult.combat }, barrierResult.absorptions);
  const playerDamage = applyPlayerHealthDamage(next.combat, resolved.healthDamage, context);
  next = { ...next, combat: { ...playerDamage.combat, lastDamageSource: enemy.displayName } };
  if (result.blocked) next = applyPlayerSuccessfulBlockHooks(next, context);
  if (playerDamage.appliedDamage > 0) next = processEnemyTraitEvent(next, enemyId, "enemy-damage-dealt", { actionId: ability.id, abilityId: ability.id, actualDamage: playerDamage.appliedDamage, successful: true }, context);
  return { game: next, outcome: result.outcome, hpDamage: playerDamage.appliedDamage, barrierAbsorbed: resolved.barrierAbsorbed, blocked: result.blocked };
}

export function resolveEnemyCombatAbilityResult(game: GameState, enemyId: string, ability: EnemyCombatAbilityDefinition, context: CombatContext, stats: HunterCombatStats, dependencies: EnemyRuntimeDependencies): { game: GameState; resolution: EnemyCombatAbilityResolution } {
  const current = game.combat.enemies.find((enemy) => enemy.instanceId === enemyId);
  if (!current || current.defeated) return { game, resolution: emptyAbilityResolution(ability, enemyId) };
  const source: CombatantRef = { kind: "enemy", instanceId: enemyId };
  let next = game;
  const resolution = emptyAbilityResolution(ability, enemyId);
  let previousHitSuccessful = false;
  for (const mechanic of ability.mechanics) {
    if (mechanic.type === "damage") {
      const hit = resolveEnemyAbilityDamageHit(next, enemyId, ability, mechanic, context, stats, dependencies);
      next = hit.game;
      resolution.totalHits += 1;
      if (hit.outcome === "hit") { resolution.successfulHits += 1; previousHitSuccessful = true; }
      else previousHitSuccessful = false;
      resolution.hpDamageDealt += hit.hpDamage;
      resolution.barrierDamageAbsorbed += hit.barrierAbsorbed;
      for (const effect of mechanic.onHitEffects ?? []) {
        const applied = applyAbilityEffect(next, effect, source, context, hit.outcome === "hit");
        next = applied.game;
        resolution.effectsApplied.push(...applied.applied);
      }
    }
    if (mechanic.type === "multi-hit") {
      let lastHitSuccessful = false;
      for (let index = 0; index < Math.max(1, mechanic.hits); index += 1) {
        const hit = resolveEnemyAbilityDamageHit(next, enemyId, ability, mechanic.hit, context, stats, dependencies);
        next = hit.game;
        resolution.totalHits += 1;
        const successful = hit.outcome === "hit";
        lastHitSuccessful = successful;
        if (successful) resolution.successfulHits += 1;
        resolution.hpDamageDealt += hit.hpDamage;
        resolution.barrierDamageAbsorbed += hit.barrierAbsorbed;
        for (const effect of [...(mechanic.hit.onHitEffects ?? []), ...(mechanic.perHitEffects ?? [])]) {
          const applied = applyAbilityEffect(next, effect, source, context, successful);
          next = applied.game;
          resolution.effectsApplied.push(...applied.applied);
        }
        if (next.combat.playerHp <= 0) break;
      }
      previousHitSuccessful = lastHitSuccessful;
    }
    if (mechanic.type === "apply-effect") {
      const applied = applyAbilityEffect(next, mechanic, source, context, previousHitSuccessful);
      next = applied.game;
      resolution.effectsApplied.push(...applied.applied);
    }
    if (mechanic.type === "advance-phase") next = advanceEnemyPhase(next, enemyId, context);
    if (mechanic.type === "ability-stat-effect") {
      const applied = applyEffectToGameResult(next, mechanic.effectId, source, source, context);
      next = applied.game;
      if (applied.applied) resolution.effectsApplied.push(mechanic.effectId);
    }
    if (mechanic.type === "barrier") {
      const target = next.combat.enemies.find((candidate) => candidate.instanceId === enemyId);
      if (target) {
        const applied = applyEffectToGameResult(next, "effect.enemy-ability-barrier", source, source, context, { absorbAmount: target.maxHealth * mechanic.maxHpFraction, power: target.maxHealth * mechanic.maxHpFraction });
        next = applied.game;
        if (applied.applied) resolution.effectsApplied.push("effect.enemy-ability-barrier");
      }
    }
    if (mechanic.type === "heal-self" || mechanic.type === "damage-based-heal") {
      const target = next.combat.enemies.find((candidate) => candidate.instanceId === enemyId);
      const requested = mechanic.type === "heal-self" ? (target?.maxHealth ?? 0) * mechanic.maxHpFraction : resolution.hpDamageDealt * mechanic.fraction;
      const amount = target ? Math.min(Math.max(0, target.maxHealth - target.currentHealth), Math.max(0, requested)) : 0;
      if (amount > 0) {
        resolution.healingDone += amount;
        next = { ...next, combat: { ...next.combat, enemies: next.combat.enemies.map((candidate) => candidate.instanceId === enemyId ? { ...candidate, currentHealth: candidate.currentHealth + amount } : candidate) } };
      }
    }
  }
  const target = next.combat.enemies.find((enemy) => enemy.instanceId === enemyId) ?? current;
  resolution.effectsApplied = [...new Set(resolution.effectsApplied)];
  const used = (target.abilityRuntime?.usedThisFight?.[ability.id] ?? 0) + 1;
  next = { ...next, combat: { ...next.combat, enemies: next.combat.enemies.map((candidate) => candidate.instanceId === enemyId ? { ...candidate, abilityCooldowns: { ...(candidate.abilityCooldowns ?? {}), [ability.id]: Math.max(0, ability.cooldownSeconds * getEnemyCombatAbilityCooldownMultiplier(candidate, ability.id, context.enemies, context.enemyTraits)) }, abilityRuntime: { ...(candidate.abilityRuntime ?? { usedThisFight: {} }), usedThisFight: { ...(candidate.abilityRuntime?.usedThisFight ?? {}), [ability.id]: used } } } : candidate) } };
  next = processEnemyTraitEvent(next, enemyId, "enemy-combat-ability-resolved", { actionId: ability.id, abilityId: ability.id, successful: resolution.successfulHits > 0, actualDamage: resolution.hpDamageDealt }, context);
  if (resolution.successfulHits > 0) next = { ...next, combat: reduceEnemyCombatAbilityCooldowns(next.combat, enemyId, getEnemyCombatAbilityCooldownReduction(target, "action-hit", context.enemies, context.enemyTraits), ability.id) };
  next = dependencies.resolveDefensiveTrainingForEnemyAction(next, { source: "enemy-combat-ability", resolved: true }, context.items);
  next = { ...next, combat: event(next.combat, { text: `${current.displayName} uses ${ability.name}${resolution.hpDamageDealt > 0 ? ` for ${resolution.hpDamageDealt} damage` : resolution.healingDone > 0 ? ` and restores ${resolution.healingDone} HP` : ""}.`, type: "enemy", eventType: "enemyAbilityResolved", source, target: abilityTarget(source, ability.target), data: { abilityId: ability.id, damage: resolution.hpDamageDealt, hits: resolution.totalHits, successfulHits: resolution.successfulHits, absorbed: resolution.barrierDamageAbsorbed, healing: resolution.healingDone } }) };
  return { game: next, resolution };
}

export function resolveEnemyCombatAbility(game: GameState, enemyId: string, ability: EnemyCombatAbilityDefinition, context: CombatContext, stats: HunterCombatStats, dependencies: EnemyRuntimeDependencies): GameState {
  return resolveEnemyCombatAbilityResult(game, enemyId, ability, context, stats, dependencies).game;
}

export function advanceEnemyCombatAbilities(game: GameState, step: number, context: CombatContext, stats: HunterCombatStats, dependencies: EnemyRuntimeDependencies): GameState {
  let next = tickEnemyCombatAbilityCooldowns(game, step);
  for (const enemy of [...next.combat.enemies]) {
    if (enemy.defeated) continue;
    const definition = context.enemies[enemy.enemyId];
    const ability = selectNextEnemyCombatAbility(enemy, definition, next, context);
    if (ability) next = resolveEnemyCombatAbility(next, enemy.instanceId, ability, context, stats, dependencies);
  }
  return next;
}

export function advanceEnemyNormalAttacks(
  game: GameState,
  step: number,
  context: CombatContext,
  stats: HunterCombatStats,
  dependencies: EnemyRuntimeDependencies,
): GameState {
  let combat = game.combat;
  for (const enemy of combat.enemies) {
    if (enemy.defeated) continue;
    const current = combat.enemies.find((candidate) => candidate.instanceId === enemy.instanceId);
    if (!current || current.defeated || current.currentAction) continue;
    const definition = context.enemies[current.enemyId];
    const updatedTimer = current.attackTimer - step;
    combat = {
      ...combat,
      enemies: combat.enemies.map((candidate) => candidate.instanceId === current.instanceId ? { ...candidate, attackTimer: updatedTimer } : candidate),
    };
    if (updatedTimer > 0) continue;
    const playerStats = getPlayerStats(combat, stats, context, game.progression);
    const packet: DamagePacket = {
      ...componentFromAttack("physical", 1, true),
      sourceCategory: "melee",
      source: { kind: "enemy", instanceId: current.instanceId },
      target: { kind: "player" },
      defensiveEligibility: { canMiss: true, canBeEvaded: true, blockable: true },
    };
    const enemyStats = getEnemyStats(combat, current, context);
    const preparedPacket = prepareEnemyNormalAttack(current, { ...packet, attackerAccuracy: enemyStats.accuracyRating }, combat.maxPlayerHp > 0 ? combat.playerHp / combat.maxPlayerHp : 1, context);
    const result = resolveDamageWithEffectModifiers(preparedPacket, enemyStats, playerStats, context.rng, current.effects, combat.playerEffects, context.effects);
    const barrierResult = packet.ignoresBarrier
      ? { combat, absorbed: 0, remaining: result.mitigatedDamage, absorptions: [] as BarrierAbsorption[] }
      : absorbDamage(combat, packet.target, result.mitigatedDamage, context.effects);
    let resolved = applyBarrierToDamage(result, barrierResult.absorbed);
    game = dependencies.awardBarrierCredits({ ...game, combat: barrierResult.combat }, barrierResult.absorptions);
    const playerDamage = applyPlayerHealthDamage(game.combat, resolved.healthDamage, context);
    combat = { ...playerDamage.combat, enemies: game.combat.enemies, lastDamageSource: definition.name };
    resolved = { ...resolved, healthDamage: playerDamage.appliedDamage };
    combat = {
      ...combat,
      enemies: combat.enemies.map((candidate) => candidate.instanceId === current.instanceId
        ? { ...candidate, attackTimer: Math.max(combatBalance.minimumAttackInterval, enemyStats.attackInterval) }
        : candidate),
    };
    if (resolved.blocked) {
      game = applyPlayerSuccessfulBlockHooks({ ...game, combat }, context);
      combat = game.combat;
    }
    if (resolved.outcome === "hit") {
      game = processEnemyTraitEvent({ ...game, combat }, current.instanceId, "enemy-normal-attack-resolved", { actualDamage: playerDamage.appliedDamage, critical: resolved.critical, successful: true }, context);
      if (playerDamage.appliedDamage > 0)
        game = processEnemyTraitEvent(game, current.instanceId, "enemy-damage-dealt", { actualDamage: playerDamage.appliedDamage, successful: true }, context);
      game.combat = consumeEnemyNormalAttackEmpowerment(game.combat, current.instanceId);
      combat = game.combat;
      combat = reduceEnemyActionRemainingCooldowns(combat, current.instanceId, getEnemyActionCooldownReduction(current, "normal-hit", context.enemies, context.enemyTraits));
      combat = reduceEnemyCombatAbilityCooldowns(combat, current.instanceId, getEnemyActionCooldownReduction(current, "normal-hit", context.enemies, context.enemyTraits));
    } else if (resolved.outcome === "evaded") {
      game = processEnemyTraitEvent({ ...game, combat }, current.instanceId, "enemy-normal-attack-missed", {}, context);
      combat = game.combat;
    }
    game = dependencies.resolveDefensiveTrainingForEnemyAction({ ...game, combat }, { source: "enemy-normal-attack", resolved: true }, context.items);
    combat = game.combat;
    if (resolved.blocked)
      combat = event(combat, {
        text: `You block ${resolved.blockedDamage} damage from ${current.displayName}.`,
        type: "player",
        eventType: "attackBlocked",
        source: packet.source,
        target: packet.target,
        data: { blockedDamage: resolved.blockedDamage },
      });
    const message = resolved.outcome === "hit"
      ? `${current.displayName} hits you for ${resolved.healthDamage}${resolved.barrierAbsorbed > 0 ? ` (${resolved.barrierAbsorbed} absorbed)` : ""}.`
      : `${current.displayName} ${resolved.outcome}s your attack.`;
    combat = event(combat, {
      text: message,
      type: "enemy",
      eventType: resolved.outcome === "evaded" ? "attackEvaded" : "damageDealt",
      source: packet.source,
      target: packet.target,
      data: {
        damage: resolved.healthDamage,
        blockedDamage: resolved.blockedDamage,
        absorbed: resolved.barrierAbsorbed,
        requestedDamage: playerDamage.requestedDamage,
        appliedDamage: playerDamage.appliedDamage,
        immortalPrevented: playerDamage.preventedLethalDamage,
      },
    });
    if (combat.playerHp <= 0)
      return {
        ...game,
        combat: event({ ...combat, phase: "defeat", stopReason: "defeat" }, {
          text: `Defeated by ${definition.name}.`,
          type: "system",
          eventType: "combatantDefeated",
          target: { kind: "player" },
        }),
      };
  }
  return { ...game, combat };
}

export function advanceEnemySpecials(
  game: GameState,
  step: number,
  context: CombatContext,
  stats: HunterCombatStats,
  dependencies: EnemyRuntimeDependencies,
  mode: "both" | "start" | "advance" = "both",
): GameState {
  let combat = game.combat;
  const startedThisStep = combat.enemyActionsStartedThisStep ?? [];
  for (const enemy of [...combat.enemies]) {
    if (enemy.defeated) continue;
    const definition = context.enemies[enemy.enemyId];
    let current = combat.enemies.find((candidate) => candidate.instanceId === enemy.instanceId) ?? enemy;
    const source: CombatantRef = { kind: "enemy", instanceId: current.instanceId };
    const phases = getEnemyPhaseSequence(definition);
    const currentPhaseIndex = current.phaseId ? phases.findIndex((candidate) => candidate.phaseId === current.phaseId) : -1;
    const desiredPhaseIndex = phases.reduce(
      (deepest, candidate, index) => current.currentHealth / Math.max(1, current.maxHealth) <= candidate.hpThreshold ? index : deepest,
      -1,
    );
    const phase = desiredPhaseIndex > currentPhaseIndex ? phases[desiredPhaseIndex] : undefined;
    if (phase) {
      game = enterEnemyPhase(game, current.instanceId, phase.phaseId, context);
      combat = game.combat;
      current = combat.enemies.find((candidate) => candidate.instanceId === current.instanceId) ?? current;
    }
    const actionDefinition = current.currentAction ? definition.actions.find((action) => action.id === current.currentAction?.actionId) : undefined;
    if (current.currentAction && !actionDefinition) {
      current = { ...current, currentAction: null };
    } else if (current.currentAction && actionDefinition && mode !== "start" && !(mode === "advance" && startedThisStep.includes(current.instanceId))) {
      const action = { ...current.currentAction, remainingSeconds: current.currentAction.remainingSeconds - step };
      current = { ...current, currentAction: action };
      if (action.remainingSeconds <= 0) {
        const playerStats = getPlayerStats(combat, stats, context, game.progression);
        const enemyStats = getEnemyStats(combat, current, context);
        const actionTargets = enemyActionTargets(actionDefinition, current, combat, context.rng);
        const components = actionDefinition.damage?.length ? actionDefinition.damage : [componentFromAttack("physical", actionDefinition.damageMultiplier, true)];
        let totalDamage = 0;
        let totalAbsorbed = 0;
        let requestedDamage = 0;
        let lastOutcome: string = "hit";
        let playerBlockedAction = false;
        let playerHitAction = false;
        for (const component of components) {
          const actionSourceCategory = component.sourceCategory ?? "melee";
          const packet: DamagePacket = {
            ...component,
            sourceCategory: actionSourceCategory,
            damageMultiplier: getEnemyActionDamageMultiplier(current, context.enemies, context.enemyTraits) * getEnemyTraitOutgoingDamageMultiplier(current, { damageType: component.damageType, deliveryKind: component.deliveryKind, sourceCategory: actionSourceCategory }, combat.maxPlayerHp > 0 ? combat.playerHp / combat.maxPlayerHp : 1, context.enemies, context.enemyTraits, false),
            source,
            target: { kind: "player" },
            defensiveEligibility: { canMiss: true, canBeEvaded: true, blockable: actionDefinition.blockable },
          };
          const result = resolveDamageWithEffectModifiers(packet, enemyStats, playerStats, context.rng, current.effects, combat.playerEffects, context.effects);
          const barrierResult = absorbDamage(combat, packet.target, result.mitigatedDamage, context.effects);
          const resolved = applyBarrierToDamage(result, barrierResult.absorbed);
          requestedDamage += resolved.healthDamage;
          game = dependencies.awardBarrierCredits({ ...game, combat: barrierResult.combat }, barrierResult.absorptions);
          const playerDamage = applyPlayerHealthDamage(game.combat, resolved.healthDamage, context);
          const appliedResolved = { ...resolved, healthDamage: playerDamage.appliedDamage };
          totalDamage += appliedResolved.healthDamage;
          totalAbsorbed += appliedResolved.barrierAbsorbed;
          lastOutcome = result.outcome;
          playerHitAction = playerHitAction || result.outcome === "hit";
          playerBlockedAction = playerBlockedAction || result.blocked;
          combat = { ...playerDamage.combat, lastDamageSource: definition.name };
          if (result.blocked)
            combat = event(combat, {
              text: `You block ${result.blockedDamage} damage from ${current.displayName}.`,
              type: "player",
              eventType: "attackBlocked",
              source,
              target: { kind: "player" },
              data: { blockedDamage: result.blockedDamage },
            });
        }
        current = { ...current, currentAction: null, actionCooldowns: { ...current.actionCooldowns, [actionDefinition.id]: Math.max(0, actionDefinition.cooldownSeconds) } };
        combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === current.instanceId ? current : candidate) };
        if (playerBlockedAction) {
          game = applyPlayerSuccessfulBlockHooks({ ...game, combat }, context);
          combat = game.combat;
        }
        game = dependencies.resolveDefensiveTrainingForEnemyAction({ ...game, combat }, { source: "enemy-direct-action", resolved: true }, context.items);
        combat = event(game.combat, {
          text: `${current.displayName} resolves ${actionDefinition.name}: ${lastOutcome}${totalDamage > 0 ? ` for ${totalDamage} damage` : ""}.`,
          type: "enemy",
          eventType: "actionResolved",
          source,
          target: { kind: "player" },
          data: { damage: totalDamage, absorbed: totalAbsorbed, components: components.length, requestedDamage, appliedDamage: totalDamage, immortalPrevented: Math.max(0, requestedDamage - totalDamage) },
        });
        game = { ...game, combat };
        if (playerHitAction) {
          game = processEnemyTraitEvent(game, current.instanceId, "enemy-action-resolved", { actionId: actionDefinition.id, successful: true, actualDamage: totalDamage }, context);
          if (totalDamage > 0) game = processEnemyTraitEvent(game, current.instanceId, "enemy-damage-dealt", { actionId: actionDefinition.id, successful: true, actualDamage: totalDamage }, context);
          combat = reduceEnemyActionRemainingCooldowns(game.combat, current.instanceId, getEnemyActionCooldownReduction(current, "action-hit", context.enemies, context.enemyTraits), actionDefinition.id);
          game = { ...game, combat };
        }
        combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === current.instanceId ? { ...candidate, actionCooldowns: { ...candidate.actionCooldowns, [actionDefinition.id]: Math.max(0, actionDefinition.cooldownSeconds * getEnemyActionCooldownMultiplier(candidate, actionDefinition.id, context.enemies, context.enemyTraits)) } } : candidate) };
        if (playerHitAction && actionDefinition.applyEffects)
          for (const applied of actionDefinition.applyEffects)
            if (applied.chance >= 1 || nextCombatRandom(context.rng, "effect") < applied.chance)
              game = applyEffectToGame(game, applied.effectId, source, { kind: "player" }, context);
        combat = game.combat;
        if (actionDefinition.healing && actionTargets.some((target) => target.kind === "player")) {
          game = dependencies.applyEffectiveHealing(game, "water-magic", Math.max(0, actionDefinition.healing), source, actionDefinition.name, false);
          combat = game.combat;
        }
        if (actionDefinition.healing && actionTargets.some((target) => target.kind === "enemy" && target.instanceId !== current.instanceId))
          for (const healingTarget of actionTargets) {
            if (healingTarget.kind !== "enemy") continue;
            const ally = combat.enemies.find((candidate) => candidate.instanceId === healingTarget.instanceId);
            if (!ally || ally.defeated) continue;
            const healed = Math.min(ally.maxHealth - ally.currentHealth, Math.max(0, actionDefinition.healing));
            if (healed <= 0) continue;
            combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === ally.instanceId ? { ...candidate, currentHealth: candidate.currentHealth + healed } : candidate) };
            combat = event(combat, { text: ally.displayName + " heals for " + healed + ".", type: "enemy", eventType: "enemyHealed", source, target: healingTarget, data: { amount: healed } });
            game = { ...game, combat };
          }
        if (actionDefinition.healing && actionTargets.some((target) => target.kind === "enemy" && target.instanceId === current.instanceId)) {
          const healed = Math.min(current.maxHealth - current.currentHealth, Math.max(0, actionDefinition.healing));
          if (healed > 0) {
            current = { ...current, currentHealth: current.currentHealth + healed };
            combat = event(game.combat, { text: `${current.displayName} heals for ${healed}.`, type: "enemy", eventType: "enemyHealed", source, target: source, data: { amount: healed } });
            game = { ...game, combat };
          }
        }
        if (actionDefinition.effects)
          for (const applied of actionDefinition.effects)
            for (const selectedTarget of applied.targetMode === "self" ? [source] : actionTargets)
              if (applied.chance >= 1 || nextCombatRandom(context.rng, "effect") < applied.chance)
                game = applyEffectToGame(game, applied.effectId, source, selectedTarget, context);
        combat = game.combat;
      }
    } else if (!current.currentAction && mode !== "advance") {
      const actionCooldowns = Object.fromEntries(Object.entries(current.actionCooldowns).map(([id, remaining]) => [id, Math.max(0, remaining - step)]));
      current = { ...current, actionCooldowns };
      const activePhase = definition.phases?.find((candidate) => candidate.phaseId === current.phaseId);
      const phaseDefinition = activePhase?.actionIds ? { ...definition, actions: definition.actions.filter((action) => activePhase.actionIds!.includes(action.id)) } : definition;
      const availableDefinition = {
        ...phaseDefinition,
        actions: phaseDefinition.actions.filter((action) => (action.conditions ?? []).every((condition) => {
          const value = condition.value;
          if (condition.type === "player-hp-below") return game.combat.maxPlayerHp > 0 && game.combat.playerHp / game.combat.maxPlayerHp < Number(value);
          if (condition.type === "self-hp-below") return current.maxHealth > 0 && current.currentHealth / current.maxHealth < Number(value);
          if (condition.type === "has-effect") return current.effects.some((effect) => effect.effectId === value);
          if (condition.type === "missing-effect") return !current.effects.some((effect) => effect.effectId === value);
          if (condition.type === "allies-at-least") return combat.enemies.filter((ally) => !ally.defeated).length >= Number(value);
          if (condition.type === "phase") return current.phaseId === value;
          return true;
        })),
      };
      const selected = selectNextEnemyAction(availableDefinition, actionCooldowns, context.rng);
      if (selected) {
        const preparation = Math.max(0, selected.preparationSeconds);
        current = { ...current, currentAction: { actionId: selected.id, remainingSeconds: preparation, totalSeconds: preparation, source, target: { kind: "player" }, startedSequence: combat.eventSequence + 1 } };
        combat = event(combat, { text: `${current.displayName} begins ${selected.name}.`, type: "enemy", eventType: "actionStarted", source, target: { kind: "player" } });
        combat = { ...combat, enemyActionsStartedThisStep: [...(combat.enemyActionsStartedThisStep ?? []), current.instanceId] };
      }
    }
    combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === current.instanceId ? current : candidate) };
    if (combat.playerHp <= 0)
      return { ...game, combat: event({ ...combat, phase: "defeat", stopReason: "defeat" }, { text: `Defeated by ${definition.name}'s special action.`, type: "system", eventType: "combatantDefeated", target: { kind: "player" } }) };
  }
  return { ...game, combat: mode === "advance" ? { ...combat, enemyActionsStartedThisStep: [] } : combat };
}
