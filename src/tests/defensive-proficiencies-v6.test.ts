import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game/gameState'
import { calculateHunterCombatStats } from '../game/equipment/derivedStats'
import { calculateDefensiveTrainingAwards, getDefensiveEquipmentContext } from '../game/equipment/defensiveEquipment'
import { advanceCombat, resolveDefensiveTrainingForEnemyAction } from '../game/combat/combatEngine'
import { itemById, type ItemDefinition } from '../game/data/items'
import { getActiveDefensiveEquipmentModifiers } from '../game/progression/perkProgression'
import { migrateCurrentSave } from '../game/persistence/saveMigration'
import type { ProficiencyPerkDefinition } from '../game/progression/progressionTypes'

const piece = (id: string, equipmentSlot: 'head' | 'chest' | 'hands' | 'feet' | 'offhand', defensiveProficiencyId: 'light-armor' | 'medium-armor' | 'heavy-armor' | 'shield', stats: NonNullable<ItemDefinition['stats']> = {}): ItemDefinition => ({ id, name: id, category: 'armor', rarity: 'common', description: id, icon: 'shield', equipmentSlot, defensiveProficiencyId, stats })
const items = { ...itemById, ...Object.fromEntries([
  piece('test.light-head', 'head', 'light-armor'), piece('test.light-chest', 'chest', 'light-armor'), piece('test.light-hands', 'hands', 'light-armor'), piece('test.light-feet', 'feet', 'light-armor'),
  piece('test.medium-chest', 'chest', 'medium-armor'), piece('test.heavy-hands', 'hands', 'heavy-armor'), piece('test.heavy-feet', 'feet', 'heavy-armor'), piece('test.shield', 'offhand', 'shield', { armor: 4, blockChance: .1, blockPower: .1, attackInterval: .5 }),
].map((item) => [item.id, item])) } as Record<string, ItemDefinition>

