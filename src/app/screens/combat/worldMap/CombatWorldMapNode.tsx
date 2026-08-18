import { Globe2, Lock, MapPin, Mountain, Swords, Trees } from 'lucide-react'
import { areaById } from '../../../../game/data/world/areas'
import { combatLocationById } from '../../../../game/data/world/combatLocations'
import { continentById } from '../../../../game/data/world/continents'
import { regionById } from '../../../../game/data/world/regions'
import { isCombatLocationAvailable } from '../../../../game/world/worldSelectors'
import type { CombatMapNodeLayout } from './combatWorldMapTypes'

interface CombatWorldMapNodeProps {
  node: CombatMapNodeLayout
  masteryLevel: number
  selected: boolean
  active: boolean
  onSelect: (node: CombatMapNodeLayout) => void
}

export function CombatWorldMapNode({ node, masteryLevel, selected, active, onSelect }: CombatWorldMapNodeProps) {
  const details = mapNodeDetails(node, masteryLevel)
  const status = active ? 'ACTIVE' : selected ? 'SELECTED' : details.available ? 'AVAILABLE' : details.availability === 'coming-soon' ? 'COMING SOON' : 'LOCKED'
  const isArena = node.kind === 'arena'
  const Icon = isArena ? Swords : node.kind === 'continent' ? Globe2 : node.kind === 'region' ? Mountain : node.kind === 'area' ? MapPin : Trees
  return <button
    type="button"
    className={`combat-world-map-node combat-map-node-kind-${node.kind} ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''} ${!details.available ? 'is-locked' : ''}`}
    style={{ left: `${node.x}%`, top: `${node.y}%` }}
    disabled={!details.available}
    aria-disabled={!details.available}
    aria-pressed={selected}
    aria-label={isArena ? `${details.name} · ${status}` : `${details.available ? 'Open' : status} ${details.name}`}
    title={`${details.name} · ${details.availability === 'coming-soon' ? 'Coming soon' : details.available ? 'Available' : 'Locked'}${details.recommended ? ` · Recommended Mastery ${details.recommended[0]}–${details.recommended[1]}` : ''}`}
    onPointerDown={(event) => event.stopPropagation()}
    onClick={() => details.available && onSelect(node)}
    data-debug-kind={isArena ? 'combat-world-arena-marker' : 'combat-world-map-node'}
    data-debug-node-kind={node.kind}
    data-debug-source-id={node.sourceId}
    data-debug-location-id={isArena ? node.sourceId : undefined}
    data-debug-marker-kind={isArena ? node.markerKind ?? 'normal' : undefined}
    data-debug-marker-state={isArena ? (active ? 'active' : selected ? 'selected' : !details.available ? 'locked' : 'available') : undefined}
    data-debug-label={details.name}
  >
    {!isArena && <span className="combat-world-map-node-icon"><Icon size={node.kind === 'continent' ? 17 : 14} /></span>}
    {isArena && <span className="arena-marker-orb"><Swords size={18} strokeWidth={1.8} /></span>}
    <span className="combat-world-map-node-status">{status}</span>
    <strong>{details.name}</strong>
    {!details.available && <Lock className="combat-world-map-node-lock" size={11} aria-hidden="true" />}
  </button>
}

function mapNodeDetails(node: CombatMapNodeLayout, masteryLevel: number) {
  if (node.kind === 'continent') {
    const definition = continentById[node.sourceId]
    return { name: definition?.name ?? node.sourceId, description: definition?.description, availability: definition?.availability ?? 'locked', requiredMastery: 0, recommended: definition?.recommendedMasteryLevel, available: definition?.availability === 'available' }
  }
  if (node.kind === 'region') {
    const definition = regionById[node.sourceId]
    return { name: definition?.name ?? node.sourceId, description: definition?.description, availability: definition?.availability ?? 'locked', requiredMastery: definition?.requiredMasteryLevel ?? 0, recommended: definition?.recommendedMasteryLevel, available: definition?.availability === 'available' }
  }
  if (node.kind === 'area') {
    const definition = areaById[node.sourceId]
    return { name: definition?.name ?? node.sourceId, description: definition?.description, availability: definition?.availability ?? 'locked', requiredMastery: definition?.requiredMasteryLevel ?? 0, recommended: definition?.recommendedMasteryLevel, available: definition?.availability === 'available' }
  }
  const definition = combatLocationById[node.sourceId]
  return { name: definition?.name ?? node.sourceId, description: definition?.description, availability: definition?.availability ?? 'locked', requiredMastery: definition?.requiredMasteryLevel ?? 0, recommended: definition?.recommendedMasteryLevel, available: isCombatLocationAvailable(node.sourceId, masteryLevel) }
}
