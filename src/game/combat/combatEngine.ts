import { addItem, itemQuantity, removeItem } from '../inventory/inventoryLogic'
import { discoverItem } from '../collection/collectionLogic'
import { calculateHunterCombatStats, type HunterCombatStats } from '../equipment/derivedStats'
import { stanceDefinitions } from '../data/stances'
import { techniqueDefinitions } from '../data/techniques'
import { spellById } from '../data/spells'
import { effectById } from '../data/effects'
import { enemyById } from '../data/enemies'
import { combatLocationById } from '../data/world/combatLocations'
import { itemById } from '../data/items'
import { combatBalance, clamp } from './combatBalance'
import { componentFromAttack, resolveDamage, applyBarrierToDamage, type DamagePacket } from './combatDamage'
import { calculateEffectiveCombatStats, calculateEnemyBaseCombatStats, normalizeCombatStats } from './combatStats'
import { applyEffectById, absorbDamage, advanceEffectTimers, cleanseEffects, getBarrierAmount, updateActiveEffects } from './combatEffects'
import { interruptAction, selectNextEnemyAction } from './combatActions'
import { instantiateEnemies } from './combatState'
import { generateCombatGroup } from './combatGroupGenerator'
import { firstLivingEnemy, livingEnemies, selectNextTarget } from './combatTargeting'
import { resolveEnemyReward, resolveLocationClearReward } from './combatRewards'
import { awardProficiencyXp, calculateProficiencyXpAward, discoverProficiency } from '../progression/proficiencyProgression'
import { masteryLevelForXp } from '../progression/masteryProgression'
import { applyProficiencyStatModifiers, getBarrierAbsorbResourceRestore, getConditionalMagicStatModifiers, getConditionalProficiencyStatModifiers, getEffectiveMagicModifiers, getMagicCleanseEffectHooks, getMagicCleanseHooks, getParryEffectHooks, getProficiencyXpMultiplier, getSpellCastEffectHooks, getSpellHitEffectHooks, getSpellHpDamageResourceHooks, getSpellLifeDrainFraction, getStanceSwitchCooldownMultiplier, getStanceSwitchEffectHooks, getSuccessfulInterruptHooks, getTechniqueStaminaDrainMultiplier, getWeaponAttackModifiers, getWeaponBlockEffectHooks, getWeaponDamageMultiplier, getWeaponDodgeEffectHooks, getWeaponHitAdvanceHooks, getWeaponHitEffectHooks, getWeaponHitResourceHooks } from '../progression/perkProgression'
import { calculateEffectiveSpell } from '../progression/spellProgression'
import { getEquippedWeaponProficiency } from '../progression/progressionSelectors'
import { perkById } from '../data/proficiencyPerks'
import { proficiencyById } from '../data/proficiencies'
import type { GameState } from '../gameState'
import type { ActiveEffectInstance, EffectDefinition } from './combatEffectTypes'
import type { CombatContext, CombatEvent, CombatEventType, CombatLogEntry, CombatState, CombatStats, CombatantRef, EnemyCombatInstance, StanceId, TechniqueId } from './combatTypes'
import type { CombatProficiencyId, ProgressionCredit, ProgressionState, WeaponProficiencyId } from '../progression/progressionTypes'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function event(state: CombatState, item: CombatEvent) {
  const nextSequence = state.eventSequence + 1
  const log: CombatLogEntry = { id: nextSequence, text: item.text, type: item.type, time: `T+${Math.floor(state.session.elapsedSeconds)}s` }
  const record = { id: nextSequence, type: item.eventType ?? 'actionResolved' as CombatEventType, source: item.source, target: item.target, data: item.data }
  return { ...state, eventSequence: nextSequence, log: [log, ...state.log].slice(0, 30), events: [...state.events, record].slice(-100) }
}

export function createCombatContext(rng: CombatContext['rng']): CombatContext {
  return { enemies: enemyById, locations: combatLocationById, spells: Object.fromEntries(Object.values(spellById).map((spell) => [spell.id, spell])), items: itemById, effects: effectById, rng }
}

function playerBaseStats(stats: HunterCombatStats): CombatStats {
  return normalizeCombatStats(stats as HunterCombatStats & Record<string, unknown>)
}

function getPlayerStats(combat: CombatState, stats: HunterCombatStats, context: CombatContext, progression?: GameState['progression']) {
  const base = calculateEffectiveCombatStats(playerBaseStats(stats), combat.playerEffects, context.effects)
  if (!progression) return base
  const barrierActive = getBarrierAmount(combat.playerEffects, context.effects) > 0
  const activeTechniqueCount = Object.values(combat.techniques).filter(Boolean).length
  const weapon = stats.weaponProficiencyId ?? null
  const dynamicWeapon = getConditionalProficiencyStatModifiers(progression, weapon, { stance: combat.stance, activeTechniqueCount, staminaFraction: combat.maxStamina > 0 ? combat.stamina / combat.maxStamina : 0, playerHpFraction: combat.maxPlayerHp > 0 ? combat.playerHp / combat.maxPlayerHp : 1, barrierActive }, perkById)
  return applyProficiencyStatModifiers(base, [...dynamicWeapon, ...getConditionalMagicStatModifiers(progression, barrierActive, perkById)])
}

function awardCombatXp(game: GameState, proficiencyId: CombatProficiencyId, amount: number) {
  if (!(amount > 0)) return { game, result: null }
  const result = awardProficiencyXp(game.progression, proficiencyId, amount)
  const current = game.combat.session.proficiencyXpGained[proficiencyId] ?? 0
  return {
    game: { ...game, progression: result.progression, combat: { ...game.combat, session: { ...game.combat.session, proficiencyXpGained: { ...game.combat.session.proficiencyXpGained, [proficiencyId]: current + result.proficiencyXpGained }, masteryXpGained: game.combat.session.masteryXpGained + result.proficiencyXpGained } } },
    result,
  }
}

function applyEffectiveHealing(game: GameState, proficiencyId: CombatProficiencyId, requestedAmount: number, source: CombatantRef, label: string, awardProgression = true) {
  const effective = Math.min(Math.max(0, game.combat.maxPlayerHp - game.combat.playerHp), Math.max(0, requestedAmount))
  if (effective <= 0) return game
  let next = { ...game, combat: event({ ...game.combat, playerHp: game.combat.playerHp + effective, session: { ...game.combat.session, healing: game.combat.session.healing + effective } }, { text: `${label} restores ${effective} HP.`, type: 'player', eventType: 'healingDone', source, target: { kind: 'player' }, data: { amount: effective } }) }
  if (awardProgression) next = awardCombatXp(next, proficiencyId, calculateProficiencyXpAward({ type: 'effective-healing', amount: effective })).game
  return next
}

function discoverCombatProficiency(game: GameState, proficiencyId: CombatProficiencyId) {
  return game.progression.proficiencies[proficiencyId] ? game : { ...game, progression: discoverProficiency(game.progression, proficiencyId) }
}

function restoreBarrierResource(game: GameState, proficiencyId: CombatProficiencyId, absorbedAmount: number) {
  const resource = proficiencyId === 'light-magic' ? 'mana' : proficiencyId === 'earth-magic' ? 'stamina' : null
  const magicProficiencyId = proficiencyId === 'light-magic' || proficiencyId === 'earth-magic' ? proficiencyId : undefined
  if (!resource || !magicProficiencyId) return game
  const restored = getBarrierAbsorbResourceRestore(game.progression, resource, perkById, magicProficiencyId) * absorbedAmount
  if (restored <= 0) return game
  return resource === 'mana'
    ? { ...game, combat: { ...game.combat, mana: Math.min(game.combat.maxMana, game.combat.mana + restored) } }
    : { ...game, combat: { ...game.combat, stamina: Math.min(game.combat.maxStamina, game.combat.stamina + restored) } }
}

