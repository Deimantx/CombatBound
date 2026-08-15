import { combatBalance, clamp } from './combatBalance'
import type { CombatStats, CombatState, CombatantRef } from './combatTypes'
import type { ActiveEffectInstance, EffectDefinition, EffectStackingMode, EffectTick, EffectTimerResult } from './combatEffectTypes'
import type { ProgressionCredit } from '../progression/progressionTypes'

export interface EffectApplyOptions {
  targetStats?: CombatStats
  power?: number
  absorbAmount?: number
  progressionCredit?: ProgressionCredit
  sourceProficiencyId?: ProgressionCredit['proficiencyId']
  durationBonusSeconds?: number
  durationMultiplier?: number
  periodicPowerMultiplier?: number
  maxStacksBonus?: number
}

export interface EffectApplicationResult {
  combat: CombatState
  instance: ActiveEffectInstance | null
  outcome: 'applied' | 'refreshed' | 'stacked' | 'extended' | 'replaced' | 'rejected' | 'missing-target'
}

const aliveRef = (combat: CombatState, target: CombatantRef) => target.kind === 'player'
  ? combat.playerHp > 0
  : combat.enemies.some((enemy) => enemy.instanceId === target.instanceId && !enemy.defeated && enemy.currentHealth > 0)

export function getActiveEffects(combat: CombatState, target: CombatantRef): ActiveEffectInstance[] {
  if (target.kind === 'player') return combat.playerEffects
  return combat.enemies.find((enemy) => enemy.instanceId === target.instanceId)?.effects ?? []
}

export function updateActiveEffects(combat: CombatState, target: CombatantRef, effects: ActiveEffectInstance[]): CombatState {
  if (target.kind === 'player') return { ...combat, playerEffects: effects }
  return { ...combat, enemies: combat.enemies.map((enemy) => enemy.instanceId === target.instanceId ? { ...enemy, effects } : enemy) }
}

export function calculateEffectDuration(definition: EffectDefinition, targetStats?: CombatStats, durationBonusSeconds = 0, durationMultiplier = 1) {
  if (definition.durationSeconds === null) return null
  const duration = Math.max(0, definition.durationSeconds)
  const resistant = !((definition.beneficial ?? (definition.kind === 'buff' || definition.kind === 'barrier')))
  const durationReduction = resistant ? clamp(targetStats?.ailmentDurationReduction ?? 0, 0, 1) : 0
  return Math.max(0, (duration + durationBonusSeconds) * durationMultiplier * (1 - durationReduction))
}

