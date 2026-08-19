import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TooltipProvider } from '../app/components/tooltip/TooltipProvider'
import { DebugAdminPanel } from '../app/debug/admin/DebugAdminPanel'
import { useGameStore } from '../state/gameStore'

beforeEach(() => useGameStore.getState().resetGameplay())
afterEach(() => cleanup())

describe('debug progression toolkit', () => {
  it('shows Hunter Rank, independent perk points, and direct Proficiency controls', () => {
    render(<TooltipProvider><DebugAdminPanel onClose={() => undefined} /></TooltipProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Progression' }))
    expect(screen.getAllByText('Hunter Rank').length).toBeGreaterThan(0)
    expect(screen.getByText('Perk Points')).toBeInTheDocument()
    expect(screen.getByText('Proficiencies')).toBeInTheDocument()
    expect(screen.getByText('Bonus / Granted')).toBeInTheDocument()
    expect(screen.getByText('Spent')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('grants an arbitrary positive integer as independent bonus points', () => {
    render(<TooltipProvider><DebugAdminPanel onClose={() => undefined} /></TooltipProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Progression' }))
    const before = useGameStore.getState().game
    const rankBefore = before.progression.hunterRankPoints
    const input = screen.getByLabelText('Custom bonus perk point amount')
    fireEvent.change(input, { target: { value: '17' } })
    fireEvent.click(screen.getByRole('button', { name: 'GRANT' }))
    const after = useGameStore.getState().game
    expect(after.progression.hunterRankPoints).toBe(rankBefore)
    expect(after.progression.bonusPerkPoints).toBe(17)
  })

  it('groups proficiency definitions by canonical category', () => {
    render(<TooltipProvider><DebugAdminPanel onClose={() => undefined} /></TooltipProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Progression' }))
    for (const label of ['Melee', 'Ranged', 'Magic', 'Defense']) expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText('One-Handed Sword')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Defense/ }))
    expect(screen.getByText('Light Armor')).toBeInTheDocument()
  })
})
