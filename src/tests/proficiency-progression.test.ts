import { describe, expect, it } from 'vitest'
import { itemById } from '../game/data/items'
import { createInitialGameState } from '../game/gameState'
import { calculateAvailablePerkPoints, calculateEarnedPerkPoints, perkPointCost, totalMasteryXpForPerkPoints } from '../game/progression/masteryProgression'
import { applyProficiencyStatModifiers, getActiveProficiencyStatModifiers, purchasePerk } from '../game/progression/perkProgression'
import { discoverProficiency, awardProficiencyXp, proficiencyLevelForXp, proficiencyXpForLevel } from '../game/progression/proficiencyProgression'
import { migrateLegacySave } from '../game/persistence/saveMigration'
import { getEquippedWeaponProficiency } from '../game/progression/progressionSelectors'
import { perkById } from '../game/data/proficiencyPerks'
import type { CombatStats } from '../game/combat/combatTypes'

describe('weapon proficiency progression', () => {
  it('uses the capped weapon XP curve and supports multi-level jumps', () => {
    expect(proficiencyXpForLevel(1)).toBe(0)
    expect(proficiencyLevelForXp(proficiencyXpForLevel(5) - 1)).toBe(4)
    expect(proficiencyLevelForXp(proficiencyXpForLevel(5))).toBe(5)
    expect(proficiencyLevelForXp(Number.MAX_SAFE_INTEGER)).toBe(100)
  })

  it('awards equal proficiency and mastery XP and reports threshold gains', () => {
    const result = awardProficiencyXp(createInitialGameState().progression, 'one-handed-sword', 1000)
    expect(result.proficiencyXpGained).toBe(1000)
    expect(result.progression.proficiencies['one-handed-sword']?.totalXp).toBe(1000)
    expect(result.progression.masteryXp).toBe(1000)
    expect(result.oldEarnedPerkPoints).toBe(0)
    expect(result.newEarnedPerkPoints).toBe(1)
    expect(result.perkPointsEarned).toBe(1)
  })

  it('derives increasing perk thresholds and available points', () => {
    expect(perkPointCost(1)).toBe(1000)
    expect(totalMasteryXpForPerkPoints(3)).toBe(4500)
    expect(calculateEarnedPerkPoints(999)).toBe(0)
    expect(calculateEarnedPerkPoints(2500)).toBe(2)
    const progression = { ...createInitialGameState().progression, masteryXp: 4500, purchasedPerks: { 'perk.one-handed-sword.blade-familiarity': 1 } }
    expect(calculateAvailablePerkPoints(progression, perkById)).toBe(2)
  })

  it('validates perk level, points, max rank, and matching tree membership', () => {
    const base = { ...createInitialGameState().progression, masteryXp: 1000, proficiencies: { 'one-handed-sword': { proficiencyId: 'one-handed-sword' as const, totalXp: 0 } } }
    expect(purchasePerk(base, 'perk.one-handed-sword.balanced-grip', perkById).outcome).toBe('level-locked')
    const unlocked = { ...base, proficiencies: { 'one-handed-sword': { proficiencyId: 'one-handed-sword' as const, totalXp: proficiencyXpForLevel(1) } } }
    const purchased = purchasePerk(unlocked, 'perk.one-handed-sword.blade-familiarity', perkById)
    expect(purchased.outcome).toBe('purchased')
    expect(purchased.progression.purchasedPerks['perk.one-handed-sword.blade-familiarity']).toBe(1)
    expect(purchasePerk({ ...unlocked, purchasedPerks: { 'perk.one-handed-sword.blade-familiarity': 3 } }, 'perk.one-handed-sword.blade-familiarity', perkById).outcome).toBe('max-rank')
    expect(purchasePerk(unlocked, 'perk.one-handed-sword.relentless-blade', perkById).outcome).toBe('level-locked')
  })

  it('scopes sword stat perks to the equipped weapon proficiency', () => {
    const progression = { ...createInitialGameState().progression, purchasedPerks: { 'perk.one-handed-sword.blade-familiarity': 3 } }
    const active = getActiveProficiencyStatModifiers(progression, 'one-handed-sword', perkById)
    const baseStats: CombatStats = { maxHealth: 100, attackPower: 20, accuracy: 50, attackInterval: 2, armor: 10, evasion: 10, critChance: 0.05, critDamage: 1.5, dodgeChance: 0.03, parryChance: 0.03, blockChance: 0, blockPower: 0.5, maxStamina: 100, staminaRegen: 5, maxMana: 100, manaRegen: 5, statusResistance: 0, resistances: {} }
    expect(applyProficiencyStatModifiers(baseStats, active).accuracy).toBe(56)
    expect(active).toHaveLength(1)
    expect(active[0].value).toBe(6)
    expect(getEquippedWeaponProficiency(createInitialGameState().equipment)).toBe('one-handed-sword')
    expect(getEquippedWeaponProficiency({ slots: { weapon: 'item.training-armor', armor: 'item.training-armor' } })).toBeNull()
    expect(itemById['item.training-sword'].weaponProficiencyId).toBe('one-handed-sword')
  })

  it('discovers a new proficiency without creating fake XP in others', () => {
    const next = discoverProficiency(createInitialGameState().progression, 'longbow')
    expect(next.proficiencies.longbow).toEqual({ proficiencyId: 'longbow', totalXp: 0 })
    expect(next.proficiencies['one-handed-axe']).toBeUndefined()
  })

  it('migrates old skill XP to sword XP and global mastery only', () => {
    const game = createInitialGameState()
    const migrated = migrateLegacySave({ version: 1, progression: { skills: { swordsmanship: { totalXp: 120 }, defense: { totalXp: 80 }, magic: { totalXp: 30 } }, trainingFocus: 'magic', hunterRank: 7 }, inventory: game.inventory, equipment: game.equipment, collection: game.collection, gold: 42, settings: { reducedMotion: false, showInspectorButton: true } })
    expect(migrated?.progression.masteryXp).toBe(230)
    expect(migrated?.progression.proficiencies['one-handed-sword']?.totalXp).toBe(120)
    expect(migrated?.progression.proficiencies['longbow']).toBeUndefined()
    expect(migrated?.progression.purchasedPerks).toEqual({})
  })
})
