import { addItem, itemQuantity, removeItem } from '../inventory/inventoryLogic'
import { discoverItem } from '../collection/collectionLogic'
import { calculateHunterCombatStats, type HunterCombatStats } from '../equipment/derivedStats'
import { stanceDefinitions } from '../data/stances'
import { techniqueDefinitions } from '../data/techniques'
import { spellById } from '../data/spells'
import { enemyById } from '../data/enemies'
import { combatLocationById } from '../data/world/combatLocations'
import { itemById } from '../data/items'
import { combatBalance, clamp } from './combatBalance'
import { calculateMitigatedDamage, resolveDefensiveOutcome } from './combatMath'
import { instantiateEnemies } from './combatState'
import { generateCombatGroup } from './combatGroupGenerator'
import { firstLivingEnemy, livingEnemies, selectNextTarget } from './combatTargeting'
import { resolveEnemyReward, resolveLocationClearReward } from './combatRewards'
import type { GameState } from '../gameState'
import type { CombatContext, CombatEvent, CombatLogEntry, CombatState, EnemyCombatInstance, StanceId, TechniqueId } from './combatTypes'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function event(state: CombatState, item: CombatEvent) {
  const nextSequence = state.eventSequence + 1
  const log: CombatLogEntry = { id: nextSequence, text: item.text, type: item.type, time: `T+${Math.floor(state.session.elapsedSeconds)}s` }
  return { ...state, eventSequence: nextSequence, log: [log, ...state.log].slice(0, 30) }
}

export function createCombatContext(rng: CombatContext['rng']): CombatContext {
  return { enemies: enemyById, locations: combatLocationById, spells: Object.fromEntries(Object.values(spellById).map((spell) => [spell.id, spell])), items: itemById, rng }
}

export function startHunt(game: GameState, locationId: string, stats: HunterCombatStats, context: CombatContext): GameState {
  const location = context.locations[locationId]
  if (!location) return game
  const group = generateCombatGroup(location, context.rng, Object.values(game.progression.skills).reduce((sum, skill) => sum + skill.level, 0))
  const session = { ...game.combat.session, elapsedSeconds: 0, groupClears: 0, enemiesDefeated: 0, damageDealt: 0, damageTaken: 0, healing: 0, xpGained: 0, itemsGained: 0, lootGained: {}, goldGained: 0, highestHit: 0 }
  const combat = createActiveCombat({ ...game.combat, session }, locationId, group, stats, 1)
  return { ...game, combat }
}

function createActiveCombat(previous: CombatState, locationId: string, enemyIds: string[], stats: HunterCombatStats, groupNumber: number): CombatState {
  const enemies = instantiateEnemies(enemyIds, groupNumber)
  return { ...previous, phase: 'active', combatLocationId: locationId, groupNumber, enemies, selectedEnemyInstanceId: enemies[0]?.instanceId ?? null, maxPlayerHp: stats.maxHealth, playerHp: Math.min(previous.playerHp, stats.maxHealth), playerAttackInterval: stats.attackInterval, playerAttackTimer: Math.min(previous.playerAttackTimer, stats.attackInterval), maxEnergy: stats.maxEnergy, maxAdrenaline: stats.maxAdrenaline, recoveryRemaining: 0, stopReason: null, lastDamageSource: null }
}

export function selectEnemy(combat: CombatState, instanceId: string) { return combat.enemies.some((enemy) => enemy.instanceId === instanceId && !enemy.defeated) ? { ...combat, selectedEnemyInstanceId: instanceId } : combat }

export function setStance(combat: CombatState, stance: StanceId, newStats: HunterCombatStats) {
  if (combat.stance === stance || (combat.phase === 'active' && combat.stanceCooldownRemaining > 0)) return combat
  const progress = combat.playerAttackInterval > 0 ? 1 - combat.playerAttackTimer / combat.playerAttackInterval : 0
  const active = combat.phase === 'active'
  return { ...combat, stance, stanceCooldownRemaining: active ? combatBalance.stanceSwitchCooldown : 0, playerAttackInterval: newStats.attackInterval, playerAttackTimer: active ? Math.max(0, newStats.attackInterval * (1 - progress)) : newStats.attackInterval, maxPlayerHp: newStats.maxHealth, playerHp: Math.min(combat.playerHp, newStats.maxHealth) }
}

