import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game/gameState'
import { perkById } from '../game/data/proficiencyPerks'
import { calculateAvailablePerkPoints } from '../game/progression/perkProgression'
import { applyProficiencyStatModifiers, getActiveProficiencyStatModifiers, purchasePerk } from '../game/progression/perkProgression'
import { discoverProficiency, awardProficiencyXp, getProficiencyLevelProgress, proficiencyLevelForXp, proficiencyXpForLevel } from '../game/progression/proficiencyProgression'
import { migrateLegacySave } from '../game/persistence/saveMigration'
import type { CombatStats } from '../game/combat/combatTypes'
import { normalizeCombatStats } from '../game/combat/combatStats'

describe('weapon proficiency progression', () => {
  it('uses the harder curve and supports multi-level jumps', () => {
    expect(proficiencyXpForLevel(1)).toBe(0)
    expect(proficiencyXpForLevel(2)).toBe(100)
    expect(proficiencyLevelForXp(proficiencyXpForLevel(5) - 1)).toBe(4)
    expect(proficiencyLevelForXp(proficiencyXpForLevel(5))).toBe(5)
    expect(proficiencyLevelForXp(Number.MAX_SAFE_INTEGER)).toBe(100)
  })

  it('calculates honest within-level progress for proficiency UI', () => {
    const levelTwoXp = proficiencyXpForLevel(2)
    const midwayXp = levelTwoXp + Math.floor((proficiencyXpForLevel(3) - levelTwoXp) / 2)
    expect(getProficiencyLevelProgress(0)).toMatchObject({ level: 0, progressFraction: 0, xpRequiredForLevel: proficiencyXpForLevel(2), xpToNextLevel: proficiencyXpForLevel(2), isMaxLevel: false })
    expect(getProficiencyLevelProgress(levelTwoXp)).toMatchObject({ level: 2, currentLevelXp: levelTwoXp, xpIntoLevel: 0, progressFraction: 0 })
    expect(getProficiencyLevelProgress(midwayXp).progressFraction).toBeCloseTo((midwayXp - levelTwoXp) / (proficiencyXpForLevel(3) - levelTwoXp))
    expect(getProficiencyLevelProgress(proficiencyXpForLevel(100))).toMatchObject({ level: 100, progressFraction: 1, isMaxLevel: true, xpToNextLevel: 0 })
  })

  it('does not award Hunter Rank or perk points when Proficiency XP is awarded', () => {
    const initial = createInitialGameState().progression
    const result = awardProficiencyXp(initial, 'one-handed-sword', 1000)
    expect(result.proficiencyXpGained).toBe(1000)
    expect(result.progression.proficiencies['one-handed-sword']?.totalXp).toBe(1000)
    expect(result.progression.hunterRankPoints).toBe(0)
    expect(result.progression.bonusPerkPoints).toBe(0)
    expect(result.levelsGained).toBeGreaterThan(0)
  })

  it('keeps perk availability limited to independent bonus points', () => {
    const progression = { ...createInitialGameState().progression, bonusPerkPoints: 4, purchasedPerks: { 'perk.one-handed-sword.blade-familiarity': 1 } }
    expect(calculateAvailablePerkPoints(progression, perkById)).toBe(3)
  })

  it('validates perk level, points, max rank, and matching tree membership', () => {
    const base = { ...createInitialGameState().progression, bonusPerkPoints: 1, proficiencies: { 'one-handed-sword': { proficiencyId: 'one-handed-sword' as const, totalXp: 0 } } }
    expect(purchasePerk(base, 'perk.one-handed-sword.balanced-grip', perkById).outcome).toBe('level-locked')
    const unlocked = { ...base, proficiencies: { 'one-handed-sword': { proficiencyId: 'one-handed-sword' as const, totalXp: 1 } } }
    const purchased = purchasePerk(unlocked, 'perk.one-handed-sword.blade-familiarity', perkById)
    expect(purchased.outcome).toBe('purchased')
  })

  it('scopes sword stat perks to the equipped weapon proficiency', () => {
    const progression = { ...createInitialGameState().progression, purchasedPerks: { 'perk.one-handed-sword.blade-familiarity': 3 } }
    const active = getActiveProficiencyStatModifiers(progression, 'one-handed-sword', { 'perk.one-handed-sword.blade-familiarity': { id: 'perk.one-handed-sword.blade-familiarity', proficiencyId: 'one-handed-sword', name: 'Blade Familiarity', branch: 'Root', requiredProficiencyLevel: 1, maxRank: 3, costPerRank: 1, description: '', effects: [{ type: 'statModifier', stat: 'accuracyRating', operation: 'flat', valuePerRank: 2 }], prerequisiteRules: [], presentation: { column: 0, row: 0, icon: 'sword' } } })
    const baseStats: CombatStats = normalizeCombatStats({ maxLife: 100, attackDamage: 20, accuracyRating: 50, baseAttackTime: 2, armour: 10, evasionRating: 10, criticalStrikeChance: 0.05, criticalStrikeMultiplier: 1.5, maxStamina: 100, staminaRegen: 5, maxMana: 100, manaRegenFlat: 5, resistances: {} })
    expect(applyProficiencyStatModifiers(baseStats, active).accuracyRating).toBe(56)
  })

  it('discovers a new proficiency without creating fake XP in others', () => {
    const next = discoverProficiency(createInitialGameState().progression, 'longbow')
    expect(next.proficiencies.longbow).toEqual({ proficiencyId: 'longbow', totalXp: 0 })
    expect(next.proficiencies['one-handed-axe']).toBeUndefined()
  })

  it('migrates old skill XP through the historical boundary', () => {
    const game = createInitialGameState()
    const migrated = migrateLegacySave({ version: 1, progression: { skills: { swordsmanship: { totalXp: 120 }, defense: { totalXp: 80 }, magic: { totalXp: 30 } }, trainingFocus: 'magic', hunterRank: 7 }, inventory: game.inventory, equipment: game.equipment, collection: game.collection, gold: 42, settings: { reducedMotion: false, showInspectorButton: true } })
    expect(migrated?.progression.masteryXp).toBe(230)
    expect(migrated?.progression.proficiencies['one-handed-sword']?.totalXp).toBe(120)
    expect(migrated?.progression.purchasedPerks).toEqual({})
  })
})
