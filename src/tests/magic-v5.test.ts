import { describe, expect, it } from 'vitest'
import { castSpell, createCombatContext, startHunt } from '../game/combat/combatEngine'
import { resolveDamage } from '../game/combat/combatDamage'
import type { CombatStats } from '../game/combat/combatTypes'
import { effectById } from '../game/data/effects'
import { proficiencyDefinitions } from '../game/data/proficiencies'
import { proficiencyPerkDefinitions } from '../game/data/proficiencyPerks'
import { spellById } from '../game/data/spells'
import { createInitialGameState } from '../game/gameState'
import { migrateCurrentSave } from '../game/persistence/saveMigration'
import { normalizeCombatStats } from '../game/combat/combatStats'

const stats: CombatStats = normalizeCombatStats({ maxLife: 100, attackDamage: 40, accuracyRating: 100, baseAttackTime: 2, armour: 10, evasionRating: 0, baseCritChance: 0, criticalStrikeMultiplier: 1.5, maxStamina: 100, staminaRegen: 5, maxMana: 100, manaRegenFlat: 5, resistances: {} })
const fixedContext = createCombatContext({ next: () => .5 })

describe('Magic Schools V5', () => {
  it('contains exactly the five canonical 40-node Magic trees', () => {
    const magic = proficiencyDefinitions.filter((definition) => definition.category === 'magic')
    expect(magic.map((definition) => definition.id)).toEqual(['fire-magic', 'water-magic', 'air-magic', 'earth-magic', 'darkness-magic'])
    expect(magic.every((definition) => definition.perkIds.length === 40)).toBe(true)
    expect(magic.reduce((total, definition) => total + definition.perkIds.length, 0)).toBe(200)
    expect(proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === 'water-magic')).toHaveLength(40)
    expect(proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === 'air-magic')).toHaveLength(40)
    expect(proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === 'earth-magic')).toHaveLength(40)
    expect(proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === 'darkness-magic')).toHaveLength(40)
  })

  it('keeps canonical spell IDs and school mappings stable', () => {
    expect(spellById['spell.flame-blast'].magicProficiencyId).toBe('fire-magic')
    expect(spellById['spell.disrupting-pulse'].magicProficiencyId).toBe('air-magic')
    expect(spellById['spell.ice-shard'].damageType).toBe('cold')
    expect(spellById['spell.stone-spike'].damageType).toBe('physical')
    expect(spellById['spell.shadow-bolt'].damageType).toBe('chaos')
  })

  it('provides source-owned core statuses and Darkness periodic progression credit', () => {
    expect(effectById['effect.chilled'].statModifiers).toContainEqual({ stat: 'actionSpeed', operation: 'flat', value: -.03 })
    expect(effectById['effect.shocked'].statModifiers).toContainEqual({ stat: 'increasedDamageTaken', operation: 'flat', value: .1 })
    expect(effectById['effect.cursed'].statModifiers).toContainEqual({ stat: 'accuracyRating', operation: 'flat', value: -5 })
    expect(effectById['effect.shadow-decay'].periodic?.operation).toEqual({ type: 'damage', damageType: 'chaos', baseAmount: 7, canCrit: false })
  })

  it('uses the expanded resistance identities in generic damage resolution', () => {
    const defender = { ...stats, coldResistance: .5, chaosResistance: -.25 }
    const cold = resolveDamage({ damageType: 'cold', baseDamage: 40, canCrit: false, source: { kind: 'player' }, target: { kind: 'enemy', instanceId: 'e' }, guaranteedHit: true, defensiveEligibility: { canMiss: false, blockable: false } }, stats, defender, { next: () => .5 })
    const chaos = resolveDamage({ damageType: 'chaos', baseDamage: 40, canCrit: false, source: { kind: 'player' }, target: { kind: 'enemy', instanceId: 'e' }, guaranteedHit: true, defensiveEligibility: { canMiss: false, blockable: false } }, stats, defender, { next: () => .5 })
    expect(cold.healthDamage).toBe(20)
    expect(chaos.healthDamage).toBe(50)
  })

  it('trains Water, Earth, and Darkness through meaningful starter outcomes', () => {
    const game = createInitialGameState()
    const started = startHunt({ ...game, combat: { ...game.combat, playerHp: 1000 } }, 'location.wolf-den', { ...stats, maxLife: 1000, attackDamage: 40 }, fixedContext)
    const target = started.combat.enemies[0]
    const water = castSpell({ ...started, combat: { ...started.combat, selectedEnemyInstanceId: target.instanceId, mana: 100 } }, 'spell.ice-shard', stats as never, fixedContext)
    expect(water.progression.proficiencies['water-magic']?.totalXp).toBeGreaterThan(0)
    expect(water.combat.enemies[0].effects.some((effect) => effect.effectId === 'effect.chilled')).toBe(true)
    const earth = castSpell({ ...started, combat: { ...started.combat, selectedEnemyInstanceId: target.instanceId, mana: 100 } }, 'spell.stone-spike', stats as never, createCombatContext({ next: () => .1 }))
    expect(earth.progression.proficiencies['earth-magic']?.totalXp).toBeGreaterThan(0)
    expect(earth.combat.enemies[0].effects.some((effect) => effect.effectId === 'effect.armor-broken')).toBe(true)
    const darkness = castSpell({ ...started, spellbook: { ...started.spellbook, equippedSpellSlots: [...started.spellbook.equippedSpellSlots.slice(0, 4), 'spell.shadow-bolt'] }, combat: { ...started.combat, selectedEnemyInstanceId: target.instanceId, mana: 100 } }, 'spell.shadow-bolt', stats as never, fixedContext)
    expect(darkness.progression.proficiencies['darkness-magic']?.totalXp).toBeGreaterThan(0)
    expect(darkness.combat.enemies[0].effects.find((effect) => effect.effectId === 'effect.shadow-decay')?.sourceProficiencyId).toBe('darkness-magic')
  })

  it('migrates V2 school progress without duplicating Mastery or preserving legacy purchases', () => {
    const game = createInitialGameState()
    const migrated = migrateCurrentSave({ version: 2, progression: { proficiencies: { 'one-handed-sword': { proficiencyId: 'one-handed-sword', totalXp: 10 }, 'warding-magic': { proficiencyId: 'warding-magic', totalXp: 40 }, 'light-magic': { proficiencyId: 'light-magic', totalXp: 3 }, 'disruption-magic': { proficiencyId: 'disruption-magic', totalXp: 20 } }, masteryXp: 123, purchasedPerks: { 'perk.warding-magic.aegis-training': 2, 'perk.one-handed-sword.one-handed-mastery': 1 } }, inventory: game.inventory, equipment: game.equipment, collection: game.collection, gold: 0, settings: { reducedMotion: false, showInspectorButton: true } })
    expect(migrated?.version).toBe(3)
    expect(migrated?.progression.masteryXp).toBe(123)
    expect((migrated?.progression.proficiencies as Record<string, unknown>)['light-magic']).toBeUndefined()
    expect(migrated?.progression.proficiencies['air-magic']?.totalXp).toBe(20)
    expect(migrated?.progression.purchasedPerks).toEqual({ 'perk.one-handed-sword.one-handed-mastery': 1 })
  })
})