export function toggleTechnique(combat: CombatState, technique: TechniqueId) { return { ...combat, techniques: { ...combat.techniques, [technique]: !combat.techniques[technique] } } }

export function castSpell(game: GameState, spellId: string, stats: HunterCombatStats, context: CombatContext): GameState {
  const spell = spellById[spellId]
  const combat = game.combat
  if (!spell || combat.phase !== 'active' || combat.adrenaline < spell.cost) return game
  const runtime = combat.spells.find((entry) => entry.spellId === spellId)
  if (!runtime || runtime.cooldownRemaining > 0) return game
  if (spell.targetMode === 'selectedEnemy' && !combat.enemies.some((enemy) => enemy.instanceId === combat.selectedEnemyInstanceId && !enemy.defeated)) return game
  let next = { ...game, combat: { ...combat, adrenaline: combat.adrenaline - spell.cost, spells: combat.spells.map((entry) => entry.spellId === spellId ? { ...entry, cooldownRemaining: spell.cooldownSeconds } : entry) } }
  if (spellId === 'spell.flame-blast') next = damageSelectedEnemy(next, spell.damage, stats, context, 'You cast Flame Blast')
  if (spellId === 'spell.protective-sign') next.combat = event({ ...next.combat, shield: 65 }, { text: 'Protective Sign created a 65-point shield.', type: 'player' })
  if (spellId === 'spell.disrupting-pulse') {
    const target = next.combat.enemies.find((enemy) => enemy.instanceId === next.combat.selectedEnemyInstanceId)
    const definition = target ? context.enemies[target.enemyId] : undefined
    const action = target?.currentAction && definition?.actions.find((candidate) => candidate.id === target.currentAction?.actionId)
    if (!target || !action?.interruptible) return game
    next.combat = { ...next.combat, adrenaline: combat.adrenaline - spell.cost, enemies: next.combat.enemies.map((enemy) => enemy.instanceId === target.instanceId ? { ...enemy, currentAction: null, specialCooldownRemaining: action.cooldownSeconds } : enemy) }
    next.combat = event(next.combat, { text: `Disrupting Pulse interrupts ${target.displayName}'s ${action.name}.`, type: 'player' })
  }
  return next
}

function damageSelectedEnemy(game: GameState, rawDamage: number, stats: HunterCombatStats, context: CombatContext, prefix: string): GameState {
  const target = game.combat.enemies.find((enemy) => enemy.instanceId === game.combat.selectedEnemyInstanceId && !enemy.defeated)
  if (!target) return game
  const definition = context.enemies[target.enemyId]
  const damage = calculateMitigatedDamage(rawDamage, definition.defense, definition.resistances.includes('fire') ? 0.2 : 0)
  const enemies = game.combat.enemies.map((enemy) => enemy.instanceId === target.instanceId ? { ...enemy, currentHealth: Math.max(0, enemy.currentHealth - damage), defeated: enemy.currentHealth - damage <= 0, currentAction: enemy.currentHealth - damage <= 0 ? null : enemy.currentAction } : enemy)
  let next: GameState = { ...game, combat: { ...game.combat, enemies, adrenaline: clamp(game.combat.adrenaline + damage * combatBalance.adrenalinePerDamage, 0, game.combat.maxAdrenaline), session: { ...game.combat.session, damageDealt: game.combat.session.damageDealt + damage, highestHit: Math.max(game.combat.session.highestHit, damage) } } }
  next.combat = event(next.combat, { text: `${prefix} for ${damage} damage.`, type: 'player' })
  return resolveDefeatedEnemies(next, context)
}

export function useHealingPotion(game: GameState, stats: HunterCombatStats) {
  if (game.combat.phase !== 'active' || game.combat.potionCooldownRemaining > 0 || game.combat.playerHp >= stats.maxHealth || itemQuantity(game.inventory, 'item.healing-potion') <= 0) return game
  const amount = Math.min(combatBalance.healingPotionAmount, stats.maxHealth - game.combat.playerHp)
  return { ...game, inventory: removeItem(game.inventory, 'item.healing-potion', 1), combat: event({ ...game.combat, playerHp: game.combat.playerHp + amount, potionCooldownRemaining: combatBalance.potionCooldown, session: { ...game.combat.session, healing: game.combat.session.healing + amount } }, { text: `Healing Potion restored ${amount} HP.`, type: 'player' }) }
}

