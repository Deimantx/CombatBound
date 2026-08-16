import { describe, expect, it } from 'vitest'
import { effectById } from '../game/data/effects'
import { calculateHitChance } from '../game/combat/combatMath'
import { applyEffect, getBarrierAmount } from '../game/combat/combatEffects'
import { createCombatState, instantiateEnemies } from '../game/combat/combatState'
import { getEnemyEffectiveCombatStats, getHuntSessionRates, getPlayerBarrierAmount, getSelectedTargetMatchup } from '../game/combat/combatSelectors'
import { createInitialGameState } from '../game/gameState'
import { calculateHunterCombatStats } from '../game/equipment/derivedStats'
import { getLayeredHealthSegments } from '../app/screens/combat/components/LayeredHealthBar'

describe('combat presentation selectors', () => {
  it('keeps layered health fractions separate from overflow barrier', () => {
    const fitted = getLayeredHealthSegments(173, 270, 70)
    expect(fitted.healthFraction).toBeCloseTo(173 / 270)
    expect(fitted.barrierFraction).toBeCloseTo(70 / 270)
    expect(fitted.overflowFraction).toBe(0)

    const overflow = getLayeredHealthSegments(260, 270, 70)
    expect(overflow.barrierFraction).toBeCloseTo(10 / 270)
    expect(overflow.overflowFraction).toBeCloseTo(60 / 270)

    const fullHealth = getLayeredHealthSegments(270, 270, 70)
    expect(fullHealth.barrierFraction).toBe(0)
    expect(fullHealth.overflowFraction).toBeCloseTo(70 / 270)
  })

  it('aggregates independent barrier effects from runtime values', () => {
    let combat = createCombatState()
    combat = applyEffect(combat, effectById['effect.earth-barrier'], { kind: 'player' }, { kind: 'player' }, { absorbAmount: 25 }).combat
    combat = applyEffect(combat, effectById['effect.disruptive-shield'], { kind: 'player' }, { kind: 'player' }, { absorbAmount: 40 }).combat
    expect(getBarrierAmount(combat.playerEffects, effectById)).toBe(65)
    expect(getPlayerBarrierAmount(combat)).toBe(65)
  })

  it('uses effective runtime stats and the canonical hit chance for the selected target', () => {
    const game = createInitialGameState()
    const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression, game.combat.stance, game.combat.techniques)
    const enemies = instantiateEnemies(['enemy.grey-wolf', 'enemy.alpha-wolf'], 1)
    const combat = { ...game.combat, enemies, selectedEnemyInstanceId: enemies[0].instanceId }
    const first = getSelectedTargetMatchup(combat, stats, game.progression, enemies[0])
    expect(first).not.toBeNull()
    expect(first?.playerHitChance).toBe(calculateHitChance(first!.playerAccuracy, first!.targetEvasion))
    expect(first?.enemyHitChance).toBe(calculateHitChance(first!.enemyAccuracy, first!.playerEvasion))

    const offBalance = applyEffect(combat, effectById['effect.off-balance'], { kind: 'player' }, { kind: 'enemy', instanceId: enemies[0].instanceId }).combat
    const afterEffect = getSelectedTargetMatchup(offBalance, stats, game.progression, offBalance.enemies[0])
    expect(afterEffect!.targetEvasion).toBe(getEnemyEffectiveCombatStats(offBalance.enemies[0]).evasionRating)
    expect(afterEffect!.targetEvasion).toBeLessThan(first!.targetEvasion)
    expect(afterEffect!.playerHitChance).toBeGreaterThanOrEqual(first!.playerHitChance)

    const switched = getSelectedTargetMatchup({ ...combat, selectedEnemyInstanceId: enemies[1].instanceId }, stats, game.progression, enemies[1])
    expect(switched!.targetName).toBe('Alpha Wolf')
    expect(switched!.targetEvasion).not.toBe(first!.targetEvasion)
  })

  it('keeps session rates finite and gates hourly projections until ten seconds', () => {
    const initial = createInitialGameState().combat.session
    const zero = getHuntSessionRates(initial)
    expect(zero.rateSampleReady).toBe(false)
    expect(zero.averageKillSeconds).toBeNull()
    expect(Object.values(zero).every((value) => typeof value !== 'number' || Number.isFinite(value))).toBe(true)

    const short = getHuntSessionRates({ ...initial, elapsedSeconds: 5, damageDealt: 10, enemiesDefeated: 1 })
    expect(short.dps).toBe(2)
    expect(short.killsPerHour).toBe(0)
    expect(short.rateSampleReady).toBe(false)

    const session = getHuntSessionRates({ ...initial, elapsedSeconds: 60, damageDealt: 1200, damageTaken: 300, healing: 60, enemiesDefeated: 2, groupClears: 1, masteryXpGained: 30, proficiencyXpGained: { 'one-handed-sword': 10, 'fire-magic': 20 }, goldGained: 15, itemsGained: 3 })
    expect(session.dps).toBe(20)
    expect(session.damageTakenPerSecond).toBe(5)
    expect(session.healingPerSecond).toBe(1)
    expect(session.killsPerHour).toBe(120)
    expect(session.groupsPerHour).toBe(60)
    expect(session.proficiencyXpPerHour).toBe(1800)
    expect(session.proficiencyXpPerHourById['one-handed-sword']).toBe(600)
    expect(session.proficiencyXpPerHourById['fire-magic']).toBe(1200)
    expect(session.totalProficiencyXp).toBe(30)
    expect(session.averageKillSeconds).toBe(30)
    expect(session.rateSampleReady).toBe(true)
  })
})
