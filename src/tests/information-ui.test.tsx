import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { useGameStore } from '../state/gameStore'

beforeEach(() => { useGameStore.getState().resetGameplay(); window.localStorage.removeItem('combatbound-hero-stats-v1') })
afterEach(() => { cleanup(); window.localStorage.removeItem('combatbound-hero-stats-v1') })

describe('combat information surfaces', () => {
  it('renders the complete collapsible Hero Combat Stats inspector', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Hero' }))
    const toggle = screen.getByRole('button', { name: /COMBAT STATS/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    for (const label of ['Attack Damage', 'Accuracy Rating', 'Attack Interval', 'Critical Strike Chance', 'Critical Strike Multiplier', 'Max Life', 'Armour', 'Evasion Rating', 'Block Chance', 'Block Effect', 'Max Stamina', 'Stamina Regeneration', 'Max Mana', 'Mana Regeneration', 'Fire Resistance', 'Cold Resistance', 'Lightning Resistance', 'Chaos Resistance']) expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    const defenseSection = screen.getByRole('button', { name: /^DEFENSE/ }).closest('section')
    expect(defenseSection).not.toBeNull()
    const defenseLabels = Array.from(defenseSection!.querySelectorAll('.stat-label')).map((label) => label.textContent)
    expect(defenseLabels).toEqual(expect.arrayContaining(['Physical Damage Reduction', 'Block Chance', 'Block Effect']))
    const offenseToggle = screen.getByRole('button', { name: /^OFFENSE/ })
    expect(offenseToggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(offenseToggle)
    expect(offenseToggle).toHaveAttribute('aria-expanded', 'false')
    expect(offenseToggle.closest('section')?.querySelector('.hero-stat-list')).toHaveAttribute('hidden')
    fireEvent.click(screen.getByRole('button', { name: /^RESOURCES & REGEN/ }))
    expect(screen.getAllByText('Max Life').some((element) => element.checkVisibility?.() ?? true)).toBe(true)
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Attack Damage')).not.toBeVisible()
  })

  it('keeps each group state when returning to Equipment', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Hero' }))
    fireEvent.click(screen.getByRole('button', { name: /^OFFENSE/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Info' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hero' }))
    expect(screen.getByRole('button', { name: /COMBAT STATS/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /^OFFENSE/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders the major Info reference sections from current data', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Info' }))
    for (const heading of ['Combat Basics', 'Combat Resolution', 'Combat Stats Reference', 'Damage Types & Resistances', 'Statuses & Effects', 'Combat Proficiencies', 'Hunter Rank & Perks', 'World navigation', 'UI Inspector']) expect(screen.getByText(heading)).toBeInTheDocument()
    expect(screen.getAllByText('Magic Arts').length).toBeGreaterThan(0)
    expect(screen.getByText('One-Handed Sword')).toBeInTheDocument()
    expect(screen.getAllByText('Earthen Ward').length).toBeGreaterThan(0)
  })
})