export function advanceCombat(input: GameState, deltaSeconds: number, context: CombatContext, stats: HunterCombatStats): GameState {
  let game = clone(input)
  let remaining = Math.max(0, deltaSeconds)
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
    const healed = Math.min(stats.maxHealth, combat.playerHp + combatBalance.recoveryHealthPerSecond * 3 * step)
    combat = { ...combat, playerHp: healed, energy: clamp(combat.energy + stats.energyRegen * step * 3, 0, combat.maxEnergy), recoveryRemaining: combat.recoveryRemaining - step, session: { ...combat.session, elapsedSeconds: combat.session.elapsedSeconds + step } }
    if (combat.recoveryRemaining <= 0 && combat.combatLocationId && (healed / stats.maxHealth) >= 0.2) {
      const location = context.locations[combat.combatLocationId]
      const group = location ? generateCombatGroup(location, context.rng, Object.values(game.progression.skills).reduce((sum, skill) => sum + skill.level, 0)) : []
      combat = location && group.length > 0 ? createActiveCombat(combat, location.id, group, stats, combat.groupNumber + 1) : { ...combat, phase: 'stopped', stopReason: 'completed' }
    }
    else if (combat.recoveryRemaining <= 0) combat = { ...combat, phase: 'stopped', stopReason: 'safety' }
    return { ...game, combat }
  }
  if (combat.phase !== 'active') return game
  combat = { ...combat, session: { ...combat.session, elapsedSeconds: combat.session.elapsedSeconds + step }, stanceCooldownRemaining: Math.max(0, combat.stanceCooldownRemaining - step), potionCooldownRemaining: Math.max(0, combat.potionCooldownRemaining - step), playerAttackTimer: combat.playerAttackTimer - step, energy: clamp(combat.energy + energyDelta(combat, stats) * step, 0, combat.maxEnergy), adrenaline: clamp(combat.adrenaline, 0, combat.maxAdrenaline), spells: combat.spells.map((spell) => ({ ...spell, cooldownRemaining: Math.max(0, spell.cooldownRemaining - step) })) }
  if (combat.energy <= 0 && (combat.techniques['careful-positioning'] || combat.techniques['heightened-reflexes'])) { combat = event({ ...combat, energy: 0, techniques: { 'careful-positioning': false, 'heightened-reflexes': false } }, { text: 'Techniques deactivated: Energy depleted.', type: 'system' }) }
  const protectiveRuntime = combat.spells.find((spell) => spell.spellId === 'spell.protective-sign')
  if (protectiveRuntime?.autoEnabled && combat.shield <= 0 && combat.playerHp / stats.maxHealth <= 0.7 && combat.adrenaline >= 25 && protectiveRuntime.cooldownRemaining <= 0) {
    game = castSpell({ ...game, combat }, 'spell.protective-sign', stats, context)
    combat = game.combat
  }
  combat = advanceEnemySpecials({ ...game, combat }, step, context, stats).combat
  if (combat.phase !== 'active') return { ...game, combat }
  if (combat.playerAttackTimer <= 0) {
    const target = combat.enemies.find((enemy) => enemy.instanceId === combat.selectedEnemyInstanceId && !enemy.defeated) ?? firstLivingEnemy(combat.enemies)
    if (target) {
      combat = { ...combat, playerAttackTimer: combat.playerAttackInterval }
      const definition = context.enemies[target.enemyId]
      const packBonus = definition.id === 'enemy.grey-wolf' && livingEnemies(combat.enemies).filter((enemy) => enemy.enemyId === definition.id).length > 1 ? 1.05 : 1
      const raw = stats.attack * packBonus
      const outcome = resolveDefensiveOutcome(stats.accuracy, definition.defense, definition, { dodgeable: true, parryable: true, blockable: true, interruptible: false }, context.rng)
      if (outcome === 'hit' || outcome === 'block') { const critical = context.rng.next() < stats.critChance; const dealt = calculateMitigatedDamage(raw * (critical ? stats.critDamage : 1), definition.defense); const finalDamage = outcome === 'block' ? Math.max(1, Math.round(dealt * combatBalance.blockReduction)) : dealt; combat = { ...combat, enemies: combat.enemies.map((enemy) => enemy.instanceId === target.instanceId ? { ...enemy, currentHealth: Math.max(0, enemy.currentHealth - finalDamage), defeated: enemy.currentHealth - finalDamage <= 0, currentAction: enemy.currentHealth - finalDamage <= 0 ? null : enemy.currentAction } : enemy), adrenaline: clamp(combat.adrenaline + finalDamage * combatBalance.adrenalinePerDamage * stats.adrenalineGeneration, 0, combat.maxAdrenaline), session: { ...combat.session, damageDealt: combat.session.damageDealt + finalDamage, highestHit: Math.max(combat.session.highestHit, finalDamage) } }; combat = event(combat, { text: `You hit ${target.displayName} for ${finalDamage}${critical ? ' critical' : ''}.`, type: 'player' }) }
      else combat = event(combat, { text: `Your attack ${outcome}s against ${target.displayName}.`, type: 'system' })
    }
  }
  game = resolveDefeatedEnemies({ ...game, combat }, context)
  combat = game.combat
  if (combat.phase !== 'active') return { ...game, combat }
  for (const enemy of combat.enemies) {
    if (enemy.defeated) continue
    const definition = context.enemies[enemy.enemyId]
    const updated = { ...enemy, attackTimer: enemy.attackTimer - step }
    combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === enemy.instanceId ? updated : candidate) }
    if (updated.attackTimer <= 0) {
      const outcome = resolveDefensiveOutcome(definition.accuracy, stats.defense, stats, { dodgeable: true, parryable: true, blockable: true, interruptible: false }, context.rng)
      combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === enemy.instanceId ? { ...candidate, attackTimer: definition.attackInterval } : candidate) }
      if (outcome === 'hit' || outcome === 'block') { const damage = calculateMitigatedDamage(definition.attack, stats.defense); const finalDamage = outcome === 'block' ? Math.max(1, Math.round(damage * combatBalance.blockReduction)) : damage; const absorbed = Math.min(combat.shield, finalDamage); const hpDamage = finalDamage - absorbed; combat = { ...combat, shield: combat.shield - absorbed, playerHp: Math.max(0, combat.playerHp - hpDamage), adrenaline: clamp(combat.adrenaline + finalDamage * combatBalance.adrenalinePerDamageTaken * stats.adrenalineGeneration, 0, combat.maxAdrenaline), lastDamageSource: definition.name, session: { ...combat.session, damageTaken: combat.session.damageTaken + hpDamage } }; combat = event(combat, { text: `${enemy.displayName} hits you for ${hpDamage}.`, type: 'enemy' }) }
      else combat = event(combat, { text: `${enemy.displayName} ${outcome}s your attack.`, type: 'system' })
      if (combat.playerHp <= 0) return { ...game, combat: event({ ...combat, phase: 'defeat', stopReason: 'defeat' }, { text: `Defeated by ${definition.name}.`, type: 'system' }) }
    }
  }
  if (combat.playerHp / stats.maxHealth <= combatBalance.autoPotionThreshold) return useHealingPotion({ ...game, combat }, stats)
  return { ...game, combat }
}

