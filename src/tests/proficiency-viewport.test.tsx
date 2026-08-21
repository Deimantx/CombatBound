import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../App'
import { useGameStore } from '../state/gameStore'
import { proficiencyDefinitions } from '../game/data/proficiencies'

beforeEach(() => useGameStore.getState().resetGameplay())
afterEach(() => cleanup())

describe('proficiency perk tree viewport', () => {
  function openTree() {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Proficiencies' }))
    const viewport = document.querySelector('[data-debug-kind="perk-tree-viewport"]') as HTMLElement
    const camera = document.querySelector('[data-debug-kind="perk-tree-camera"]') as HTMLElement
    Object.defineProperties(viewport, { clientWidth: { configurable: true, value: 640 }, clientHeight: { configurable: true, value: 520 } })
    Object.defineProperties(camera, { offsetWidth: { configurable: true, value: 1000 }, offsetHeight: { configurable: true, value: 1100 } })
    return viewport
  }

  it('pans from empty space and suppresses the click created by a drag', () => {
    const viewport = openTree()
    const camera = document.querySelector('[data-debug-kind="perk-tree-camera"]') as HTMLElement

    fireEvent.pointerDown(viewport, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(viewport, { pointerId: 1, pointerType: 'mouse', clientX: 160, clientY: 145 })
    expect(viewport).toHaveClass('is-panning')
    expect(camera).toHaveAttribute('data-debug-pan-x', '60')
    expect(camera).toHaveAttribute('data-debug-pan-y', '45')

    fireEvent.pointerUp(viewport, { pointerId: 1, pointerType: 'mouse', clientX: 160, clientY: 145 })
    expect(viewport).not.toHaveClass('is-panning')
    fireEvent.click(viewport)
    expect(viewport).not.toHaveClass('is-panning')
  })

  it('does not begin a pan when dragging from a perk node', () => {
    const viewport = openTree()
    const node = viewport.querySelector('[data-perk-node]') as HTMLElement
    const before = viewport.getAttribute('data-debug-pan-x')

    fireEvent.pointerDown(node, { pointerId: 2, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(node, { pointerId: 2, pointerType: 'mouse', clientX: 180, clientY: 180 })

    expect(viewport).not.toHaveClass('is-panning')
    expect(viewport).toHaveAttribute('data-debug-pan-x', before)
  })

  it('keeps a short background movement as a click and preserves node selection', () => {
    const viewport = openTree()
    const node = viewport.querySelector('[data-perk-node]') as HTMLElement

    fireEvent.pointerDown(viewport, { pointerId: 3, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(viewport, { pointerId: 3, pointerType: 'mouse', clientX: 102, clientY: 102 })
    expect(viewport).not.toHaveClass('is-panning')
    fireEvent.pointerUp(viewport, { pointerId: 3, pointerType: 'mouse', clientX: 102, clientY: 102 })

    fireEvent.click(node)
    expect(node).toHaveClass('is-selected')
  })

  it('uses wheel input for camera movement and keeps a center action available', () => {
    const viewport = openTree()
    const camera = document.querySelector('[data-debug-kind="perk-tree-camera"]') as HTMLElement
    const before = Number(camera.getAttribute('data-debug-pan-y'))

    fireEvent.wheel(viewport, { deltaY: 100 })
    expect(Number(camera.getAttribute('data-debug-pan-y'))).toBe(before - 100)

    fireEvent.click(screen.getByRole('button', { name: 'Center Perk Tree' }))
    expect(Number(camera.getAttribute('data-debug-pan-y'))).not.toBe(before - 100)
  })

  it('opens the authored weapon and magic trees without a reload or placeholder state', () => {
    openTree()
    for (const label of ['One-Handed Axe', 'Dagger', 'Longbow']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }))
      expect(document.querySelectorAll('[data-perk-node]')).toHaveLength(40)
      expect(screen.queryByText('Tree not authored yet')).not.toBeInTheDocument()
    }
  })

  it('keeps the canonical defense catalogue and selector order', () => {
    const defense = proficiencyDefinitions.filter((definition) => definition.category === 'defense')
    expect(defense.map((definition) => definition.id)).toEqual(['light-armor', 'medium-armor', 'heavy-armor', 'shield'])
    for (const definition of defense) expect(definition.perkIds).toHaveLength(40)

    openTree()
    expect(Array.from(document.querySelectorAll('[data-debug-kind="proficiency-group"]')).map((group) => group.getAttribute('data-debug-label'))).toEqual(['MELEE', 'RANGED', 'MAGIC', 'DEFENSE'])
    const defenseGroup = document.querySelector('[data-debug-kind="proficiency-group"][data-debug-category="defense"]')
    expect(defenseGroup).toBeInTheDocument()
    expect(defenseGroup).toHaveAttribute('data-debug-count', '4')
    expect(defenseGroup?.querySelectorAll('[data-debug-kind="proficiency-tile"]')).toHaveLength(4)
    for (const label of ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shield']) {
      const tile = screen.getByRole('button', { name: new RegExp(label) })
      expect(tile).toBeVisible()
      expect(tile).not.toBeDisabled()
    }
  })

  it('opens each defensive tree while untrained', () => {
    openTree()
    for (const label of ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shield']) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }))
      expect(screen.getByText(`${label} Proficiency`)).toBeInTheDocument()
      expect(document.querySelectorAll('[data-perk-node]')).toHaveLength(40)
      expect(screen.getByText('CURRENT TRAINING')).toBeInTheDocument()
      expect(screen.queryByText('Tree not authored yet')).not.toBeInTheDocument()
    }
  })

  it('keeps tree nodes readable and preserves selected details', () => {
    const viewport = openTree()
    const node = viewport.querySelector('[data-perk-node]') as HTMLElement
    expect(node.querySelector('.perk-node-icon')).toBeNull()
    expect(node.querySelector('.perk-node-name')).toHaveTextContent(/.+/)
    expect(node.querySelector('.perk-node-rank')).toHaveTextContent(/^R /)
    fireEvent.click(node)
    expect(screen.getByText('PERK DETAILS')).toBeInTheDocument()
  })

  it('exposes honest empty progress for an untrained proficiency', () => {
    openTree()
    expect(screen.getByLabelText('One-Handed Axe XP progress')).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByLabelText('One-Handed Sword selected XP progress')).toHaveAttribute('aria-valuenow', '0')
  })
})