describe('Defensive Proficiencies V6', () => {
  it('splits armor XP exactly and adds Shield independently', () => {
    expect(calculateDefensiveTrainingAwards({ lightArmorPieces: 4, mediumArmorPieces: 0, heavyArmorPieces: 0, shieldEquipped: false })).toMatchObject({ 'light-armor': 1, 'medium-armor': 0, 'heavy-armor': 0, shield: 0 })
    expect(calculateDefensiveTrainingAwards({ lightArmorPieces: 1, mediumArmorPieces: 1, heavyArmorPieces: 2, shieldEquipped: true })).toMatchObject({ 'light-armor': .25, 'medium-armor': .25, 'heavy-armor': .5, shield: 1 })
    expect(calculateDefensiveTrainingAwards({ lightArmorPieces: 0, mediumArmorPieces: 0, heavyArmorPieces: 0, shieldEquipped: true })).toMatchObject({ 'light-armor': 0, 'medium-armor': 0, 'heavy-armor': 0, shield: 1 })
  })

  it('awards one event through normal proficiency and Mastery progression', () => {
    const game = createInitialGameState()
    const equipped = { slots: { head: 'test.light-head', chest: 'test.medium-chest', hands: 'test.heavy-hands', feet: 'test.heavy-feet', offhand: 'test.shield' } }
    const next = resolveDefensiveTrainingForEnemyAction({ ...game, equipment: equipped }, { source: 'enemy-direct-action', resolved: true }, items)
    expect(next.progression.proficiencies['light-armor']?.totalXp).toBe(.25)
    expect(next.progression.proficiencies['medium-armor']?.totalXp).toBe(.25)
    expect(next.progression.proficiencies['heavy-armor']?.totalXp).toBe(.5)
    expect(next.progression.proficiencies.shield?.totalXp).toBe(1)
    expect(next.progression.masteryXp).toBe(2)
    expect(next.combat.session.masteryXpGained).toBe(2)
    expect(resolveDefensiveTrainingForEnemyAction({ ...game, equipment: equipped }, { source: 'enemy-direct-action', resolved: false }, items).progression.masteryXp).toBe(0)
  })

  it('scales defensive perk effects by matching pieces and respects thresholds', () => {
    const perk: ProficiencyPerkDefinition = { id: 'test.defensive-per-piece', proficiencyId: 'light-armor', name: 'Per-piece test', branch: 'Test', requiredProficiencyLevel: 1, maxRank: 3, costPerRank: 1, description: 'test', effects: [{ type: 'equippedArmorStatModifier', stat: 'manaRegen', operation: 'flat', valuePerRankPerPiece: .5 }, { type: 'equippedArmorStatModifier', stat: 'armor', operation: 'flat', valuePerRankPerPiece: 2, minimumPieces: 3 }], prerequisiteRules: [], presentation: { column: 0, row: 1, icon: 'shield' } }
    const progression = { ...createInitialGameState().progression, purchasedPerks: { [perk.id]: 2 } }
    expect(getActiveDefensiveEquipmentModifiers(progression, { lightArmorPieces: 0, mediumArmorPieces: 0, heavyArmorPieces: 0, shieldEquipped: false }, { [perk.id]: perk }).statModifiers).toEqual([])
    expect(getActiveDefensiveEquipmentModifiers(progression, { lightArmorPieces: 2, mediumArmorPieces: 0, heavyArmorPieces: 0, shieldEquipped: false }, { [perk.id]: perk }).statModifiers).toEqual([{ stat: 'manaRegen', operation: 'flat', value: 2 }])
    expect(getActiveDefensiveEquipmentModifiers(progression, { lightArmorPieces: 3, mediumArmorPieces: 0, heavyArmorPieces: 0, shieldEquipped: false }, { [perk.id]: perk }).statModifiers).toEqual([{ stat: 'manaRegen', operation: 'flat', value: 3 }, { stat: 'armor', operation: 'flat', value: 12 }])
  })

  it('aggregates all defensive gear while keeping attack interval weapon-controlled', () => {
    const equipment = { slots: { weapon: 'item.training-sword', head: 'test.light-head', chest: 'test.medium-chest', hands: 'test.heavy-hands', feet: 'test.heavy-feet', offhand: 'test.shield' } }
    const stats = calculateHunterCombatStats(equipment, createInitialGameState().progression, 'mid', { 'careful-positioning': false, 'heightened-reflexes': false }, items)
    expect(stats.armor).toBe(35 + 4)
    expect(stats.blockChance).toBeCloseTo(.1)
    expect(stats.blockPower).toBeCloseTo(.6)
    expect(stats.attackInterval).toBeCloseTo(2.4)
  })

  it('keeps active-combat Health Regen capped and frame-independent', () => {
    const equipment = { slots: { weapon: 'item.training-sword', chest: 'test.heavy-hands' } }
    const stats = calculateHunterCombatStats(equipment, createInitialGameState().progression, 'mid', { 'careful-positioning': false, 'heightened-reflexes': false }, { ...items, 'test.heavy-hands': piece('test.heavy-hands', 'chest', 'heavy-armor', { healthRegen: 2 }) })
    const base = createInitialGameState()
    const active = { ...base, equipment, combat: { ...base.combat, phase: 'active' as const, playerHp: stats.maxHealth - 1, maxPlayerHp: stats.maxHealth, enemies: [] } } as ReturnType<typeof createInitialGameState>
    const one = advanceCombat(active, 1, createInitialGameContext(), stats)
    let many = active
    for (let index = 0; index < 10; index += 1) many = advanceCombat(many, .1, createInitialGameContext(), stats)
    expect(one.combat.playerHp).toBe(stats.maxHealth)
    expect(one.combat.session.healing).toBeCloseTo(1)
    expect(many.combat.playerHp).toBeCloseTo(one.combat.playerHp)
    expect(many.combat.session.healing).toBeCloseTo(one.combat.session.healing)
  })

  it('moves legacy armor saves into chest without duplication', () => {
    const game = createInitialGameState()
    const migrated = migrateCurrentSave({ version: 2, progression: game.progression, inventory: game.inventory, equipment: { slots: { weapon: 'item.training-sword', armor: 'item.training-armor' } }, collection: game.collection, gold: 0, settings: { reducedMotion: false, showInspectorButton: true } })
    expect(migrated?.equipment.slots.chest).toBe('item.training-armor')
    expect(migrated?.equipment.slots.armor).toBeUndefined()
    expect(Object.values(migrated?.equipment.slots ?? {}).filter((itemId) => itemId === 'item.training-armor')).toHaveLength(1)
  })
})

function createInitialGameContext() {
  return { enemies: {}, locations: {}, spells: {}, items, effects: {}, rng: { next: () => 0.5 } }
}
