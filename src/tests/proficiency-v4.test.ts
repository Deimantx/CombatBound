import { describe, expect, it } from 'vitest'
import { resolveDamage } from '../game/combat/combatDamage'
import { advanceEffectTimers, applyEffect } from '../game/combat/combatEffects'
import { calculateEffectiveCombatStats, calculateEnemyBaseCombatStats } from '../game/combat/combatStats'
import { calculateEffectiveArmor } from '../game/combat/combatMath'
import { createCombatState, instantiateEnemies } from '../game/combat/combatState'
import { effectById } from '../game/data/effects'
import { enemyById } from '../game/data/enemies'
import { createInitialGameState } from '../game/gameState'
import { getActiveProficiencyStatModifiers, getWeaponAttackModifiers, getWeaponDodgeEffectHooks } from '../game/progression/perkProgression'
import { perkById } from '../game/data/proficiencyPerks'
import type { CombatStats } from '../game/combat/combatTypes'

const rng = (value: number) => ({ next: () => value })
const stats: CombatStats = { maxHealth: 100, attackPower: 100, accuracy: 100, attackInterval: 1, armor: 0, evasion: 0, critChance: 0, critDamage: 2, dodgeChance: 0, parryChance: 0, blockChance: 0, blockPower: 0, maxStamina: 100, staminaRegen: 5, maxMana: 100, manaRegen: 5, statusResistance: 0, resistances: {} }

describe('V4 weapon proficiency mechanics', () => {
  it('aggregates attack-local armor, Block, and secondary-target modifiers', () => {
    const base = createInitialGameState().progression
    const progression = { ...base, purchasedPerks: {
      'perk.two-handed-hammer.break-the-shield': 1,
      'perk.two-handed-hammer.unstoppable-weight': 1,
      'perk.two-handed-sword.wide-arc': 1,
    } }
    const hammer = getWeaponAttackModifiers(progression, 'two-handed-hammer', perkById)
    const greatsword = getWeaponAttackModifiers(progression, 'two-handed-sword', perkById)
    expect(hammer.blockChancePenetration).toBe(0)
    expect(hammer.blockPowerPenetration).toBe(.1)
    expect(greatsword.secondaryTargetFraction).toBe(.1)
    expect(greatsword.secondaryTargetCount).toBe(1)
  })

  it('applies armor and Block penetration to the current hit without mutating the defender', () => {
    expect(calculateEffectiveArmor(50, .2, 10)).toBe(30)
    const defender = { ...stats, armor: 50, blockChance: .2, blockPower: .5 }
    const packet = { damageType: 'physical' as const, baseDamage: 100, minMultiplier: 1, maxMultiplier: 1, canCrit: false, armorPenetrationPercent: .2, armorPenetrationFlat: 10, blockChancePenetration: .05, blockPowerPenetration: .2, source: { kind: 'player' as const }, target: { kind: 'enemy' as const, instanceId: 'target' }, defensiveEligibility: { canMiss: false, dodgeable: false, parryable: false, blockable: true } }
    const result = resolveDamage(packet, stats, defender, rng(.1))
    expect(result.outcome).toBe('block')
    expect(result.healthDamage).toBe(54)
    expect(defender.armor).toBe(50)
    expect(defender.blockPower).toBe(.5)
  })

  it('supports dodge-triggered effects, Concussed runtime stats, and weapon scope', () => {
    const base = createInitialGameState().progression
    const progression = { ...base, purchasedPerks: { 'perk.dagger.counterstep': 1, 'perk.dagger.fast-recovery': 1 } }
    expect(getWeaponDodgeEffectHooks(progression, 'dagger', perkById)).toHaveLength(1)
    expect(getActiveProficiencyStatModifiers(progression, 'one-handed-sword', perkById)).toHaveLength(0)
    expect(getActiveProficiencyStatModifiers(progression, 'dagger', perkById).some((modifier) => modifier.stat === 'attackInterval')).toBe(true)

    const enemy = instantiateEnemies(['enemy.grey-wolf'], 1)[0]
    const target = { kind: 'enemy' as const, instanceId: enemy.instanceId }
    const applied = applyEffect({ ...createCombatState(), enemies: [enemy], selectedEnemyInstanceId: enemy.instanceId }, effectById['effect.concussed'], { kind: 'player' }, target)
    const baseEnemy = calculateEnemyBaseCombatStats(enemyById[enemy.enemyId])
    const effective = calculateEffectiveCombatStats(baseEnemy, applied.combat.enemies[0].effects, effectById)
    expect(effective.accuracy).toBe(baseEnemy.accuracy - 5)
    expect(effective.attackInterval).toBeCloseTo(baseEnemy.attackInterval * 1.05)
    expect(advanceEffectTimers(applied.combat.enemies[0].effects, 4.01, effectById).effects).toHaveLength(0)
  })
})
