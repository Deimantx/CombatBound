import type { CSSProperties } from 'react'
import { Lock, Swords } from 'lucide-react'
import { atlasAccentRgb } from './combatAtlasLayout'
import type { CombatAtlasNodeDetails } from './combatAtlasNodeDetails'
import { atlasStatusLabel } from './combatAtlasNodeDetails'
import type { CombatAtlasNodeLayout } from './combatAtlasTypes'

interface CombatAtlasArenaNodeProps {
  node: CombatAtlasNodeLayout
  details: CombatAtlasNodeDetails
  selected: boolean
  active: boolean
  index: number
  onSelect: (node: CombatAtlasNodeLayout) => void
  onHover: (nodeId: string | undefined) => void
}

export function CombatAtlasArenaNode({ node, details, selected, active, index, onSelect, onHover }: CombatAtlasArenaNodeProps) {
  const status = atlasStatusLabel(details, selected, active)
  return <button
    type="button"
    className={`combat-atlas-arena ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''} ${!details.available ? 'is-locked' : ''}`}
    style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${Math.min(index * 42, 180)}ms`, '--atlas-node-rgb': atlasAccentRgb[node.accent] } as CSSProperties}
    disabled={!details.available}
    aria-disabled={!details.available}
    aria-pressed={selected}
    aria-label={`${details.name} · ${details.available ? 'Select arena' : status}`}
    title={`${details.name} · ${status}`}
    onPointerEnter={() => onHover(node.sourceId)}
    onPointerLeave={() => onHover(undefined)}
    onFocus={() => onHover(node.sourceId)}
    onBlur={() => onHover(undefined)}
    onClick={() => details.available && onSelect(node)}
    data-debug-kind="combat-atlas-node"
    data-debug-node-kind="arena"
    data-debug-source-id={node.sourceId}
    data-debug-location-id={node.sourceId}
    data-debug-marker-kind="normal"
    data-debug-marker-state={active ? 'active' : selected ? 'selected' : details.available ? 'available' : 'locked'}
    data-debug-label={details.name}
  >
    <span className="combat-atlas-arena-halo" />
    <span className="combat-atlas-arena-orb"><Swords size={23} strokeWidth={1.5} /></span>
    <span className="combat-atlas-arena-label"><strong>{details.name}</strong><em>{!details.available && <Lock size={10} aria-hidden="true" />}{status}</em></span>
  </button>
}