function awardBarrierCredits(game: GameState, absorptions: Array<{ effectId: string; amount: number; progressionCredit?: ProgressionCredit }>) {
  let next = game
  for (const absorption of absorptions) {
    const credit = absorption.progressionCredit
    if (credit?.mode !== 'barrier-absorb') continue
    next = awardCombatXp(next, credit.proficiencyId, calculateProficiencyXpAward({ type: 'barrier-absorption', amount: absorption.amount })).game
    next = restoreBarrierResource(next, credit.proficiencyId, absorption.amount)
  }
  return next
}

function getEnemyStats(combat: CombatState, enemy: EnemyCombatInstance, context: CombatContext) {
  const definition = context.enemies[enemy.enemyId]
  return calculateEffectiveCombatStats(calculateEnemyBaseCombatStats(definition), enemy.effects, context.effects)
}

function clearEndedHuntEffects(combat: CombatState, definitions: Record<string, EffectDefinition>) {
  const shouldKeep = (effect: ActiveEffectInstance) => {
    const persistence = definitions[effect.effectId]?.persistence
    return persistence !== 'hunt' && persistence !== 'between-enemies'
  }
  return { ...combat, playerEffects: combat.playerEffects.filter(shouldKeep), enemies: combat.enemies.map((enemy) => ({ ...enemy, effects: [] })) }
}

export function startHunt(game: GameState, locationId: string, stats: HunterCombatStats, context: CombatContext): GameState {
  const location = context.locations[locationId]
  if (!location) return game
  const group = generateCombatGroup(location, context.rng, masteryLevelForXp(game.progression.masteryXp))
  const session = { ...game.combat.session, elapsedSeconds: 0, groupClears: 0, enemiesDefeated: 0, damageDealt: 0, damageTaken: 0, healing: 0, proficiencyXpGained: {}, masteryXpGained: 0, itemsGained: 0, lootGained: {}, goldGained: 0, highestHit: 0 }
  const clean = clearEndedHuntEffects({ ...game.combat, session }, context.effects)
  const combat = createActiveCombat(clean, locationId, group, stats, 1, true)
  return { ...game, combat }
}

function createActiveCombat(previous: CombatState, locationId: string, enemyIds: string[], stats: HunterCombatStats, groupNumber: number, resetResources = false): CombatState {
  const enemies = instantiateEnemies(enemyIds, groupNumber)
  const base = playerBaseStats(stats)
  return { ...previous, phase: 'active', combatLocationId: locationId, groupNumber, enemies, selectedEnemyInstanceId: enemies[0]?.instanceId ?? null, maxPlayerHp: base.maxHealth, playerHp: Math.min(previous.playerHp, base.maxHealth), playerAttackInterval: base.attackInterval, playerAttackTimer: Math.min(previous.playerAttackTimer, base.attackInterval), stamina: resetResources ? base.maxStamina : clamp(previous.stamina, 0, base.maxStamina), maxStamina: base.maxStamina, mana: resetResources ? base.maxMana : clamp(previous.mana, 0, base.maxMana), maxMana: base.maxMana, recoveryRemaining: 0, stopReason: null, lastDamageSource: null }
}

export function selectEnemy(combat: CombatState, instanceId: string) { return combat.enemies.some((enemy) => enemy.instanceId === instanceId && !enemy.defeated) ? { ...combat, selectedEnemyInstanceId: instanceId } : combat }

export function setStance(combat: CombatState, stance: StanceId, newStats: HunterCombatStats, progression?: ProgressionState, weaponProficiencyId: WeaponProficiencyId | null = null) {
  if (combat.stance === stance || (combat.phase === 'active' && combat.stanceCooldownRemaining > 0)) return combat
  const progress = combat.playerAttackInterval > 0 ? 1 - combat.playerAttackTimer / combat.playerAttackInterval : 0
  const active = combat.phase === 'active'
  const canonical = playerBaseStats(newStats)
  let next = { ...combat, stance, stanceCooldownRemaining: active ? combatBalance.stanceSwitchCooldown * (progression ? getStanceSwitchCooldownMultiplier(progression, weaponProficiencyId, perkById) : 1) : 0, playerAttackInterval: canonical.attackInterval, playerAttackTimer: active ? Math.max(0, canonical.attackInterval * (1 - progress)) : canonical.attackInterval, maxPlayerHp: canonical.maxHealth, playerHp: Math.min(combat.playerHp, canonical.maxHealth), maxStamina: canonical.maxStamina, stamina: Math.min(combat.stamina, canonical.maxStamina), maxMana: canonical.maxMana, mana: Math.min(combat.mana, canonical.maxMana) }
  if (progression && active) for (const hook of getStanceSwitchEffectHooks(progression, weaponProficiencyId, perkById)) {
    const result = applyEffectById(next, hook.effectId, effectById, { kind: 'player' }, { kind: 'player' }, { targetStats: playerBaseStats(newStats) })
    if (result.instance) next = result.combat
  }
  return next
}

export function toggleTechnique(combat: CombatState, technique: TechniqueId) { return { ...combat, techniques: { ...combat.techniques, [technique]: !combat.techniques[technique] } } }