export function applyEffect(combat: CombatState, definition: EffectDefinition, source: CombatantRef, target: CombatantRef, options: EffectApplyOptions = {}): EffectApplicationResult {
  if (!aliveRef(combat, target)) return { combat, instance: null, outcome: 'missing-target' }
  const effects = getActiveEffects(combat, target)
  const duration = calculateEffectDuration(definition, options.targetStats, options.durationBonusSeconds, options.durationMultiplier)
  const interval = definition.periodic && definition.periodic.intervalSeconds > 0 ? definition.periodic.intervalSeconds : null
  const nextSequence = combat.effectSequence + 1
  const maxStacks = Math.max(1, Math.floor((definition.stacking.maxStacks || 1) + (options.maxStacksBonus ?? 0)))
  const existing = effects.filter((effect) => effect.effectId === definition.id)
  const mode = definition.stacking.mode

  if (mode !== 'independent' && existing.length > 0) {
    const current = existing[0]
    if (mode === 'replace-stronger' && (current.snapshot?.power ?? 0) >= (options.power ?? definition.barrierAmount ?? 0)) return { combat, instance: current, outcome: 'rejected' }
    const refreshed: ActiveEffectInstance = {
      ...current,
      source,
      target,
      stacks: mode === 'stack-refresh' ? Math.min(maxStacks, current.stacks + 1) : current.stacks,
      remainingSeconds: mode === 'extend' ? (current.remainingSeconds === null || duration === null ? null : current.remainingSeconds + duration) : duration,
      nextTickRemaining: interval,
      snapshot: options.power !== undefined || current.snapshot || options.periodicPowerMultiplier !== undefined ? { power: options.power ?? current.snapshot?.power, periodicPowerMultiplier: options.periodicPowerMultiplier ?? current.snapshot?.periodicPowerMultiplier } : current.snapshot,
      progressionCredit: options.progressionCredit ?? current.progressionCredit,
      sourceProficiencyId: options.sourceProficiencyId ?? current.sourceProficiencyId,
      runtimeValues: definition.kind === 'barrier' ? { absorbRemaining: options.absorbAmount ?? definition.barrierAmount ?? current.runtimeValues?.absorbRemaining ?? 0 } : current.runtimeValues,
    }
    const updated = updateActiveEffects(combat, target, effects.map((effect) => effect.instanceId === current.instanceId ? refreshed : effect))
    return { combat: { ...updated, effectSequence: nextSequence }, instance: refreshed, outcome: mode === 'stack-refresh' ? 'stacked' : mode === 'extend' ? 'extended' : mode === 'replace-stronger' ? 'replaced' : 'refreshed' }
  }

  const instance: ActiveEffectInstance = {
    instanceId: `${definition.id}#${nextSequence}`,
    effectId: definition.id,
    source,
    target,
    stacks: 1,
    remainingSeconds: duration,
    nextTickRemaining: interval,
    appliedSequence: nextSequence,
    snapshot: options.power !== undefined || definition.barrierAmount !== undefined || options.periodicPowerMultiplier !== undefined ? { power: options.power ?? definition.barrierAmount, periodicPowerMultiplier: options.periodicPowerMultiplier } : undefined,
    progressionCredit: options.progressionCredit,
    sourceProficiencyId: options.sourceProficiencyId,
    runtimeValues: definition.kind === 'barrier' ? { absorbRemaining: options.absorbAmount ?? definition.barrierAmount ?? 0 } : undefined,
  }
  const updated = updateActiveEffects(combat, target, [...effects, instance])
  return { combat: { ...updated, effectSequence: nextSequence }, instance, outcome: 'applied' }
}

export function applyEffectById(combat: CombatState, effectId: string, definitions: Record<string, EffectDefinition>, source: CombatantRef, target: CombatantRef, options: EffectApplyOptions = {}) {
  const definition = definitions[effectId]
  return definition ? applyEffect(combat, definition, source, target, options) : { combat, instance: null, outcome: 'rejected' as const }
}

export function removeEffectByInstanceId(combat: CombatState, target: CombatantRef, instanceId: string) {
  const effects = getActiveEffects(combat, target)
  return updateActiveEffects(combat, target, effects.filter((effect) => effect.instanceId !== instanceId))
}

export function removeEffectsById(combat: CombatState, target: CombatantRef, effectId: string) {
  return updateActiveEffects(combat, target, getActiveEffects(combat, target).filter((effect) => effect.effectId !== effectId))
}

export function cleanseEffects(combat: CombatState, target: CombatantRef, options: { tags?: string[]; maxEffects?: number }, definitions: Record<string, EffectDefinition>) {
  const tags = options.tags ?? []
  let removed = 0
  const maxEffects = options.maxEffects ?? Number.POSITIVE_INFINITY
  const remaining = getActiveEffects(combat, target).filter((effect) => {
    const definition = definitions[effect.effectId]
    const matches = definition && (tags.length === 0 || tags.some((tag) => definition.tags.includes(tag) || definition.cleanseTags?.includes(tag)))
    if (matches && removed < maxEffects) { removed += 1; return false }
    return true
  })
  return { combat: updateActiveEffects(combat, target, remaining), removed }
}

