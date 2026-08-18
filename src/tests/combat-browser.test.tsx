import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { masteryXpForLevel } from '../game/progression/masteryProgression'
import { useGameStore } from '../state/gameStore'

beforeEach(() => {
  useGameStore.getState().resetGameplay()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function openCombatBrowser() {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Combat' }))
}

function unlockBanditCamp() {
  useGameStore.setState((state) => ({ game: { ...state.game, progression: { ...state.game.progression, masteryXp: masteryXpForLevel(2) } } }))
}

function debugElement(kind: string) {
  const element = document.querySelector(`[data-debug-kind="${kind}"]`)
  if (!element) throw new Error(`Missing debug element: ${kind}`)
  return element as HTMLElement
}

function openDeepWoods() {
  fireEvent.click(screen.getByRole('button', { name: 'Open Greenvale' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open Northwood' }))
  fireEvent.click(screen.getByRole('button', { name: 'Open Deep Woods' }))
}

describe('combat world map browser', () => {
  it('drills from World to Greenvale, Northwood, Deep Woods, and Wolf Den', () => {
    openCombatBrowser()
    expect(screen.getByText('Greenvale')).toBeInTheDocument()
    expect(screen.getByText('Frostmarch')).toBeInTheDocument()
    expect(screen.getByText('Emberreach')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Wolf Den/ })).not.toBeInTheDocument()

    openDeepWoods()

    expect(screen.getByText('Deep Woods')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Wolf Den/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Bandit Camp/ })).not.toBeInTheDocument()
    expect(debugElement('combat-world-map')).toHaveAttribute('data-debug-map-level', 'area')
    expect(debugElement('combat-world-map')).toHaveAttribute('data-debug-map-id', 'area.deep-woods')
  })

  it('shows only child geography before the arena level', () => {
    openCombatBrowser()
    fireEvent.click(screen.getByRole('button', { name: 'Open Greenvale' }))
    expect(screen.getByRole('button', { name: 'Open Northwood' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Wolf Den/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Northwood' }))
    expect(screen.getByRole('button', { name: 'Open Deep Woods' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Old Road' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: /^Wolf Den/ })).not.toBeInTheDocument()
  })

  it('uses fixed viewport controls for one-level back and direct world navigation', () => {
    openCombatBrowser()
    expect(screen.getByRole('button', { name: 'Back one map level' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Return to World Map' })).toBeDisabled()

    openDeepWoods()
    expect(screen.getByRole('button', { name: 'Back one map level' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Return to World Map' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Back one map level' }))
    expect(debugElement('combat-world-map')).toHaveAttribute('data-debug-map-level', 'region')
    fireEvent.click(screen.getByRole('button', { name: 'Back one map level' }))
    expect(debugElement('combat-world-map')).toHaveAttribute('data-debug-map-level', 'continent')
    fireEvent.click(screen.getByRole('button', { name: 'Back one map level' }))
    expect(debugElement('combat-world-map')).toHaveAttribute('data-debug-map-id', 'world')
    expect(screen.getByRole('button', { name: 'Back one map level' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Return to World Map' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Open Greenvale' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Northwood' }))
    fireEvent.click(screen.getByRole('button', { name: 'Return to World Map' }))
    expect(debugElement('combat-world-map')).toHaveAttribute('data-debug-map-id', 'world')
  })

  it('selects an arena without starting combat', () => {
    openCombatBrowser()
    openDeepWoods()
    fireEvent.click(screen.getByRole('button', { name: /^Wolf Den/ }))
    expect(screen.getByRole('heading', { name: 'Wolf Den' })).toBeInTheDocument()
    expect(useGameStore.getState().game.combat.phase).toBe('inactive')
    expect(useGameStore.getState().activeCombatLocationId).toBeNull()
  })

  it('starts the selected hunt and collapses the map', () => {
    openCombatBrowser()
    openDeepWoods()
    fireEvent.click(screen.getByRole('button', { name: /^Wolf Den/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start selected location hunt' }))
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.wolf-den')
    expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false')
    expect(document.querySelector('[data-debug-kind="combat-world-map"]')).not.toBeInTheDocument()
  })

  it('browses the hierarchy during combat without changing the active hunt', () => {
    openCombatBrowser()
    openDeepWoods()
    fireEvent.click(screen.getByRole('button', { name: /^Wolf Den/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start selected location hunt' }))
    const activeBeforeBrowsing = useGameStore.getState().activeCombatLocationId
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    fireEvent.click(screen.getByRole('button', { name: 'Return to World Map' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Greenvale' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Northwood' }))
    act(unlockBanditCamp)
    fireEvent.click(screen.getByRole('button', { name: 'Open Old Road' }))
    fireEvent.click(screen.getByRole('button', { name: /^Bandit Camp/ }))
    expect(screen.getAllByText('CURRENT HUNT').length).toBeGreaterThan(0)
    expect(useGameStore.getState().activeCombatLocationId).toBe(activeBeforeBrowsing)
    expect(useGameStore.getState().selectedCombatLocationId).toBe('location.bandit-camp')
    expect(screen.getByRole('button', { name: 'Switch hunt' })).toBeInTheDocument()
  })

  it('switches hunt only from the explicit Switch Hunt action', () => {
    openCombatBrowser()
    openDeepWoods()
    fireEvent.click(screen.getByRole('button', { name: /^Wolf Den/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start selected location hunt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    fireEvent.click(screen.getByRole('button', { name: 'Return to World Map' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Greenvale' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Northwood' }))
    act(unlockBanditCamp)
    fireEvent.click(screen.getByRole('button', { name: 'Open Old Road' }))
    fireEvent.click(screen.getByRole('button', { name: /^Bandit Camp/ }))
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.wolf-den')
    fireEvent.click(screen.getByRole('button', { name: 'Switch hunt' }))
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.bandit-camp')
    expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('resets each child map to centered 100% and keeps discrete wheel zoom', () => {
    openCombatBrowser()
    const map = debugElement('combat-world-map')
    expect(debugElement('combat-world-map-zoom-readout')).toHaveTextContent('100%')
    vi.useFakeTimers()
    fireEvent.wheel(map, { deltaY: -100 })
    expect(debugElement('combat-world-map-zoom-readout')).toHaveTextContent('150%')
    act(() => vi.advanceTimersByTime(200))
    fireEvent.wheel(map, { deltaY: 100 })
    expect(debugElement('combat-world-map-zoom-readout')).toHaveTextContent('100%')
    act(() => vi.advanceTimersByTime(200))
    fireEvent.wheel(map, { deltaY: 100 })
    expect(debugElement('combat-world-map-zoom-readout')).toHaveTextContent('50%')
    fireEvent.click(screen.getByRole('button', { name: 'Open Greenvale' }))
    expect(debugElement('combat-world-map-zoom-readout')).toHaveTextContent('100%')
  })
})
