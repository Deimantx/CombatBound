import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Lock } from 'lucide-react'
import { GameTooltip } from '../../../components/tooltip/GameTooltip'
import { atlasAccentRgb } from './combatAtlasLayout'
import type { CombatAtlasNodeDetails } from './combatAtlasNodeDetails'
import { atlasIconByKey, atlasStatusLabel } from './combatAtlasNodeDetails'
import type { CombatAtlasNodeLayout } from './combatAtlasTypes'

interface CombatAtlasTerritoryCardProps {
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

export function CombatAtlasTerritoryCard({ node, details, selected, dimmed, huntPath, activating, index, onSelect, onHover }: CombatAtlasTerritoryCardProps) {
  const Icon = atlasIconByKey[node.icon]
  const status = atlasStatusLabel(details, selected, false)
  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100
    const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100
    event.currentTarget.style.setProperty('--card-pointer-x', `${x}%`)
    event.currentTarget.style.setProperty('--card-pointer-y', `${y}%`)
    if (details.available) {
      event.currentTarget.style.setProperty('--card-tilt-x', `${Math.max(-1.8, Math.min(1.8, (x - 50) / 28))}deg`)
      event.currentTarget.style.setProperty('--card-tilt-y', `${Math.max(-1.3, Math.min(1.3, (50 - y) / 38))}deg`)
      event.currentTarget.style.setProperty('--card-icon-shift-x', `${Math.max(-2, Math.min(2, (x - 50) / 24))}px`)
      event.currentTarget.style.setProperty('--card-icon-shift-y', `${Math.max(-2, Math.min(2, (y - 50) / 24))}px`)
    }
  }
  const resetPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.style.setProperty('--card-pointer-x', '50%')
    event.currentTarget.style.setProperty('--card-pointer-y', '50%')
    event.currentTarget.style.setProperty('--card-tilt-x', '0deg')
    event.currentTarget.style.setProperty('--card-tilt-y', '0deg')
    event.currentTarget.style.setProperty('--card-icon-shift-x', '0px')
    event.currentTarget.style.setProperty('--card-icon-shift-y', '0px')
    onHover(undefined)
  }
  const label = details.available ? `Open ${details.name}` : `${status} ${details.name}`

  return <GameTooltip content={{ id: `atlas:${node.sourceId}`, icon: 'map', title: details.name, subtitle: `${node.kind === 'continent' ? 'CONTINENT' : 'REGION'} - ${status}`, description: details.description }}>
    <button
      type="button"
      className={`combat-atlas-territory ${selected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''} ${huntPath ? 'is-hunt-path' : ''} ${activating ? 'is-activating' : ''} ${!details.available ? 'is-locked' : ''}`}
      style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${Math.min(index * 38, 180)}ms`, '--atlas-node-rgb': atlasAccentRgb[node.accent] } as CSSProperties}
      aria-disabled={!details.available}
      aria-pressed={selected}
      aria-label={label}
      onPointerEnter={() => onHover(node.sourceId)}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      onFocus={() => onHover(node.sourceId)}
      onBlur={() => onHover(undefined)}
      onClick={() => details.available && onSelect(node)}
      data-debug-kind="combat-atlas-node"
      data-debug-node-kind={node.kind}
      data-debug-source-id={node.sourceId}
      data-debug-label={details.name}
    >
      <span className="combat-atlas-territory-surface">
        <span className="combat-atlas-territory-ghost" aria-hidden="true"><Icon size={92} strokeWidth={1} /></span>
        <span className="combat-atlas-territory-border-trace" aria-hidden="true" />
        <span className="combat-atlas-territory-corners" aria-hidden="true"><i /><i /><i /><i /></span>
        <span className="combat-atlas-territory-icon"><Icon size={node.kind === 'continent' ? 23 : 19} strokeWidth={1.5} /></span>
        <span className="combat-atlas-territory-body">
          <span className="combat-atlas-territory-kind">{node.kind === 'continent' ? 'CONTINENT' : 'REGION'}</span>
          <strong>{details.name}</strong>
          <span className="combat-atlas-territory-description">{details.description}</span>
          {huntPath && <span className="combat-atlas-hunt-path-label"><i />HUNT</span>}
          {!details.available
            ? <span className="combat-atlas-territory-status"><Lock size={11} aria-hidden="true" />{status}</span>
            : <span className="combat-atlas-enter">ENTER -&gt;</span>}
        </span>
      </span>
    </button>
  </GameTooltip>
}
