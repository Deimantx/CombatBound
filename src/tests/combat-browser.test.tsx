import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { totalHunterRankPointsForRank } from '../game/progression/hunterRankProgression'
import { useGameStore } from '../state/gameStore'

beforeEach(() => {
  vi.useFakeTimers()
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
  useGameStore.setState((state) => ({ game: { ...state.game, progression: { ...state.game.progression, hunterRankPoints: totalHunterRankPointsForRank(2) } } }))
}

function debugElement(kind: string) {
  const element = document.querySelector(`[data-debug-kind="${kind}"]`)
  if (!element) throw new Error(`Missing debug element: ${kind}`)
  return element as HTMLElement
}

function clickAtlas(name: string) {
  fireEvent.click(screen.getByRole('button', { name }))
  act(() => vi.advanceTimersByTime(190))
}

function openDeepWoods() {
  clickAtlas('Open Greenvale')
  clickAtlas('Open Northwood')
  clickAtlas('Open Deep Woods')
}

describe('combat world atlas browser', () => {
  it('drills from World to Greenvale, Northwood, Deep Woods, and Wolf Den', () => {
    openCombatBrowser()
    expect(screen.getByText('Greenvale')).toBeInTheDocument()
    expect(screen.getByText('Frostmarch')).toBeInTheDocument()
    expect(screen.getByText('Emberreach')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Wolf Den/ })).not.toBeInTheDocument()

    openDeepWoods()

    expect(screen.getByText('Deep Woods')).toBeInTheDocument()
    const wolfDen = screen.getByRole('button', { name: /^Wolf Den/ })
    expect(wolfDen).toBeInTheDocument()
    expect(wolfDen).toHaveAttribute('data-debug-tooltip-id', 'combat-arena:location.wolf-den')
    expect(wolfDen).not.toHaveAttribute('title')
    expect(screen.queryByRole('button', { name: /^Bandit Camp/ })).not.toBeInTheDocument()
    expect(screen.getByText('LOOT')).toBeInTheDocument()
    expect(screen.queryByText('KNOWN SHARED LOOT')).not.toBeInTheDocument()
    expect(document.querySelector('[data-debug-kind="combat-enemy-preview"][data-debug-enemy-id="enemy.grey-wolf"]')).toHaveAttribute('aria-label', 'Inspect Grey Wolf')
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-mode', 'arenas')
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-view-id', 'area.deep-woods')
  })

  it('shows only child geography before the arena level', () => {
    openCombatBrowser()
    clickAtlas('Open Greenvale')
    expect(screen.getByRole('button', { name: 'Open Northwood' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Wolf Den/ })).not.toBeInTheDocument()
    clickAtlas('Open Northwood')
    expect(screen.getByRole('button', { name: 'Open Deep Woods' })).toBeInTheDocument()
    const lockedOldRoad = screen.getByRole('button', { name: 'LOCKED Old Road' })
    expect(lockedOldRoad).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(lockedOldRoad)
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-view-id', 'region.northwood')
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
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-mode', 'constellation')
    fireEvent.click(screen.getByRole('button', { name: 'Back one map level' }))
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-mode', 'territories')
    fireEvent.click(screen.getByRole('button', { name: 'Back one map level' }))
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-view-id', 'world')
    expect(screen.getByRole('button', { name: 'Back one map level' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Return to World Map' })).toBeDisabled()

    clickAtlas('Open Greenvale')
    clickAtlas('Open Northwood')
    fireEvent.click(screen.getByRole('button', { name: 'Return to World Map' }))
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-view-id', 'world')
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
    expect(document.querySelector('[data-debug-kind="combat-atlas-stage"]')).not.toBeInTheDocument()
  })

  it('browses the hierarchy during combat without changing the active hunt', () => {
    openCombatBrowser()
    openDeepWoods()
    fireEvent.click(screen.getByRole('button', { name: /^Wolf Den/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start selected location hunt' }))
    const activeBeforeBrowsing = useGameStore.getState().activeCombatLocationId
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    fireEvent.click(screen.getByRole('button', { name: 'Return to World Map' }))
    expect(document.querySelector('[data-debug-source-id="continent.greenvale"]')).toHaveClass('is-hunt-path')
    clickAtlas('Open Greenvale')
    clickAtlas('Open Northwood')
    act(unlockBanditCamp)
    clickAtlas('Open Old Road')
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
    clickAtlas('Open Greenvale')
    clickAtlas('Open Northwood')
    act(unlockBanditCamp)
    clickAtlas('Open Old Road')
    fireEvent.click(screen.getByRole('button', { name: /^Bandit Camp/ }))
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.wolf-den')
    fireEvent.click(screen.getByRole('button', { name: 'Switch hunt' }))
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.bandit-camp')
    expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('uses the hybrid atlas mode at each hierarchy depth without a camera HUD', () => {
    openCombatBrowser()
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-mode', 'territories')
    expect(screen.queryByLabelText('Map zoom')).not.toBeInTheDocument()
    clickAtlas('Open Greenvale')
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-mode', 'territories')
    clickAtlas('Open Northwood')
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-mode', 'constellation')
    clickAtlas('Open Deep Woods')
    expect(debugElement('combat-atlas-stage')).toHaveAttribute('data-debug-atlas-mode', 'arenas')
  })
})