export function castSpell(game: GameState, spellId: string, stats: HunterCombatStats, context: CombatContext): GameState {
  const spell = context.spells[spellId] ?? spellById[spellId]
  const combat = game.combat
  if (!spell || combat.phase !== 'active') return game
  const runtime = combat.spells.find((entry) => entry.spellId === spellId)
  if (!runtime || runtime.cooldownRemaining > 0) return game
  const target = combat.enemies.find((enemy) => enemy.instanceId === combat.selectedEnemyInstanceId && !enemy.defeated)
  if (spell.targetMode === 'selectedEnemy' && !target) return game
  const effectiveSpell = calculateEffectiveSpell(spell, game.progression, target ? { targetHpFraction: target.currentHealth / target.maxHealth, targetEffects: target.effects, manaFraction: combat.maxMana > 0 ? combat.mana / combat.maxMana : 1 } : { manaFraction: combat.maxMana > 0 ? combat.mana / combat.maxMana : 1 })
  if (combat.mana < effectiveSpell.manaCost) return game
  const targetRef: CombatantRef = target ? { kind: 'enemy', instanceId: target.instanceId } : { kind: 'player' }
  const interruptActionDefinition = spell.interruptsAction && target?.currentAction ? context.enemies[target.enemyId]?.actions.find((candidate) => candidate.id === target.currentAction?.actionId) : undefined
  const interruptResult = spell.interruptsAction ? interruptAction(target?.currentAction ?? null, interruptActionDefinition) : null
  if (spell.interruptsAction && !interruptResult?.interrupted) return game

  let next: GameState = { ...game, combat: { ...combat, mana: combat.mana - effectiveSpell.manaCost, spells: combat.spells.map((entry) => entry.spellId === spellId ? { ...entry, cooldownRemaining: effectiveSpell.cooldownSeconds } : entry) } }
  const source: CombatantRef = { kind: 'player' }

  const magicModifiers = getEffectiveMagicModifiers(next.progression, spell.magicProficiencyId, perkById)
  if (spell.damage > 0 && target) {
    const packet: DamagePacket = { ...componentFromAttack(spell.damageType ?? 'fire', 0, effectiveSpell.canCrit), source, target: targetRef, baseDamage: effectiveSpell.damage, criticalDamageMultiplier: effectiveSpell.criticalDamageMultiplier, criticalChanceBonus: effectiveSpell.criticalChanceBonus, attackerAccuracy: getPlayerStats(next.combat, stats, context, next.progression).accuracy + effectiveSpell.accuracyModifier, minMultiplier: combatBalance.baseDamageVarianceMin, maxMultiplier: combatBalance.baseDamageVarianceMax, defensiveEligibility: { canMiss: spell.canMiss ?? true, dodgeable: spell.dodgeable ?? false, parryable: spell.parryable ?? false, blockable: spell.blockable ?? false }, armorPenetrationPercent: magicModifiers.spellArmorPenetrationPercent, armorPenetrationFlat: magicModifiers.spellArmorPenetrationFlat, progressionSource: { type: 'spell', proficiencyId: spell.magicProficiencyId, proficiencyEligible: true } }
    const effects = [
      ...(spell.applyEffects ?? []).map((applied) => ({ ...applied, options: { sourceProficiencyId: spell.magicProficiencyId, progressionCredit: applied.progressionCredit ? { proficiencyId: spell.magicProficiencyId, mode: applied.progressionCredit } : undefined, durationBonusSeconds: effectiveSpell.effectDurationModifiers[applied.effectId]?.durationBonusSeconds, durationMultiplier: effectiveSpell.effectDurationModifiers[applied.effectId]?.durationMultiplier, periodicPowerMultiplier: effectiveSpell.effectPeriodicPowerModifiers[applied.effectId], maxStacksBonus: effectiveSpell.effectMaxStacksModifiers[applied.effectId] } })),
      ...getSpellHitEffectHooks(next.progression, spell.magicProficiencyId, perkById).map((hook) => ({ effectId: hook.effectId, chance: hook.chance, options: { sourceProficiencyId: spell.magicProficiencyId, secondaryOnly: hook.secondaryOnly, durationBonusSeconds: effectiveSpell.effectDurationModifiers[hook.effectId]?.durationBonusSeconds, durationMultiplier: effectiveSpell.effectDurationModifiers[hook.effectId]?.durationMultiplier, periodicPowerMultiplier: effectiveSpell.effectPeriodicPowerModifiers[hook.effectId], maxStacksBonus: effectiveSpell.effectMaxStacksModifiers[hook.effectId] } })),
    ]
    next = damageEnemy(next, target, packet, getPlayerStats(next.combat, stats, context, next.progression), context, `You cast ${spell.name}`, effects)
    if (next.combat.phase !== 'active') return next
  }
  for (const hook of getSpellCastEffectHooks(next.progression, spell.magicProficiencyId, perkById)) {
    const definition = context.effects[hook.effectId]
    const hookTarget = definition?.beneficial || definition?.kind === 'buff' || definition?.kind === 'barrier' ? source : targetRef
    if (hookTarget.kind === 'enemy' && !target) continue
    const hookStats = hookTarget.kind === 'player' ? getPlayerStats(next.combat, stats, context, next.progression) : getEnemyStats(next.combat, target as EnemyCombatInstance, context)
    next = applyEffectToGame(next, hook.effectId, source, hookTarget, hookStats, context, { sourceProficiencyId: spell.magicProficiencyId, durationBonusSeconds: hook.durationSeconds })
  }
  const castDamage = Math.max(0, next.combat.session.damageDealt - game.combat.session.damageDealt)
  if (castDamage > 0 && spell.damage > 0) {
    const manaRestore = castDamage * magicModifiers.damageBasedManaRestoreFraction
    if (manaRestore > 0) next.combat = { ...next.combat, mana: Math.min(next.combat.maxMana, next.combat.mana + manaRestore) }
    const drainFraction = getSpellLifeDrainFraction(next.progression, spell.magicProficiencyId, perkById)
    const drainedHealing = Math.min(next.combat.maxPlayerHp - next.combat.playerHp, castDamage * drainFraction)
    if (drainedHealing > 0) next = applyEffectiveHealing(next, spell.magicProficiencyId, drainedHealing, source, `${spell.name} drain`, false)
  }
  if (effectiveSpell.healing && spell.targetMode === 'self') next = applyEffectiveHealing(next, spell.magicProficiencyId, effectiveSpell.healing.flatAmount, source, spell.name)
  if (spell.cleanseTags?.length) {
    const cleansed = cleanseEffects(next.combat, source, { tags: spell.cleanseTags, maxEffects: spell.cleanseMaxEffects }, context.effects)
    next = { ...next, combat: cleansed.combat }
    if (cleansed.removed > 0) {
      next = awardCombatXp(next, spell.magicProficiencyId, calculateProficiencyXpAward({ type: 'successful-cleanse', weight: cleansed.removed })).game
      next.combat = event(next.combat, { text: `${spell.name} cleansed ${cleansed.removed} harmful effect${cleansed.removed === 1 ? '' : 's'}.`, type: 'player', eventType: 'effectCleansed', source, target: source, data: { removed: cleansed.removed } })
      for (const hook of getMagicCleanseHooks(next.progression, spell.magicProficiencyId, perkById)) next.combat = hook.resource === 'mana' ? { ...next.combat, mana: Math.min(next.combat.maxMana, next.combat.mana + hook.amount) } : { ...next.combat, stamina: Math.min(next.combat.maxStamina, next.combat.stamina + hook.amount) }
      for (const hook of getMagicCleanseEffectHooks(next.progression, spell.magicProficiencyId, perkById)) next = applyEffectToGame(next, hook.effectId, source, source, getPlayerStats(next.combat, stats, context, next.progression), context, { sourceProficiencyId: spell.magicProficiencyId, durationBonusSeconds: hook.durationSeconds })
    }
  }
  if (spell.barrierAmount !== undefined) {
    const barrierEffectId = spell.barrierEffectId ?? 'effect.protective-sign'
    const duration = effectiveSpell.effectDurationModifiers[barrierEffectId]
    next = applyEffectToGame(next, barrierEffectId, source, source, getPlayerStats(next.combat, stats, context, next.progression), context, { absorbAmount: effectiveSpell.barrierAmount, power: effectiveSpell.barrierAmount, sourceProficiencyId: spell.magicProficiencyId, progressionCredit: { proficiencyId: spell.magicProficiencyId, mode: 'barrier-absorb' }, durationBonusSeconds: duration?.durationBonusSeconds, durationMultiplier: duration?.durationMultiplier })
    next = discoverCombatProficiency(next, spell.magicProficiencyId)
  }
  if (spell.interruptsAction && target) {
    const action = interruptActionDefinition
    const hooks = getSuccessfulInterruptHooks(next.progression, perkById, spell.magicProficiencyId)
    const danger = action?.danger ?? 'low'
    const baseXp = calculateProficiencyXpAward({ type: 'successful-interrupt', danger })
    const xp = baseXp * getProficiencyXpMultiplier(next.progression, spell.magicProficiencyId, 'successful-interrupt', perkById)
    const awarded = awardCombatXp(next, spell.magicProficiencyId, xp)
    next = awarded.game
    next.combat = { ...next.combat, enemies: next.combat.enemies.map((enemy) => enemy.instanceId === target.instanceId ? { ...enemy, currentAction: null, specialCooldownRemaining: (interruptResult?.cooldownSeconds ?? 0) * hooks.cooldownMultiplier } : enemy) }
    next.combat = event(next.combat, { text: `${spell.name} interrupts ${target.displayName}'s ${action?.name ?? 'action'}.`, type: 'player', eventType: 'actionInterrupted', source, target: targetRef, data: { proficiencyXp: awarded.result?.proficiencyXpGained ?? 0 } })
    if (hooks.restoreMana > 0) next.combat = { ...next.combat, mana: Math.min(next.combat.maxMana, next.combat.mana + hooks.restoreMana) }
    if (hooks.restoreStamina > 0) next.combat = { ...next.combat, stamina: Math.min(next.combat.maxStamina, next.combat.stamina + hooks.restoreStamina) }
    if (hooks.refundManaFraction > 0) next.combat = { ...next.combat, mana: Math.min(next.combat.maxMana, next.combat.mana + effectiveSpell.manaCost * hooks.refundManaFraction) }
    if (hooks.barrierAmount > 0) next = applyEffectToGame(next, 'effect.disruptive-shield', source, source, getPlayerStats(next.combat, stats, context, next.progression), context, { absorbAmount: hooks.barrierAmount, power: hooks.barrierAmount, sourceProficiencyId: spell.magicProficiencyId, durationBonusSeconds: 0, durationMultiplier: 1 })
    for (const hook of hooks.statEffects) next = applyEffectToGame(next, hook.effectId, source, source, getPlayerStats(next.combat, stats, context, next.progression), context, { sourceProficiencyId: spell.magicProficiencyId, durationBonusSeconds: hook.durationSeconds })
    if (hooks.reduceSpellCooldownFraction > 0 || hooks.reduceSpellCooldownSeconds > 0) next.combat = { ...next.combat, spells: next.combat.spells.map((entry) => entry.spellId === spellId ? { ...entry, cooldownRemaining: Math.max(0, entry.cooldownRemaining * (1 - hooks.reduceSpellCooldownFraction) - hooks.reduceSpellCooldownSeconds) } : entry) }
    for (const hook of hooks.effects) {
      const hookTarget = hook.effectId === 'effect.disruptive-shield' ? source : targetRef
      const hookStats = hookTarget.kind === 'player' ? getPlayerStats(next.combat, stats, context, next.progression) : getEnemyStats(next.combat, target, context)
      next = applyEffectToGame(next, hook.effectId, source, hookTarget, hookStats, context, { sourceProficiencyId: spell.magicProficiencyId, durationMultiplier: hook.durationMultiplier })
    }
  }
  return next
}

