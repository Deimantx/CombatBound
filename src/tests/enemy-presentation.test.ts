import { describe, expect, it } from 'vitest'
import { enemyById } from '../game/data/enemies'
import { formatDamageRange } from '../game/presentation/statFormatting'
import { enemyPresentation, enemyTooltipModel } from '../app/screens/combat/enemyPresentation'

describe('enemy preview presentation', () => {
  it('keeps real Grey Wolf data in the icon tooltip model', () => {
    const preview = enemyPresentation('enemy.grey-wolf')
    const tooltip = enemyTooltipModel('enemy.grey-wolf')
    const coreStats = tooltip.sections?.find((section) => section.id === 'enemy-stats')

    expect(preview.enemy).toBe(enemyById['enemy.grey-wolf'])
    expect(preview.name).toBe('Grey Wolf')
    expect(tooltip.title).toBe('Grey Wolf')
    expect(tooltip.subtitle).toBe('Wolves')
    expect(tooltip.tone).toBe('red')
    expect(coreStats?.rows).toEqual(expect.arrayContaining([
      { label: 'Life', value: '120', tone: 'green' },
      { label: 'Damage', value: formatDamageRange(14, 14), tone: 'red' },
      { label: 'Accuracy', value: '70', tone: 'gold' },
      { label: 'Armour', value: '30', tone: 'blue' },
      { label: 'Evasion', value: '35', tone: 'blue' },
      { label: 'Attack Interval', value: '2.2s', tone: 'blue' },
    ]))
    expect(coreStats?.rows?.some((row) => row.label === 'Block Chance')).toBe(false)
    expect(tooltip.sections?.find((section) => section.id === 'enemy-traits')).toBeDefined()
    expect(tooltip.sections?.find((section) => section.id === 'enemy-resistances')?.rows).toEqual([
      { label: 'Fire', value: '-20%', tone: 'red' },
    ])
  })

  it('shows rankless enemy combat ability preparation and cooldown for Bandit Archer', () => {
    const tooltip = enemyTooltipModel('enemy.bandit-archer')
    const coreStats = tooltip.sections?.find((section) => section.id === 'enemy-stats')
    const abilityNotes = tooltip.sections?.find((section) => section.id === 'enemy-abilities')?.notes ?? []

    expect(tooltip.tone).toBe('gold')
    expect(coreStats?.rows?.some((row) => row.label === 'Block Chance')).toBe(false)
    expect(abilityNotes).toHaveLength(1)
    expect(abilityNotes[0]).toContain('Charged Shot')
    expect(abilityNotes[0]).toContain('Preparation 3.0s')
    expect(abilityNotes[0]).toContain('Cooldown 10.0s')
    expect(abilityNotes[0]).not.toContain('DANGER')
  })
})
