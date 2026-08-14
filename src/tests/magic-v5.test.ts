import { describe, expect, it } from 'vitest'
import { advanceCombat, castSpell, createCombatContext, startHunt } from '../game/combat/combatEngine'
import { resolveDamage } from '../game/combat/combatDamage'
import type { CombatStats } from '../game/combat/combatTypes'
import { effectById } from '../game/data/effects'
import { proficiencyDefinitions } from '../game/data/proficiencies'
import { proficiencyPerkDefinitions } from '../game/data/proficiencyPerks'
import { spellById } from '../game/data/spells'
import { createInitialGameState } from '../game/gameState'
import { migrateCurrentSave } from '../game/persistence/saveMigration'

const stats: CombatStats = { maxHealth: 100, attackPower: 40, accuracy: 100, attackInterval: 2, armor: 10, evasion: 0, critChance: 0, critDamage: 1.5, dodgeChance: 0, parryChance: 0, blockChance: 0, blockPower: .5, maxStamina: 100, staminaRegen: 5, maxMana: 100, manaRegen: 5, statusResistance: 0, resistances: {} }
const fixedContext = createCombatContext({ next: () => .5 })

describe('Magic Schools V5', () => {
  it('contains exactly the six canonical 40-node Magic trees', () => {
    const magic = proficiencyDefinitions.filter((definition) => definition.category === 'magic')
    expect(magic.map((definition) => definition.id)).toEqual(['fire-magic', 'water-magic', 'air-magic', 'earth-magic', 'light-magic', 'darkness-magic'])
    expect(magic.every((definition) => definition.perkIds.length === 40)).toBe(true)
    expect(magic.reduce((total, definition) => total + definition.perkIds.length, 0)).toBe(240)
    expect(proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === 'water-magic')).toHaveLength(40)
    expect(proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === 'air-magic')).toHaveLength(40)
    expect(proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === 'earth-magic')).toHaveLength(40)
    expect(proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === 'light-magic')).toHaveLength(40)
    expect(proficiencyPerkDefinitions.filter((perk) => perk.proficiencyId === 'darkness-magic')).toHaveLength(40)
  })

  it('keeps spell IDs stable while migrating Protective Sign and Disrupting Pulse', () => {
    expect(spellById['spell.flame-blast'].magicProficiencyId).toBe('fire-magic')
    expect(spellById['spell.protective-sign'].magicProficiencyId).toBe('light-magic')
    expect(spellById['spell.disrupting-pulse'].magicProficiencyId).toBe('air-magic')
    expect(spellById['spell.ice-shard'].damageType).toBe('water')
    expect(spellById['spell.stone-spike'].damageType).toBe('earth')
    expect(spellById['spell.shadow-bolt'].damageType).toBe('darkness')
  })

  it('provides source-owned core statuses and Darkness periodic progression credit', () => {
    expect(effectById['effect.chilled'].statModifiers).toContainEqual({ stat: 'attackInterval', operation: 'addPercent', value: .03 })
    expect(effectById['effect.shocked'].statModifiers).toContainEqual({ stat: 'evasion', operation: 'flat', value: -8 })
    expect(effectById['effect.cursed'].statModifiers).toContainEqual({ stat: 'accuracy', operation: 'flat', value: -5 })
    expect(effectById['effect.shadow-decay'].periodic?.operation).toEqual({ type: 'damage', damageType: 'darkness', baseAmount: 7, canCrit: false })
  })

  it('uses the expanded resistance identities in generic damage resolution', () => {
    const defender = { ...stats, resistances: { water: .5, light: .25, darkness: -.25 } }
    const water = resolveDamage({ damageType: 'water', baseDamage: 40, canCrit: false, source: { kind: 'player' }, target: { kind: 'enemy', instanceId: 'e' }, guaranteedHit: true, defensiveEligibility: { canMiss: false, dodgeable: false, parryable: false, blockable: false } }, stats, defender, { next: () => .5 })
    const darkness = resolveDamage({ damageType: 'darkness', baseDamage: 40, canCrit: false, source: { kind: 'player' }, target: { kind: 'enemy', instanceId: 'e' }, guaranteedHit: true, defensiveEligibility: { canMiss: false, dodgeable: false, parryable: false, blockable: false } }, stats, defender, { next: () => .5 })
    expect(water.healthDamage).toBe(20)
    expect(darkness.healthDamage).toBe(50)
  })

  it('trains Water, Earth, and Darkness through meaningful starter outcomes', () => {
    const game = createInitialGameState()
    const started = startHunt({ ...game, combat: { ...game.combat, playerHp: 1000 } }, 'location.wolf-den', { ...stats, maxHealth: 1000, attackPower: 40 } as never, fixedContext)
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
    expect(migrated?.progression.proficiencies['light-magic']?.totalXp).toBe(43)
    expect(migrated?.progression.proficiencies['air-magic']?.totalXp).toBe(20)
    expect(migrated?.progression.purchasedPerks).toEqual({ 'perk.one-handed-sword.one-handed-mastery': 1 })
  })
})
