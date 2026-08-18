import { areaById } from '../../../../game/data/world/areas'
import { continentById, continentDefinitions } from '../../../../game/data/world/continents'
import { regionById } from '../../../../game/data/world/regions'
import { getAreasForRegion, getLocationsForArea, getRegionsForContinent } from '../../../../game/world/worldSelectors'
import { combatWorldMapAssetAspectRatios, combatWorldMapAssets } from './combatWorldMapAssets'
import type { CombatMapViewDefinition, CombatWorldMapLevel } from './combatWorldMapTypes'
import type { CombatMapNodeKind, CombatMapNodeLayout } from './combatWorldMapTypes'

const view = (definition: CombatMapViewDefinition) => definition
type MapPoint = Pick<CombatMapNodeLayout, 'x' | 'y'>

const worldPositions: Record<string, MapPoint> = {
  'continent.greenvale': { x: 30, y: 42 },
  'continent.frostmarch': { x: 55, y: 15 },
  'continent.emberreach': { x: 75, y: 39 },
  'continent.stormcoast': { x: 12, y: 61 },
  'continent.duskmoor': { x: 46, y: 79 },
}

const greenvaleRegionPositions: Record<string, MapPoint> = {
  'region.northwood': { x: 25, y: 23 },
  'region.greyspine-highlands': { x: 80, y: 25 },
  'region.westmere-coast': { x: 12, y: 55 },
  'region.crowmoor': { x: 45, y: 78 },
  'region.southfen': { x: 78, y: 78 },
}

const northwoodAreaPositions: Record<string, MapPoint> = {
  'area.deep-woods': { x: 23, y: 27 },
  'area.blackroot-hollow': { x: 74, y: 25 },
  'area.old-road': { x: 53, y: 50 },
  'area.thornwatch-glade': { x: 22, y: 77 },
  'area.hunters-crossing': { x: 76, y: 72 },
}

const southfenAreaPositions: Record<string, MapPoint> = {
  'area.fen-edge': { x: 27, y: 30 },
  'area.drowned-reeds': { x: 70, y: 25 },
  'area.mirewatch': { x: 42, y: 58 },
  'area.rotwater-crossing': { x: 74, y: 77 },
}

const arenaPositions: Record<string, MapPoint> = {
  'location.wolf-den': { x: 21, y: 22 },
  'location.bandit-camp': { x: 34, y: 23 },
}

function nodesFor<T extends { id: string }>(kind: CombatMapNodeKind, definitions: readonly T[], positions: Record<string, MapPoint>): CombatMapNodeLayout[] {
  return definitions.flatMap((definition) => {
    const position = positions[definition.id]
    return position ? [{ kind, sourceId: definition.id, ...position }] : []
  })
}

const worldNodes = nodesFor('continent', continentDefinitions, worldPositions)
const greenvaleRegionNodes = nodesFor('region', getRegionsForContinent('continent.greenvale'), greenvaleRegionPositions)
const northwoodAreaNodes = nodesFor('area', getAreasForRegion('region.northwood'), northwoodAreaPositions)
const southfenAreaNodes = nodesFor('area', getAreasForRegion('region.southfen'), southfenAreaPositions)

function arenaNodesFor(areaId: string) {
  return getLocationsForArea(areaId).flatMap((location) => {
    const position = arenaPositions[location.id]
    return position ? [{ kind: 'arena' as const, sourceId: location.id, ...position, markerKind: 'normal' as const }] : []
  })
}

export const combatMapViewRegistry: Record<string, CombatMapViewDefinition> = {
  world: view({ id: 'world', level: 'world', backgroundKey: 'world', backgroundAsset: combatWorldMapAssets.world, backgroundAspectRatio: combatWorldMapAssetAspectRatios.world, nodes: worldNodes }),
  'continent.greenvale': view({
    id: 'continent.greenvale', level: 'continent', parentId: 'world', sourceId: 'continent.greenvale', backgroundKey: 'greenvale', backgroundAsset: combatWorldMapAssets.greenvale, backgroundAspectRatio: combatWorldMapAssetAspectRatios.greenvale, nodes: greenvaleRegionNodes,
  }),
  'region.northwood': view({
    id: 'region.northwood', level: 'region', parentId: 'continent.greenvale', sourceId: 'region.northwood', backgroundKey: 'northwood', backgroundAsset: combatWorldMapAssets.northwood, backgroundAspectRatio: combatWorldMapAssetAspectRatios.northwood, nodes: northwoodAreaNodes,
  }),
  'region.southfen': view({
    id: 'region.southfen', level: 'region', parentId: 'continent.greenvale', sourceId: 'region.southfen', backgroundKey: 'southfen', nodes: southfenAreaNodes,
  }),
  'area.deep-woods': view({
    id: 'area.deep-woods', level: 'area', parentId: 'region.northwood', sourceId: 'area.deep-woods', backgroundKey: 'deep-woods', backgroundAsset: combatWorldMapAssets['deep-woods'], backgroundAspectRatio: combatWorldMapAssetAspectRatios['deep-woods'], nodes: arenaNodesFor('area.deep-woods'),
  }),
  'area.old-road': view({
    id: 'area.old-road', level: 'area', parentId: 'region.northwood', sourceId: 'area.old-road', backgroundKey: 'old-road', backgroundAsset: combatWorldMapAssets['old-road'], backgroundAspectRatio: combatWorldMapAssetAspectRatios['old-road'], nodes: arenaNodesFor('area.old-road'),
  }),
}

export function combatMapViewFor(id: string | undefined) {
  if (id && combatMapViewRegistry[id]) return combatMapViewRegistry[id]
  return combatMapViewRegistry.world
}

export function combatMapViewId(level: CombatWorldMapLevel, selectedContinentId: string, selectedRegionId: string, selectedAreaId: string) {
  if (level === 'world') return 'world'
  if (level === 'continent') return selectedContinentId
  if (level === 'region') return selectedRegionId
  return selectedAreaId
}

export function combatMapViewTitle(mapView: CombatMapViewDefinition) {
  if (!mapView.sourceId) return 'World Map'
  if (mapView.level === 'continent') return continentById[mapView.sourceId]?.name ?? 'Continent Map'
  if (mapView.level === 'region') return regionById[mapView.sourceId]?.name ?? 'Region Map'
  return areaById[mapView.sourceId]?.name ?? 'Area Map'
}

export function combatMapViewDescription(mapView: CombatMapViewDefinition) {
  if (!mapView.sourceId) return 'Choose a continent to begin browsing the world.'
  if (mapView.level === 'continent') return continentById[mapView.sourceId]?.description ?? 'Browse regions within this continent.'
  if (mapView.level === 'region') return regionById[mapView.sourceId]?.description ?? 'Browse areas within this region.'
  return areaById[mapView.sourceId]?.description ?? 'Choose a combat arena.'
}
