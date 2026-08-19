import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { useGameStore } from '../state/gameStore'

beforeEach(() => {
  useGameStore.getState().resetGameplay()
})

afterEach(() => cleanup())

function openCombat() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Combat' }))
}

describe('combat screen dashboard', () => {
  it('shows the live resource and action hierarchy before a hunt starts', () => {
    openCombat()
    expect(screen.getByText('Hunt enemy groups, manage combat decisions, and survive repeated encounters.')).toBeInTheDocument()
    expect(screen.getAllByText('HP').length).toBeGreaterThan(0)
    expect(screen.getByText('Stamina')).toBeInTheDocument()
    expect(screen.getByText('Mana')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /^HP \d+ of \d+$/ })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /^Stamina \d+ of \d+$/ })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /^Mana \d+ of \d+$/ })).toBeInTheDocument()
    expect(screen.getByText('TARGETING')).toBeInTheDocument()
    expect(screen.getByText('No active target')).toBeInTheDocument()
    expect(document.querySelector('[data-debug-kind="player-vital-bar"]')).toHaveAttribute('data-debug-health')
    expect(screen.queryByText('Highest Hit')).not.toBeInTheDocument()
    expect(screen.queryByText('Damage Taken')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Loot' }))
    expect(screen.getByText('LOOT BREAKDOWN')).toBeInTheDocument()
    expect(screen.queryByText('PROFICIENCY XP BREAKDOWN')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Progression' }))
    expect(screen.getByText('PROFICIENCY XP')).toBeInTheDocument()
    expect(screen.getByText('Available Perk Points')).toBeInTheDocument()
    expect(screen.getAllByText(/-.*[0-9]/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/â€”|â†’/)).not.toBeInTheDocument()
    expect(screen.getByText('Proficiency progress appears after this Hunt awards XP.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Session Summary' }))
    expect(screen.getByRole('progressbar', { name: 'Player attack progress' })).toBeInTheDocument()
    expect(screen.getByText('NO ACTIVE HUNT')).toBeInTheDocument()
    expect(screen.getByText('COMBAT ACTIONS')).toBeInTheDocument()
    expect(screen.queryByText('RETURN TO COMBAT')).not.toBeInTheDocument()
  })

  it('keeps live hunt controls explicit and techniques toggleable', () => {
    openCombat()
    fireEvent.click(screen.getByRole('button', { name: 'Start hunt' }))
    expect(screen.getByText('ENEMY GROUP')).toBeInTheDocument()
    expect(screen.getByText('YOUR ATTACK')).toBeInTheDocument()
    expect(screen.getByText(/Healing Potion/)).toBeInTheDocument()
    expect(screen.queryByText('AUTOMATION')).not.toBeInTheDocument()
    expect(screen.getByText('COMBAT ABILITIES')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Player attack progress' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /^Selected target .+ health$/ })).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar', { name: / health$/i }).length).toBeGreaterThan(1)
    expect(screen.getByText('Hit Chance')).toBeInTheDocument()
    expect(screen.getByText(/YOUR HIT/)).toBeInTheDocument()
    expect(screen.getByText(/THEIR HIT/)).toBeInTheDocument()
    expect(screen.getByText(/Target: .*Hit/)).toBeInTheDocument()
    expect(screen.getByText(/Healing Potion ×/)).toBeInTheDocument()
    expect(screen.queryByText(/Net Stamina:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/regen/)).not.toBeInTheDocument()

    const technique = screen.getByRole('button', { name: /Careful Positioning/ })
    expect(technique).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(technique)
    expect(technique).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText(/Net Stamina:/)).not.toBeInTheDocument()
  })

  it('uses the compact activity bar on combat and the persistent bar elsewhere', () => {
    openCombat()
    expect(screen.queryByText('RETURN TO COMBAT')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }))
    expect(screen.getByText('GO TO COMBAT')).toBeInTheDocument()
  })
})
