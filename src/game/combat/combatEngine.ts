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
import { applyEffectById, absorbDamage, advanceEffectTimers, getBarrierAmount, updateActiveEffects } from './combatEffects'
import { interruptAction, selectNextEnemyAction } from './combatActions'
import { instantiateEnemies } from './combatState'
import { generateCombatGroup } from './combatGroupGenerator'
import { firstLivingEnemy, livingEnemies, selectNextTarget } from './combatTargeting'
import { resolveEnemyReward, resolveLocationClearReward } from './combatRewards'
import type { GameState } from '../gameState'
import type { ActiveEffectInstance, EffectDefinition } from './combatEffectTypes'
import type { CombatContext, CombatEvent, CombatEventType, CombatLogEntry, CombatState, CombatStats, CombatantRef, EnemyCombatInstance, StanceId, TechniqueId } from './combatTypes'

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

function getPlayerStats(combat: CombatState, stats: HunterCombatStats, context: CombatContext) {
  return calculateEffectiveCombatStats(playerBaseStats(stats), combat.playerEffects, context.effects)
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
  const group = generateCombatGroup(location, context.rng, Object.values(game.progression.skills).reduce((sum, skill) => sum + skill.level, 0))
  const session = { ...game.combat.session, elapsedSeconds: 0, groupClears: 0, enemiesDefeated: 0, damageDealt: 0, damageTaken: 0, healing: 0, xpGained: 0, itemsGained: 0, lootGained: {}, goldGained: 0, highestHit: 0 }
  const clean = clearEndedHuntEffects({ ...game.combat, session }, context.effects)
  const combat = createActiveCombat(clean, locationId, group, stats, 1)
  return { ...game, combat }
}

function createActiveCombat(previous: CombatState, locationId: string, enemyIds: string[], stats: HunterCombatStats, groupNumber: number): CombatState {
  const enemies = instantiateEnemies(enemyIds, groupNumber)
  const base = playerBaseStats(stats)
  return { ...previous, phase: 'active', combatLocationId: locationId, groupNumber, enemies, selectedEnemyInstanceId: enemies[0]?.instanceId ?? null, maxPlayerHp: base.maxHealth, playerHp: Math.min(previous.playerHp, base.maxHealth), playerAttackInterval: base.attackInterval, playerAttackTimer: Math.min(previous.playerAttackTimer, base.attackInterval), maxEnergy: base.maxEnergy, maxAdrenaline: base.maxAdrenaline, recoveryRemaining: 0, stopReason: null, lastDamageSource: null }
}

export function selectEnemy(combat: CombatState, instanceId: string) { return combat.enemies.some((enemy) => enemy.instanceId === instanceId && !enemy.defeated) ? { ...combat, selectedEnemyInstanceId: instanceId } : combat }

export function setStance(combat: CombatState, stance: StanceId, newStats: HunterCombatStats) {
  if (combat.stance === stance || (combat.phase === 'active' && combat.stanceCooldownRemaining > 0)) return combat
  const progress = combat.playerAttackInterval > 0 ? 1 - combat.playerAttackTimer / combat.playerAttackInterval : 0
  const active = combat.phase === 'active'
  const canonical = playerBaseStats(newStats)
  return { ...combat, stance, stanceCooldownRemaining: active ? combatBalance.stanceSwitchCooldown : 0, playerAttackInterval: canonical.attackInterval, playerAttackTimer: active ? Math.max(0, canonical.attackInterval * (1 - progress)) : canonical.attackInterval, maxPlayerHp: canonical.maxHealth, playerHp: Math.min(combat.playerHp, canonical.maxHealth), maxEnergy: canonical.maxEnergy, maxAdrenaline: canonical.maxAdrenaline }
}

export function toggleTechnique(combat: CombatState, technique: TechniqueId) { return { ...combat, techniques: { ...combat.techniques, [technique]: !combat.techniques[technique] } } }

