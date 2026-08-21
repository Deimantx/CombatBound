import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameTooltip } from '../app/components/tooltip/GameTooltip'
import { TooltipProvider } from '../app/components/tooltip/TooltipProvider'
import { buildItemTooltip } from '../game/presentation/tooltipBuilders'
import { itemById } from '../game/data/items'

afterEach(() => { cleanup(); vi.useRealTimers() })

const model = { id: 'stat.accuracy', title: 'Accuracy', description: 'Accuracy vs Evasion.' }
function Harness() {
  return <TooltipProvider><section className="panel"><GameTooltip content={model}><button>Accuracy trigger</button></GameTooltip><GameTooltip content={{ id: 'stat.armor', title: 'Armor' }}><button>Armor trigger</button></GameTooltip></section></TooltipProvider>
}

describe('CombatBound tooltip toolkit', () => {
  beforeEach(() => vi.useFakeTimers())

  it('opens after 250ms and cancels before the delay', () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Accuracy trigger' })
    fireEvent.mouseEnter(trigger)
    act(() => vi.advanceTimersByTime(249))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.mouseLeave(trigger)
    act(() => vi.advanceTimersByTime(10))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('opens on time, closes on leave, and renders outside the clipping panel', () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Accuracy trigger' })
    fireEvent.mouseEnter(trigger)
    act(() => vi.advanceTimersByTime(250))
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Accuracy')
    expect(tooltip.closest('.panel')).toBeNull()
    expect(document.body.contains(tooltip)).toBe(true)
    fireEvent.mouseLeave(trigger)
    act(() => vi.advanceTimersByTime(100))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('opens focus immediately, switches triggers without stale delayed content, and closes on Escape', () => {
    render(<Harness />)
    const accuracy = screen.getByRole('button', { name: 'Accuracy trigger' })
    const armor = screen.getByRole('button', { name: 'Armor trigger' })
    fireEvent.mouseEnter(accuracy)
    act(() => vi.advanceTimersByTime(499))
    fireEvent.mouseEnter(armor)
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Armor')
    fireEvent.focus(accuracy)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Accuracy')
    fireEvent.keyDown(accuracy, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

describe('tooltip presentation models', () => {
  it('formats current Iron Sword stats as player-facing values', () => {
    const tooltip = buildItemTooltip(itemById['item.iron-sword'])
    expect(tooltip.title).toBe('Iron Sword')
    expect(tooltip.subtitle).toContain('Longsword')
    expect(tooltip.subtitle).toContain('Common')
    expect(tooltip.description).toContain('fixed-authored')
    expect(tooltip.rows?.map((row) => `${row.label} ${row.value}`).join(' ')).toContain('Weapon Base Attack Time 2.35s')
    expect(JSON.stringify(tooltip)).not.toContain('attackInterval')
  })
})
