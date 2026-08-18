import { Lock, Swords } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { combatLocationById } from '../../../../game/data/world/combatLocations'
import { isCombatLocationAvailable } from '../../../../game/world/worldSelectors'
import type { CombatLocationDefinition } from '../../../../game/world/worldTypes'
import {
  combatWorldArenaMarkerLayouts,
  combatWorldMapLabels,
  mapLabelAvailability,
  mapLabelName,
  mapLabelRequiredMastery,
  type CombatMapMarkerKind,
} from './combatWorldMapLayout'

const ZOOM_LEVELS = [0.5, 1, 1.5] as const
const ZOOM_LABELS = ['50%', '100%', '150%'] as const
const MAP_ZOOM_STEP_LOCK_MS = 160

interface CombatWorldMapProps {
  masteryLevel: number
  selectedLocationId: string
  activeLocationId: string | null
  onSelectLocation: (locationId: string) => void
}

interface PanState {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

export function CombatWorldMap({ masteryLevel, selectedLocationId, activeLocationId, onSelectLocation }: CombatWorldMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<PanState | null>(null)
  const zoomLockRef = useRef(false)
  const [zoomIndex, setZoomIndex] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [dragging, setDragging] = useState(false)
  const zoom = ZOOM_LEVELS[zoomIndex]

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
    setPan((current) => clampPan(current, zoom, viewportSize))
  }, [zoom, viewportSize])

  const setZoom = (nextIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, nextIndex))
    setZoomIndex(clampedIndex)
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (zoomLockRef.current || event.deltaY === 0) return
    zoomLockRef.current = true
    setZoomIndex((current) => Math.max(0, Math.min(ZOOM_LEVELS.length - 1, current + (event.deltaY > 0 ? -1 : 1))))
    window.setTimeout(() => { zoomLockRef.current = false }, MAP_ZOOM_STEP_LOCK_MS)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    }
    if (typeof event.currentTarget.setPointerCapture === 'function') event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = panRef.current
    if (!current || current.pointerId !== event.pointerId) return
    const nextX = current.originX + event.clientX - current.startX
    const nextY = current.originY + event.clientY - current.startY
    if (Math.abs(event.clientX - current.startX) > 4 || Math.abs(event.clientY - current.startY) > 4) {
      current.moved = true
      setDragging(true)
    }
    setPan(clampPan({ x: nextX, y: nextY }, zoom, viewportSize))
  }

  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null
    setDragging(false)
    if (typeof event.currentTarget.hasPointerCapture === 'function' && event.currentTarget.hasPointerCapture(event.pointerId) && typeof event.currentTarget.releasePointerCapture === 'function') event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div
    ref={viewportRef}
    className={`combat-world-map-viewport ${dragging ? 'is-dragging' : ''}`}
    data-debug-kind="combat-world-map"
    data-debug-label="Interactive combat world map"
    onWheel={handleWheel}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={finishPointer}
    onPointerCancel={finishPointer}
  >
    <div className="combat-world-map-scene" style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}>
      <MapBackdrop />
      {combatWorldMapLabels.map((label) => <MapLabel key={label.id} label={label} masteryLevel={masteryLevel} />)}
      {combatWorldArenaMarkerLayouts.map((layout) => {
        const location = combatLocationById[layout.locationId]
        return location ? <ArenaMarker
          key={layout.locationId}
          location={location}
          layout={{ x: layout.x, y: layout.y, kind: layout.kind }}
          available={isCombatLocationAvailable(location.id, masteryLevel)}
          selected={location.id === selectedLocationId}
          active={location.id === activeLocationId}
          onSelect={onSelectLocation}
        /> : null
      })}
    </div>
    <div className="combat-world-map-toolbar" onPointerDown={(event) => event.stopPropagation()} data-debug-kind="combat-world-map-controls" data-debug-label="Map controls">
      <span className="map-pan-hint">DRAG TO PAN · WHEEL TO ZOOM</span>
      <div className="map-zoom-controls" aria-label="Map zoom">
        {ZOOM_LEVELS.map((level, index) => <button
          key={level}
          type="button"
          className={`map-zoom-button ${index === zoomIndex ? 'is-selected' : ''}`}
          onClick={() => setZoom(index)}
          aria-pressed={index === zoomIndex}
          aria-label={`Zoom ${ZOOM_LABELS[index]}`}
          data-debug-kind="combat-world-map-zoom"
          data-debug-zoom={ZOOM_LABELS[index]}
        >{ZOOM_LABELS[index]}</button>)}
      </div>
      <span className="map-zoom-readout" data-debug-kind="combat-world-map-zoom-readout">ZOOM {ZOOM_LABELS[zoomIndex]}</span>
    </div>
  </div>
}

