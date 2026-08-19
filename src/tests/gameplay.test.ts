import { describe, expect, it } from 'vitest'
import { advanceCombat, castSpell, createCombatContext, selectEnemy, startHunt, useHealingPotion } from '../game/combat/combatEngine'
import { combatBalance } from '../game/combat/combatBalance'
import { generateCombatGroup } from '../game/combat/combatGroupGenerator'
import { enemyById } from '../game/data/enemies'
import { combatLocationById } from '../game/data/world/combatLocations'
import { createInitialGameState } from '../game/gameState'
import { calculateHunterCombatStats } from '../game/equipment/derivedStats'
import { awardProficiencyXp, proficiencyLevelForXp, proficiencyXpForLevel } from '../game/progression/proficiencyProgression'

const fixedContext = createCombatContext({ next: () => 0.5 })
const statsFor = (game: ReturnType<typeof createInitialGameState>) => calculateHunterCombatStats(game.equipment, game.inventory, game.progression, game.combat.techniques)
const sequenceContext = (values: number[]) => { let index = 0; return createCombatContext({ next: () => values[index++ % values.length] }) }

describe('gameplay domain', () => {
  it('generates independent runtime instances from a location pool', () => {
    const game = createInitialGameState()
    const started = startHunt(game, 'location.wolf-den', statsFor(game), fixedContext)
    expect(started.combat.enemies.length).toBeGreaterThanOrEqual(1)
    expect(started.combat.enemies.length).toBeLessThanOrEqual(3)
    expect(new Set(started.combat.enemies.map((enemy) => enemy.instanceId)).size).toBe(started.combat.enemies.length)
    expect(started.combat.enemies.every((enemy) => combatLocationById['location.wolf-den'].enemyPool.some((entry) => entry.enemyId === enemy.enemyId))).toBe(true)
  })

  it('keeps the player attack timer when switching runtime targets', () => {
    const game = createInitialGameState()
    const started = startHunt(game, 'location.wolf-den', statsFor(game), fixedContext)
    const first = started.combat.enemies[0].instanceId
    const second = started.combat.enemies[1].instanceId
    const withProgress = { ...started, combat: { ...started.combat, selectedEnemyInstanceId: first, playerAttackTimer: 0.73 } }
    const switched = selectEnemy(withProgress.combat, second)
    expect(switched.selectedEnemyInstanceId).toBe(second)
    expect(switched.playerAttackTimer).toBe(0.73)
  })

  it('does not end a generated group when one enemy is defeated', () => {
    const game = createInitialGameState()
    const started = startHunt(game, 'location.wolf-den', statsFor(game), fixedContext)
    const first = started.combat.enemies[0]
    const weakened = { ...started, combat: { ...started.combat, selectedEnemyInstanceId: first.instanceId, playerAttackTimer: 0, enemies: started.combat.enemies.map((enemy) => enemy.instanceId === first.instanceId ? { ...enemy, currentHealth: 1 } : enemy) } }
    const after = advanceCombat(weakened, 0.01, fixedContext, statsFor(weakened))
    expect(after.combat.enemies.some((enemy) => enemy.defeated)).toBe(true)
    expect(after.combat.phase).toBe('active')
    expect(after.combat.enemies.filter((enemy) => !enemy.defeated)).toHaveLength(started.combat.enemies.length - 1)
  })

  it('retargets and enters recovery only after the final generated group enemy dies', () => {
    const game = createInitialGameState()
    const started = startHunt(game, 'location.wolf-den', statsFor(game), fixedContext)
    const target = started.combat.enemies[0]
    const weakened = { ...started, combat: { ...started.combat, selectedEnemyInstanceId: target.instanceId, playerAttackTimer: 0, enemies: [{ ...target, currentHealth: 1 }] } }
    const after = advanceCombat(weakened, 0.01, fixedContext, statsFor(weakened))
    expect(after.combat.phase).toBe('recovery')
    expect(after.combat.recoveryRemaining).toBe(combatBalance.recoverySeconds)
    expect(after.combat.selectedEnemyInstanceId).toBeNull()
    expect(after.combat.session.enemiesDefeated).toBe(1)
    expect(after.combat.session.groupClears).toBe(1)
    expect(after.collection.targets[target.enemyId]?.defeats).toBe(1)
  })

  it('generates a fresh group after recovery and keeps the Hunt location', () => {
    const game = createInitialGameState()
    const stats = { ...statsFor(game), maxLife: 10000, attackDamage: 10000, armour: 10000 }
    const started = startHunt({ ...game, combat: { ...game.combat, playerHp: stats.maxLife } }, 'location.wolf-den', stats, fixedContext)
    const oldIds = started.combat.enemies.map((enemy) => enemy.instanceId)
    const weakened = { ...started, combat: { ...started.combat, playerAttackTimer: 0, enemies: [{ ...started.combat.enemies[0], currentHealth: 1 }] } }
    const cleared = advanceCombat(weakened, 0.01, fixedContext, stats)
    const nextGroup = advanceCombat(cleared, combatBalance.recoverySeconds + 0.01, fixedContext, stats)
    expect(nextGroup.combat.phase).toBe('active')
    expect(nextGroup.combat.combatLocationId).toBe('location.wolf-den')
    expect(nextGroup.combat.groupNumber).toBe(2)
    expect(nextGroup.combat.enemies.some((enemy) => oldIds.includes(enemy.instanceId))).toBe(false)
  })

  it('switching Hunt location clears the old runtime group and session counters', () => {
    const game = createInitialGameState()
    const stats = statsFor(game)
    const first = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const progressed = { ...first, combat: { ...first.combat, session: { ...first.combat.session, enemiesDefeated: 4, groupClears: 2 } } }
    const switched = startHunt(progressed, 'location.bandit-camp', stats, fixedContext)
    expect(switched.combat.combatLocationId).toBe('location.bandit-camp')
    expect(switched.combat.groupNumber).toBe(1)
    expect(switched.combat.session.enemiesDefeated).toBe(0)
    expect(switched.combat.session.groupClears).toBe(0)
    expect(switched.combat.enemies.every((enemy) => combatLocationById['location.bandit-camp'].enemyPool.some((entry) => entry.enemyId === enemy.enemyId))).toBe(true)
  })

  it('uses frame-independent elapsed time for attack progress', () => {
    const game = createInitialGameState()
    const stats = statsFor(game)
    const started = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const oneLarge = advanceCombat(started, 1, fixedContext, stats)
    let manySmall = started
    for (let index = 0; index < 10; index += 1) manySmall = advanceCombat(manySmall, 0.1, fixedContext, stats)
    expect(oneLarge.combat.playerAttackTimer).toBeCloseTo(manySmall.combat.playerAttackTimer, 5)
  })

  it('regenerates Stamina and Mana independently during active combat', () => {
    const game = createInitialGameState()
    const stats = { ...statsFor(game), staminaRegen: 5, manaRegenFlat: 1 }
    const started = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const depleted = { ...started, combat: { ...started.combat, stamina: 50, mana: 50 } }
    const advanced = advanceCombat(depleted, 1, fixedContext, stats)
    expect(advanced.combat.stamina).toBeCloseTo(55, 5)
    expect(advanced.combat.mana).toBeCloseTo(51, 5)
  })

  it('applies sustained Technique Stamina drain to net regeneration', () => {
    const game = createInitialGameState()
    const stats = { ...statsFor(game), staminaRegen: 5, manaRegenFlat: 1 }
    const started = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const activeTechnique = { ...started, combat: { ...started.combat, stamina: 50, mana: 50, techniques: { ...started.combat.techniques, 'careful-positioning': true } } }
    const advanced = advanceCombat(activeTechnique, 1, fixedContext, stats)
    expect(advanced.combat.stamina).toBeCloseTo(52, 5)
    expect(advanced.combat.mana).toBeCloseTo(51, 5)
  })

  it('deactivates sustained Techniques when Stamina is depleted', () => {
    const game = createInitialGameState()
    const stats = { ...statsFor(game), staminaRegen: 0 }
    const started = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const activeTechnique = { ...started, combat: { ...started.combat, stamina: 1, techniques: { ...started.combat.techniques, 'careful-positioning': true } } }
    const advanced = advanceCombat(activeTechnique, 1, fixedContext, stats)
    expect(advanced.combat.stamina).toBe(0)
    expect(advanced.combat.techniques['careful-positioning']).toBe(false)
    expect(advanced.combat.log[0]?.text).toBe('Techniques deactivated: Stamina depleted.')
  })

  it('doubles Stamina and Mana regeneration during group recovery', () => {
    const game = createInitialGameState()
    const stats = { ...statsFor(game), staminaRegen: 5, manaRegenFlat: 1 }
    const started = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const target = started.combat.enemies[0]
    const cleared = advanceCombat({ ...started, combat: { ...started.combat, stamina: 50, mana: 50, playerAttackTimer: 0, enemies: [{ ...target, currentHealth: 1 }] } }, 0.01, fixedContext, stats)
    expect(cleared.combat.phase).toBe('recovery')
    const beforeRecovery = cleared.combat
    const recovering = advanceCombat(cleared, 1, fixedContext, stats)
    expect(recovering.combat.stamina - beforeRecovery.stamina).toBeCloseTo(10, 5)
    expect(recovering.combat.mana - beforeRecovery.mana).toBeCloseTo(2, 5)
  })

  it('regenerates 1% of max HP every 3 seconds while travelling between groups', () => {
    const game = createInitialGameState()
    const stats = statsFor(game)
    const started = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const recovering = {
      ...started,
      combat: {
        ...started.combat,
        phase: 'recovery' as const,
        recoveryRemaining: 2,
        playerHp: started.combat.maxPlayerHp - 50,
        stamina: 10,
        mana: 10,
      },
    }
    const advanced = advanceCombat(recovering, 1, fixedContext, stats)
    expect(advanced.combat.playerHp - recovering.combat.playerHp).toBeCloseTo(
      started.combat.maxPlayerHp * 0.01 / 3,
      5,
    )
    expect(advanced.combat.stamina).toBeCloseTo(20, 5)
    expect(advanced.combat.mana).toBeCloseTo(12.4, 5)
  })

  it('regenerates missing resources while stopped and not fighting', () => {
    const game = createInitialGameState()
    const stats = statsFor(game)
    const stopped = {
      ...game,
      combat: {
        ...game.combat,
        phase: 'stopped' as const,
        playerHp: game.combat.maxPlayerHp - 50,
        stamina: 10,
        mana: 10,
      },
    }
    const advanced = advanceCombat(stopped, 1, fixedContext, stats)
    expect(advanced.combat.playerHp - stopped.combat.playerHp).toBeCloseTo(
      (stats.maxLife ?? 0) * 0.01 / 3,
      5,
    )
    expect(advanced.combat.stamina).toBeCloseTo(20, 5)
    expect(advanced.combat.mana).toBeCloseTo(12.4, 5)
  })

  it('preserves current resources when a recovery spawns the next group', () => {
    const game = createInitialGameState()
    const stats = { ...statsFor(game), staminaRegen: 0, manaRegenFlat: 1 }
    const started = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const target = started.combat.enemies[0]
    const cleared = advanceCombat({ ...started, combat: { ...started.combat, stamina: 20, mana: 20, playerAttackTimer: 0, enemies: [{ ...target, currentHealth: 1 }] } }, 0.01, fixedContext, stats)
    const nextGroup = advanceCombat(cleared, combatBalance.recoverySeconds + 0.01, fixedContext, stats)
    expect(nextGroup.combat.phase).toBe('active')
    expect(nextGroup.combat.stamina).toBeCloseTo(20, 5)
    expect(nextGroup.combat.mana).toBeCloseTo(26.02, 5)
    expect(nextGroup.combat.stamina).toBeLessThan(nextGroup.combat.maxStamina)
  })

  it('levels weapon proficiency without changing Hunter Rank', () => {
    let progression = createInitialGameState().progression
    const result = awardProficiencyXp(progression, 'one-handed-sword', proficiencyXpForLevel(4))
    progression = result.progression
    expect(proficiencyLevelForXp(progression.proficiencies['one-handed-sword']!.totalXp)).toBeGreaterThanOrEqual(4)
    expect(progression.hunterRankPoints).toBe(0)
    expect(result.levelsGained).toBeGreaterThan(0)
  })

  it('awards only actual HP damage from direct weapon attacks', () => {
    const game = createInitialGameState()
    const stats = { ...statsFor(game), attackDamage: 10000, accuracyRating: 10000 }
    const started = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const target = started.combat.enemies[0]
    const overkill = advanceCombat({ ...started, combat: { ...started.combat, playerAttackTimer: 0, selectedEnemyInstanceId: target.instanceId, enemies: [{ ...target, currentHealth: 1 }] } }, 0.01, fixedContext, stats)
    expect(overkill.progression.proficiencies['one-handed-sword']?.totalXp).toBe(1)
    expect(overkill.progression.hunterRankPoints).toBe(0)
    expect(overkill.combat.session.proficiencyXpGained['one-handed-sword']).toBe(1)
  })

  it('awards magic progression for eligible Fire spell damage without awarding the equipped weapon', () => {
    const game = createInitialGameState()
    const stats = statsFor(game)
    const started = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const target = started.combat.enemies[0]
    const cast = castSpell({ ...started, combat: { ...started.combat, selectedEnemyInstanceId: target.instanceId, mana: 100 } }, 'spell.flame-blast', stats, fixedContext)
    expect(cast.progression.hunterRankPoints).toBe(0)
    expect(cast.progression.proficiencies['one-handed-sword']?.totalXp).toBe(0)
    expect(cast.progression.proficiencies['fire-magic']?.totalXp).toBeGreaterThan(0)
    expect(cast.combat.session.proficiencyXpGained['fire-magic']).toBeGreaterThan(0)
  })

  it('credits authored Ignite ticks to Fire Magic', () => {
    const game = createInitialGameState()
    const stats = { ...statsFor(game), accuracyRating: 10000 }
    const started = startHunt(game, 'location.wolf-den', stats, fixedContext)
    const prepared = { ...started, combat: { ...started.combat, mana: 100, playerAttackTimer: 100, enemies: started.combat.enemies.map((enemy) => ({ ...enemy, attackTimer: 100, actionCooldowns: { 'action.charged-shot': 100 } })) } }
    const cast = castSpell(prepared, 'spell.flame-blast', stats, fixedContext)
    const before = cast.progression.proficiencies['fire-magic']?.totalXp ?? 0
    const advanced = advanceCombat(cast, 2.1, fixedContext, stats)
    expect(advanced.progression.proficiencies['fire-magic']?.totalXp ?? 0).toBeGreaterThan(before)
  })

  it('exposes immutable world enemy definitions and location pools', () => {
    expect(Object.isFrozen(enemyById['enemy.grey-wolf'])).toBe(true)
    expect(combatLocationById['location.wolf-den'].enemyPool).toHaveLength(4)
    expect(combatLocationById['location.bandit-camp'].enemyPool.every((entry) => enemyById[entry.enemyId].familyId === 'family.bandits')).toBe(true)
  })

  it('starts an independent archer special inside a generated group', () => {
    const game = createInitialGameState()
    const stats = statsFor(game)
    const context = sequenceContext([0.5, 0.1, 0.5, 0.5, 0.5])
    const started = startHunt(game, 'location.bandit-camp', stats, context)
    const archer = started.combat.enemies.find((enemy) => enemy.enemyId === 'enemy.bandit-archer')
    expect(archer).toBeDefined()
    const targeted = { ...started, combat: { ...started.combat, selectedEnemyInstanceId: archer!.instanceId, mana: 100 } }
    const preparing = advanceCombat(targeted, 0.1, context, stats)
    expect(preparing.combat.enemies.find((enemy) => enemy.instanceId === archer!.instanceId)?.currentAction).not.toBeNull()
    const cast = castSpell(preparing, 'spell.lightning-pulse', stats, context)
    expect(cast.combat.enemies.find((enemy) => enemy.instanceId === archer!.instanceId)?.currentAction).not.toBeNull()
    expect(cast.combat.mana).toBeCloseTo(72.12, 5)
    expect(cast.progression.proficiencies['air-magic']?.totalXp).toBeGreaterThan(0)
  })

  it('consumes a potion only when it restores health', () => {
    const game = createInitialGameState()
    const stats = statsFor(game)
    const started = startHunt({ ...game, combat: { ...game.combat, playerHp: 100 } }, 'location.wolf-den', stats, fixedContext)
    const healed = useHealingPotion(started, stats)
    expect(healed.combat.playerHp).toBe(170)
    expect(healed.inventory.stackables['item.healing-potion']).toBe(9)
    const full = useHealingPotion({ ...started, combat: { ...started.combat, playerHp: stats.maxLife ?? 0 } }, stats)
    expect(full.inventory.stackables['item.healing-potion']).toBe(10)
  })

  it('keeps repeatable hunting stable across a simulated hour', () => {
    const game = createInitialGameState()
    const stats = { ...statsFor(game), maxLife: 100000, attackDamage: 10000, accuracyRating: 100, armour: 10000, baseAttackTime: 0.1, staminaRegen: 100 }
    const prepared = { ...game, combat: { ...game.combat, playerHp: stats.maxLife } }
    const started = startHunt(prepared, 'location.wolf-den', stats, fixedContext)
    const after = advanceCombat(started, 3600, fixedContext, stats)
    expect(after.combat.session.elapsedSeconds).toBeCloseTo(3600, 3)
    expect(['active', 'recovery']).toContain(after.combat.phase)
    expect(after.combat.session.groupClears).toBeGreaterThan(500)
    expect(after.combat.session.enemiesDefeated).toBeGreaterThan(after.combat.session.groupClears)
  })

  it('supports deterministic weighted group generation and copy limits', () => {
    const group = generateCombatGroup(combatLocationById['location.wolf-den'], { next: () => 0.99 }, 1)
    expect(group).toHaveLength(3)
    expect(group).not.toContain('enemy.alpha-wolf')
    expect(new Set(group).size).toBeGreaterThanOrEqual(2)
  })
})
