import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { Lock } from 'lucide-react'
import type { CombatAtlasNodeDetails } from './combatAtlasNodeDetails'
import { atlasIconByKey, atlasStatusLabel } from './combatAtlasNodeDetails'
import type { CombatAtlasNodeLayout } from './combatAtlasTypes'

interface CombatAtlasTerritoryCardProps {
  node: CombatAtlasNodeLayout
  details: CombatAtlasNodeDetails
  selected: boolean
  index: number
  onSelect: (node: CombatAtlasNodeLayout) => void
  onHover: (nodeId: string | undefined) => void
}

export function CombatAtlasTerritoryCard({ node, details, selected, index, onSelect, onHover }: CombatAtlasTerritoryCardProps) {
  const Icon = atlasIconByKey[node.icon]
  const status = atlasStatusLabel(details, selected, false)
  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--card-pointer-x', `${((event.clientX - rect.left) / Math.max(1, rect.width)) * 100}%`)
    event.currentTarget.style.setProperty('--card-pointer-y', `${((event.clientY - rect.top) / Math.max(1, rect.height)) * 100}%`)
  }
  const resetPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.style.setProperty('--card-pointer-x', '50%')
    event.currentTarget.style.setProperty('--card-pointer-y', '50%')
    onHover(undefined)
  }
  const label = details.available ? `Open ${details.name}` : `${status} ${details.name}`
  return <button
    type="button"
    className={`combat-atlas-territory combat-atlas-accent-${node.accent} ${selected ? 'is-selected' : ''} ${!details.available ? 'is-locked' : ''}`}
    style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${Math.min(index * 38, 180)}ms` } as CSSProperties}
    disabled={!details.available}
    aria-disabled={!details.available}
    aria-pressed={selected}
    aria-label={label}
    title={`${details.name} · ${status}`}
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
    <span className="combat-atlas-territory-glow" />
    <span className="combat-atlas-territory-corner" />
    <span className="combat-atlas-territory-icon"><Icon size={node.kind === 'continent' ? 23 : 19} strokeWidth={1.5} /></span>
    <span className="combat-atlas-territory-body">
      <span className="combat-atlas-territory-kind">{node.kind === 'continent' ? 'CONTINENT' : 'REGION'}</span>
      <strong>{details.name}</strong>
      <span className="combat-atlas-territory-description">{details.description}</span>
      <span className="combat-atlas-territory-meta">
        {details.childCount !== undefined && <span>{details.childCount} {details.childLabel}</span>}
        {details.recommendedMasteryLevel && <span>MASTERY {details.recommendedMasteryLevel[0]}–{details.recommendedMasteryLevel[1]}</span>}
      </span>
      <span className="combat-atlas-territory-status">{!details.available && <Lock size={11} aria-hidden="true" />}{status}</span>
      <span className="combat-atlas-enter">{details.available ? 'ENTER →' : 'COMING SOON'}</span>
    </span>
  </button>
}
