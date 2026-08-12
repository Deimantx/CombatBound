import { areaById, areaDefinitions } from '../data/world/areas'
import { combatLocationById, combatLocationDefinitions } from '../data/world/combatLocations'
import { continentById, continentDefinitions } from '../data/world/continents'
import { regionById, regionDefinitions } from '../data/world/regions'
import { subAreaById, subAreaDefinitions } from '../data/world/subAreas'
import type { WorldSelection } from './worldTypes'

export const getRegionsForContinent = (continentId: string) => regionDefinitions.filter((region) => region.continentId === continentId)
export const getAreasForRegion = (regionId: string) => areaDefinitions.filter((area) => area.regionId === regionId)
export const getSubAreasForArea = (areaId: string) => subAreaDefinitions.filter((subArea) => subArea.areaId === areaId)
export const getLocationsForSubArea = (subAreaId: string) => combatLocationDefinitions.filter((location) => location.subAreaId === subAreaId)
export const getSubAreaForCombatLocation = (locationId: string) => { const location = combatLocationById[locationId]; return location ? subAreaById[location.subAreaId] : undefined }
export const getAreaForSubArea = (subAreaId: string) => { const subArea = subAreaById[subAreaId]; return subArea ? areaById[subArea.areaId] : undefined }
export const getRegionForArea = (areaId: string) => { const area = areaById[areaId]; return area ? regionById[area.regionId] : undefined }
export const getContinentForRegion = (regionId: string) => { const region = regionById[regionId]; return region ? continentById[region.continentId] : undefined }
export const getCombatLocationBreadcrumb = locationBreadcrumb

export function getDefaultWorldSelection(): WorldSelection {
  const continent = continentDefinitions.find((candidate) => candidate.availability === 'available') ?? continentDefinitions[0]
  const region = getRegionsForContinent(continent.id)[0] ?? regionDefinitions[0]
  const area = getAreasForRegion(region.id)[0] ?? areaDefinitions[0]
  const subArea = getSubAreasForArea(area.id)[0] ?? subAreaDefinitions[0]
  const location = getLocationsForSubArea(subArea.id)[0] ?? combatLocationDefinitions[0]
  return { continentId: continent.id, regionId: region.id, areaId: area.id, subAreaId: subArea.id, combatLocationId: location.id }
}

export function selectionForLocation(locationId: string, fallback = getDefaultWorldSelection()): WorldSelection {
  const location = combatLocationById[locationId]
  const subArea = location ? subAreaById[location.subAreaId] : undefined
  const area = subArea ? areaById[subArea.areaId] : undefined
  const region = area ? regionById[area.regionId] : undefined
  const continent = region ? continentById[region.continentId] : undefined
  return continent && region && area && subArea && location ? { continentId: continent.id, regionId: region.id, areaId: area.id, subAreaId: subArea.id, combatLocationId: location.id } : fallback
}

export function cascadeSelection(selection: Partial<WorldSelection>): WorldSelection {
  const fallback = getDefaultWorldSelection()
  const continent = continentById[selection.continentId ?? ''] ?? continentById[fallback.continentId]
  const region = getRegionsForContinent(continent.id).find((candidate) => candidate.id === selection.regionId) ?? getRegionsForContinent(continent.id)[0] ?? regionById[fallback.regionId]
  const area = getAreasForRegion(region.id).find((candidate) => candidate.id === selection.areaId) ?? getAreasForRegion(region.id)[0] ?? areaById[fallback.areaId]
  const subArea = getSubAreasForArea(area.id).find((candidate) => candidate.id === selection.subAreaId) ?? getSubAreasForArea(area.id)[0] ?? subAreaById[fallback.subAreaId]
  const location = getLocationsForSubArea(subArea.id).find((candidate) => candidate.id === selection.combatLocationId) ?? getLocationsForSubArea(subArea.id)[0] ?? combatLocationById[fallback.combatLocationId]
  return { continentId: continent.id, regionId: region.id, areaId: area.id, subAreaId: subArea.id, combatLocationId: location.id }
}

export function isWorldNodeAvailable(availability: string | undefined, requiredCombatLevel: number | undefined, totalCombatLevel: number) {
  return availability === 'available' && (requiredCombatLevel ?? 0) <= totalCombatLevel
}

export function isCombatLocationAvailable(locationId: string, totalCombatLevel: number) {
  const location = combatLocationById[locationId]
  if (!location) return false
  const subArea = subAreaById[location.subAreaId]
  const area = subArea && areaById[subArea.areaId]
  const region = area && regionById[area.regionId]
  const continent = region && continentById[region.continentId]
  return Boolean(continent && region && area && subArea && isWorldNodeAvailable(continent.availability, undefined, totalCombatLevel) && isWorldNodeAvailable(region.availability, region.requiredCombatLevel, totalCombatLevel) && isWorldNodeAvailable(area.availability, area.requiredCombatLevel, totalCombatLevel) && isWorldNodeAvailable(subArea.availability, subArea.requiredCombatLevel, totalCombatLevel) && isWorldNodeAvailable(location.availability, location.requiredCombatLevel, totalCombatLevel))
}

export function worldBreadcrumb(selection: WorldSelection) {
  return [continentById[selection.continentId]?.name, regionById[selection.regionId]?.name, areaById[selection.areaId]?.name, subAreaById[selection.subAreaId]?.name, combatLocationById[selection.combatLocationId]?.name].filter(Boolean).join(' · ')
}

export function locationBreadcrumb(locationId: string) { return worldBreadcrumb(selectionForLocation(locationId)) }
export function locationParentBreadcrumb(locationId: string) {
  const selection = selectionForLocation(locationId)
  return [continentById[selection.continentId]?.name, regionById[selection.regionId]?.name, areaById[selection.areaId]?.name, subAreaById[selection.subAreaId]?.name].filter(Boolean).join(' · ')
}