function applyEffectToGame(game: GameState, effectId: string, source: CombatantRef, target: CombatantRef, targetStats: CombatStats, context: CombatContext, options: { absorbAmount?: number; power?: number; progressionCredit?: ProgressionCredit; sourceProficiencyId?: CombatProficiencyId; secondaryOnly?: boolean; durationBonusSeconds?: number; durationMultiplier?: number; periodicPowerMultiplier?: number; maxStacksBonus?: number } = {}) {
  const result = applyEffectById(game.combat, effectId, context.effects, source, target, { targetStats, ...options })
  if (!result.instance || result.outcome === 'rejected' || result.outcome === 'missing-target') return game
  const eventType: CombatEventType = result.outcome === 'refreshed' ? 'effectRefreshed' : result.outcome === 'stacked' ? 'effectStacked' : 'effectApplied'
  const definition = context.effects[effectId]
  const suffix = result.instance.stacks > 1 ? ` x${result.instance.stacks}` : ''
  return { ...game, combat: event(result.combat, { text: `${definition.name}${suffix} applied to ${target.kind === 'player' ? 'you' : game.combat.enemies.find((enemy) => enemy.instanceId === target.instanceId)?.displayName ?? 'target'}.`, type: source.kind === 'player' ? 'player' : 'enemy', eventType, source, target, data: { effectId, stacks: result.instance.stacks } }) }
}

