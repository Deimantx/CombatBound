import { describe, expect, it } from 'vitest'
import { combatBalance } from '../game/combat/combatBalance'
import { resolveDamage } from '../game/combat/combatDamage'
import { advanceEffectTimers, absorbDamage, applyEffect, getBarrierAmount } from '../game/combat/combatEffects'
import { calculateEffectiveCombatStats } from '../game/combat/combatStats'
import { calculateArmorMitigation, calculateHitChance } from '../game/combat/combatMath'
import { effectById } from '../game/data/effects'
import { createCombatState, instantiateEnemies } from '../game/combat/combatState'
import { castSpell, createCombatContext, startHunt } from '../game/combat/combatEngine'
import { createInitialGameState } from '../game/gameState'
import { calculateHunterCombatStats } from '../game/equipment/derivedStats'
import type { CombatStats } from '../game/combat/combatTypes'

const rng = (value: number) => ({ next: () => value })
const stats: CombatStats = {
  maxHealth: 100, attackPower: 100, accuracy: 100, attackInterval: 1, armor: 0, evasion: 0,
  critChance: 0, critDamage: 2, dodgeChance: 0, parryChance: 0, blockChance: 0, blockPower: combatBalance.baseBlockPower,
  maxEnergy: 0, energyRegen: 0, maxAdrenaline: 0, adrenalineGeneration: 1, statusResistance: 0, resistances: {},
}

describe('Combat Foundation 2.0 math', () => {
  it('uses Accuracy versus Evasion and remains monotonic and bounded', () => {
    expect(calculateHitChance(100, 100)).toBeCloseTo(combatBalance.baseHitChance)
    expect(calculateHitChance(120, 100)).toBeGreaterThan(calculateHitChance(100, 100))
    expect(calculateHitChance(100, 120)).toBeLessThan(calculateHitChance(100, 100))
    expect(calculateHitChance(100000, 0)).toBe(combatBalance.maxHitChance)
    expect(calculateHitChance(0, 100000)).toBeGreaterThanOrEqual(combatBalance.minHitChance)
    expect(calculateHitChance(100, 100)).toBe(calculateHitChance(100, 100))
  })

  it('separates Armor mitigation from typed resistance and true damage', () => {
    const physical = resolveDamage({ damageType: 'physical', baseDamage: 100, canCrit: false, source: { kind: 'player' }, target: { kind: 'enemy', instanceId: 'e' }, defensiveEligibility: { canMiss: false, dodgeable: false, parryable: false, blockable: false } }, stats, { ...stats, armor: 100 }, rng(0.5))
    const fire = resolveDamage({ damageType: 'fire', baseDamage: 100, canCrit: false, source: { kind: 'player' }, target: { kind: 'enemy', instanceId: 'e' }, defensiveEligibility: { canMiss: false, dodgeable: false, parryable: false, blockable: false } }, stats, { ...stats, armor: 100, resistances: { fire: 0.2 } }, rng(0.5))
    const trueDamage = resolveDamage({ damageType: 'true', baseDamage: 100, canCrit: false, source: { kind: 'player' }, target: { kind: 'enemy', instanceId: 'e' }, defensiveEligibility: { canMiss: false, dodgeable: false, parryable: false, blockable: false } }, stats, { ...stats, armor: 100, resistances: { true: 0.8 } }, rng(0.5))
    expect(physical.healthDamage).toBe(50)
    expect(fire.healthDamage).toBe(80)
    expect(trueDamage.healthDamage).toBe(100)
  })
})

describe('Combat effect runtime', () => {
  it('supports stack-refresh, duration refresh, independent timers, and stat modifiers', () => {
    let combat = createCombatState()
    const enemy = instantiateEnemies(['enemy.grey-wolf'], 1)[0]
    combat = { ...combat, enemies: [enemy], selectedEnemyInstanceId: enemy.instanceId }
    const target = { kind: 'enemy' as const, instanceId: enemy.instanceId }
    const source = { kind: 'player' as const }
    const first = applyEffect(combat, effectById['effect.bleed'], source, target)
    const second = applyEffect(first.combat, effectById['effect.bleed'], source, target)
    expect(second.combat.enemies[0].effects[0].stacks).toBe(2)
    expect(second.combat.enemies[0].effects[0].remainingSeconds).toBe(combatBalance.bleedDuration)
    const broken = applyEffect(second.combat, effectById['effect.armor-broken'], source, target)
    const effective = calculateEffectiveCombatStats({ ...stats, armor: 50 }, broken.combat.enemies[0].effects, effectById)
    expect(effective.armor).toBe(35)
    const ticked = advanceEffectTimers(second.combat.enemies[0].effects, combatBalance.bleedInterval + 0.01, effectById)
    expect(ticked.ticks).toHaveLength(1)
  })

  it('uses the effect runtime as the authoritative barrier state', () => {
    let combat = createCombatState()
    const applied = applyEffect(combat, effectById['effect.protective-sign'], { kind: 'player' }, { kind: 'player' }, { absorbAmount: 65, power: 65 })
    combat = applied.combat
    expect(getBarrierAmount(combat.playerEffects, effectById)).toBe(65)
    const partial = absorbDamage(combat, { kind: 'player' }, 20, effectById)
    expect(partial.absorbed).toBe(20)
    expect(getBarrierAmount(partial.combat.playerEffects, effectById)).toBe(45)
    const depleted = absorbDamage(partial.combat, { kind: 'player' }, 50, effectById)
    expect(depleted.absorbed).toBe(45)
    expect(depleted.combat.playerEffects).toHaveLength(0)
  })

  it('migrates Flame Blast through typed Fire damage and Burn', () => {
    const game = createInitialGameState()
    const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques)
    const context = createCombatContext(rng(0.5))
    const started = startHunt({ ...game, combat: { ...game.combat, adrenaline: 100 } }, 'location.wolf-den', stats, context)
    const cast = castSpell(started, 'spell.flame-blast', stats, context)
    const target = cast.combat.enemies.find((enemy) => enemy.instanceId === cast.combat.selectedEnemyInstanceId)
    expect(target?.effects.some((effect) => effect.effectId === 'effect.burn')).toBe(true)
    expect(target?.currentHealth).toBeLessThan(target?.maxHealth ?? Infinity)
  })
})
