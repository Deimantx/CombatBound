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
    expect(screen.getByRole('progressbar', { name: 'Player attack progress' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /^Selected target .+ health$/ })).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar', { name: / health$/i }).length).toBeGreaterThan(1)
    expect(screen.getByText(/Healing Potion ×/)).toBeInTheDocument()
    expect(screen.getByText(/Net Stamina: \+5\.0\/s/)).toBeInTheDocument()

    const technique = screen.getByRole('button', { name: /Careful Positioning/ })
    expect(technique).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(technique)
    expect(technique).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Net Stamina: \+2\.0\/s/)).toBeInTheDocument()
  })

  it('uses the compact activity bar on combat and the persistent bar elsewhere', () => {
    openCombat()
    expect(screen.queryByText('RETURN TO COMBAT')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }))
    expect(screen.getByText('GO TO COMBAT')).toBeInTheDocument()
  })
})
