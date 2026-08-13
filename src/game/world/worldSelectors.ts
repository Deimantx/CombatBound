import { areaById, areaDefinitions } from '../data/world/areas'
import { combatLocationById, combatLocationDefinitions } from '../data/world/combatLocations'
import { continentById, continentDefinitions } from '../data/world/continents'
import { regionById, regionDefinitions } from '../data/world/regions'
import type { WorldSelection } from './worldTypes'

export const getRegionsForContinent = (continentId: string) => regionDefinitions.filter((region) => region.continentId === continentId)
export const getAreasForRegion = (regionId: string) => areaDefinitions.filter((area) => area.regionId === regionId)
export const getLocationsForArea = (areaId: string) => combatLocationDefinitions.filter((location) => location.areaId === areaId)
export const getAreaForCombatLocation = (locationId: string) => { const location = combatLocationById[locationId]; return location ? areaById[location.areaId] : undefined }
export const getRegionForArea = (areaId: string) => { const area = areaById[areaId]; return area ? regionById[area.regionId] : undefined }
export const getContinentForRegion = (regionId: string) => { const region = regionById[regionId]; return region ? continentById[region.continentId] : undefined }
export const getCombatLocationBreadcrumb = locationBreadcrumb

export function getDefaultWorldSelection(): WorldSelection {
  const continent = continentDefinitions.find((candidate) => candidate.availability === 'available') ?? continentDefinitions[0]
  const region = getRegionsForContinent(continent.id)[0] ?? regionDefinitions[0]
  const area = getAreasForRegion(region.id)[0] ?? areaDefinitions[0]
  const location = getLocationsForArea(area.id)[0] ?? combatLocationDefinitions[0]
  return { continentId: continent.id, regionId: region.id, areaId: area.id, combatLocationId: location.id }
}

export function selectionForLocation(locationId: string, fallback = getDefaultWorldSelection()): WorldSelection {
  const location = combatLocationById[locationId]
  const area = location ? areaById[location.areaId] : undefined
  const region = area ? regionById[area.regionId] : undefined
  const continent = region ? continentById[region.continentId] : undefined
  return continent && region && area && location ? { continentId: continent.id, regionId: region.id, areaId: area.id, combatLocationId: location.id } : fallback
}

export function cascadeSelection(selection: Partial<WorldSelection>): WorldSelection {
  const fallback = getDefaultWorldSelection()
  const continent = continentById[selection.continentId ?? ''] ?? continentById[fallback.continentId]
  const region = getRegionsForContinent(continent.id).find((candidate) => candidate.id === selection.regionId) ?? getRegionsForContinent(continent.id)[0] ?? regionById[fallback.regionId]
  const area = getAreasForRegion(region.id).find((candidate) => candidate.id === selection.areaId) ?? getAreasForRegion(region.id)[0] ?? areaById[fallback.areaId]
  const location = getLocationsForArea(area.id).find((candidate) => candidate.id === selection.combatLocationId) ?? getLocationsForArea(area.id)[0] ?? combatLocationById[fallback.combatLocationId]
  return { continentId: continent.id, regionId: region.id, areaId: area.id, combatLocationId: location.id }
}

export function isWorldNodeAvailable(availability: string | undefined, requiredMasteryLevel: number | undefined, masteryLevel: number) {
  return availability === 'available' && (requiredMasteryLevel ?? 0) <= masteryLevel
}

export function isCombatLocationAvailable(locationId: string, masteryLevel: number) {
  const location = combatLocationById[locationId]
  if (!location) return false
  const area = areaById[location.areaId]
  const region = area && regionById[area.regionId]
  const continent = region && continentById[region.continentId]
  return Boolean(continent && region && area && isWorldNodeAvailable(continent.availability, undefined, masteryLevel) && isWorldNodeAvailable(region.availability, region.requiredMasteryLevel, masteryLevel) && isWorldNodeAvailable(area.availability, area.requiredMasteryLevel, masteryLevel) && isWorldNodeAvailable(location.availability, location.requiredMasteryLevel, masteryLevel))
}

export function worldBreadcrumb(selection: WorldSelection) {
  return [continentById[selection.continentId]?.name, regionById[selection.regionId]?.name, areaById[selection.areaId]?.name, combatLocationById[selection.combatLocationId]?.name].filter(Boolean).join(' · ')
}

export function locationBreadcrumb(locationId: string) { return worldBreadcrumb(selectionForLocation(locationId)) }
export function locationParentBreadcrumb(locationId: string) {
  const selection = selectionForLocation(locationId)
  return [continentById[selection.continentId]?.name, regionById[selection.regionId]?.name, areaById[selection.areaId]?.name].filter(Boolean).join(' · ')
}
