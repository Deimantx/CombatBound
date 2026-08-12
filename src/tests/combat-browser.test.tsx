import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { useGameStore } from '../state/gameStore'

beforeEach(() => {
  useGameStore.getState().resetGameplay()
})

afterEach(() => cleanup())

function openCombatBrowser() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Combat' }))
}

describe('combat browser presentation and flow', () => {
  it('renders hierarchy tiers in vertical navigation order', () => {
    openCombatBrowser()
    const labels = ['CONTINENT', 'REGION', 'AREA', 'SUB-AREA', 'COMBAT LOCATIONS'].map((label) => screen.getByText(label))
    expect(labels.every((label, index) => index === 0 || labels[index - 1].compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  it('selects a location for preview without starting a hunt', () => {
    openCombatBrowser()
    fireEvent.click(screen.getByRole('button', { name: /^Frontier Road/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Bandit Camp/ }))
    expect(screen.getByRole('heading', { name: 'Bandit Camp' })).toBeInTheDocument()
    expect(useGameStore.getState().game.combat.phase).toBe('inactive')
  })

  it('starts the selected location hunt from the explicit action', () => {
    openCombatBrowser()
    fireEvent.click(screen.getByRole('button', { name: 'Start hunt' }))
    expect(useGameStore.getState().game.combat.phase).toBe('active')
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.wolf-den')
  })

  it('keeps the current hunt while browsing another location', () => {
    openCombatBrowser()
    fireEvent.click(screen.getByRole('button', { name: 'Start hunt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    fireEvent.click(screen.getByRole('button', { name: /^Frontier Road/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Bandit Camp/ }))
    expect(screen.getAllByText('CURRENT HUNT').length).toBeGreaterThan(0)
    expect(screen.getByText('BROWSING')).toBeInTheDocument()
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.wolf-den')
    fireEvent.click(screen.getByRole('button', { name: 'Switch hunt' }))
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.bandit-camp')
  })
})
