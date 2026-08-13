import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { combatProgress, useSmoothCombatProgress } from '../app/screens/combat/components/combatUi'

function ProgressProbe({ remaining, total }: { remaining: number; total: number }) {
  const progress = useSmoothCombatProgress(remaining, total)
  return <output data-testid="progress" data-value={progress.value} data-resetting={progress.isResetting} />
}

describe('smooth combat progress', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the completed frame before starting the next attack cycle', () => {
    expect(combatProgress(0.1, 2.4)).toBe(100)

    const view = render(<ProgressProbe remaining={0.2} total={2.4} />)
    view.rerender(<ProgressProbe remaining={2.4} total={2.4} />)

    expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '100')

    act(() => vi.advanceTimersByTime(120))
    expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '0')

    view.rerender(<ProgressProbe remaining={2.3} total={2.4} />)
    expect(Number(screen.getByTestId('progress').getAttribute('data-value'))).toBeCloseTo(4.17, 1)
  })
})
