import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { useGameStore } from '../state/gameStore'

beforeEach(() => { useGameStore.getState().resetGameplay(); window.localStorage.removeItem('combatbound-equipment-stat-groups') })
afterEach(() => { cleanup(); window.localStorage.removeItem('combatbound-equipment-stat-groups') })

describe('combat information surfaces', () => {
  it('renders the complete collapsible Hunter Combat Stats sheet', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Equipment' }))
    const toggle = screen.getByRole('button', { name: /Hunter Combat Stats/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    for (const label of ['Attack Power', 'Accuracy', 'Attack Interval', 'Critical Hit Chance', 'Critical Hit Damage', 'Max Health', 'Armor', 'Evasion', 'Dodge Chance', 'Parry Chance', 'Block Chance', 'Block Power', 'Status Resistance', 'Max Stamina', 'Stamina Regeneration', 'Max Mana', 'Mana Regeneration', 'Physical Resistance', 'Fire Resistance', 'Earth Resistance', 'Air Resistance', 'Nature Resistance', 'Mystic Resistance']) expect(screen.getByText(label)).toBeInTheDocument()
    const offenseToggle = screen.getByRole('button', { name: 'OFFENSE' })
    expect(offenseToggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(offenseToggle)
    expect(offenseToggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Critical Hit Chance')).not.toBeVisible()
    expect(screen.getByText('Max Health')).toBeVisible()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Attack Power')).not.toBeVisible()
  })

  it('keeps each group state when returning to Equipment', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Equipment' }))
    fireEvent.click(screen.getByRole('button', { name: 'OFFENSE' }))
    fireEvent.click(screen.getByRole('button', { name: 'Info' }))
    fireEvent.click(screen.getByRole('button', { name: 'Equipment' }))
    expect(screen.getByRole('button', { name: 'OFFENSE' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Critical Hit Chance')).not.toBeVisible()
  })

  it('renders the major Info reference sections from current data', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Info' }))
    for (const heading of ['Combat Basics', 'Combat Resolution', 'Combat Stats Reference', 'Damage Types & Resistances', 'Statuses & Effects', 'Combat Proficiencies', 'Combat Mastery & Perks', 'Stances / Techniques / Spells', 'World navigation', 'UI Inspector']) expect(screen.getByText(heading)).toBeInTheDocument()
    expect(screen.getByText('One-Handed Sword')).toBeInTheDocument()
    expect(screen.getAllByText('Protective Sign').length).toBeGreaterThan(0)
  })
})
