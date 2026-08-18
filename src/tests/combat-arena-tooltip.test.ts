import { describe, expect, it } from 'vitest'
import { combatArenaTooltipModel } from '../app/screens/combat/combatLocationPresentation'

describe('combat arena tooltip presentation', () => {
  it('uses real Wolf Den data for selected arena details', () => {
    const tooltip = combatArenaTooltipModel('location.wolf-den', 'SELECTED', false, true)

    expect(tooltip.title).toBe('Wolf Den')
    expect(tooltip.subtitle).toBe('Wolves · SELECTED')
    expect(tooltip.tone).toBe('gold')
    expect(tooltip.rows).toEqual([{ label: 'Recommended', value: 'Mastery 1–10', tone: 'gold' }])
    expect(tooltip.sections?.[0].notes).toEqual(['Grey Wolf', 'Wolf Stalker', 'Wolf Ravager', 'Alpha Wolf'])
  })
})
