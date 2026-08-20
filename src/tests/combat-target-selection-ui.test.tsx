import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { useGameStore } from '../state/gameStore'

beforeEach(() => {
  vi.useFakeTimers()
  useGameStore.getState().resetGameplay()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function openDeepWoods() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Combat' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open Greenvale' }))
  act(() => vi.advanceTimersByTime(190))
  fireEvent.click(screen.getByRole('button', { name: 'Open Northwood' }))
  act(() => vi.advanceTimersByTime(190))
  fireEvent.click(screen.getByRole('button', { name: 'Open Deep Woods' }))
  act(() => vi.advanceTimersByTime(190))
  fireEvent.click(screen.getByRole('button', { name: /^Wolf Den/ }))
}

describe('combat target selection UI', () => {
  it('renders dark target cards, a static preview inspector, and no fabricated live runtime target', () => {
    openDeepWoods()
    const cards = [...document.querySelectorAll('[data-debug-kind="combat-target-preview"]')]
    expect(cards).toHaveLength(4)
    expect(cards.every((card) => card.classList.contains('location-target-card'))).toBe(true)
    expect(screen.getByText('SELECTED TARGET')).toBeInTheDocument()
    expect(screen.getByText('ZONE SHARED LOOT')).toBeInTheDocument()
    expect(screen.getByText('NO CURRENT ENEMY')).toBeInTheDocument()
    expect(document.querySelectorAll('.location-preview-action button')).toHaveLength(1)
    expect(document.querySelectorAll('.combat-inspector-tile')).not.toHaveLength(0)
    expect(screen.queryByText(/Every kill in this arena/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/No traits|No combat abilities/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Drop chance/i)).not.toBeInTheDocument()
  })

  it('changes the preview without changing combat and keeps locked targets uncommittable', () => {
    openDeepWoods()
    const stalker = screen.getByRole('button', { name: /Wolf Stalker.*available/i })
    fireEvent.click(stalker)
    expect(useGameStore.getState().selectedTargetId).toBe('enemy.wolf-stalker')
    expect(useGameStore.getState().game.combat.phase).toBe('inactive')
    expect(document.querySelector('[data-debug-kind="combat-target-inspector"]')).toHaveAttribute('data-debug-enemy-id', 'enemy.wolf-stalker')
    const alpha = screen.getByRole('button', { name: /Alpha Wolf.*locked/i })
    expect(alpha).toBeDisabled()
    expect(alpha).toHaveClass('is-locked')
  })

  it('starts only the highlighted target through the primary action', () => {
    openDeepWoods()
    fireEvent.click(screen.getByRole('button', { name: /Wolf Ravager.*available/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Fight selected target' }))
    expect(useGameStore.getState().game.combat.phase).toBe('active')
    expect(useGameStore.getState().game.combat.targetEnemyId).toBe('enemy.wolf-ravager')
  })
})
