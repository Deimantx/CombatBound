import { areaDefinitions } from '../../../../game/data/world/areas'
import { continentDefinitions } from '../../../../game/data/world/continents'
import { regionDefinitions } from '../../../../game/data/world/regions'
import { getAreasForRegion, getLocationsForArea, getRegionsForContinent } from '../../../../game/world/worldSelectors'
import { generateAtlasFallbackPositions } from './combatAtlasLayout'
import type { AtlasAccent, AtlasAtmosphere, AtlasIconKey, AtlasPoint, CombatAtlasConnection, CombatAtlasLevel, CombatAtlasNodeLayout, CombatAtlasViewDefinition } from './combatAtlasTypes'

type Presentation = { accent: AtlasAccent; icon: AtlasIconKey }

const worldPositions: Record<string, AtlasPoint> = {
  'continent.frostmarch': { x: 50, y: 15 },
  'continent.greenvale': { x: 25, y: 40 },
  'continent.emberreach': { x: 75, y: 40 },
  'continent.duskmoor': { x: 30, y: 77 },
  'continent.stormcoast': { x: 70, y: 77 },
}

const worldPresentation: Record<string, Presentation> = {
  'continent.greenvale': { accent: 'forest', icon: 'trees' },
  'continent.frostmarch': { accent: 'frost', icon: 'snowflake' },
  'continent.emberreach': { accent: 'ember', icon: 'flame' },
  'continent.stormcoast': { accent: 'storm', icon: 'waves' },
  'continent.duskmoor': { accent: 'moor', icon: 'moon' },
}

const greenvaleRegionPositions: Record<string, AtlasPoint> = {
  'region.northwood': { x: 50, y: 20 },
  'region.westmere-coast': { x: 18, y: 48 },
  'region.greyspine-highlands': { x: 82, y: 48 },
  'region.crowmoor': { x: 34, y: 78 },
  'region.southfen': { x: 66, y: 78 },
}

const greenvalePresentation: Record<string, Presentation> = {
  'region.northwood': { accent: 'forest', icon: 'trees' },
  'region.southfen': { accent: 'marsh', icon: 'waves' },
  'region.greyspine-highlands': { accent: 'highland', icon: 'mountain' },
  'region.westmere-coast': { accent: 'coast', icon: 'waves' },
  'region.crowmoor': { accent: 'moor', icon: 'moon' },
}

const northwoodAreaPositions: Record<string, AtlasPoint> = {
  'area.deep-woods': { x: 23, y: 24 },
  'area.blackroot-hollow': { x: 77, y: 24 },
  'area.old-road': { x: 50, y: 50 },
  'area.thornwatch-glade': { x: 24, y: 78 },
  'area.hunters-crossing': { x: 76, y: 78 },
}

const northwoodPresentation: Record<string, Presentation> = {
  'area.deep-woods': { accent: 'forest', icon: 'trees' },
  'area.blackroot-hollow': { accent: 'forest', icon: 'moon' },
  'area.old-road': { accent: 'road', icon: 'map' },
  'area.thornwatch-glade': { accent: 'forest', icon: 'trees' },
  'area.hunters-crossing': { accent: 'road', icon: 'pin' },
}

const southfenAreaPositions: Record<string, AtlasPoint> = {
  'area.fen-edge': { x: 25, y: 25 },
  'area.drowned-reeds': { x: 75, y: 25 },
  'area.mirewatch': { x: 50, y: 52 },
  'area.rotwater-crossing': { x: 50, y: 79 },
}

const arenaPositions: Record<string, AtlasPoint> = {
  'location.wolf-den': { x: 50, y: 44 },
  'location.bandit-camp': { x: 50, y: 44 },
}

function nodesFor<T extends { id: string }>(kind: CombatAtlasNodeLayout['kind'], definitions: readonly T[], positions: Record<string, AtlasPoint>, presentation: Record<string, Presentation>, fallbackAccent: AtlasAccent, fallbackIcon: AtlasIconKey): CombatAtlasNodeLayout[] {
  const fallbackPositions = generateAtlasFallbackPositions(definitions.length)
  return definitions.flatMap((definition, index) => {
    const position = positions[definition.id] ?? fallbackPositions[index]
    const visual = presentation[definition.id] ?? { accent: fallbackAccent, icon: fallbackIcon }
    return [{ sourceId: definition.id, kind, ...position, ...visual }]
  })
}

function arenaNodesFor(areaId: string) {
  const locations = getLocationsForArea(areaId)
  const fallbackPositions = generateAtlasFallbackPositions(locations.length)
  return locations.map((location, index) => ({
    sourceId: location.id,
    kind: 'arena' as const,
    ...(arenaPositions[location.id] ?? fallbackPositions[index]),
    accent: location.id === 'location.bandit-camp' ? 'road' as const : 'forest' as const,
    icon: 'swords' as const,
  }))
}

const worldConnections: readonly CombatAtlasConnection[] = [
  { from: 'continent.greenvale', to: 'continent.frostmarch', curve: -6 },
  { from: 'continent.greenvale', to: 'continent.duskmoor', curve: 6 },
  { from: 'continent.greenvale', to: 'continent.emberreach', curve: -5 },
  { from: 'continent.duskmoor', to: 'continent.stormcoast', curve: 4 },
  { from: 'continent.emberreach', to: 'continent.stormcoast', curve: -6 },
]

const greenvaleConnections: readonly CombatAtlasConnection[] = [
  { from: 'region.northwood', to: 'region.westmere-coast', curve: -5 },
  { from: 'region.northwood', to: 'region.greyspine-highlands', curve: 5 },
  { from: 'region.northwood', to: 'region.crowmoor', curve: 4 },
  { from: 'region.crowmoor', to: 'region.southfen', curve: -3 },
  { from: 'region.westmere-coast', to: 'region.crowmoor', curve: -4 },
  { from: 'region.greyspine-highlands', to: 'region.southfen', curve: 4 },
]