function MapBackdrop() {
  return <div className="combat-world-map-backdrop" aria-hidden="true">
    <div className="map-landmass map-landmass-west" />
    <div className="map-landmass map-landmass-east" />
    <div className="map-waterway map-waterway-north" />
    <div className="map-waterway map-waterway-south" />
    <div className="map-road map-road-old" />
    <div className="map-road map-road-fen" />
    <div className="map-compass"><span>N</span><i /><span>S</span></div>
    <div className="map-legend"><span className="map-legend-dot" /> HUNTING AREAS</div>
  </div>
}

function MapLabel({ label, masteryLevel }: { label: (typeof combatWorldMapLabels)[number]; masteryLevel: number }) {
  const availability = mapLabelAvailability(label)
  const available = availability === 'available' && mapLabelRequiredMastery(label) <= masteryLevel
  return <span
    className={`combat-world-map-label map-label-${label.variant} ${available ? '' : 'is-locked'}`}
    style={{ left: `${label.x}%`, top: `${label.y}%` }}
    data-debug-kind="combat-world-map-label"
    data-debug-world-id={label.sourceId}
    data-debug-label={mapLabelName(label)}
    title={!available ? (availability === 'coming-soon' ? 'Coming soon' : 'Locked') : undefined}
  >{!available && <Lock size={11} aria-hidden="true" />}<span>{mapLabelName(label).toUpperCase()}</span></span>
}

function ArenaMarker({ location, layout, available, selected, active, onSelect }: { location: CombatLocationDefinition; layout: { x: number; y: number; kind: CombatMapMarkerKind }; available: boolean; selected: boolean; active: boolean; onSelect: (locationId: string) => void }) {
  const status = active ? 'ACTIVE' : selected ? 'SELECTED' : !available ? 'LOCKED' : 'AVAILABLE'
  return <button
    type="button"
    className={`combat-world-arena-marker marker-kind-${layout.kind} ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''} ${!available ? 'is-locked' : ''}`}
    style={{ left: `${layout.x}%`, top: `${layout.y}%` }}
    onPointerDown={(event) => event.stopPropagation()}
    onClick={() => available && onSelect(location.id)}
    disabled={!available}
    aria-pressed={selected}
    aria-label={`${location.name} · ${status}`}
    data-debug-kind="combat-world-arena-marker"
    data-debug-location-id={location.id}
    data-debug-marker-kind={layout.kind}
    data-debug-marker-state={active ? 'active' : selected ? 'selected' : !available ? 'locked' : 'available'}
    data-debug-label={location.name}
  >
    <span className="arena-marker-status">{status}</span>
    <span className="arena-marker-orb"><Swords size={18} strokeWidth={1.8} /></span>
    <strong>{location.name}</strong>
  </button>
}

function clampPan(pan: { x: number; y: number }, zoom: number, viewport: { width: number; height: number }) {
  const horizontalLimit = Math.max(0, (viewport.width * zoom - viewport.width) / 2)
  const verticalLimit = Math.max(0, (viewport.height * zoom - viewport.height) / 2)
  return {
    x: Math.max(-horizontalLimit, Math.min(horizontalLimit, pan.x)),
    y: Math.max(-verticalLimit, Math.min(verticalLimit, pan.y)),
  }
}
