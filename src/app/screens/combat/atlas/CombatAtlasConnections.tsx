import type { CombatAtlasDecoration, CombatAtlasNodeLayout, CombatAtlasViewDefinition } from './combatAtlasTypes'

interface CombatAtlasConnectionsProps {
  view: CombatAtlasViewDefinition
  hoveredNodeId?: string
  selectedNodeId?: string
  activeLocationId: string | null
  activeHuntPathNodeId?: string
  activatingNodeId?: string
}

export function CombatAtlasConnections({ view, hoveredNodeId, selectedNodeId, activeLocationId, activeHuntPathNodeId, activatingNodeId }: CombatAtlasConnectionsProps) {
  const points = new Map(view.nodes.map((node) => [node.sourceId, node]))
  return <svg className="combat-atlas-connections" data-debug-kind="combat-atlas-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {view.decorations?.map((decoration, index) => <Decoration key={`decoration-${index}`} decoration={decoration} />)}
    {view.connections?.map((connection) => {
      const from = points.get(connection.from)
      const to = points.get(connection.to)
      if (!from || !to) return null
      const relatedToHover = Boolean(hoveredNodeId && (connection.from === hoveredNodeId || connection.to === hoveredNodeId))
      const relatedToSelection = Boolean(selectedNodeId && (connection.from === selectedNodeId || connection.to === selectedNodeId))
      const relatedToActive = Boolean(activeLocationId && (connection.from === activeLocationId || connection.to === activeLocationId))
      const relatedToHuntPath = Boolean(activeHuntPathNodeId && (connection.from === activeHuntPathNodeId || connection.to === activeHuntPathNodeId))
      const relatedToActivation = Boolean(activatingNodeId && (connection.from === activatingNodeId || connection.to === activatingNodeId))
      const unrelatedToHover = Boolean(hoveredNodeId && !relatedToHover)
      return <path
        key={`${connection.from}-${connection.to}`}
        className={`combat-atlas-connection ${connection.emphasis === 'subtle' ? 'is-subtle' : ''} ${relatedToHover ? 'is-highlighted' : ''} ${relatedToSelection ? 'is-selected' : ''} ${relatedToActive ? 'is-active' : ''} ${relatedToHuntPath ? 'is-hunt-path' : ''} ${relatedToActivation ? 'is-activating' : ''} ${unrelatedToHover ? 'is-dimmed' : ''}`}
        d={connectionPath(from, to, connection.curve)}
      />
    })}
  </svg>
}

function Decoration({ decoration }: { decoration: CombatAtlasDecoration }) {
  if (decoration.kind === 'ring') return <circle className="combat-atlas-decoration-ring" cx={decoration.x} cy={decoration.y} r={decoration.radius} />
  return <path className={`combat-atlas-decoration-route is-${decoration.tone ?? 'forest'}`} d={polylinePath(decoration.points)} />
}

function connectionPath(from: CombatAtlasNodeLayout, to: CombatAtlasNodeLayout, curve = 0) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.max(1, Math.hypot(dx, dy))
  const midpointX = (from.x + to.x) / 2
  const midpointY = (from.y + to.y) / 2
  const controlX = midpointX + (-dy / length) * curve
  const controlY = midpointY + (dx / length) * curve
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`
}

function polylinePath(points: readonly { x: number; y: number }[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  return points.reduce((path, point, index) => index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`, '')
}