function damageEnemy(game: GameState, target: EnemyCombatInstance, packet: DamagePacket, attackerStats: CombatStats, context: CombatContext, prefix: string, effectsToApply: Array<{ effectId: string; chance: number; options?: { progressionCredit?: ProgressionCredit; sourceProficiencyId?: CombatProficiencyId; secondaryOnly?: boolean; durationBonusSeconds?: number; durationMultiplier?: number; periodicPowerMultiplier?: number; maxStacksBonus?: number } }> = [], allowSecondary = true, isSecondary = false) {
  const current = game.combat.enemies.find((enemy) => enemy.instanceId === target.instanceId)
  if (!current || current.defeated) return game
  const defenderStats = getEnemyStats(game.combat, current, context)
  const weaponProficiencyId = packet.progressionSource?.type === 'equippedWeapon' && packet.progressionSource.proficiencyEligible ? getEquippedWeaponProficiency(game.equipment) : null
  const proficiencyId = packet.progressionSource?.type === 'spell' && packet.progressionSource.proficiencyEligible ? packet.progressionSource.proficiencyId : weaponProficiencyId
  const conditionalMultiplier = packet.progressionSource?.proficiencyEligible && packet.progressionSource.type === 'equippedWeapon' ? getWeaponDamageMultiplier(game.progression, weaponProficiencyId, current.currentHealth / current.maxHealth, current.effects.map((effect) => effect.effectId), perkById, game.combat.stance) : 1
  const weaponAttack = getWeaponAttackModifiers(game.progression, weaponProficiencyId, perkById)
  const magicAttack = packet.progressionSource?.type === 'spell' && packet.progressionSource.proficiencyEligible ? getEffectiveMagicModifiers(game.progression, packet.progressionSource.proficiencyId, perkById) : null
  const secondaryFraction = magicAttack?.spellSecondaryTargetFraction ?? weaponAttack.secondaryTargetFraction
  const secondaryCount = magicAttack?.spellSecondaryTargetCount ?? weaponAttack.secondaryTargetCount
  const armorPenetrationPercent = magicAttack?.spellArmorPenetrationPercent ?? weaponAttack.armorPenetrationPercent
  const armorPenetrationFlat = magicAttack?.spellArmorPenetrationFlat ?? weaponAttack.armorPenetrationFlat
  let resolution = resolveDamage({ ...packet, damageMultiplier: conditionalMultiplier * (isSecondary ? secondaryFraction : 1), armorPenetrationPercent, armorPenetrationFlat, blockChancePenetration: weaponAttack.blockChancePenetration, blockPowerPenetration: weaponAttack.blockPowerPenetration }, attackerStats, defenderStats, context.rng)
  const barrierResult = packet.ignoresBarrier ? { combat: game.combat, absorbed: 0, remaining: resolution.mitigatedDamage, absorptions: [] as Array<{ effectId: string; amount: number; progressionCredit?: ProgressionCredit }> } : absorbDamage(game.combat, packet.target, resolution.mitigatedDamage, context.effects)
  resolution = applyBarrierToDamage(resolution, barrierResult.absorbed)
  const effectiveHealthDamage = Math.min(current.currentHealth, resolution.healthDamage)
  resolution = { ...resolution, healthDamage: effectiveHealthDamage, targetDied: current.currentHealth - effectiveHealthDamage <= 0 }
  const defeated = resolution.targetDied
  let next: GameState = { ...game, combat: { ...barrierResult.combat, enemies: barrierResult.combat.enemies.map((enemy) => enemy.instanceId === current.instanceId ? { ...enemy, currentHealth: Math.max(0, enemy.currentHealth - effectiveHealthDamage), defeated, currentAction: defeated ? null : enemy.currentAction } : enemy), session: { ...barrierResult.combat.session, damageDealt: barrierResult.combat.session.damageDealt + effectiveHealthDamage, highestHit: Math.max(barrierResult.combat.session.highestHit, effectiveHealthDamage) } } }
  let progressionResults: Array<ReturnType<typeof awardProficiencyXp>> = []
  if (proficiencyId && effectiveHealthDamage > 0) {
    const awarded = awardCombatXp(next, proficiencyId, calculateProficiencyXpAward({ type: 'effective-hp-damage', amount: effectiveHealthDamage }))
    next = awarded.game
    if (awarded.result) progressionResults.push(awarded.result)
  }
  if (packet.progressionSource?.type === 'spell' && packet.progressionSource.proficiencyEligible && effectiveHealthDamage > 0) {
    for (const hook of getSpellHpDamageResourceHooks(next.progression, packet.progressionSource.proficiencyId, perkById)) if (hook.chance >= 1 || context.rng.next() < hook.chance) next.combat = hook.resource === 'mana' ? { ...next.combat, mana: Math.min(next.combat.maxMana, next.combat.mana + hook.amount) } : { ...next.combat, stamina: Math.min(next.combat.maxStamina, next.combat.stamina + hook.amount) }
  }
  for (const absorption of barrierResult.absorptions) {
    const credit = absorption.progressionCredit
    if (credit?.mode !== 'barrier-absorb') continue
    const awarded = awardCombatXp(next, credit.proficiencyId, calculateProficiencyXpAward({ type: 'barrier-absorption', amount: absorption.amount }))
    next = awarded.game
    if (awarded.result) progressionResults.push(awarded.result)
    next = restoreBarrierResource(next, credit.proficiencyId, absorption.amount)
  }
  const message = resolution.outcome === 'hit' || resolution.outcome === 'block' ? `${prefix} for ${resolution.healthDamage} damage${resolution.critical ? ' critical' : ''}${resolution.barrierAbsorbed > 0 ? ` (${resolution.barrierAbsorbed} absorbed)` : ''}.` : `${prefix} ${resolution.outcome}s against ${current.displayName}.`
  const eventType = resolution.outcome === 'miss' ? 'attackMissed' : resolution.outcome === 'dodge' ? 'attackDodged' : resolution.outcome === 'parry' ? 'attackParried' : resolution.outcome === 'block' ? 'attackBlocked' : resolution.critical ? 'criticalHit' : 'damageDealt'
  next.combat = event(next.combat, { text: message, type: 'player', eventType, source: packet.source, target: packet.target, data: { damage: resolution.healthDamage, critical: resolution.critical, absorbed: resolution.barrierAbsorbed } })
  if (resolution.outcome === 'hit' || resolution.outcome === 'block') {
    for (const applied of effectsToApply) if (!(applied.options?.secondaryOnly && !isSecondary) && (applied.chance >= 1 || context.rng.next() < applied.chance)) next = applyEffectToGame(next, applied.effectId, packet.source, packet.target, defenderStats, context, applied.options)
    if (packet.progressionSource?.type === 'equippedWeapon' && packet.progressionSource.proficiencyEligible && effectiveHealthDamage > 0) {
      for (const applied of getWeaponHitEffectHooks(next.progression, weaponProficiencyId, perkById)) if (applied.chance >= 1 || context.rng.next() < applied.chance) next = applyEffectToGame(next, applied.effectId, packet.source, packet.target, defenderStats, context)
      for (const hook of getWeaponHitResourceHooks(next.progression, weaponProficiencyId, perkById)) if (hook.chance >= 1 || context.rng.next() < hook.chance) next.combat = hook.resource === 'mana' ? { ...next.combat, mana: Math.min(next.combat.maxMana, next.combat.mana + hook.amount) } : { ...next.combat, stamina: Math.min(next.combat.maxStamina, next.combat.stamina + hook.amount) }
      for (const hook of getWeaponHitAdvanceHooks(next.progression, weaponProficiencyId, perkById)) if (hook.chance >= 1 || context.rng.next() < hook.chance) next.combat = { ...next.combat, playerAttackTimer: Math.max(0, next.combat.playerAttackTimer - next.combat.playerAttackInterval * hook.fraction) }
    }
    if (resolution.outcome === 'block' && weaponProficiencyId) for (const hook of getWeaponBlockEffectHooks(next.progression, weaponProficiencyId, perkById)) next = applyEffectToGame(next, hook.effectId, packet.source, { kind: 'player' }, attackerStats, context, { durationBonusSeconds: hook.durationSeconds })
  } else if (resolution.outcome === 'dodge' && weaponProficiencyId) {
    for (const hook of getWeaponDodgeEffectHooks(next.progression, weaponProficiencyId, perkById)) next = applyEffectToGame(next, hook.effectId, packet.source, { kind: 'player' }, attackerStats, context, { durationBonusSeconds: hook.durationSeconds })
  }
  if (allowSecondary && (weaponProficiencyId || magicAttack) && secondaryCount > 0 && (resolution.outcome === 'hit' || resolution.outcome === 'block')) {
    const secondaryTargets = next.combat.enemies.filter((enemy) => enemy.instanceId !== current.instanceId && !enemy.defeated).slice(0, secondaryCount)
    for (const secondaryTarget of secondaryTargets) {
      next = damageEnemy(next, secondaryTarget, { ...packet, target: { kind: 'enemy', instanceId: secondaryTarget.instanceId } }, attackerStats, context, `${prefix} (secondary)`, magicAttack ? effectsToApply : [], false, true)
    }
  }
  for (const progressionResult of progressionResults) {
    if (progressionResult.newProficiencyLevel > progressionResult.oldProficiencyLevel) next.combat = event(next.combat, { text: `${proficiencyById[progressionResult.proficiencyId].name} reached Proficiency Lv ${progressionResult.newProficiencyLevel}.`, type: 'system' })
    if (progressionResult.newMasteryLevel > progressionResult.oldMasteryLevel) next.combat = event(next.combat, { text: `Mastery Level increased to ${progressionResult.newMasteryLevel}.`, type: 'system' })
  }
  return resolveDefeatedEnemies(next, context)
}

export function useHealingPotion(game: GameState, stats: HunterCombatStats) {
  if (game.combat.phase !== 'active' || game.combat.potionCooldownRemaining > 0 || game.combat.playerHp >= stats.maxHealth || itemQuantity(game.inventory, 'item.healing-potion') <= 0) return game
  const amount = Math.min(combatBalance.healingPotionAmount, stats.maxHealth - game.combat.playerHp)
  return { ...game, inventory: removeItem(game.inventory, 'item.healing-potion', 1), combat: event({ ...game.combat, playerHp: game.combat.playerHp + amount, potionCooldownRemaining: combatBalance.potionCooldown, session: { ...game.combat.session, healing: game.combat.session.healing + amount } }, { text: `Healing Potion restored ${amount} HP.`, type: 'player', eventType: 'healingDone', source: { kind: 'player' }, target: { kind: 'player' }, data: { amount } }) }
}

export function advanceCombat(input: GameState, deltaSeconds: number, context: CombatContext, stats: HunterCombatStats): GameState {
  let game = clone(input)
  let remaining = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0)
  while (remaining > 0) {
    const step = Math.min(remaining, combatBalance.maxSimulationStepSeconds)
    game = advanceStep(game, step, context, stats)
    remaining -= step
  }
  return game
}

