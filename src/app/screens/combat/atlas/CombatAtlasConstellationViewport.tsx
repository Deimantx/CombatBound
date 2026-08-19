import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { constellationCanvasScale } from './combatAtlasLayout'
import { CombatAtlasConnections } from './CombatAtlasConnections'
import type { CombatAtlasNodeLayout, CombatAtlasViewDefinition } from './combatAtlasTypes'

interface CombatAtlasConstellationViewportProps {
  view: CombatAtlasViewDefinition
  selectedNodeId?: string
  activeLocationId: string | null
  activeHuntPathNodeId?: string
  activatingNodeId?: string
  hoveredNodeId?: string
  renderNode: (node: CombatAtlasNodeLayout, index: number, dimmed: boolean) => ReactNode
}

interface PanPoint {
  x: number
  y: number
}

interface DragState extends PanPoint {
  pointerId: number
  startX: number
  startY: number
  moved: boolean
}

const DRAG_THRESHOLD = 6

export function CombatAtlasConstellationViewport({ view, selectedNodeId, activeLocationId, activeHuntPathNodeId, activatingNodeId, hoveredNodeId, renderNode }: CombatAtlasConstellationViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | undefined>(undefined)
  const suppressClickRef = useRef(false)
  const [viewportSize, setViewportSize] = useState<PanPoint>({ x: 0, y: 0 })
  const [pan, setPan] = useState<PanPoint>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const scale = constellationCanvasScale(view.nodes.length)
  const isPannable = scale.x > 1 || scale.y > 1

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

  useEffect(() => {
    setPan({ x: 0, y: 0 })
  }, [view.id, view.nodes.length, scale.x, scale.y])

  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const updateSize = () => setViewportSize({ x: element.clientWidth, y: element.clientHeight })
    updateSize()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const maxPan = {
    x: Math.max(0, (viewportSize.x * (scale.x - 1)) / 2),
    y: Math.max(0, (viewportSize.y * (scale.y - 1)) / 2),
  }

  const clampPan = (next: PanPoint) => ({
    x: Math.max(-maxPan.x, Math.min(maxPan.x, next.x)),
    y: Math.max(-maxPan.y, Math.min(maxPan.y, next.y)),
  })

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPannable || (event.pointerType !== 'touch' && event.button !== 0)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: pan.x, y: pan.y, moved: false }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return
    drag.moved = true
    setDragging(true)
    setPan(clampPan({ x: drag.x + deltaX, y: drag.y + deltaY }))
  }

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.moved) suppressClickRef.current = true
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = undefined
    setDragging(false)
  }

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClickRef.current = false
  }

  return <div
    ref={viewportRef}
    className={`combat-atlas-constellation-viewport ${isPannable ? 'is-pannable' : ''} ${dragging ? 'is-dragging' : ''}`}
    data-debug-kind="combat-atlas-constellation-viewport"
    data-debug-pannable={isPannable ? 'true' : 'false'}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={finishPointer}
    onPointerCancel={finishPointer}
    onClickCapture={handleClickCapture}
  >
    <div
      className="combat-atlas-constellation-canvas"
      style={{ width: `${scale.x * 100}%`, height: `${scale.y * 100}%`, transform: `translate3d(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px), 0)` } as CSSProperties}
    >
      <CombatAtlasConnections view={view} hoveredNodeId={hoveredNodeId} selectedNodeId={selectedNodeId} activeLocationId={activeLocationId} activeHuntPathNodeId={activeHuntPathNodeId} activatingNodeId={activatingNodeId} />
      {view.nodes.map((node, index) => renderNode(node, index, Boolean(hoveredNodeId && !connectedNodeIds.has(node.sourceId))))}
    </div>
  </div>
}