export function castSpell(game: GameState, spellId: string, stats: HunterCombatStats, context: CombatContext): GameState {
  const spell = spellById[spellId]
  const combat = game.combat
  if (!spell || combat.phase !== 'active' || combat.adrenaline < spell.cost) return game
  const runtime = combat.spells.find((entry) => entry.spellId === spellId)
  if (!runtime || runtime.cooldownRemaining > 0) return game
  const target = combat.enemies.find((enemy) => enemy.instanceId === combat.selectedEnemyInstanceId && !enemy.defeated)
  if (spell.targetMode === 'selectedEnemy' && !target) return game

  let next: GameState = { ...game, combat: { ...combat, adrenaline: combat.adrenaline - spell.cost, spells: combat.spells.map((entry) => entry.spellId === spellId ? { ...entry, cooldownRemaining: spell.cooldownSeconds } : entry) } }
  const source: CombatantRef = { kind: 'player' }
  const targetRef: CombatantRef = target ? { kind: 'enemy', instanceId: target.instanceId } : source

  if (spell.damage > 0 && target) {
    const packet: DamagePacket = { ...componentFromAttack(spell.damageType ?? 'fire', 0, false), source, target: targetRef, baseDamage: spell.damage, minMultiplier: combatBalance.baseDamageVarianceMin, maxMultiplier: combatBalance.baseDamageVarianceMax, defensiveEligibility: { canMiss: spell.canMiss ?? true, dodgeable: spell.dodgeable ?? false, parryable: spell.parryable ?? false, blockable: spell.blockable ?? false } }
    next = damageEnemy(next, target, packet, getPlayerStats(next.combat, stats, context), context, `You cast ${spell.name}`, spell.applyEffects ?? [])
    if (next.combat.phase !== 'active') return next
  }
  if (spell.barrierAmount !== undefined) {
    next = applyEffectToGame(next, spell.barrierEffectId ?? 'effect.protective-sign', source, source, getPlayerStats(next.combat, stats, context), context, { absorbAmount: spell.barrierAmount, power: spell.barrierAmount })
  }
  if (spell.interruptsAction && target) {
    const definition = context.enemies[target.enemyId]
    const action = target.currentAction ? definition.actions.find((candidate) => candidate.id === target.currentAction?.actionId) : undefined
    const interrupted = interruptAction(target.currentAction, action)
    if (!interrupted.interrupted) return game
    next.combat = { ...next.combat, enemies: next.combat.enemies.map((enemy) => enemy.instanceId === target.instanceId ? { ...enemy, currentAction: null, specialCooldownRemaining: interrupted.cooldownSeconds } : enemy) }
    next.combat = event(next.combat, { text: `${spell.name} interrupts ${target.displayName}'s ${action?.name ?? 'action'}.`, type: 'player', eventType: 'actionInterrupted', source, target: targetRef })
  }
  return next
}

function applyEffectToGame(game: GameState, effectId: string, source: CombatantRef, target: CombatantRef, targetStats: CombatStats, context: CombatContext, options: { absorbAmount?: number; power?: number } = {}) {
  const result = applyEffectById(game.combat, effectId, context.effects, source, target, { targetStats, ...options })
  if (!result.instance || result.outcome === 'rejected' || result.outcome === 'missing-target') return game
  const eventType: CombatEventType = result.outcome === 'refreshed' ? 'effectRefreshed' : result.outcome === 'stacked' ? 'effectStacked' : 'effectApplied'
  const definition = context.effects[effectId]
  const suffix = result.instance.stacks > 1 ? ` x${result.instance.stacks}` : ''
  return { ...game, combat: event(result.combat, { text: `${definition.name}${suffix} applied to ${target.kind === 'player' ? 'you' : game.combat.enemies.find((enemy) => enemy.instanceId === target.instanceId)?.displayName ?? 'target'}.`, type: source.kind === 'player' ? 'player' : 'enemy', eventType, source, target, data: { effectId, stacks: result.instance.stacks } }) }
}