function advanceStep(game: GameState, step: number, context: CombatContext, stats: HunterCombatStats): GameState {
  let combat = game.combat
  if (combat.phase === 'recovery') {
    game = advanceCombatEffects(game, step, context, stats)
    combat = game.combat
    const effective = getPlayerStats(combat, stats, context, game.progression)
    const healed = Math.min(effective.maxHealth, combat.playerHp + combatBalance.recoveryHealthPerSecond * 3 * step)
    combat = { ...combat, playerHp: healed, maxPlayerHp: effective.maxHealth, stamina: clamp(combat.stamina + effective.staminaRegen * step * combatBalance.recoveryStaminaRegenMultiplier, 0, combat.maxStamina), mana: clamp(combat.mana + effective.manaRegen * step, 0, combat.maxMana), recoveryRemaining: combat.recoveryRemaining - step, session: { ...combat.session, elapsedSeconds: combat.session.elapsedSeconds + step } }
    if (combat.recoveryRemaining <= 0 && combat.combatLocationId && (healed / effective.maxHealth) >= combatBalance.safetyStopThreshold) {
      const location = context.locations[combat.combatLocationId]
      const group = location ? generateCombatGroup(location, context.rng, masteryLevelForXp(game.progression.masteryXp)) : []
      combat = location && group.length > 0 ? createActiveCombat(combat, location.id, group, stats, combat.groupNumber + 1) : { ...combat, phase: 'stopped', stopReason: 'completed' }
    } else if (combat.recoveryRemaining <= 0) combat = { ...combat, phase: 'stopped', stopReason: 'safety' }
    return { ...game, combat }
  }
  if (combat.phase !== 'active') return game
  combat = { ...combat, session: { ...combat.session, elapsedSeconds: combat.session.elapsedSeconds + step }, stanceCooldownRemaining: Math.max(0, combat.stanceCooldownRemaining - step), potionCooldownRemaining: Math.max(0, combat.potionCooldownRemaining - step), playerAttackTimer: combat.playerAttackTimer - step, stamina: clamp(combat.stamina + staminaDelta(combat, stats, context, game.progression, getEquippedWeaponProficiency(game.equipment)) * step, 0, combat.maxStamina), mana: clamp(combat.mana + getPlayerStats(combat, stats, context, game.progression).manaRegen * step, 0, combat.maxMana), spells: combat.spells.map((spell) => ({ ...spell, cooldownRemaining: Math.max(0, spell.cooldownRemaining - step) })) }
  game = { ...game, combat }
  game = advanceCombatEffects(game, step, context, stats)
  combat = game.combat
  if (combat.phase !== 'active') return game
  const effective = getPlayerStats(combat, stats, context, game.progression)
  if (combat.stamina <= 0 && (combat.techniques['careful-positioning'] || combat.techniques['heightened-reflexes'])) { combat = event({ ...combat, stamina: 0, techniques: { 'careful-positioning': false, 'heightened-reflexes': false } }, { text: 'Techniques deactivated: Stamina depleted.', type: 'system' }) }
  const protectiveRuntime = combat.spells.find((spell) => spell.spellId === 'spell.protective-sign')
  const protectiveSpell = context.spells['spell.protective-sign']
  const effectiveProtectiveSpell = protectiveSpell ? calculateEffectiveSpell(protectiveSpell, game.progression) : undefined
  if (protectiveRuntime?.autoEnabled && getBarrierAmount(combat.playerEffects, context.effects) <= 0 && combat.playerHp / effective.maxHealth <= 0.7 && protectiveRuntime.cooldownRemaining <= 0 && protectiveSpell && effectiveProtectiveSpell && combat.mana >= effectiveProtectiveSpell.manaCost) {
    game = castSpell({ ...game, combat }, protectiveSpell.id, stats, context)
    combat = game.combat
  }
  game = advanceEnemySpecials({ ...game, combat }, step, context, stats)
  combat = game.combat
  if (combat.phase !== 'active') return game
  if (combat.playerAttackTimer <= 0) {
    const target = combat.enemies.find((enemy) => enemy.instanceId === combat.selectedEnemyInstanceId && !enemy.defeated) ?? firstLivingEnemy(combat.enemies)
    if (target) {
      combat = { ...combat, playerAttackTimer: Math.max(combatBalance.minimumAttackInterval, effective.attackInterval) }
      const packet: DamagePacket = { ...componentFromAttack('physical', 1, true), source: { kind: 'player' }, target: { kind: 'enemy', instanceId: target.instanceId }, defensiveEligibility: { canMiss: true, dodgeable: true, parryable: true, blockable: true }, progressionSource: { type: 'equippedWeapon', proficiencyEligible: true } }
      game = damageEnemy({ ...game, combat }, target, packet, effective, context, `You hit ${target.displayName}`)
      combat = game.combat
    }
  }
  game = resolveDefeatedEnemies({ ...game, combat }, context)
  combat = game.combat
  if (combat.phase !== 'active') return game
  for (const enemy of combat.enemies) {
    if (enemy.defeated) continue
    const current = combat.enemies.find((candidate) => candidate.instanceId === enemy.instanceId)
    if (!current || current.defeated) continue
    const definition = context.enemies[current.enemyId]
    const updatedTimer = current.attackTimer - step
    combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === current.instanceId ? { ...candidate, attackTimer: updatedTimer } : candidate) }
    if (updatedTimer <= 0) {
      const playerStats = getPlayerStats(combat, stats, context, game.progression)
      const packet: DamagePacket = { ...componentFromAttack('physical', 1, true), source: { kind: 'enemy', instanceId: current.instanceId }, target: { kind: 'player' }, defensiveEligibility: { canMiss: true, dodgeable: true, parryable: true, blockable: true } }
      const enemyStats = getEnemyStats(combat, current, context)
      const result = resolveDamage(packet, enemyStats, playerStats, context.rng)
      const barrierResult = packet.ignoresBarrier ? { combat, absorbed: 0, remaining: result.mitigatedDamage, absorptions: [] as Array<{ effectId: string; amount: number; progressionCredit?: ProgressionCredit }> } : absorbDamage(combat, packet.target, result.mitigatedDamage, context.effects)
      const resolved = applyBarrierToDamage(result, barrierResult.absorbed)
      game = awardBarrierCredits({ ...game, combat: barrierResult.combat }, barrierResult.absorptions)
      combat = { ...game.combat, enemies: game.combat.enemies, playerHp: Math.max(0, game.combat.playerHp - resolved.healthDamage), lastDamageSource: definition.name, session: { ...game.combat.session, damageTaken: game.combat.session.damageTaken + resolved.healthDamage } }
      combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === current.instanceId ? { ...candidate, attackTimer: definition.attackInterval } : candidate) }
      const message = resolved.outcome === 'hit' || resolved.outcome === 'block' ? `${current.displayName} hits you for ${resolved.healthDamage}${resolved.barrierAbsorbed > 0 ? ` (${resolved.barrierAbsorbed} absorbed)` : ''}.` : `${current.displayName} ${resolved.outcome}s your attack.`
      const type = resolved.outcome === 'miss' ? 'attackMissed' : resolved.outcome === 'dodge' ? 'attackDodged' : resolved.outcome === 'parry' ? 'attackParried' : resolved.outcome === 'block' ? 'attackBlocked' : 'damageDealt'
      combat = event(combat, { text: message, type: 'enemy', eventType: type, source: packet.source, target: packet.target, data: { damage: resolved.healthDamage, absorbed: resolved.barrierAbsorbed } })
      if (resolved.outcome === 'parry') {
        let parryGame = { ...game, combat }
        for (const hook of getParryEffectHooks(parryGame.progression, getEquippedWeaponProficiency(parryGame.equipment), perkById)) parryGame = applyEffectToGame(parryGame, hook.effectId, { kind: 'player' }, { kind: 'player' }, playerStats, context)
        game = parryGame
        combat = game.combat
      }
      if (combat.playerHp <= 0) return { ...game, combat: event({ ...combat, phase: 'defeat', stopReason: 'defeat' }, { text: `Defeated by ${definition.name}.`, type: 'system', eventType: 'combatantDefeated', target: { kind: 'player' } }) }
    }
  }
  if (combat.playerHp / effective.maxHealth <= combatBalance.autoPotionThreshold) return useHealingPotion({ ...game, combat }, stats)
  return { ...game, combat }
}

