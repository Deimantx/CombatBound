import { describe, expect, it } from 'vitest'
import { resolveDamage } from '../game/combat/combatDamage'
import { advanceEffectTimers, applyEffect } from '../game/combat/combatEffects'
import { calculateEffectiveCombatStats, calculateEnemyBaseCombatStats } from '../game/combat/combatStats'
import { calculateEffectiveArmor } from '../game/combat/combatMath'
import { createCombatState, instantiateEnemies } from '../game/combat/combatState'
import { effectById } from '../game/data/effects'
import { enemyById } from '../game/data/enemies'
import { createInitialGameState } from '../game/gameState'
import { getActiveProficiencyStatModifiers, getWeaponAttackModifiers } from '../game/progression/perkProgression'
import { perkById } from '../game/data/proficiencyPerks'
import type { CombatStats } from '../game/combat/combatTypes'
import { normalizeCombatStats } from '../game/combat/combatStats'

const rng = (value: number) => ({ next: () => value })
const stats: CombatStats = normalizeCombatStats({ maxLife: 100, attackDamage: 100, accuracyRating: 100, baseAttackTime: 1, armour: 0, evasionRating: 0, baseCritChance: 0, criticalStrikeMultiplier: 2, maxStamina: 100, staminaRegen: 5, maxMana: 100, manaRegenFlat: 5, resistances: {} })

describe('V4 weapon proficiency mechanics', () => {
  it('aggregates attack-local armour and secondary-target modifiers', () => {
    const base = createInitialGameState().progression
    const progression = { ...base, purchasedPerks: {
      'perk.two-handed-hammer.break-the-shield': 1,
      'perk.two-handed-hammer.unstoppable-weight': 1,
      'perk.two-handed-sword.wide-arc': 1,
    } }
    const hammer = getWeaponAttackModifiers(progression, 'two-handed-hammer', perkById)
    const greatsword = getWeaponAttackModifiers(progression, 'two-handed-sword', perkById)
    expect(Object.keys(hammer).filter((key) => key.toLowerCase().includes('block'))).toEqual([])
    expect(greatsword.secondaryTargetFraction).toBe(.1)
    expect(greatsword.secondaryTargetCount).toBe(1)
  })

  it('applies armour penetration to the current hit without mutating the defender', () => {
    expect(calculateEffectiveArmor(50, .2, 10)).toBe(30)
    const defender = { ...stats, armour: 50, attackBlockChance: 0 }
    const packet = { damageType: 'physical' as const, baseDamage: 100, minMultiplier: 1, maxMultiplier: 1, canCrit: false, armorPenetrationPercent: .2, armorPenetrationFlat: 10, source: { kind: 'player' as const }, target: { kind: 'enemy' as const, instanceId: 'target' }, defensiveEligibility: { canMiss: false, blockable: false } }
    const result = resolveDamage(packet, stats, defender, rng(.1))
    expect(result.outcome).toBe('hit')
    expect(result.healthDamage).toBe(94)
    expect(defender.armour).toBe(50)
  })

  it('keeps retired evasion-triggered hooks absent and applies Concussed runtime stats', () => {
    const base = createInitialGameState().progression
    const progression = { ...base, purchasedPerks: { 'perk.dagger.counterstep': 1, 'perk.dagger.fast-recovery': 1 } }
    expect(getActiveProficiencyStatModifiers(progression, 'dagger', perkById)).toHaveLength(2)
    expect(getActiveProficiencyStatModifiers(progression, 'one-handed-sword', perkById)).toHaveLength(0)
    expect(getActiveProficiencyStatModifiers(progression, 'dagger', perkById).some((modifier) => modifier.stat === 'attackInterval')).toBe(true)

    const enemy = instantiateEnemies(['enemy.grey-wolf'], 1)[0]
    const target = { kind: 'enemy' as const, instanceId: enemy.instanceId }
    const applied = applyEffect({ ...createCombatState(), enemies: [enemy], selectedEnemyInstanceId: enemy.instanceId }, effectById['effect.concussed'], { kind: 'player' }, target)
    const baseEnemy = calculateEnemyBaseCombatStats(enemyById[enemy.enemyId])
    const effective = calculateEffectiveCombatStats(baseEnemy, applied.combat.enemies[0].effects, effectById)
    expect(effective.accuracyRating).toBe((baseEnemy.accuracyRating ?? 0) - 5)
    expect(effective.attackInterval).toBeCloseTo(baseEnemy.attackInterval * 1.05)
    expect(advanceEffectTimers(applied.combat.enemies[0].effects, 4.01, effectById).effects).toHaveLength(0)
  })
})
