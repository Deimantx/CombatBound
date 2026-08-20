import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game/gameState'
import { calculateHunterCombatStats } from '../game/equipment/derivedStats'
import { createCombatContext, startCombatTarget } from '../game/combat/combatEngine'
import { resolveEnemyCombatAbilityResult, type EnemyRuntimeDependencies } from '../game/combat/combatEnemyRuntime'
import { enemyCombatAbilityById } from '../game/data/enemyCombatAbilities'
import { effectById } from '../game/data/effects'
import { isPlayerStunned } from '../game/combat/combatCrowdControl'
import { getPlayerHealingReceivedMultiplier } from '../game/combat/combatHealing'
import { normalizeEnemyTraitRuntimeState, getEnemyTraitIncomingDamageMultiplier, getEnemyTraitStatModifiers } from '../game/enemyTraits/enemyTraitRuntime'
import { instantiateCombatTarget } from '../game/combat/combatState'

const dependencies: EnemyRuntimeDependencies = {
  applyEffectiveHealing: (game) => game,
  awardBarrierCredits: (game) => game,
  resolveDefensiveTrainingForCombatEvent: (game) => game,
}

function fixture(nextFor: (kind: string) => number = () => 0) {
  const initial = createInitialGameState()
  const stats = calculateHunterCombatStats(initial.equipment, initial.inventory, initial.progression)
  const context = createCombatContext({ next: () => 0, nextFor })
  return { game: startCombatTarget(initial, 'location.wolf-den', 'enemy.grey-wolf', stats, context), stats, context }
}

describe('1v1 combat regression coverage', () => {
  it('resolves a single-hit ability and starts its cooldown after resolution', () => {
    const { game, stats, context } = fixture()
    const enemyId = game.combat.enemy!.instanceId
    const result = resolveEnemyCombatAbilityResult(game, enemyId, enemyCombatAbilityById['enemy-ability.heavy-slam'], context, stats, dependencies)
    expect(result.resolution.totalHits).toBe(1)
    expect(result.resolution.successfulHits).toBe(1)
    expect(result.resolution.hpDamageDealt).toBeGreaterThan(0)
    expect(result.game.combat.enemy?.abilityCooldowns['enemy-ability.heavy-slam']).toBe(10)
  })

  it('keeps multi-hit effect ownership per successful hit and rejects effects after a miss', () => {
    const hitFixture = fixture(() => 0)
    const hitResult = resolveEnemyCombatAbilityResult(hitFixture.game, hitFixture.game.combat.enemy!.instanceId, enemyCombatAbilityById['enemy-ability.triple-rend'], hitFixture.context, hitFixture.stats, dependencies)
    expect(hitResult.resolution.totalHits).toBe(3)
    expect(hitResult.resolution.successfulHits).toBe(3)
    expect(hitResult.resolution.effectsApplied).toEqual(['effect.bleed'])

    const missFixture = fixture((kind) => kind === 'hit' ? 1 : 0)
    const missResult = resolveEnemyCombatAbilityResult(missFixture.game, missFixture.game.combat.enemy!.instanceId, enemyCombatAbilityById['enemy-ability.headlong-charge'], missFixture.context, missFixture.stats, dependencies)
    expect(missResult.resolution.successfulHits).toBe(0)
    expect(missResult.resolution.effectsApplied).toEqual([])
    expect(missResult.game.combat.playerEffects).toEqual([])
    expect(effectById['effect.stunned'].tags).toContain('stun')
    expect(isPlayerStunned({ ...missFixture.game.combat, playerEffects: [{ effectId: 'effect.stunned' } as never] }, missFixture.context.effects)).toBe(true)
  })

  it('preserves enemy trait stat and incoming-damage modifiers through the canonical runtime', () => {
    const enemy = { ...instantiateCombatTarget('enemy.grey-wolf', 1)!, currentHealth: 20 }
    const definitions = { [enemy.enemyId]: { traits: [{ traitId: 'trait.fireborn' as const, rank: 1 as const }, { traitId: 'trait.bloodied-fury' as const, rank: 2 as const }] } }
    const modifiers = getEnemyTraitStatModifiers(enemy, .2, definitions)
    expect(modifiers.some((modifier) => modifier.stat === 'fireResistance')).toBe(true)
    expect(modifiers.some((modifier) => modifier.stat === 'attackDamage')).toBe(true)
    expect(getEnemyTraitIncomingDamageMultiplier(enemy, { damageType: 'fire', deliveryKind: 'hit', sourceCategory: 'magic' }, 1, definitions)).toBeGreaterThan(0)
    expect(normalizeEnemyTraitRuntimeState(undefined)).toEqual({ elapsedSeconds: 0, byTraitId: {} })
  })

  it('composes healing reduction from active effect and enemy trait', () => {
    const { game, context } = fixture()
    const enemy = game.combat.enemy!
    const healingEffect = { effectId: 'effect.enemy-healing-reduction', instanceId: 'healing#1', source: { kind: 'enemy', instanceId: enemy.instanceId }, target: { kind: 'player' }, stacks: 1, remainingSeconds: 10, nextTickRemaining: null, appliedSequence: 1 } as never
    const traitContext = { ...context, enemies: { ...context.enemies, [enemy.enemyId]: { ...context.enemies[enemy.enemyId], traits: [{ traitId: 'trait.diseased' as const, rank: 1 as const }] } } }
    expect(getPlayerHealingReceivedMultiplier({ ...game.combat, playerEffects: [healingEffect] }, traitContext, enemy)).toBeCloseTo(.5525)
  })
})