function staminaDelta(combat: CombatState, stats: HunterCombatStats, context: CombatContext, progression: ProgressionState, weaponProficiencyId: WeaponProficiencyId | null) {
  const stance = stanceDefinitions[combat.stance]
  const drain = Object.entries(combat.techniques).reduce((sum, [id, active]) => sum + (active ? techniqueDefinitions[id as TechniqueId].staminaDrainPerSecond : 0), 0) * stance.staminaDrainMultiplier
  return getPlayerStats(combat, stats, context, progression).staminaRegen - drain * getTechniqueStaminaDrainMultiplier(progression, weaponProficiencyId, perkById)
}

function advanceCombatEffects(game: GameState, step: number, context: CombatContext, stats: HunterCombatStats): GameState {
  let combat = game.combat
  const playerTimers = advanceEffectTimers(combat.playerEffects, step, context.effects, combat.playerHp > 0)
  combat = updateActiveEffects(combat, { kind: 'player' }, playerTimers.effects)
  for (const expired of playerTimers.expired) combat = event(combat, { text: `${context.effects[expired.effectId]?.name ?? expired.effectId} expired.`, type: 'system', eventType: 'effectExpired', target: expired.target, data: { effectId: expired.effectId } })
  let next: GameState = { ...game, combat }
  for (const tick of playerTimers.ticks) next = resolvePeriodicEffect(next, tick.effect, tick.definition, stats, context)

  for (const enemy of next.combat.enemies) {
    if (enemy.defeated) continue
    const timers = advanceEffectTimers(enemy.effects, step, context.effects, enemy.currentHealth > 0)
    next.combat = updateActiveEffects(next.combat, { kind: 'enemy', instanceId: enemy.instanceId }, timers.effects)
    for (const expired of timers.expired) next.combat = event(next.combat, { text: `${context.effects[expired.effectId]?.name ?? expired.effectId} expired on ${enemy.displayName}.`, type: 'system', eventType: 'effectExpired', target: expired.target, data: { effectId: expired.effectId } })
    for (const tick of timers.ticks) next = resolvePeriodicEffect(next, tick.effect, tick.definition, stats, context)
  }
  return resolveDefeatedEnemies(next, context)
}

function resolvePeriodicEffect(game: GameState, effect: ActiveEffectInstance, definition: EffectDefinition, stats: HunterCombatStats, context: CombatContext): GameState {
  if (!definition.periodic) return game
  const operation = definition.periodic.operation
  if (operation.type === 'heal') {
    const amount = Math.max(0, operation.baseAmount * effect.stacks)
    if (effect.target.kind === 'player') {
      const effective = getPlayerStats(game.combat, stats, context, game.progression)
      const healed = Math.min(effective.maxHealth - game.combat.playerHp, amount)
      if (healed > 0 && effect.sourceProficiencyId) return applyEffectiveHealing(game, effect.sourceProficiencyId, healed, effect.source, 'Regeneration')
      return { ...game, combat: event({ ...game.combat, playerHp: game.combat.playerHp + healed, session: { ...game.combat.session, healing: game.combat.session.healing + healed } }, { text: `Regeneration restores ${healed} HP.`, type: 'system', eventType: 'healingDone', target: effect.target, data: { amount: healed } }) }
    }
    return game
  }
  const targetId = effect.target.kind === 'enemy' ? effect.target.instanceId : undefined
  const target = targetId ? game.combat.enemies.find((enemy) => enemy.instanceId === targetId) : undefined
  if (effect.target.kind === 'enemy' && (!target || target.defeated)) return game
  const attacker = effect.source.kind === 'player' ? getPlayerStats(game.combat, stats, context, game.progression) : target ? getEnemyStats(game.combat, target, context) : playerBaseStats(stats)
  const defender = effect.target.kind === 'player' ? getPlayerStats(game.combat, stats, context, game.progression) : target ? getEnemyStats(game.combat, target, context) : playerBaseStats(stats)
  const packet: DamagePacket = { ...componentFromAttack(operation.damageType, 0, operation.canCrit ?? false), source: effect.source, target: effect.target, baseDamage: operation.baseAmount * effect.stacks * (effect.snapshot?.periodicPowerMultiplier ?? 1), minMultiplier: 1, maxMultiplier: 1, ignoresArmor: operation.damageType === 'physical', defensiveEligibility: { canMiss: false, dodgeable: false, parryable: false, blockable: false } }
  const result = resolveDamage(packet, attacker, defender, context.rng)
  const barrierResult = absorbDamage(game.combat, effect.target, result.mitigatedDamage, context.effects)
  let resolved = applyBarrierToDamage(result, barrierResult.absorbed)
  let next = { ...game, combat: barrierResult.combat }
  if (effect.target.kind === 'enemy' && target) {
    const effectiveHealthDamage = Math.min(target.currentHealth, resolved.healthDamage)
    const dead = target.currentHealth - effectiveHealthDamage <= 0
    next.combat = { ...next.combat, enemies: next.combat.enemies.map((enemy) => enemy.instanceId === target.instanceId ? { ...enemy, currentHealth: Math.max(0, target.currentHealth - effectiveHealthDamage), defeated: dead, currentAction: dead ? null : enemy.currentAction } : enemy), session: { ...next.combat.session, damageDealt: next.combat.session.damageDealt + effectiveHealthDamage, highestHit: Math.max(next.combat.session.highestHit, effectiveHealthDamage) } }
    resolved = { ...resolved, healthDamage: effectiveHealthDamage, targetDied: dead }
    if (effect.progressionCredit?.mode === 'hp-damage' && effectiveHealthDamage > 0) next = awardCombatXp(next, effect.progressionCredit.proficiencyId, calculateProficiencyXpAward({ type: 'effective-hp-damage', amount: effectiveHealthDamage })).game
  } else if (effect.target.kind === 'player') {
    next.combat = { ...next.combat, playerHp: Math.max(0, next.combat.playerHp - resolved.healthDamage), session: { ...next.combat.session, damageTaken: next.combat.session.damageTaken + resolved.healthDamage } }
  }
  for (const absorption of barrierResult.absorptions) {
    if (absorption.progressionCredit?.mode !== 'barrier-absorb') continue
    next = awardCombatXp(next, absorption.progressionCredit.proficiencyId, calculateProficiencyXpAward({ type: 'barrier-absorption', amount: absorption.amount })).game
    next = restoreBarrierResource(next, absorption.progressionCredit.proficiencyId, absorption.amount)
  }
  next.combat = event(next.combat, { text: `${definition.name} deals ${resolved.healthDamage} damage${resolved.barrierAbsorbed > 0 ? ` (${resolved.barrierAbsorbed} absorbed)` : ''}.`, type: effect.source.kind === 'player' ? 'player' : 'enemy', eventType: 'effectTicked', source: effect.source, target: effect.target, data: { effectId: effect.effectId, damage: resolved.healthDamage, absorbed: resolved.barrierAbsorbed } })
  return next
}

