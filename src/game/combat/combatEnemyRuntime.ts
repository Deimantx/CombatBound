import { absorbDamage } from "./combatEffects";
import { applyBarrierToDamage, componentFromAttack, resolveDamageWithEffectModifiers, type DamagePacket } from "./combatDamage";
import { clearEndedHuntEffects, combatEvent as event, getEnemyStats, getPlayerStats } from "./combatRuntime";
import { nextCombatRandom } from "./combatRng";
import { applyPlayerHealthDamage } from "./combatHealth";
import { applyEffectToGame, applyEffectToGameResult, applyPlayerSuccessfulBlockHooks } from "./combatEffectRuntime";
import { combatBalance } from "./combatBalance";
import { enemyCombatAbilityConditionMatches, selectNextEnemyCombatAbility, tickEnemyCombatAbilityCooldowns, getEnemyPhaseSequence } from "../enemyAbilities/enemyAbilityRuntime";
import type { EnemyCombatAbilityDefinition, EnemyCombatAbilityDamageMechanic, EnemyCombatAbilityApplyEffectMechanic, EnemyCombatAbilityResolution } from "../enemyAbilities/enemyAbilityTypes";
import type { GameState } from "../gameState";
import type { CombatContext, CombatantRef, CombatState, EnemyCombatInstance } from "./combatTypes";
import type { HunterCombatStats } from "../equipment/derivedStats";
import type { DefensiveTrainingEvent } from "../equipment/defensiveEquipment";
import type { CombatProficiencyId, ProgressionCredit } from "../progression/progressionTypes";
import { consumeEnemyNormalAttackEmpowerment, getEnemyCombatAbilityCooldownMultiplier, getEnemyCombatAbilityCooldownReduction, getEnemyCombatAbilityDamageMultiplier, getEnemyTraitOutgoingDamageMultiplier, prepareEnemyNormalAttack, processEnemyTraitEvent, reduceEnemyCombatAbilityCooldowns } from "../enemyTraits/enemyTraitRuntime";

type BarrierAbsorption = { effectId: string; amount: number; progressionCredit?: ProgressionCredit };