function damageEnemy(game: GameState, target: EnemyCombatInstance, packet: DamagePacket, attackerStats: CombatStats, context: CombatContext, prefix: string, effectsToApply: Array<{ effectId: string; chance: number }> = []) {
  const current = game.combat.enemies.find((enemy) => enemy.instanceId === target.instanceId)
  if (!current || current.defeated) return game
  const defenderStats = getEnemyStats(game.combat, current, context)
  let resolution = resolveDamage(packet, attackerStats, defenderStats, context.rng)
  const barrierResult = packet.ignoresBarrier ? { combat: game.combat, absorbed: 0, remaining: resolution.mitigatedDamage } : absorbDamage(game.combat, packet.target, resolution.mitigatedDamage, context.effects)
  resolution = applyBarrierToDamage(resolution, barrierResult.absorbed)
  const defeated = current.currentHealth - resolution.healthDamage <= 0
  let next: GameState = { ...game, combat: { ...barrierResult.combat, enemies: barrierResult.combat.enemies.map((enemy) => enemy.instanceId === current.instanceId ? { ...enemy, currentHealth: Math.max(0, enemy.currentHealth - resolution.healthDamage), defeated, currentAction: defeated ? null : enemy.currentAction } : enemy), adrenaline: clamp(game.combat.adrenaline + resolution.healthDamage * combatBalance.adrenalinePerDamage * attackerStats.adrenalineGeneration, 0, game.combat.maxAdrenaline), session: { ...game.combat.session, damageDealt: game.combat.session.damageDealt + resolution.healthDamage, highestHit: Math.max(game.combat.session.highestHit, resolution.healthDamage) } } }
  const message = resolution.outcome === 'hit' || resolution.outcome === 'block' ? `${prefix} for ${resolution.healthDamage} damage${resolution.critical ? ' critical' : ''}${resolution.barrierAbsorbed > 0 ? ` (${resolution.barrierAbsorbed} absorbed)` : ''}.` : `${prefix} ${resolution.outcome}s against ${current.displayName}.`
  const eventType = resolution.outcome === 'miss' ? 'attackMissed' : resolution.outcome === 'dodge' ? 'attackDodged' : resolution.outcome === 'parry' ? 'attackParried' : resolution.outcome === 'block' ? 'attackBlocked' : resolution.critical ? 'criticalHit' : 'damageDealt'
  next.combat = event(next.combat, { text: message, type: 'player', eventType, source: packet.source, target: packet.target, data: { damage: resolution.healthDamage, critical: resolution.critical, absorbed: resolution.barrierAbsorbed } })
  if (resolution.outcome === 'hit' || resolution.outcome === 'block') {
    for (const applied of effectsToApply) if (applied.chance >= 1 || context.rng.next() < applied.chance) next = applyEffectToGame(next, applied.effectId, packet.source, packet.target, defenderStats, context)
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
    const effective = getPlayerStats(combat, stats, context)
    const healed = Math.min(effective.maxHealth, combat.playerHp + combatBalance.recoveryHealthPerSecond * 3 * step)
    combat = { ...combat, playerHp: healed, maxPlayerHp: effective.maxHealth, energy: clamp(combat.energy + effective.energyRegen * step * 3, 0, combat.maxEnergy), recoveryRemaining: combat.recoveryRemaining - step, session: { ...combat.session, elapsedSeconds: combat.session.elapsedSeconds + step } }
    if (combat.recoveryRemaining <= 0 && combat.combatLocationId && (healed / effective.maxHealth) >= combatBalance.safetyStopThreshold) {
      const location = context.locations[combat.combatLocationId]
      const group = location ? generateCombatGroup(location, context.rng, Object.values(game.progression.skills).reduce((sum, skill) => sum + skill.level, 0)) : []
      combat = location && group.length > 0 ? createActiveCombat(combat, location.id, group, stats, combat.groupNumber + 1) : { ...combat, phase: 'stopped', stopReason: 'completed' }
    } else if (combat.recoveryRemaining <= 0) combat = { ...combat, phase: 'stopped', stopReason: 'safety' }
    return { ...game, combat }
  }
  if (combat.phase !== 'active') return game
  combat = { ...combat, session: { ...combat.session, elapsedSeconds: combat.session.elapsedSeconds + step }, stanceCooldownRemaining: Math.max(0, combat.stanceCooldownRemaining - step), potionCooldownRemaining: Math.max(0, combat.potionCooldownRemaining - step), playerAttackTimer: combat.playerAttackTimer - step, energy: clamp(combat.energy + energyDelta(combat, stats, context) * step, 0, combat.maxEnergy), adrenaline: clamp(combat.adrenaline, 0, combat.maxAdrenaline), spells: combat.spells.map((spell) => ({ ...spell, cooldownRemaining: Math.max(0, spell.cooldownRemaining - step) })) }
  game = { ...game, combat }
  game = advanceCombatEffects(game, step, context, stats)
  combat = game.combat
  if (combat.phase !== 'active') return game
  const effective = getPlayerStats(combat, stats, context)
  if (combat.energy <= 0 && (combat.techniques['careful-positioning'] || combat.techniques['heightened-reflexes'])) { combat = event({ ...combat, energy: 0, techniques: { 'careful-positioning': false, 'heightened-reflexes': false } }, { text: 'Techniques deactivated: Energy depleted.', type: 'system' }) }
  const protectiveRuntime = combat.spells.find((spell) => spell.spellId === 'spell.protective-sign')
  const protectiveSpell = context.spells['spell.protective-sign']
  if (protectiveRuntime?.autoEnabled && getBarrierAmount(combat.playerEffects, context.effects) <= 0 && combat.playerHp / effective.maxHealth <= 0.7 && combat.adrenaline >= 25 && protectiveRuntime.cooldownRemaining <= 0 && protectiveSpell) {
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
      const packet: DamagePacket = { ...componentFromAttack('physical', 1, true), source: { kind: 'player' }, target: { kind: 'enemy', instanceId: target.instanceId }, defensiveEligibility: { canMiss: true, dodgeable: true, parryable: true, blockable: true } }
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
      const playerStats = getPlayerStats(combat, stats, context)
      const packet: DamagePacket = { ...componentFromAttack('physical', 1, true), source: { kind: 'enemy', instanceId: current.instanceId }, target: { kind: 'player' }, defensiveEligibility: { canMiss: true, dodgeable: true, parryable: true, blockable: true } }
      const enemyStats = getEnemyStats(combat, current, context)
      const result = resolveDamage(packet, enemyStats, playerStats, context.rng)
      const barrierResult = packet.ignoresBarrier ? { combat, absorbed: 0, remaining: result.mitigatedDamage } : absorbDamage(combat, packet.target, result.mitigatedDamage, context.effects)
      const resolved = applyBarrierToDamage(result, barrierResult.absorbed)
      combat = { ...barrierResult.combat, enemies: barrierResult.combat.enemies, playerHp: Math.max(0, combat.playerHp - resolved.healthDamage), adrenaline: clamp(combat.adrenaline + (resolved.healthDamage + resolved.barrierAbsorbed) * combatBalance.adrenalinePerDamageTaken * playerStats.adrenalineGeneration, 0, combat.maxAdrenaline), lastDamageSource: definition.name, session: { ...combat.session, damageTaken: combat.session.damageTaken + resolved.healthDamage } }
      combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === current.instanceId ? { ...candidate, attackTimer: definition.attackInterval } : candidate) }
      const message = resolved.outcome === 'hit' || resolved.outcome === 'block' ? `${current.displayName} hits you for ${resolved.healthDamage}${resolved.barrierAbsorbed > 0 ? ` (${resolved.barrierAbsorbed} absorbed)` : ''}.` : `${current.displayName} ${resolved.outcome}s your attack.`
      const type = resolved.outcome === 'miss' ? 'attackMissed' : resolved.outcome === 'dodge' ? 'attackDodged' : resolved.outcome === 'parry' ? 'attackParried' : resolved.outcome === 'block' ? 'attackBlocked' : 'damageDealt'
      combat = event(combat, { text: message, type: 'enemy', eventType: type, source: packet.source, target: packet.target, data: { damage: resolved.healthDamage, absorbed: resolved.barrierAbsorbed } })
      if (combat.playerHp <= 0) return { ...game, combat: event({ ...combat, phase: 'defeat', stopReason: 'defeat' }, { text: `Defeated by ${definition.name}.`, type: 'system', eventType: 'combatantDefeated', target: { kind: 'player' } }) }
    }
  }
  if (combat.playerHp / effective.maxHealth <= combatBalance.autoPotionThreshold) return useHealingPotion({ ...game, combat }, stats)
  return { ...game, combat }
}

