import { ArrowLeft, Globe2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { combatAtlasNodeDetails } from './combatAtlasNodeDetails'
import { CombatAtlasArenaNode } from './CombatAtlasArenaNode'
import { CombatAtlasBackdrop } from './CombatAtlasBackdrop'
import { CombatAtlasConnections } from './CombatAtlasConnections'
import { CombatAtlasConstellationNode } from './CombatAtlasConstellationNode'
import { CombatAtlasTerritoryCard } from './CombatAtlasTerritoryCard'
import type { CombatAtlasNodeLayout, CombatAtlasViewDefinition } from './combatAtlasTypes'

interface CombatAtlasStageProps {
  view: CombatAtlasViewDefinition
  masteryLevel: number
  selectedNodeId?: string
  activeLocationId: string | null
  onNodeSelect: (node: CombatAtlasNodeLayout) => void
  onBack: () => void
  onReturnToWorld: () => void
}

export function CombatAtlasStage({ view, masteryLevel, selectedNodeId, activeLocationId, onNodeSelect, onBack, onReturnToWorld }: CombatAtlasStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string>()

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

  return <div
    ref={stageRef}
    className={`combat-atlas-stage combat-atlas-level-${view.level} combat-atlas-mode-${view.mode} combat-atlas-atmosphere-${view.atmosphere}`}
    data-debug-kind="combat-atlas-stage"
    data-debug-atlas-mode={view.mode}
    data-debug-atlas-view-id={view.id}
    data-debug-label={`${view.level} atlas`}
    onPointerMove={handlePointerMove}
    onPointerLeave={resetPointer}
  >
    <CombatAtlasBackdrop atmosphere={view.atmosphere} />
    <CombatAtlasConnections view={view} hoveredNodeId={hoveredNodeId} selectedNodeId={selectedNodeId} activeLocationId={activeLocationId} />
    {view.nodes.map((node, index) => {
      const details = combatAtlasNodeDetails(node, masteryLevel)
      if (view.mode === 'territories') return <CombatAtlasTerritoryCard key={node.sourceId} node={node} details={details} selected={selectedNodeId === node.sourceId} index={index} onSelect={onNodeSelect} onHover={setHoveredNodeId} />
      if (view.mode === 'constellation') return <CombatAtlasConstellationNode key={node.sourceId} node={node} details={details} selected={selectedNodeId === node.sourceId} index={index} onSelect={onNodeSelect} onHover={setHoveredNodeId} />
      return <CombatAtlasArenaNode key={node.sourceId} node={node} details={details} selected={selectedNodeId === node.sourceId} active={activeLocationId === node.sourceId} index={index} onSelect={onNodeSelect} onHover={setHoveredNodeId} />
    })}
    <div className="combat-atlas-nav-controls" data-debug-kind="combat-atlas-nav-controls" data-debug-label="Atlas navigation controls">
      <button type="button" className="combat-atlas-nav-button" onClick={onBack} aria-label="Back one map level" title="Back one map level" disabled={view.level === 'world'} data-debug-kind="combat-atlas-nav-button" data-debug-atlas-action="back">
        <ArrowLeft size={16} aria-hidden="true" />
      </button>
      <button type="button" className="combat-atlas-nav-button" onClick={onReturnToWorld} aria-label="Return to World Map" title="Return to World Map" disabled={view.level === 'world'} data-debug-kind="combat-atlas-nav-button" data-debug-atlas-action="world">
        <Globe2 size={16} aria-hidden="true" />
      </button>
    </div>
    <span className="combat-atlas-stage-index">{view.mode === 'territories' ? 'TERRITORY ATLAS' : view.mode === 'constellation' ? 'CONSTELLATION ATLAS' : 'COMBAT ARENA ATLAS'}</span>
  </div>
}
