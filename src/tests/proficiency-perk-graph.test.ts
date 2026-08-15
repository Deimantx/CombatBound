import { describe, expect, it } from 'vitest'
import { proficiencyPerkDefinitions, perkById } from '../game/data/proficiencyPerks'
import { createInitialGameState } from '../game/gameState'
import { getPerkPurchaseState, purchasePerk } from '../game/progression/perkProgression'
import { validateAllPerkGraphs, validatePerkGraph } from '../game/progression/perkGraphValidation'
import { proficiencyXpForLevel } from '../game/progression/proficiencyProgression'

describe('proficiency perk graphs', () => {
  it('contains a 40-node tree for every current proficiency', () => {
    for (const proficiencyId of ['one-handed-sword', 'one-handed-axe', 'one-handed-mace', 'dagger', 'two-handed-sword', 'two-handed-axe', 'two-handed-hammer', 'spear', 'shortbow', 'longbow', 'crossbow', 'fire-magic', 'water-magic', 'air-magic', 'earth-magic', 'darkness-magic', 'light-armor', 'medium-armor', 'heavy-armor', 'shield'] as const) expect(proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === proficiencyId)).toHaveLength(40)
  })

  it('validates roots, rank references, coordinates, and acyclic prerequisites', () => {
    const result = validateAllPerkGraphs(proficiencyPerkDefinitions)
    expect(result.valid).toBe(true)
    expect(result.results).toHaveLength(20)
    expect(result.results.every(({ result: graph }) => graph.errors.length === 0)).toBe(true)
  })

  it('uses any-rule minimums and rank-specific requirements in the purchase state', () => {
    const base = { ...createInitialGameState().progression, masteryXp: 10000, proficiencies: { 'one-handed-sword': { proficiencyId: 'one-handed-sword' as const, totalXp: proficiencyXpForLevel(100) } } }
    const apex = perkById['perk.one-handed-sword.swordmaster']
    expect(apex.prerequisiteRules.some((rule) => rule.mode === 'any' && rule.minimumSatisfied === 3)).toBe(true)
    expect(getPerkPurchaseState(base, apex.id, perkById).status).toBe('prerequisite-locked')
    const partial = { ...base, purchasedPerks: { 'perk.one-handed-sword.one-handed-mastery': 5, 'perk.one-handed-sword.final-measure': 1, 'perk.one-handed-sword.red-finale': 1, 'perk.one-handed-sword.perfect-form': 1 } }
    expect(getPerkPurchaseState(partial, apex.id, perkById).status).toBe('points-locked')
    const purchased = purchasePerk({ ...partial, masteryXp: 1000000 }, apex.id, perkById)
    expect(purchased.outcome).toBe('purchased')
  })

  it('reports distinct level, prerequisite, points, and maxed states', () => {
    const rootId = 'perk.one-handed-sword.one-handed-mastery'
    const root = perkById[rootId]
    const noPoints = { ...createInitialGameState().progression, proficiencies: { 'one-handed-sword': { proficiencyId: 'one-handed-sword' as const, totalXp: 0 } } }
    expect(getPerkPurchaseState(noPoints, rootId, perkById).status).toBe('level-locked')
    const lowLevel = { ...noPoints, masteryXp: 1000, proficiencies: { 'one-handed-sword': { proficiencyId: 'one-handed-sword' as const, totalXp: 0 } } }
    expect(getPerkPurchaseState(lowLevel, 'perk.one-handed-sword.measured-strikes', perkById).status).toBe('level-locked')
    const purchased = { ...lowLevel, proficiencies: { 'one-handed-sword': { proficiencyId: 'one-handed-sword' as const, totalXp: proficiencyXpForLevel(5) } }, purchasedPerks: { [rootId]: 1 } }
    expect(getPerkPurchaseState(purchased, 'perk.one-handed-sword.measured-strikes', perkById).status).toBe('points-locked')
    const maxed = { ...purchased, purchasedPerks: { [rootId]: root.maxRank } }
    expect(getPerkPurchaseState(maxed, rootId, perkById).status).toBe('maxed')
  })

  it('rejects a cyclic graph', () => {
    const root = proficiencyPerkDefinitions.find((perk) => perk.id === 'perk.fire-magic.fire-magic-mastery')!
    const child = proficiencyPerkDefinitions.find((perk) => perk.id === 'perk.fire-magic.kindled-force')!
    const result = validatePerkGraph([{ ...root, prerequisiteRules: [{ mode: 'all', requirements: [{ perkId: child.id, requiredRank: 1 }] }] }, child], 'fire-magic')
    expect(result.valid).toBe(false)
    expect(result.errors.some((error) => error.includes('cycle'))).toBe(true)
  })
})