function energyDelta(combat: CombatState, stats: HunterCombatStats, context: CombatContext) {
  const stance = stanceDefinitions[combat.stance]
  const drain = Object.entries(combat.techniques).reduce((sum, [id, active]) => sum + (active ? techniqueDefinitions[id as TechniqueId].drainPerSecond : 0), 0) * stance.techniqueDrain
  return getPlayerStats(combat, stats, context).energyRegen - drain
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
      const effective = getPlayerStats(game.combat, stats, context)
      const healed = Math.min(effective.maxHealth - game.combat.playerHp, amount)
      return { ...game, combat: event({ ...game.combat, playerHp: game.combat.playerHp + healed, session: { ...game.combat.session, healing: game.combat.session.healing + healed } }, { text: `Regeneration restores ${healed} HP.`, type: 'system', eventType: 'healingDone', target: effect.target, data: { amount: healed } }) }
    }
    return game
  }
  const targetId = effect.target.kind === 'enemy' ? effect.target.instanceId : undefined
  const target = targetId ? game.combat.enemies.find((enemy) => enemy.instanceId === targetId) : undefined
  if (effect.target.kind === 'enemy' && (!target || target.defeated)) return game
  const attacker = effect.source.kind === 'player' ? getPlayerStats(game.combat, stats, context) : target ? getEnemyStats(game.combat, target, context) : playerBaseStats(stats)
  const defender = effect.target.kind === 'player' ? getPlayerStats(game.combat, stats, context) : target ? getEnemyStats(game.combat, target, context) : playerBaseStats(stats)
  const packet: DamagePacket = { ...componentFromAttack(operation.damageType, 0, operation.canCrit ?? false), source: effect.source, target: effect.target, baseDamage: operation.baseAmount * effect.stacks, minMultiplier: 1, maxMultiplier: 1, ignoresArmor: operation.damageType === 'physical', defensiveEligibility: { canMiss: false, dodgeable: false, parryable: false, blockable: false } }
  const result = resolveDamage(packet, attacker, defender, context.rng)
  const barrierResult = absorbDamage(game.combat, effect.target, result.mitigatedDamage, context.effects)
  const resolved = applyBarrierToDamage(result, barrierResult.absorbed)
  let next = { ...game, combat: barrierResult.combat }
  if (effect.target.kind === 'enemy' && target) {
    const dead = target.currentHealth - resolved.healthDamage <= 0
    next.combat = { ...next.combat, enemies: next.combat.enemies.map((enemy) => enemy.instanceId === target.instanceId ? { ...enemy, currentHealth: Math.max(0, target.currentHealth - resolved.healthDamage), defeated: dead, currentAction: dead ? null : enemy.currentAction } : enemy), session: { ...next.combat.session, damageDealt: next.combat.session.damageDealt + resolved.healthDamage, highestHit: Math.max(next.combat.session.highestHit, resolved.healthDamage) } }
  } else if (effect.target.kind === 'player') {
    next.combat = { ...next.combat, playerHp: Math.max(0, next.combat.playerHp - resolved.healthDamage), session: { ...next.combat.session, damageTaken: next.combat.session.damageTaken + resolved.healthDamage } }
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
        const playerStats = getPlayerStats(combat, stats, context)
        const enemyStats = getEnemyStats(combat, current, context)
        const packet: DamagePacket = { ...(actionDefinition.damage?.[0] ?? componentFromAttack('physical', actionDefinition.damageMultiplier, true)), source: { kind: 'enemy', instanceId: current.instanceId }, target: { kind: 'player' }, defensiveEligibility: { canMiss: true, dodgeable: actionDefinition.dodgeable, parryable: actionDefinition.parryable, blockable: actionDefinition.blockable } }
        const result = resolveDamage(packet, enemyStats, playerStats, context.rng)
        const barrierResult = absorbDamage(combat, packet.target, result.mitigatedDamage, context.effects)
        const resolved = applyBarrierToDamage(result, barrierResult.absorbed)
        current = { ...current, currentAction: null, specialCooldownRemaining: Math.max(0, actionDefinition.cooldownSeconds) }
        combat = { ...barrierResult.combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === current.instanceId ? current : candidate), playerHp: Math.max(0, combat.playerHp - resolved.healthDamage), session: { ...combat.session, damageTaken: combat.session.damageTaken + resolved.healthDamage }, lastDamageSource: definition.name }
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
    next.combat = event(next.combat, { text: `${enemy.displayName} was defeated. +${reward.xp} XP received.`, type: 'system', eventType: 'enemyDefeated', target: { kind: 'enemy', instanceId: enemy.instanceId }, data: { enemyId: enemy.enemyId, xp: reward.xp } })
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
    const cleared = { ...next.combat, selectedEnemyInstanceId: null, session: { ...next.combat.session, groupClears: next.combat.session.groupClears + 1 }, adrenaline: next.combat.adrenaline * combatBalance.adrenalineCarryover }
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
  return { ...game, combat: { ...game.combat, maxPlayerHp: canonical.maxHealth, playerHp: Math.min(game.combat.playerHp, canonical.maxHealth), playerAttackInterval: canonical.attackInterval, maxEnergy: canonical.maxEnergy, maxAdrenaline: canonical.maxAdrenaline } }
}
