import { describe, expect, it } from 'vitest'
import { combatArenaTooltipModel } from '../app/screens/combat/combatLocationPresentation'

describe('combat arena tooltip presentation', () => {
  it('uses real Wolfscar Hollow data for selected arena details', () => {
    const tooltip = combatArenaTooltipModel('location.wolfscar-hollow', 'SELECTED', false, true)
    expect(tooltip.title).toBe('Wolfscar Hollow')
    expect(tooltip.subtitle).toContain('Wolves')
    expect(tooltip.subtitle).toContain('SELECTED')
    expect(tooltip.tone).toBe('gold')
    expect(tooltip.rows?.[0]?.label).toBe('RANK REQUIRED')
    expect(tooltip.rows?.[0]?.value).toBe('Hunter Rank 1')
    expect(tooltip.sections?.[0].notes).toEqual(['Grey Wolf', 'Wolf Stalker', 'Wolf Ravager', 'Alpha Wolf'])
  })
})
