import { ArrowLeft, Globe2 } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useMemo, useRef, useState } from 'react'
import { combatAtlasNodeDetails } from './combatAtlasNodeDetails'
import { atlasAccentRgb, atlasAtmosphereAccent, atlasNeutralRgb } from './combatAtlasLayout'
import { CombatAtlasArenaNode } from './CombatAtlasArenaNode'
import { CombatAtlasBackdrop } from './CombatAtlasBackdrop'
import { CombatAtlasConnections } from './CombatAtlasConnections'
import { CombatAtlasConstellationNode } from './CombatAtlasConstellationNode'
import { CombatAtlasConstellationViewport } from './CombatAtlasConstellationViewport'
import { CombatAtlasTerritoryCard } from './CombatAtlasTerritoryCard'
import type { CombatAtlasNodeLayout, CombatAtlasViewDefinition } from './combatAtlasTypes'

export interface CombatAtlasTransitionOrigin {
  x: number
  y: number
  rgb: string
}

export type CombatAtlasTransitionPhase = 'idle' | 'exit' | 'enter'

interface CombatAtlasStageProps {
  view: CombatAtlasViewDefinition
  hunterRank: number
  selectedNodeId?: string
  activeLocationId: string | null
  activeHuntPathNodeId?: string
  activatingNodeId?: string
  transitionPhase?: CombatAtlasTransitionPhase
  transitionOrigin?: CombatAtlasTransitionOrigin
  onNodeSelect: (node: CombatAtlasNodeLayout) => void
  onBack: () => void
  onReturnToWorld: () => void
}

export function CombatAtlasStage({ view, hunterRank, selectedNodeId, activeLocationId, activeHuntPathNodeId, activatingNodeId, transitionOrigin, transitionPhase = 'idle', onNodeSelect, onBack, onReturnToWorld }: CombatAtlasStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string>()
  const defaultAccent = atlasAtmosphereAccent[view.atmosphere]
  const hoveredNode = view.nodes.find((node) => node.sourceId === hoveredNodeId)
  const focusRgb = hoveredNode ? atlasAccentRgb[hoveredNode.accent] : atlasNeutralRgb
  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>()
    if (!hoveredNodeId) return ids
    ids.add(hoveredNodeId)
    view.connections?.forEach((connection) => {
      if (connection.from === hoveredNodeId) ids.add(connection.to)
      if (connection.to === hoveredNodeId) ids.add(connection.from)
    })
    return ids
  }, [hoveredNodeId, view.connections])
  const stageStyle = {
    '--atlas-default-rgb': atlasAccentRgb[defaultAccent],
    '--atlas-atmosphere-rgb': atlasAccentRgb[defaultAccent],
    '--atlas-focus-rgb': focusRgb,
    '--atlas-transition-x': `${transitionOrigin?.x ?? 50}%`,
    '--atlas-transition-y': `${transitionOrigin?.y ?? 50}%`,
    '--atlas-transition-rgb': transitionOrigin?.rgb ?? focusRgb,
  } as CSSProperties

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100))
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100))
    stage.style.setProperty('--atlas-x', `${x}%`)
    stage.style.setProperty('--atlas-y', `${y}%`)
    stage.style.setProperty('--atlas-shift-x', `${(x - 50) / 16}px`)
    stage.style.setProperty('--atlas-shift-y', `${(y - 50) / 16}px`)
  }

  const resetPointer = () => {
    const stage = stageRef.current
    stage?.style.setProperty('--atlas-x', '50%')
    stage?.style.setProperty('--atlas-y', '50%')
    stage?.style.setProperty('--atlas-shift-x', '0px')
    stage?.style.setProperty('--atlas-shift-y', '0px')
  }

  const renderNode = (node: CombatAtlasNodeLayout, index: number, dimmed: boolean): ReactNode => {
    const details = combatAtlasNodeDetails(node, hunterRank)
    const huntPath = activeHuntPathNodeId === node.sourceId
    const activating = activatingNodeId === node.sourceId
    if (view.mode === 'territories') return <CombatAtlasTerritoryCard key={node.sourceId} node={node} details={details} selected={selectedNodeId === node.sourceId} dimmed={dimmed} huntPath={huntPath} activating={activating} index={index} onSelect={onNodeSelect} onHover={setHoveredNodeId} />
    if (view.mode === 'constellation') return <CombatAtlasConstellationNode key={node.sourceId} node={node} details={details} selected={selectedNodeId === node.sourceId} dimmed={dimmed} huntPath={huntPath} activating={activating} index={index} onSelect={onNodeSelect} onHover={setHoveredNodeId} />
    return <CombatAtlasArenaNode key={node.sourceId} node={node} details={details} selected={selectedNodeId === node.sourceId} active={activeLocationId === node.sourceId} index={index} onSelect={onNodeSelect} onHover={setHoveredNodeId} />
  }

  return <div
    ref={stageRef}
    className={`combat-atlas-stage combat-atlas-level-${view.level} combat-atlas-mode-${view.mode} combat-atlas-atmosphere-${view.atmosphere} ${transitionOrigin ? 'is-transitioning' : ''} combat-atlas-transition-${transitionPhase}`}
    style={stageStyle}
    data-debug-kind="combat-atlas-stage"
    data-debug-atlas-mode={view.mode}
    data-debug-atlas-view-id={view.id}
    data-debug-activating-node-id={activatingNodeId}
    data-debug-label={`${view.level} atlas`}
    onPointerMove={handlePointerMove}
    onPointerLeave={resetPointer}
  >
    <CombatAtlasBackdrop atmosphere={view.atmosphere} />
    {view.mode === 'constellation'
      ? <CombatAtlasConstellationViewport view={view} selectedNodeId={selectedNodeId} activeLocationId={activeLocationId} activeHuntPathNodeId={activeHuntPathNodeId} activatingNodeId={activatingNodeId} hoveredNodeId={hoveredNodeId} renderNode={renderNode} />
      : <>
        <CombatAtlasConnections view={view} hoveredNodeId={hoveredNodeId} selectedNodeId={selectedNodeId} activeLocationId={activeLocationId} activeHuntPathNodeId={activeHuntPathNodeId} activatingNodeId={activatingNodeId} />
        {view.nodes.map((node, index) => renderNode(node, index, Boolean(hoveredNodeId && !connectedNodeIds.has(node.sourceId))))}
      </>}
    <div className="combat-atlas-nav-controls" data-debug-kind="combat-atlas-nav-controls" data-debug-label="Atlas navigation controls">
      <button type="button" className="combat-atlas-nav-button" onClick={onBack} aria-label="Back one map level" title="Back one map level" disabled={view.level === 'world'} data-debug-kind="combat-atlas-nav-button" data-debug-atlas-action="back">
        <ArrowLeft size={16} aria-hidden="true" />
      </button>
      <button type="button" className="combat-atlas-nav-button" onClick={onReturnToWorld} aria-label="Return to World Map" title="Return to World Map" disabled={view.level === 'world'} data-debug-kind="combat-atlas-nav-button" data-debug-atlas-action="world">
        <Globe2 size={16} aria-hidden="true" />
      </button>
    </div>
  </div>
}
