import { areaById } from '../../../../game/data/world/areas'
import { continentById } from '../../../../game/data/world/continents'
import { regionById } from '../../../../game/data/world/regions'

export type CombatMapMarkerKind = 'normal' | 'elite' | 'boss'

export interface CombatWorldMapPoint {
  x: number
  y: number
}

export interface CombatWorldMapLabel {
  id: string
  sourceType: 'continent' | 'region' | 'area'
  sourceId: string
  x: number
  y: number
  variant: 'continent' | 'region' | 'area'
}

export interface CombatWorldArenaMarkerLayout extends CombatWorldMapPoint {
  locationId: string
  kind: CombatMapMarkerKind
}

export const combatWorldMapLabels: readonly CombatWorldMapLabel[] = [
  { id: 'map-label.greenvale', sourceType: 'continent', sourceId: 'continent.greenvale', x: 42, y: 48, variant: 'continent' },
  { id: 'map-label.frostmarch', sourceType: 'continent', sourceId: 'continent.frostmarch', x: 77, y: 18, variant: 'continent' },
  { id: 'map-label.northwood', sourceType: 'region', sourceId: 'region.northwood', x: 41, y: 28, variant: 'region' },
  { id: 'map-label.southfen', sourceType: 'region', sourceId: 'region.southfen', x: 56, y: 72, variant: 'region' },
  { id: 'map-label.deep-woods', sourceType: 'area', sourceId: 'area.deep-woods', x: 24, y: 39, variant: 'area' },
  { id: 'map-label.old-road', sourceType: 'area', sourceId: 'area.old-road', x: 58, y: 42, variant: 'area' },
  { id: 'map-label.fen-edge', sourceType: 'area', sourceId: 'area.fen-edge', x: 61, y: 79, variant: 'area' },
]

export const combatWorldArenaMarkerLayouts: readonly CombatWorldArenaMarkerLayout[] = [
  { locationId: 'location.wolf-den', x: 27, y: 49, kind: 'normal' },
  { locationId: 'location.bandit-camp', x: 59, y: 51, kind: 'normal' },
]

export function mapLabelName(label: CombatWorldMapLabel) {
  if (label.sourceType === 'continent') return continentById[label.sourceId]?.name ?? label.sourceId
  if (label.sourceType === 'region') return regionById[label.sourceId]?.name ?? label.sourceId
  return areaById[label.sourceId]?.name ?? label.sourceId
}

export function mapLabelAvailability(label: CombatWorldMapLabel) {
  if (label.sourceType === 'continent') return continentById[label.sourceId]?.availability ?? 'locked'
  if (label.sourceType === 'region') return regionById[label.sourceId]?.availability ?? 'locked'
  return areaById[label.sourceId]?.availability ?? 'locked'
}

export function mapLabelRequiredMastery(label: CombatWorldMapLabel) {
  if (label.sourceType === 'continent') return 0
  if (label.sourceType === 'region') return regionById[label.sourceId]?.requiredMasteryLevel ?? 0
  return areaById[label.sourceId]?.requiredMasteryLevel ?? 0
}
