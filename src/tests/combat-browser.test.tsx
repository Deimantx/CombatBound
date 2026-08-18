import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { masteryXpForLevel } from '../game/progression/masteryProgression'
import { useGameStore } from '../state/gameStore'

beforeEach(() => {
  useGameStore.getState().resetGameplay()
})

afterEach(() => cleanup())

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

describe('combat world map browser', () => {
  it('renders the world context and arena markers on the map', () => {
    openCombatBrowser()
    expect(screen.getByText('GREENVALE')).toBeInTheDocument()
    expect(screen.getByText('NORTHWOOD')).toBeInTheDocument()
    expect(screen.getByText('DEEP WOODS')).toBeInTheDocument()
    expect(screen.getByText('FROSTMARCH')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Wolf Den/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Bandit Camp/ })).toBeInTheDocument()
    expect(document.querySelector('[data-debug-kind="combat-world-arena-marker"] .lucide-swords')).toBeInTheDocument()
    expect(document.querySelector('[data-debug-kind="combat-world-map"]')).toBeInTheDocument()
  })

  it('selects an arena for preview without starting a hunt', () => {
    openCombatBrowser()
    act(unlockBanditCamp)
    fireEvent.click(screen.getByRole('button', { name: /^Bandit Camp/ }))
    expect(screen.getByRole('heading', { name: 'Bandit Camp' })).toBeInTheDocument()
    expect(screen.getByText('SELECTED ARENA')).toBeInTheDocument()
    expect(useGameStore.getState().game.combat.phase).toBe('inactive')
    expect(useGameStore.getState().activeCombatLocationId).toBeNull()
  })

  it('starts the selected hunt and collapses the map explicitly', () => {
    openCombatBrowser()
    fireEvent.click(screen.getByRole('button', { name: 'Start selected location hunt' }))
    expect(useGameStore.getState().game.combat.phase).toBe('active')
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.wolf-den')
    expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false')
    expect(document.querySelector('[data-debug-kind="combat-world-map"]')).not.toBeInTheDocument()
  })

  it('keeps the current hunt while browsing and switching to another arena', () => {
    openCombatBrowser()
    fireEvent.click(screen.getByRole('button', { name: 'Start selected location hunt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    act(unlockBanditCamp)
    fireEvent.click(screen.getByRole('button', { name: /^Bandit Camp/ }))
    expect(screen.getByText('CURRENT HUNT')).toBeInTheDocument()
    expect(screen.getByText('BROWSING')).toBeInTheDocument()
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.wolf-den')
    fireEvent.click(screen.getByRole('button', { name: 'Switch hunt' }))
    expect(useGameStore.getState().activeCombatLocationId).toBe('location.bandit-camp')
    expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('allows map browsing during combat without changing the active hunt', () => {
    openCombatBrowser()
    fireEvent.click(screen.getByRole('button', { name: 'Start selected location hunt' }))
    const before = useGameStore.getState()
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    act(unlockBanditCamp)
    fireEvent.click(screen.getByRole('button', { name: /^Bandit Camp/ }))
    const after = useGameStore.getState()
    expect(after.activeCombatLocationId).toBe(before.activeCombatLocationId)
    expect(after.game.combat.phase).toBe(before.game.combat.phase)
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('does not close a manually reopened map during active and recovery cycling', () => {
    openCombatBrowser()
    fireEvent.click(screen.getByRole('button', { name: 'Start selected location hunt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    act(() => {
      useGameStore.setState((state) => ({ game: { ...state.game, combat: { ...state.game.combat, phase: 'recovery' } } }))
      useGameStore.setState((state) => ({ game: { ...state.game, combat: { ...state.game.combat, phase: 'active' } } }))
    })
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute('aria-expanded', 'true')
    expect(debugElement('combat-world-map')).toBeInTheDocument()
  })

  it('supports discrete zoom levels and drag panning as presentation state', () => {
    openCombatBrowser()
    const map = debugElement('combat-world-map')
    expect(debugElement('combat-world-map-zoom-readout')).toHaveTextContent('ZOOM 100%')
    fireEvent.click(screen.getByRole('button', { name: 'Zoom 150%' }))
    expect(debugElement('combat-world-map-zoom-readout')).toHaveTextContent('ZOOM 150%')
    fireEvent.wheel(map, { deltaY: 100 })
    expect(debugElement('combat-world-map-zoom-readout')).toHaveTextContent('ZOOM 100%')
    fireEvent.click(screen.getByRole('button', { name: 'Zoom 50%' }))
    fireEvent.wheel(map, { deltaY: 100 })
    expect(debugElement('combat-world-map-zoom-readout')).toHaveTextContent('ZOOM 50%')
    fireEvent.pointerDown(map, { button: 0, pointerId: 1, clientX: 20, clientY: 20 })
    fireEvent.pointerMove(map, { pointerId: 1, clientX: 80, clientY: 45 })
    fireEvent.pointerUp(map, { pointerId: 1, clientX: 80, clientY: 45 })
    expect(map).toBeInTheDocument()
    expect(useGameStore.getState().activeCombatLocationId).toBeNull()
  })
})