export interface EnemyRuntimeDependencies {
  applyEffectiveHealing: (game: GameState, proficiencyId: CombatProficiencyId, requestedAmount: number, source: CombatantRef, label: string, awardProgression?: boolean) => GameState;
  awardBarrierCredits: (game: GameState, absorptions: BarrierAbsorption[]) => GameState;
  resolveDefensiveTrainingForCombatEvent: (game: GameState, trainingEvent: DefensiveTrainingEvent, items: CombatContext["items"]) => GameState;
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
  for (let index = 0; index < Math.max(1, mechanic.stacks ?? 1); index += 1) {
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
  const enemy = game.combat.enemy?.instanceId === enemyId ? game.combat.enemy : undefined;
  if (!enemy) return game;
  const phase = getEnemyPhaseSequence(context.enemies[enemy.enemyId] ?? {}).find((candidate) => candidate.phaseId === phaseId);
  if (!phase) return game;
  const source: CombatantRef = { kind: "enemy", instanceId: enemyId };
  let next: GameState = { ...game, combat: { ...game.combat, enemy: { ...enemy, phaseId: phase.phaseId, phaseStatModifiers: phase.statModifiers ?? [] } } };
  next.combat = event(next.combat, { text: `${enemy.displayName} enters ${phase.phaseId}.`, type: "enemy", eventType: "enemyPhaseChanged", source, target: source, data: { phaseId: phase.phaseId } });
  next = processEnemyTraitEvent(next, enemyId, "enemy-phase-entered", { phaseId: phase.phaseId }, context);
  for (const effectId of phase.onEnterEffectIds ?? []) next = applyEffectToGame(next, effectId, source, source, context);
  return next;
}

export function advanceEnemyPhase(game: GameState, enemyId: string, context: CombatContext): GameState {
  const enemy = game.combat.enemy?.instanceId === enemyId ? game.combat.enemy : undefined;
  if (!enemy) return game;
  const phases = getEnemyPhaseSequence(context.enemies[enemy.enemyId] ?? {});
  const index = enemy.phaseId ? phases.findIndex((phase) => phase.phaseId === enemy.phaseId) : -1;
  return phases[index + 1] ? enterEnemyPhase(game, enemyId, phases[index + 1].phaseId, context) : game;
}

function resolveEnemyAbilityDamageHit(game: GameState, enemyId: string, ability: EnemyCombatAbilityDefinition, mechanic: EnemyCombatAbilityDamageMechanic, context: CombatContext, stats: HunterCombatStats, dependencies: EnemyRuntimeDependencies) {
  const enemy = game.combat.enemy?.instanceId === enemyId ? game.combat.enemy : undefined;
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
  if (playerDamage.appliedDamage > 0) next = processEnemyTraitEvent(next, enemyId, "enemy-damage-dealt", { abilityId: ability.id, actualDamage: playerDamage.appliedDamage, successful: true }, context);
  return { game: next, outcome: result.outcome, hpDamage: playerDamage.appliedDamage, barrierAbsorbed: resolved.barrierAbsorbed, blocked: result.blocked };
}

export function resolveEnemyCombatAbilityResult(game: GameState, enemyId: string, ability: EnemyCombatAbilityDefinition, context: CombatContext, stats: HunterCombatStats, dependencies: EnemyRuntimeDependencies): { game: GameState; resolution: EnemyCombatAbilityResolution } {
  const current = game.combat.enemy?.instanceId === enemyId ? game.combat.enemy : undefined;
  if (!current || current.defeated) return { game, resolution: emptyAbilityResolution(ability, enemyId) };
  const source: CombatantRef = { kind: "enemy", instanceId: enemyId };
  let next = game;
  const resolution = emptyAbilityResolution(ability, enemyId);
  let previousHitSuccessful = false;
  for (const mechanic of ability.mechanics) {
    if (mechanic.type === "damage") {
      const hit = resolveEnemyAbilityDamageHit(next, enemyId, ability, mechanic, context, stats, dependencies);
      next = hit.game; resolution.totalHits += 1; resolution.successfulHits += hit.outcome === "hit" ? 1 : 0; previousHitSuccessful = hit.outcome === "hit"; resolution.hpDamageDealt += hit.hpDamage; resolution.barrierDamageAbsorbed += hit.barrierAbsorbed;
      for (const effect of mechanic.onHitEffects ?? []) { const applied = applyAbilityEffect(next, effect, source, context, hit.outcome === "hit"); next = applied.game; resolution.effectsApplied.push(...applied.applied); }
    } else if (mechanic.type === "multi-hit") {
      for (let index = 0; index < Math.max(1, mechanic.hits); index += 1) {
        const hit = resolveEnemyAbilityDamageHit(next, enemyId, ability, mechanic.hit, context, stats, dependencies);
        next = hit.game; resolution.totalHits += 1; const successful = hit.outcome === "hit"; resolution.successfulHits += successful ? 1 : 0; previousHitSuccessful = successful; resolution.hpDamageDealt += hit.hpDamage; resolution.barrierDamageAbsorbed += hit.barrierAbsorbed;
        for (const effect of [...(mechanic.hit.onHitEffects ?? []), ...(mechanic.perHitEffects ?? [])]) { const applied = applyAbilityEffect(next, effect, source, context, successful); next = applied.game; resolution.effectsApplied.push(...applied.applied); }
        if (next.combat.playerHp <= 0) break;
      }
    } else if (mechanic.type === "apply-effect") {
      const applied = applyAbilityEffect(next, mechanic, source, context, previousHitSuccessful); next = applied.game; resolution.effectsApplied.push(...applied.applied);
    } else if (mechanic.type === "advance-phase") next = advanceEnemyPhase(next, enemyId, context);
    else if (mechanic.type === "ability-stat-effect") { const applied = applyEffectToGameResult(next, mechanic.effectId, source, source, context); next = applied.game; if (applied.applied) resolution.effectsApplied.push(mechanic.effectId); }
    else if (mechanic.type === "barrier") {
      const target = next.combat.enemy?.instanceId === enemyId ? next.combat.enemy : undefined;
      if (target) { const applied = applyEffectToGameResult(next, "effect.enemy-ability-barrier", source, source, context, { absorbAmount: target.maxHealth * mechanic.maxHpFraction, power: target.maxHealth * mechanic.maxHpFraction }); next = applied.game; if (applied.applied) resolution.effectsApplied.push("effect.enemy-ability-barrier"); }
    } else if (mechanic.type === "heal-self" || mechanic.type === "damage-based-heal") {
      const target = next.combat.enemy?.instanceId === enemyId ? next.combat.enemy : undefined;
      const requested = mechanic.type === "heal-self" ? (target?.maxHealth ?? 0) * mechanic.maxHpFraction : resolution.hpDamageDealt * mechanic.fraction;
      const amount = target ? Math.min(Math.max(0, target.maxHealth - target.currentHealth), Math.max(0, requested)) : 0;
      if (amount > 0 && target) { resolution.healingDone += amount; next = { ...next, combat: { ...next.combat, enemy: { ...target, currentHealth: target.currentHealth + amount } } }; }
    }
  }
  resolution.effectsApplied = [...new Set(resolution.effectsApplied)];
  const target = next.combat.enemy?.instanceId === enemyId ? next.combat.enemy : current;
  const used = (target.abilityRuntime?.usedThisFight?.[ability.id] ?? 0) + 1;
  next = { ...next, combat: { ...next.combat, enemy: { ...target, abilityCooldowns: { ...(target.abilityCooldowns ?? {}), [ability.id]: Math.max(0, ability.cooldownSeconds * getEnemyCombatAbilityCooldownMultiplier(target, ability.id, context.enemies, context.enemyTraits)) }, abilityRuntime: { ...(target.abilityRuntime ?? { usedThisFight: {} }), usedThisFight: { ...(target.abilityRuntime?.usedThisFight ?? {}), [ability.id]: used } }, preparedAbility: null } } };
  next = processEnemyTraitEvent(next, enemyId, "enemy-combat-ability-resolved", { abilityId: ability.id, successful: resolution.successfulHits > 0, actualDamage: resolution.hpDamageDealt }, context);
  if (resolution.successfulHits > 0) next = { ...next, combat: reduceEnemyCombatAbilityCooldowns(next.combat, enemyId, getEnemyCombatAbilityCooldownReduction(target, "ability-hit", context.enemies, context.enemyTraits), ability.id) };
  next = dependencies.resolveDefensiveTrainingForCombatEvent(next, { source: "enemy-combat-ability", resolved: true }, context.items);
  next.combat = event(next.combat, { text: `${current.displayName} uses ${ability.name}${resolution.hpDamageDealt > 0 ? ` for ${resolution.hpDamageDealt} damage` : resolution.healingDone > 0 ? ` and restores ${resolution.healingDone} HP` : ""}.`, type: "enemy", eventType: "enemyAbilityResolved", source, target: abilityTarget(source, ability.target), data: { abilityId: ability.id, damage: resolution.hpDamageDealt, hits: resolution.totalHits, successfulHits: resolution.successfulHits, absorbed: resolution.barrierDamageAbsorbed, healing: resolution.healingDone } });
  return { game: next, resolution };
}

export function resolveEnemyCombatAbility(game: GameState, enemyId: string, ability: EnemyCombatAbilityDefinition, context: CombatContext, stats: HunterCombatStats, dependencies: EnemyRuntimeDependencies): GameState {
  return resolveEnemyCombatAbilityResult(game, enemyId, ability, context, stats, dependencies).game;
}

export function advanceEnemyCombatAbilities(game: GameState, step: number, context: CombatContext, stats: HunterCombatStats, dependencies: EnemyRuntimeDependencies): GameState {
  let next = tickEnemyCombatAbilityCooldowns(game, step);
  const enemy = next.combat.enemy;
  if (!enemy || enemy.defeated) return next;
  const definition = context.enemies[enemy.enemyId];
  if (!definition) return next;
  const phases = getEnemyPhaseSequence(definition);
  const currentPhaseIndex = enemy.phaseId ? phases.findIndex((candidate) => candidate.phaseId === enemy.phaseId) : -1;
  const desiredPhaseIndex = phases.reduce((deepest, candidate, index) => enemy.currentHealth / Math.max(1, enemy.maxHealth) <= candidate.hpThreshold ? index : deepest, -1);
  if (desiredPhaseIndex > currentPhaseIndex) {
    next = enterEnemyPhase(next, enemy.instanceId, phases[desiredPhaseIndex].phaseId, context);
  }
  const current = next.combat.enemy;
  if (!current || current.defeated) return next;
  if (current.preparedAbility) {
    const prepared = { ...current.preparedAbility, remainingSeconds: current.preparedAbility.remainingSeconds - step };
    if (prepared.remainingSeconds > 0) return { ...next, combat: { ...next.combat, enemy: { ...current, preparedAbility: prepared } } };
    const ability = context.enemyCombatAbilities?.[prepared.abilityId];
    return ability ? resolveEnemyCombatAbility({ ...next, combat: { ...next.combat, enemy: { ...current, preparedAbility: prepared } } }, current.instanceId, ability, context, stats, dependencies) : { ...next, combat: { ...next.combat, enemy: { ...current, preparedAbility: null } } };
  }
  const ability = selectNextEnemyCombatAbility(current, definition, next, context);
  if (!ability) return next;
  const source: CombatantRef = { kind: "enemy", instanceId: current.instanceId };
  const preparation = Math.max(0, ability.preparationSeconds);
  if (preparation <= 0) return resolveEnemyCombatAbility(next, current.instanceId, ability, context, stats, dependencies);
  return { ...next, combat: event({ ...next.combat, enemy: { ...current, preparedAbility: { abilityId: ability.id, remainingSeconds: preparation, totalSeconds: preparation, source, target: abilityTarget(source, ability.target), startedSequence: next.combat.eventSequence + 1 } } }, { text: `${current.displayName} begins preparing ${ability.name}.`, type: "enemy", eventType: "enemyAbilityPreparationStarted", source, target: abilityTarget(source, ability.target), data: { abilityId: ability.id, preparationSeconds: preparation } }) };
}

export function advanceEnemyNormalAttacks(game: GameState, step: number, context: CombatContext, stats: HunterCombatStats, dependencies: EnemyRuntimeDependencies): GameState {
  const current = game.combat.enemy;
  if (!current || current.defeated) return game;
  const updatedTimer = current.attackTimer - step;
  let combat: CombatState = { ...game.combat, enemy: { ...current, attackTimer: updatedTimer } };
  if (updatedTimer > 0) return { ...game, combat };
  const playerStats = getPlayerStats(combat, stats, context, game.progression);
  const source: CombatantRef = { kind: "enemy", instanceId: current.instanceId };
  const packet: DamagePacket = { ...componentFromAttack("physical", 1, true), sourceCategory: "melee", source, target: { kind: "player" }, defensiveEligibility: { canMiss: true, canBeEvaded: true, blockable: true } };
  const enemyStats = getEnemyStats(combat, current, context);
  const preparedPacket = prepareEnemyNormalAttack(current, { ...packet, attackerAccuracy: enemyStats.accuracyRating }, combat.maxPlayerHp > 0 ? combat.playerHp / combat.maxPlayerHp : 1, context);
  const result = resolveDamageWithEffectModifiers(preparedPacket, enemyStats, playerStats, context.rng, current.effects, combat.playerEffects, context.effects);
  const barrierResult = absorbDamage(combat, packet.target, result.mitigatedDamage, context.effects);
  let resolved = applyBarrierToDamage(result, barrierResult.absorbed);
  let next = dependencies.awardBarrierCredits({ ...game, combat: barrierResult.combat }, barrierResult.absorptions);
  const playerDamage = applyPlayerHealthDamage(next.combat, resolved.healthDamage, context);
  resolved = { ...resolved, healthDamage: playerDamage.appliedDamage };
  combat = { ...playerDamage.combat, lastDamageSource: current.displayName };
  if (next.combat.enemy) combat = { ...combat, enemy: { ...next.combat.enemy, attackTimer: Math.max(combatBalance.minimumAttackInterval, enemyStats.attackInterval) } };
  next = { ...next, combat };
  if (resolved.blocked) next = applyPlayerSuccessfulBlockHooks(next, context);
  if (resolved.outcome === "hit") {
    next = processEnemyTraitEvent(next, current.instanceId, "enemy-normal-attack-resolved", { actualDamage: playerDamage.appliedDamage, critical: resolved.critical, successful: true }, context);
    if (playerDamage.appliedDamage > 0) next = processEnemyTraitEvent(next, current.instanceId, "enemy-damage-dealt", { actualDamage: playerDamage.appliedDamage, successful: true }, context);
    next.combat = consumeEnemyNormalAttackEmpowerment(next.combat, current.instanceId);
    next.combat = reduceEnemyCombatAbilityCooldowns(next.combat, current.instanceId, getEnemyCombatAbilityCooldownReduction(current, "normal-hit", context.enemies, context.enemyTraits));
  } else if (resolved.outcome === "evaded") next = processEnemyTraitEvent(next, current.instanceId, "enemy-normal-attack-missed", {}, context);
  next = dependencies.resolveDefensiveTrainingForCombatEvent(next, { source: "enemy-normal-attack", resolved: true }, context.items);
  next.combat = event(next.combat, { text: resolved.outcome === "hit" ? `${current.displayName} hits you for ${resolved.healthDamage}${resolved.barrierAbsorbed > 0 ? ` (${resolved.barrierAbsorbed} absorbed)` : ""}.` : `${current.displayName} ${resolved.outcome}s your attack.`, type: "enemy", eventType: resolved.outcome === "evaded" ? "attackEvaded" : "damageDealt", source: packet.source, target: packet.target, data: { damage: resolved.healthDamage, blockedDamage: resolved.blockedDamage, absorbed: resolved.barrierAbsorbed, requestedDamage: playerDamage.requestedDamage, appliedDamage: playerDamage.appliedDamage, immortalPrevented: playerDamage.preventedLethalDamage } });
  if (next.combat.playerHp <= 0) {
    const defeated = clearEndedHuntEffects({ ...next.combat, phase: "defeat", stopReason: "defeat", enemy: next.combat.enemy ? { ...next.combat.enemy, preparedAbility: null } : null }, context.effects);
    next.combat = event({ ...defeated, enemy: null, recoveryRemaining: 0 }, { text: `Defeated by ${current.displayName}.`, type: "system", eventType: "combatantDefeated", target: { kind: "player" } });
  }
  return next;
}
