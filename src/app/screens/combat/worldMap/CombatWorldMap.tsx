import { ArrowLeft, Globe2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CombatMapNodeLayout, CombatMapViewDefinition } from './combatWorldMapTypes'
import { CombatWorldMapArtwork } from './CombatWorldMapArtwork'
import { CombatWorldMapNode } from './CombatWorldMapNode'

const ZOOM_LEVELS = [0.5, 1, 1.5] as const
const ZOOM_LABELS = ['50%', '100%', '150%'] as const
const MAP_ZOOM_STEP_LOCK_MS = 160
const FALLBACK_SCENE_ASPECT_RATIO = 900 / 540

interface CombatWorldMapProps {
  view: CombatMapViewDefinition
  masteryLevel: number
  selectedNodeId?: string
  activeLocationId: string | null
  onNodeSelect: (node: CombatMapNodeLayout) => void
  onBack: () => void
  onReturnToWorld: () => void
}

interface PanState {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

export function CombatWorldMap({ view, masteryLevel, selectedNodeId, activeLocationId, onNodeSelect, onBack, onReturnToWorld }: CombatWorldMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<PanState | null>(null)
  const zoomLockRef = useRef(false)
  const [zoomIndex, setZoomIndex] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [dragging, setDragging] = useState(false)
  const zoom = ZOOM_LEVELS[zoomIndex]
  const sceneAspectRatio = view.backgroundAspectRatio ?? FALLBACK_SCENE_ASPECT_RATIO
  const sceneSize = sceneSizeForViewport(viewportSize, sceneAspectRatio)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const updateSize = () => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight })
    updateSize()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updateSize)
    observer?.observe(viewport)
    window.addEventListener('resize', updateSize)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  useEffect(() => {
    setPan((current) => clampPan(current, zoom, viewportSize, sceneSize))
  }, [sceneSize.height, sceneSize.width, viewportSize.height, viewportSize.width, zoom])

  const changeZoom = (direction: -1 | 1) => {
    setZoomIndex((current) => Math.max(0, Math.min(ZOOM_LEVELS.length - 1, current + direction)))
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (zoomLockRef.current || event.deltaY === 0) return
    zoomLockRef.current = true
    changeZoom(event.deltaY > 0 ? -1 : 1)
    window.setTimeout(() => { zoomLockRef.current = false }, MAP_ZOOM_STEP_LOCK_MS)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y }
    setDragging(true)
    if (typeof event.currentTarget.setPointerCapture === 'function') event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = panRef.current
    if (!current || current.pointerId !== event.pointerId) return
    if (Math.abs(event.clientX - current.startX) > 4 || Math.abs(event.clientY - current.startY) > 4) setDragging(true)
    setPan(clampPan({ x: current.originX + event.clientX - current.startX, y: current.originY + event.clientY - current.startY }, zoom, viewportSize, sceneSize))
  }

  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null
    setDragging(false)
    if (typeof event.currentTarget.hasPointerCapture === 'function' && event.currentTarget.hasPointerCapture(event.pointerId) && typeof event.currentTarget.releasePointerCapture === 'function') event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const sceneStyle = {
    left: sceneSize.width > 0 ? `${(viewportSize.width - sceneSize.width) / 2}px` : '0px',
    top: sceneSize.height > 0 ? `${(viewportSize.height - sceneSize.height) / 2}px` : '0px',
    width: sceneSize.width > 0 ? `${sceneSize.width}px` : '100%',
    height: sceneSize.height > 0 ? `${sceneSize.height}px` : '100%',
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
  }

  return <div
    ref={viewportRef}
    className={`combat-world-map-viewport ${dragging ? 'is-dragging' : ''}`}
    data-debug-kind="combat-world-map"
    data-debug-map-level={view.level}
    data-debug-map-id={view.id}
    data-debug-label={`${view.level} map`}
    onWheel={handleWheel}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={finishPointer}
    onPointerCancel={finishPointer}
    >
    <div className="combat-world-map-scene" style={sceneStyle}>
      <CombatWorldMapArtwork backgroundKey={view.backgroundKey} backgroundAsset={view.backgroundAsset} />
      {view.nodes.map((node) => <CombatWorldMapNode
        key={`${node.kind}-${node.sourceId}`}
        node={node}
        masteryLevel={masteryLevel}
        selected={selectedNodeId === node.sourceId}
        active={node.kind === 'arena' && activeLocationId === node.sourceId}
        onSelect={onNodeSelect}
      />)}
    </div>
    <div className="combat-world-map-nav-controls" onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()} data-debug-kind="combat-world-map-nav-controls" data-debug-label="Map navigation controls">
      <button type="button" className="combat-world-map-nav-button" onClick={onBack} aria-label="Back one map level" title="Back one map level" disabled={view.level === 'world'} data-debug-kind="combat-world-map-nav-button" data-debug-map-action="back">
        <ArrowLeft size={16} aria-hidden="true" />
      </button>
      <button type="button" className="combat-world-map-nav-button" onClick={onReturnToWorld} aria-label="Return to World Map" title="Return to World Map" disabled={view.level === 'world'} data-debug-kind="combat-world-map-nav-button" data-debug-map-action="world">
        <Globe2 size={16} aria-hidden="true" />
      </button>
    </div>
    <div className="combat-world-map-toolbar" onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()} data-debug-kind="combat-world-map-controls" data-debug-label="Map controls">
      <span className="map-pan-hint">DRAG TO PAN</span>
      <div className="map-zoom-controls" aria-label="Map zoom">
        <button type="button" className="map-zoom-button" onClick={() => changeZoom(-1)} aria-label="Zoom out" disabled={zoomIndex === 0}>−</button>
        <span className="map-zoom-readout" data-debug-kind="combat-world-map-zoom-readout">{ZOOM_LABELS[zoomIndex]}</span>
        <button type="button" className="map-zoom-button" onClick={() => changeZoom(1)} aria-label="Zoom in" disabled={zoomIndex === ZOOM_LEVELS.length - 1}>+</button>
      </div>
    </div>
  </div>
}

function sceneSizeForViewport(viewport: { width: number; height: number }, aspectRatio: number) {
  if (viewport.width <= 0 || viewport.height <= 0) return { width: 0, height: 0 }
  const width = Math.min(viewport.width, viewport.height * aspectRatio)
  return { width, height: width / aspectRatio }
}

function clampPan(pan: { x: number; y: number }, zoom: number, viewport: { width: number; height: number }, scene: { width: number; height: number }) {
  const horizontalLimit = Math.max(0, (scene.width * zoom - viewport.width) / 2)
  const verticalLimit = Math.max(0, (scene.height * zoom - viewport.height) / 2)
  return {
    x: Math.max(-horizontalLimit, Math.min(horizontalLimit, pan.x)),
    y: Math.max(-verticalLimit, Math.min(verticalLimit, pan.y)),
  }
}
