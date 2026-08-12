import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, beforeEach } from 'vitest'
import App from '../../App'
import { useGameStore } from '../state/gameStore'
import { buildInspectorTarget, formatInspectorReference, resolveSemanticTarget } from '../app/debug/ui-inspector/uiInspectorModel'

beforeEach(() => {
  useGameStore.getState().resetGameplay()
})

afterEach(() => cleanup())

describe('application shell', () => {
  it('keeps the shell mounted while navigation changes screens', () => {
    render(<App />)
    expect(screen.getByLabelText('Primary navigation')).toBeInTheDocument()
    expect(screen.getByText('Saved just now')).toBeInTheDocument()
    expect(screen.getByText('GO TO COMBAT')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }))
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
    expect(screen.getByText('Saved just now')).toBeInTheDocument()
    expect(screen.getByText('GO TO COMBAT')).toBeInTheDocument()
  })

  it('opens every navigation destination', () => {
    render(<App />)
    for (const label of ['Home', 'Combat', 'Equipment', 'Inventory', 'Collection Log', 'Settings', 'Info']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(screen.getByRole('heading', { name: label === 'Collection Log' ? 'Collection Log' : label })).toBeInTheDocument()
    }
  })
})

describe('prototype combat', () => {
  it('persists activity after navigating away and returns to combat', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Combat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start hunt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }))
    expect(screen.getByText('IN COMBAT')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /RETURN TO COMBAT/i }))
    expect(screen.getByRole('heading', { name: 'Combat' })).toBeInTheDocument()
  })
})

describe('UI Inspector model', () => {
  it('resolves a nested icon to its semantic button and formats a CombatBound reference', () => {
    document.body.innerHTML = '<button data-debug-screen="combat" data-debug-kind="combat-control" data-debug-label="Fight" data-ui-panel="liveCombat"><span class="icon">+</span>Fight</button>'
    const icon = document.querySelector('.icon')
    const target = resolveSemanticTarget(icon)
    expect(target?.tagName).toBe('BUTTON')
    const model = buildInspectorTarget(target!)
    expect(formatInspectorReference(model)).toContain('CombatBound UI reference')
    expect(formatInspectorReference(model)).toContain('Kind: combat-control')
  })

  it('ignores inspector-owned nodes', () => {
    document.body.innerHTML = '<div data-ui-inspector-ignore><button data-debug-label="Ignored">Ignored</button></div>'
    expect(resolveSemanticTarget(document.querySelector('button'))).toBeNull()
  })
})
