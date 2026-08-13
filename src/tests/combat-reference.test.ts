import { describe, expect, it } from 'vitest'
import { combatStatReferenceById } from '../game/data/combatGlossary'
import { proficiencyById } from '../game/data/proficiencies'
import { formatCombatStatValue, formatHealthWithBarrier, formatItemStat } from '../game/presentation/statFormatting'

describe('combat reference metadata', () => {
  it('keeps the important stat distinctions explicit', () => {
    expect(combatStatReferenceById.accuracy.fullDescription).toContain('Evasion')
    expect(combatStatReferenceById.accuracy.fullDescription).not.toContain('Armor affects Hit Chance')
    expect(combatStatReferenceById.armor.fullDescription).toContain('Physical')
    expect(combatStatReferenceById.armor.fullDescription).toContain('does not reduce Hit Chance')
    expect(combatStatReferenceById.evasion.shortDescription).not.toContain('Dodge')
    expect(combatStatReferenceById.blockChance.label).not.toBe(combatStatReferenceById.blockPower.label)
  })

  it('describes weapon proficiency progression without inventing global stat scaling', () => {
    expect(proficiencyById['one-handed-sword'].description).toContain('sword')
    expect(proficiencyById['one-handed-sword'].maxLevel).toBe(100)
    expect(proficiencyById['one-handed-sword'].perkIds.length).toBeGreaterThan(0)
  })

  it('uses compact combat formats and resistance tones', () => {
    expect(formatCombatStatValue('critDamage', 1.5)).toBe('150%')
    expect(formatCombatStatValue('attackInterval', 2.4)).toBe('2.4s')
    expect(formatCombatStatValue('staminaRegen', 5)).toBe('5.0 / sec')
    expect(formatCombatStatValue('manaRegen', 1)).toBe('1.0 / sec')
    expect(formatItemStat('attackInterval', 2.4).value).toBe('2.4s')
    expect(formatItemStat('fireResistance', 0.2)).toMatchObject({ value: '+20%', tone: 'green' })
    expect(formatItemStat('fireResistance', -0.2)).toMatchObject({ value: '-20%', tone: 'red' })
  })

  it('shows absorb shields beside current and maximum health', () => {
    expect(formatHealthWithBarrier(173, 270, 70)).toBe('173 / 270 (+70)')
    expect(formatHealthWithBarrier(173, 270, 0)).toBe('173 / 270')
  })
})