function energyDelta(combat: CombatState, stats: HunterCombatStats) { const stance = stanceDefinitions[combat.stance]; const drain = Object.entries(combat.techniques).reduce((sum, [id, active]) => sum + (active ? techniqueDefinitions[id as TechniqueId].drainPerSecond : 0), 0) * stance.techniqueDrain; return stats.energyRegen - drain }

function advanceEnemySpecials(game: GameState, step: number, context: CombatContext, stats: HunterCombatStats): GameState {
  let combat = game.combat
  for (const enemy of combat.enemies) {
    if (enemy.defeated) continue
    const definition = context.enemies[enemy.enemyId]
    const actionDefinition = definition.actions[0]
    if (!actionDefinition) continue
    let current = combat.enemies.find((candidate) => candidate.instanceId === enemy.instanceId) ?? enemy
    if (current.currentAction) {
      const action = { ...current.currentAction, remainingSeconds: current.currentAction.remainingSeconds - step }
      current = { ...current, currentAction: action }
      if (action.remainingSeconds <= 0) {
        const outcome = resolveDefensiveOutcome(definition.accuracy, stats.defense, stats, actionDefinition, context.rng)
        const rawDamage = outcome === 'hit' || outcome === 'block' ? calculateMitigatedDamage(definition.attack * actionDefinition.damageMultiplier, stats.defense) : 0
        const damage = outcome === 'block' ? Math.max(1, Math.round(rawDamage * combatBalance.blockReduction)) : rawDamage
        const absorbed = Math.min(combat.shield, damage)
        current = { ...current, currentAction: null, specialCooldownRemaining: actionDefinition.cooldownSeconds }
        combat = { ...combat, shield: combat.shield - absorbed, playerHp: Math.max(0, combat.playerHp - (damage - absorbed)), session: { ...combat.session, damageTaken: combat.session.damageTaken + damage - absorbed }, lastDamageSource: definition.name }
        combat = event(combat, { text: `${current.displayName} resolves ${actionDefinition.name}: ${outcome}${damage > 0 ? ` for ${damage - absorbed} damage` : ''}.`, type: 'enemy' })
      }
    } else {
      const cooldown = Math.max(0, current.specialCooldownRemaining - step)
      current = { ...current, specialCooldownRemaining: cooldown }
      if (cooldown <= 0) { current = { ...current, currentAction: { actionId: actionDefinition.id, remainingSeconds: actionDefinition.preparationSeconds, totalSeconds: actionDefinition.preparationSeconds }, specialCooldownRemaining: actionDefinition.cooldownSeconds }; combat = event(combat, { text: `${current.displayName} begins ${actionDefinition.name}.`, type: 'enemy' }) }
    }
    combat = { ...combat, enemies: combat.enemies.map((candidate) => candidate.instanceId === enemy.instanceId ? current : candidate) }
    if (combat.playerHp <= 0) return { ...game, combat: event({ ...combat, phase: 'defeat', stopReason: 'defeat' }, { text: `Defeated by ${definition.name}'s special action.`, type: 'system' }) }
  }
  return { ...game, combat }
}

