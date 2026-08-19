import type { CSSProperties } from 'react'
import { Lock } from 'lucide-react'
import { GameTooltip } from '../../../components/tooltip/GameTooltip'
import { atlasAccentRgb } from './combatAtlasLayout'
import type { CombatAtlasNodeDetails } from './combatAtlasNodeDetails'
import { atlasIconByKey, atlasStatusLabel } from './combatAtlasNodeDetails'
import type { CombatAtlasNodeLayout } from './combatAtlasTypes'

interface CombatAtlasConstellationNodeProps {
  node: CombatAtlasNodeLayout
  details: CombatAtlasNodeDetails
  selected: boolean
  dimmed: boolean
  huntPath: boolean
  activating: boolean
  index: number
  onSelect: (node: CombatAtlasNodeLayout) => void
  onHover: (nodeId: string | undefined) => void
}

export function CombatAtlasConstellationNode({ node, details, selected, dimmed, huntPath, activating, index, onSelect, onHover }: CombatAtlasConstellationNodeProps) {
  const Icon = atlasIconByKey[node.icon]
  const status = atlasStatusLabel(details, selected, false)

  return <GameTooltip content={{ id: `atlas:${node.sourceId}`, icon: 'map', title: details.name, subtitle: status, description: details.description }}>
    <button
      type="button"
      className={`combat-atlas-node ${selected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''} ${huntPath ? 'is-hunt-path' : ''} ${activating ? 'is-activating' : ''} ${!details.available ? 'is-locked' : ''}`}
      style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${Math.min(index * 42, 180)}ms`, '--atlas-node-rgb': atlasAccentRgb[node.accent] } as CSSProperties}
      aria-disabled={!details.available}
      aria-pressed={selected}
      aria-label={`${details.available ? 'Open' : status} ${details.name}`}
      onPointerEnter={() => onHover(node.sourceId)}
      onPointerLeave={() => onHover(undefined)}
      onFocus={() => onHover(node.sourceId)}
      onBlur={() => onHover(undefined)}
      onClick={() => details.available && onSelect(node)}
      data-debug-kind="combat-atlas-node"
      data-debug-node-kind={node.kind}
      data-debug-source-id={node.sourceId}
      data-debug-label={details.name}
    >
      <span className="combat-atlas-node-halo" />
      <span className="combat-atlas-node-orb"><Icon size={17} strokeWidth={1.55} /></span>
      {huntPath && <span className="combat-atlas-hunt-path-label"><i />HUNT</span>}
      <span className="combat-atlas-node-label"><strong>{details.name}</strong><em>{!details.available && <Lock size={10} aria-hidden="true" />}{status}</em></span>
    </button>
  </GameTooltip>
}
