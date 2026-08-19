import {
  absorbDamage,
  advanceEffectTimers,
  getActiveEffects,
  updateActiveEffects,
} from "./combatEffects";
import {
  applyBarrierToDamage,
  componentFromAttack,
  resolveDamageWithEffectModifiers,
  type DamagePacket,
} from "./combatDamage";
import {
  awardCombatXp,
  combatEvent as event,
  getEnemyStats,
  getPlayerStats,
} from "./combatRuntime";
import { applyEnemyHealthDamage, applyPlayerHealthDamage, type EnemyDamageApplication, type PlayerDamageApplication } from "./combatHealth";
import { calculateProficiencyXpAward } from "../progression/proficiencyProgression";
import type { GameState } from "../gameState";
import type { ActiveEffectInstance, EffectDefinition } from "./combatEffectTypes";
import type { CombatContext, CombatantRef } from "./combatTypes";
import type { CombatProficiencyId } from "../progression/progressionTypes";
import type { HunterCombatStats } from "../equipment/derivedStats";

export interface PeriodicRuntimeDependencies {
  applyEffectiveHealing: (
    game: GameState,
    proficiencyId: CombatProficiencyId,
    requestedAmount: number,
    source: CombatantRef,
    label: string,
  ) => GameState;
  restoreBarrierResource: (
    game: GameState,
    proficiencyId: CombatProficiencyId,
    absorbedAmount: number,
  ) => GameState;
  resolveDefeatedEnemies: (game: GameState, context: CombatContext) => GameState;
}

export function advanceCombatEffects(
  game: GameState,
  step: number,
  context: CombatContext,
  stats: HunterCombatStats,
  dependencies: PeriodicRuntimeDependencies,
): GameState {
  let combat = game.combat;
  const playerTimers = advanceEffectTimers(
    combat.playerEffects,
    step,
    context.effects,
    combat.playerHp > 0,
  );
  combat = updateActiveEffects(combat, { kind: "player" }, playerTimers.effects);
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
    next = resolvePeriodicEffect(next, tick.effect, tick.definition, stats, context, dependencies);

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
      next = resolvePeriodicEffect(next, tick.effect, tick.definition, stats, context, dependencies);
  }
  return dependencies.resolveDefeatedEnemies(next, context);
}

export function resolvePeriodicEffect(
  game: GameState,
  effect: ActiveEffectInstance,
  definition: EffectDefinition,
  stats: HunterCombatStats,
  context: CombatContext,
  dependencies: PeriodicRuntimeDependencies,
): GameState {
  if (!definition.periodic) return game;
  const operation = definition.periodic.operation;
  if (operation.type === "heal") {
    const amount = Math.max(0, operation.baseAmount * effect.stacks);
    if (effect.target.kind === "player") {
      const effective = getPlayerStats(game.combat, stats, context, game.progression);
      const healed = Math.min((effective.maxLife ?? 0) - game.combat.playerHp, amount);
      if (healed > 0 && effect.sourceProficiencyId)
        return dependencies.applyEffectiveHealing(game, effect.sourceProficiencyId, healed, effect.source, "Regeneration");
      return {
        ...game,
        combat: event(
          {
            ...game.combat,
            playerHp: game.combat.playerHp + healed,
            session: { ...game.combat.session, healing: game.combat.session.healing + healed },
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

  const sourceEnemyId = effect.source.kind === "enemy" ? effect.source.instanceId : null;
  const targetEnemyId = effect.target.kind === "enemy" ? effect.target.instanceId : null;
  const sourceEnemy = sourceEnemyId
    ? game.combat.enemies.find((enemy) => enemy.instanceId === sourceEnemyId)
    : undefined;
  const targetEnemy = targetEnemyId
    ? game.combat.enemies.find((enemy) => enemy.instanceId === targetEnemyId)
    : undefined;
  if (effect.source.kind === "enemy" && (!sourceEnemy || sourceEnemy.defeated)) {
    // Enemy-origin effects do not snapshot a fallback attacker in Combat 2.0.1.
    // If their source has left the encounter, skip the tick instead of silently
    // substituting player stats or the target's stats.
    return game;
  }
  if (effect.target.kind === "enemy" && (!targetEnemy || targetEnemy.defeated)) return game;
  const attacker = effect.source.kind === "player"
    ? getPlayerStats(game.combat, stats, context, game.progression)
    : getEnemyStats(game.combat, sourceEnemy!, context);
  const defender = effect.target.kind === "player"
    ? getPlayerStats(game.combat, stats, context, game.progression)
    : getEnemyStats(game.combat, targetEnemy!, context);
  const packet: DamagePacket = {
    ...componentFromAttack(operation.damageType, 0, operation.canCrit ?? false),
    sourceKind: effect.source.kind === "player" && effect.sourceProficiencyId === "magic-arts" ? "magic-art" : "secondary",
    deliveryKind: "damage-over-time",
    source: effect.source,
    target: effect.target,
    baseDamage: operation.baseAmount * effect.stacks * (effect.snapshot?.periodicPowerMultiplier ?? 1),
    minMultiplier: 1,
    maxMultiplier: 1,
    ignoresArmour: operation.damageType === "physical",
    defensiveEligibility: { canMiss: false, canBeEvaded: false, blockable: false },
  };
  const result = resolveDamageWithEffectModifiers(
    packet,
    attacker,
    defender,
    context.rng,
    getActiveEffects(game.combat, effect.source),
    getActiveEffects(game.combat, effect.target),
    context.effects,
  );
  const barrierResult = absorbDamage(game.combat, effect.target, result.mitigatedDamage, context.effects);
  let resolved = applyBarrierToDamage(result, barrierResult.absorbed);
  let next = { ...game, combat: barrierResult.combat };
  let playerDamage: PlayerDamageApplication | null = null;
  let enemyDamage: EnemyDamageApplication | null = null;
  if (effect.target.kind === "enemy" && targetEnemy) {
    enemyDamage = applyEnemyHealthDamage(next.combat, targetEnemy.instanceId, resolved.healthDamage, context);
    next.combat = enemyDamage.combat;
    resolved = { ...resolved, healthDamage: enemyDamage.appliedDamage, targetDied: enemyDamage.targetDied };
    if (effect.progressionCredit?.mode === "hp-damage" && enemyDamage.appliedDamage > 0)
      next = awardCombatXp(next, effect.progressionCredit.proficiencyId, calculateProficiencyXpAward({ type: "effective-hp-damage", amount: enemyDamage.appliedDamage })).game;
  } else if (effect.target.kind === "player") {
    playerDamage = applyPlayerHealthDamage(next.combat, resolved.healthDamage, context);
    resolved = { ...resolved, healthDamage: playerDamage.appliedDamage };
    next = { ...next, combat: playerDamage.combat };
  }
  for (const absorption of barrierResult.absorptions) {
    if (absorption.progressionCredit?.mode !== "barrier-absorb") continue;
    next = awardCombatXp(next, absorption.progressionCredit.proficiencyId, calculateProficiencyXpAward({ type: "barrier-absorption", amount: absorption.amount })).game;
    next = dependencies.restoreBarrierResource(next, absorption.progressionCredit.proficiencyId, absorption.amount);
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