function resolveDefeatedEnemies(game: GameState, context: CombatContext): GameState {
  let next = game
  for (const enemy of next.combat.enemies) {
    if (!enemy.defeated || enemy.rewardResolved) continue
    const reward = resolveEnemyReward(next, next.combat, enemy, context)
    next = reward.game
    next.combat = { ...reward.combat, enemies: next.combat.enemies.map((candidate) => candidate.instanceId === enemy.instanceId ? { ...candidate, currentHealth: 0, defeated: true, rewardResolved: true, currentAction: null } : candidate) }
    next.combat = event(next.combat, { text: `${enemy.displayName} was defeated. +${reward.xp} XP received.`, type: 'system' })
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
    next.combat = cleared.playerHp / cleared.maxPlayerHp < combatBalance.safetyStopThreshold ? event({ ...cleared, phase: 'stopped', stopReason: 'safety' }, { text: 'Group cleared. Safety rule stopped the hunt below 20% HP.', type: 'system' }) : event({ ...cleared, phase: 'recovery', recoveryRemaining: combatBalance.recoverySeconds }, { text: `Group ${cleared.groupNumber} cleared. Recovery begins.`, type: 'system' })
  }
  else if (next.combat.phase === 'active' && (!next.combat.selectedEnemyInstanceId || !alive.some((enemy) => enemy.instanceId === next.combat.selectedEnemyInstanceId))) next.combat = { ...next.combat, selectedEnemyInstanceId: selectNextTarget(next.combat.enemies) }
  return next
}

export function syncCombatStats(game: GameState): GameState { const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques); return { ...game, combat: { ...game.combat, maxPlayerHp: stats.maxHealth, playerHp: Math.min(game.combat.playerHp, stats.maxHealth), playerAttackInterval: stats.attackInterval, maxEnergy: stats.maxEnergy, maxAdrenaline: stats.maxAdrenaline } } }