const northwoodConnections: readonly CombatAtlasConnection[] = [
  { from: 'area.deep-woods', to: 'area.old-road', curve: -5 },
  { from: 'area.deep-woods', to: 'area.blackroot-hollow', curve: 6 },
  { from: 'area.old-road', to: 'area.thornwatch-glade', curve: 5 },
  { from: 'area.old-road', to: 'area.hunters-crossing', curve: -5 },
  { from: 'area.blackroot-hollow', to: 'area.hunters-crossing', curve: 4 },
]

function areaDecorations(areaId: string) {
  if (areaId === 'area.deep-woods') return [
    { kind: 'route' as const, tone: 'forest' as const, points: [{ x: 16, y: 82 }, { x: 32, y: 68 }, { x: 37, y: 52 }, { x: 29, y: 37 }, { x: 50, y: 44 }] },
    { kind: 'ring' as const, x: 22, y: 25, radius: 11 },
    { kind: 'ring' as const, x: 74, y: 70, radius: 8 },
  ]
  if (areaId === 'area.old-road') return [
    { kind: 'route' as const, tone: 'road' as const, points: [{ x: 10, y: 76 }, { x: 25, y: 64 }, { x: 39, y: 58 }, { x: 57, y: 52 }, { x: 50, y: 44 }, { x: 87, y: 28 }] },
    { kind: 'ring' as const, x: 22, y: 32, radius: 9 },
  ]
  return []
}

function territoryView(id: string, level: 'world' | 'continent', sourceId: string | undefined, parentId: string | undefined, nodes: readonly CombatAtlasNodeLayout[], atmosphere: AtlasAtmosphere, connections: readonly CombatAtlasConnection[]) {
  return { id, level, sourceId, parentId, mode: 'territories' as const, atmosphere, nodes, connections }
}

const worldNodes = nodesFor('continent', continentDefinitions, worldPositions, worldPresentation, 'forest', 'globe')
const greenvaleRegionNodes = nodesFor('region', getRegionsForContinent('continent.greenvale'), greenvaleRegionPositions, greenvalePresentation, 'forest', 'map')
export const combatAtlasViewRegistry: Record<string, CombatAtlasViewDefinition> = {
  world: { id: 'world', level: 'world', mode: 'territories', atmosphere: 'world', nodes: worldNodes, connections: worldConnections },
  'continent.greenvale': territoryView('continent.greenvale', 'continent', 'continent.greenvale', 'world', greenvaleRegionNodes, 'forest', greenvaleConnections),
}

for (const continent of continentDefinitions) {
  if (continent.id === 'continent.greenvale') continue
  const nodes = nodesFor('region', getRegionsForContinent(continent.id), {}, {}, 'forest', 'map')
  combatAtlasViewRegistry[continent.id] = territoryView(continent.id, 'continent', continent.id, 'world', nodes, 'world', [])
}

for (const region of regionDefinitions) {
  const positions = region.id === 'region.northwood' ? northwoodAreaPositions : region.id === 'region.southfen' ? southfenAreaPositions : {}
  const presentation = region.id === 'region.northwood' ? northwoodPresentation : {}
  const nodes = nodesFor('area', getAreasForRegion(region.id), positions, presentation, region.id === 'region.southfen' ? 'marsh' : 'forest', 'map')
  combatAtlasViewRegistry[region.id] = {
    id: region.id,
    level: 'region',
    parentId: region.continentId,
    sourceId: region.id,
    mode: 'constellation',
    atmosphere: region.id === 'region.southfen' ? 'marsh' : 'forest',
    nodes,
    connections: region.id === 'region.northwood' ? northwoodConnections : [],
  }
}

for (const area of areaDefinitions) {
  combatAtlasViewRegistry[area.id] = {
    id: area.id,
    level: 'area',
    parentId: area.regionId,
    sourceId: area.id,
    mode: 'arenas',
    atmosphere: area.id === 'area.old-road' ? 'road' : area.regionId === 'region.southfen' ? 'marsh' : 'forest',
    nodes: arenaNodesFor(area.id),
    decorations: areaDecorations(area.id),
  }
}

export function combatAtlasViewFor(id: string | undefined) {
  if (id && combatAtlasViewRegistry[id]) return combatAtlasViewRegistry[id]
  return combatAtlasViewRegistry.world
}

export function combatAtlasViewId(level: CombatAtlasLevel, selectedContinentId: string, selectedRegionId: string, selectedAreaId: string) {
  if (level === 'world') return 'world'
  if (level === 'continent') return selectedContinentId
  if (level === 'region') return selectedRegionId
  return selectedAreaId
}

export function combatAtlasViewTitle(view: CombatAtlasViewDefinition) {
  if (!view.sourceId) return 'World Map'
  if (view.level === 'continent') return continentDefinitions.find((entry) => entry.id === view.sourceId)?.name ?? 'Continent Map'
  if (view.level === 'region') return regionDefinitions.find((entry) => entry.id === view.sourceId)?.name ?? 'Region Map'
  return areaDefinitions.find((entry) => entry.id === view.sourceId)?.name ?? 'Area Map'
}

export function combatAtlasViewDescription(view: CombatAtlasViewDefinition) {
  if (!view.sourceId) return 'Choose a continent to begin browsing the world.'
  if (view.level === 'continent') return `Choose a region within ${combatAtlasViewTitle(view)}.`
  if (view.level === 'region') return `Choose an area within ${combatAtlasViewTitle(view)}.`
  return 'Choose a combat arena.'
}
