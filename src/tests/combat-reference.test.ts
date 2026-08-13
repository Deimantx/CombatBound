import { describe, expect, it } from 'vitest'
import { combatStatReferenceById } from '../game/data/combatGlossary'
import { skillById } from '../game/data/skills'
import { formatCombatStatValue, formatItemStat } from '../game/presentation/statFormatting'

describe('combat reference metadata', () => {
  it('keeps the important stat distinctions explicit', () => {
    expect(combatStatReferenceById.accuracy.fullDescription).toContain('Evasion')
    expect(combatStatReferenceById.accuracy.fullDescription).not.toContain('Armor affects Hit Chance')
    expect(combatStatReferenceById.armor.fullDescription).toContain('Physical')
    expect(combatStatReferenceById.armor.fullDescription).toContain('does not reduce Hit Chance')
    expect(combatStatReferenceById.evasion.shortDescription).not.toContain('Dodge')
    expect(combatStatReferenceById.blockChance.label).not.toBe(combatStatReferenceById.blockPower.label)
  })

  it('describes current skill effects without inventing scaling', () => {
    expect(skillById.swordsmanship.currentEffect).toContain('Accuracy')
    expect(skillById.defense.currentEffect).toContain('Armor')
    expect(skillById.stances.currentEffect).toContain('No direct stat scaling')
    expect(skillById.magic.currentEffect).toContain('No direct spell scaling')
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
})
