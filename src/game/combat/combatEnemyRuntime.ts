import { absorbDamage } from "./combatEffects";
import { applyBarrierToDamage, componentFromAttack, resolveDamageWithEffectModifiers, type DamagePacket } from "./combatDamage";
import { combatEvent as event, getEnemyStats, getPlayerStats } from "./combatRuntime";
import { selectNextEnemyAction } from "./combatActions";
import { enemyActionTargets } from "./combatEnemyTargets";
import { nextCombatRandom } from "./combatRng";
import { applyPlayerHealthDamage } from "./combatHealth";
import { applyEffectToGame, applyPlayerSuccessfulBlockHooks } from "./combatEffectRuntime";
import { combatBalance } from "./combatBalance";
import type { GameState } from "../gameState";
import type { CombatContext, CombatantRef } from "./combatTypes";
import type { HunterCombatStats } from "../equipment/derivedStats";
import type { DefensiveTrainingEvent } from "../equipment/defensiveEquipment";
import type { CombatProficiencyId, ProgressionCredit } from "../progression/progressionTypes";
import { consumeEnemyNormalAttackEmpowerment, getEnemyActionCooldownMultiplier, getEnemyActionCooldownReduction, getEnemyActionDamageMultiplier, getEnemyTraitOutgoingDamageMultiplier, prepareEnemyNormalAttack, processEnemyTraitEvent, reduceEnemyActionRemainingCooldowns } from "../enemyTraits/enemyTraitRuntime";

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
    const phases = [...(definition.phases ?? [])].sort((a, b) => b.hpThreshold - a.hpThreshold);
    const currentPhaseIndex = current.phaseId ? phases.findIndex((candidate) => candidate.phaseId === current.phaseId) : -1;
    const desiredPhaseIndex = phases.reduce(
      (deepest, candidate, index) => current.currentHealth / Math.max(1, current.maxHealth) <= candidate.hpThreshold ? index : deepest,
      -1,
    );
    const phase = desiredPhaseIndex > currentPhaseIndex ? phases[desiredPhaseIndex] : undefined;
    if (phase) {
      current = { ...current, phaseId: phase.phaseId, phaseStatModifiers: phase.statModifiers ?? [] };
      combat = event(combat, {
        text: current.displayName + " enters " + phase.phaseId + ".",
        type: "enemy",
        eventType: "enemyPhaseChanged",
        source,
        target: source,
        data: { phaseId: phase.phaseId },
      });
      game = { ...game, combat };
      game = processEnemyTraitEvent(game, current.instanceId, "enemy-phase-entered", { phaseId: phase.phaseId }, context);
      combat = game.combat;
      current = combat.enemies.find((candidate) => candidate.instanceId === current.instanceId) ?? current;
      for (const effectId of phase.onEnterEffectIds ?? [])
        game = applyEffectToGame(game, effectId, source, source, context);
      combat = game.combat;
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
            damageMultiplier: getEnemyActionDamageMultiplier(current, context.enemies, context.enemyTraits) * getEnemyTraitOutgoingDamageMultiplier(current, { damageType: component.damageType, deliveryKind: component.deliveryKind, sourceCategory: actionSourceCategory }, combat.maxPlayerHp > 0 ? combat.playerHp / combat.maxPlayerHp : 1, context.enemies, context.enemyTraits),
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