export function advanceEffectTimers(effects: ActiveEffectInstance[], deltaSeconds: number, definitions: Record<string, EffectDefinition>, targetAlive = true): EffectTimerResult {
  if (!targetAlive) return { effects: [], ticks: [], expired: effects }
  const ticks: EffectTick[] = []
  const expired: ActiveEffectInstance[] = []
  const remainingEffects: ActiveEffectInstance[] = []
  const delta = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0)

  for (const original of effects) {
    const definition = definitions[original.effectId]
    if (!definition) { expired.push(original); continue }
    let effect = { ...original }
    let left = delta
    while (left > 0) {
      const durationLimit = effect.remainingSeconds === null ? Number.POSITIVE_INFINITY : Math.max(0, effect.remainingSeconds)
      const tickLimit = effect.nextTickRemaining === null ? Number.POSITIVE_INFINITY : Math.max(0, effect.nextTickRemaining)
      const advance = Math.min(left, durationLimit, tickLimit)
      if (!Number.isFinite(advance) || advance <= 0) {
        if (effect.nextTickRemaining !== null && effect.nextTickRemaining <= 0) {
          ticks.push({ effect, definition })
          effect = { ...effect, nextTickRemaining: definition.periodic && definition.periodic.intervalSeconds > 0 ? definition.periodic.intervalSeconds : null }
          continue
        }
        if (effect.remainingSeconds !== null && effect.remainingSeconds <= 0) { expired.push(effect); effect = null as never; break }
        break
      }
      left -= advance
      if (effect.remainingSeconds !== null) effect = { ...effect, remainingSeconds: effect.remainingSeconds - advance }
      if (effect.nextTickRemaining !== null) effect = { ...effect, nextTickRemaining: effect.nextTickRemaining - advance }
      if (effect.nextTickRemaining !== null && effect.nextTickRemaining <= 0) {
        ticks.push({ effect, definition })
        effect = { ...effect, nextTickRemaining: definition.periodic && definition.periodic.intervalSeconds > 0 ? definition.periodic.intervalSeconds : null }
      }
      if (effect.remainingSeconds !== null && effect.remainingSeconds <= 0) { expired.push(effect); effect = null as never; break }
    }
    if (effect) remainingEffects.push({ ...effect, remainingSeconds: effect.remainingSeconds === null ? null : Math.max(0, effect.remainingSeconds), nextTickRemaining: effect.nextTickRemaining === null ? null : Math.max(0, effect.nextTickRemaining) })
  }
  return { effects: remainingEffects, ticks, expired }
}

/** Alias used by simulation callers that only need effect timer progression. */
export const tickEffects = advanceEffectTimers

export function getBarrierAmount(effects: ActiveEffectInstance[], definitions: Record<string, EffectDefinition>) {
  return effects.reduce((total, effect) => total + (definitions[effect.effectId]?.kind === 'barrier' ? Math.max(0, effect.runtimeValues?.absorbRemaining ?? 0) : 0), 0)
}

export function absorbDamage(combat: CombatState, target: CombatantRef, amount: number, definitions: Record<string, EffectDefinition>) {
  let remaining = Math.max(0, amount)
  let absorbed = 0
  let effects = getActiveEffects(combat, target)
  const absorptions: Array<{ effectId: string; amount: number; progressionCredit?: ProgressionCredit }> = []
  for (const effect of effects) {
    if (remaining <= 0) break
    if (definitions[effect.effectId]?.kind !== 'barrier') continue
    const pool = Math.max(0, effect.runtimeValues?.absorbRemaining ?? 0)
    const used = Math.min(pool, remaining)
    remaining -= used
    absorbed += used
    if (used > 0) absorptions.push({ effectId: effect.effectId, amount: used, progressionCredit: effect.progressionCredit })
    const nextPool = pool - used
    effects = nextPool > 0 ? effects.map((candidate) => candidate.instanceId === effect.instanceId ? { ...candidate, runtimeValues: { absorbRemaining: nextPool } } : candidate) : effects.filter((candidate) => candidate.instanceId !== effect.instanceId)
  }
  return { combat: updateActiveEffects(combat, target, effects), absorbed, remaining, absorptions }
}

export function removeEffectsByPersistence(combat: CombatState, persistence: 'enemy-life' | 'between-enemies' | 'hunt', definitions: Record<string, EffectDefinition>) {
  const keep = (effect: ActiveEffectInstance, definitions: Record<string, EffectDefinition>) => definitions[effect.effectId]?.persistence !== persistence
  return updateActiveEffects({ ...combat, enemies: combat.enemies.map((enemy) => ({ ...enemy, effects: enemy.effects.filter((effect) => keep(effect, definitions)) })) }, { kind: 'player' }, combat.playerEffects.filter((effect) => keep(effect, definitions)))
}