function advanceEnemySpecials(game: GameState, step: number, context: CombatContext, stats: HunterCombatStats): GameState {
  let combat = game.combat
  for (const enemy of combat.enemies) {
    if (enemy.defeated) continue
    const definition = context.enemies[enemy.enemyId]
    let current = combat.enemies.find((candidate) => candidate.instanceId === enemy.instanceId) ?? enemy
    const actionDefinition = current.currentAction ? definition.actions.find((action) => action.id === current.currentAction?.actionId) : undefined
    if (current.currentAction && !actionDefinition) {
      current = { ...current, currentAction: null }
    } else if (current.currentAction && actionDefinition) {
      const action = { ...current.currentAction, remainingSeconds: current.currentAction.remainingSeconds - step }
      current = { ...current, currentAction: action }
      if (action.remainingSeconds <= 0) {
        const playerStats = getPlayerStats(combat, stats, context, game.progression)
        const enemyStats = getEnemyStats(combat, current, context)
        const packet: DamagePacket = { ...(actionDefinition.damage?.[0] ?? componentFromAttack('physical', actionDefinition.damageMultiplier, true)), source: { kind: 'enemy', instanceId: current.instanceId }, target: { kind: 'player' }, defensiveEligibility: { canMiss: true, dodgeable: actionDefinition.dodgeable, parryable: actionDefinition.parryable, blockable: actionDefinition.blockable } }
        const result = resolveDamage(packet, enemyStats, playerStats, context.rng)
        const barrierResult = absorbDamage(combat, packet.target, result.mitigatedDamage, context.effects)
        const resolved = applyBarrierToDamage(result, barrierResult.absorbed)
        current = { ...current, currentAction: null, specialCooldownRemaining: Math.max(0, actionDefinition.cooldownSeconds) }
        game = awardBarrierCredits({ ...game, combat: barrierResult.combat }, barrierResult.absorptions)
        combat = { ...game.combat, enemies: game.combat.enemies.map((candidate) => candidate.instanceId === current.instanceId ? current : candidate), playerHp: Math.max(0, game.combat.playerHp - resolved.healthDamage), session: { ...game.combat.session, damageTaken: game.combat.session.damageTaken + resolved.healthDamage }, lastDamageSource: definition.name }
        combat = event(combat, { text: `${current.displayName} resolves ${actionDefinition.name}: ${result.outcome}${resolved.healthDamage > 0 ? ` for ${resolved.healthDamage} damage` : ''}.`, type: 'enemy', eventType: 'actionResolved', source: packet.source, target: packet.target, data: { damage: resolved.healthDamage, absorbed: resolved.barrierAbsorbed } })
        if ((result.outcome === 'hit' || result.outcome === 'block') && actionDefinition.applyEffects) {
          for (const applied of actionDefinition.applyEffects) if (applied.chance >= 1 || context.rng.next() < applied.chance) combat = applyEffectToGame({ ...game, combat }, applied.effectId, packet.source, packet.target, playerStats, context).combat
        }
      }
    } else if (!current.currentAction) {
      const cooldown = Math.max(0, current.specialCooldownRemaining - step)
      current = { ...current, specialCooldownRemaining: cooldown }
      const selected = selectNextEnemyAction(definition, cooldown, context.rng)
      if (selected) {
        const preparation = Math.max(0, selected.preparationSeconds)
        current = { ...current, currentAction: { actionId: selected.id, remainingSeconds: preparation, totalSeconds: preparation, source: { kind: 'enemy', instanceId: current.instanceId }, target: { kind: 'player' }, startedSequence: combat.eventSequence + 1 }, specialCooldownRemaining: Math.max(0, selected.cooldownSeconds) }
        combat = event(combat, { text: `${current.displayName} begins ${selected.name}.`, type: 'enemy', eventType: 'actionStarted', source: { kind: 'enemy', instanceId: current.instanceId }, target: { kind: 'player' } })
      }
    }
    combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === current.instanceId ? current : candidate) }
    if (combat.playerHp <= 0) return { ...game, combat: event({ ...combat, phase: 'defeat', stopReason: 'defeat' }, { text: `Defeated by ${definition.name}'s special action.`, type: 'system', eventType: 'combatantDefeated', target: { kind: 'player' } }) }
  }
  return { ...game, combat }
}

function resolveDefeatedEnemies(game: GameState, context: CombatContext): GameState {
  let next = game
  for (const enemy of next.combat.enemies) {
    if (!enemy.defeated || enemy.rewardResolved) continue
    const reward = resolveEnemyReward(next, next.combat, enemy, context)
    next = reward.game
    next.combat = { ...reward.combat, enemies: next.combat.enemies.map((candidate) => candidate.instanceId === enemy.instanceId ? { ...candidate, currentHealth: 0, defeated: true, rewardResolved: true, currentAction: null, effects: [] } : candidate) }
    next.combat = event(next.combat, { text: `${enemy.displayName} was defeated.`, type: 'system', eventType: 'enemyDefeated', target: { kind: 'enemy', instanceId: enemy.instanceId }, data: { enemyId: enemy.enemyId } })
    for (const itemId of reward.droppedItemIds) next.combat = event(next.combat, { text: `Received ${context.items[itemId]?.name ?? itemId}.`, type: 'system' })
  }
  const alive = livingEnemies(next.combat.enemies)
  if (next.combat.phase === 'active' && alive.length === 0 && next.combat.enemies.length > 0) {
    const location = next.combat.combatLocationId ? context.locations[next.combat.combatLocationId] : undefined
    if (location) {
      const locationReward = resolveLocationClearReward(next, next.combat, location, context)
      next = locationReward.game
      next.combat = locationReward.combat
      for (const itemId of locationReward.droppedItemIds) next.combat = event(next.combat, { text: `Location bonus: ${context.items[itemId]?.name ?? itemId}.`, type: 'system' })
    }
    const cleared = { ...next.combat, selectedEnemyInstanceId: null, session: { ...next.combat.session, groupClears: next.combat.session.groupClears + 1 } }
    next.combat = cleared.playerHp / cleared.maxPlayerHp < combatBalance.safetyStopThreshold ? event({ ...cleared, phase: 'stopped', stopReason: 'safety' }, { text: 'Group cleared. Safety rule stopped the hunt below 20% HP.', type: 'system', eventType: 'groupCleared' }) : event({ ...cleared, phase: 'recovery', recoveryRemaining: combatBalance.recoverySeconds }, { text: `Group ${cleared.groupNumber} cleared. Recovery begins.`, type: 'system', eventType: 'recoveryStarted' })
  } else if (next.combat.phase === 'active' && (!next.combat.selectedEnemyInstanceId || !alive.some((enemy) => enemy.instanceId === next.combat.selectedEnemyInstanceId))) next.combat = { ...next.combat, selectedEnemyInstanceId: selectNextTarget(next.combat.enemies) }
  return next
}

export function stopHunt(combat: CombatState, definitions: Record<string, EffectDefinition> = effectById) {
  const shouldKeep = (effect: ActiveEffectInstance) => definitions[effect.effectId]?.persistence !== 'hunt' && definitions[effect.effectId]?.persistence !== 'between-enemies'
  return { ...combat, phase: 'stopped' as const, stopReason: 'manual' as const, recoveryRemaining: 0, playerEffects: combat.playerEffects.filter(shouldKeep), enemies: combat.enemies.map((enemy) => ({ ...enemy, currentAction: null, effects: [] })) }
}

export function syncCombatStats(game: GameState): GameState {
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques)
  const canonical = playerBaseStats(stats)
  return { ...game, combat: { ...game.combat, maxPlayerHp: canonical.maxHealth, playerHp: Math.min(game.combat.playerHp, canonical.maxHealth), playerAttackInterval: canonical.attackInterval, maxStamina: canonical.maxStamina, stamina: Math.min(game.combat.stamina, canonical.maxStamina), maxMana: canonical.maxMana, mana: Math.min(game.combat.mana, canonical.maxMana) } }
}
