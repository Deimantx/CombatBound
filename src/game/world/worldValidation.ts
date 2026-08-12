import { enemyById } from '../data/enemies'
import { areaById, areaDefinitions } from '../data/world/areas'
import { combatLocationById, combatLocationDefinitions } from '../data/world/combatLocations'
import { continentById, continentDefinitions } from '../data/world/continents'
import { enemyFamilyById } from '../data/world/enemyFamilies'
import { regionById, regionDefinitions } from '../data/world/regions'

export function validateWorldContent() {
  const errors: string[] = []
  const unique = (ids: string[], label: string) => { if (new Set(ids).size !== ids.length) errors.push(`${label} contains duplicate IDs`) }
  unique(continentDefinitions.map((node) => node.id), 'continents')
  unique(regionDefinitions.map((node) => node.id), 'regions')
  unique(areaDefinitions.map((node) => node.id), 'areas')
  unique(combatLocationDefinitions.map((node) => node.id), 'combat locations')
  for (const region of regionDefinitions) {
    if (!continentById[region.continentId]) errors.push(`Region ${region.id} has no continent`)
    else if (!continentById[region.continentId].regionIds.includes(region.id)) errors.push(`Continent ${region.continentId} is missing region ${region.id}`)
    for (const areaId of region.areaIds) if (!areaById[areaId] || areaById[areaId].regionId !== region.id) errors.push(`Region ${region.id} has invalid area ${areaId}`)
  }
  for (const area of areaDefinitions) {
    if (!regionById[area.regionId]) errors.push(`Area ${area.id} has no region`)
    for (const locationId of area.combatLocationIds) if (!combatLocationById[locationId] || combatLocationById[locationId].areaId !== area.id) errors.push(`Area ${area.id} has invalid location ${locationId}`)
  }
  for (const location of combatLocationDefinitions) {
    if (!areaById[location.areaId]) errors.push(`Location ${location.id} has no area`)
    if (!enemyFamilyById[location.familyId]) errors.push(`Location ${location.id} has no family`)
    if (location.enemyPool.length < 3 || location.enemyPool.length > 5) errors.push(`Location ${location.id} should have 3-5 enemy definitions`)
    if (location.groupGeneration.minGroupSize > location.groupGeneration.maxGroupSize) errors.push(`Location ${location.id} has invalid group size range`)
    for (const entry of location.enemyPool) {
      if (!enemyById[entry.enemyId]) errors.push(`Location ${location.id} references missing enemy ${entry.enemyId}`)
      else if (enemyById[entry.enemyId].familyId !== location.familyId) errors.push(`Location ${location.id} mixes enemy family ${entry.enemyId}`)
      if (entry.weight <= 0) errors.push(`Location ${location.id} has non-positive weight`)
      if (entry.minCopiesPerGroup && entry.maxCopiesPerGroup && entry.minCopiesPerGroup > entry.maxCopiesPerGroup) errors.push(`Location ${location.id} has invalid copy range`)
      if ((entry.minCopiesPerGroup ?? 0) > location.groupGeneration.maxGroupSize) errors.push(`Location ${location.id} requires more copies than its maximum group size`)
    }
  }
  return errors
}
