import { enemyById } from '../data/enemies'
import { itemById } from '../data/items'
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
    if (location.targets.length === 0) errors.push(`Location ${location.id} must expose at least one target`)
    if (new Set(location.targets.map((entry) => entry.enemyId)).size !== location.targets.length) errors.push(`Location ${location.id} contains duplicate targets`)
    if (location.areaId === 'area.deep-woods' && location.targets.length !== 4) errors.push(`Deep Woods location ${location.id} must contain exactly four targets`)
    for (const entry of location.targets) {
      if (!enemyById[entry.enemyId]) errors.push(`Location ${location.id} references missing enemy ${entry.enemyId}`)
      else if (enemyById[entry.enemyId].familyId !== location.familyId) errors.push(`Location ${location.id} mixes enemy family ${entry.enemyId}`)
      for (const drop of enemyById[entry.enemyId]?.loot ?? []) {
        if (!Number.isFinite(drop.chance) || drop.chance < 0 || drop.chance > 1) errors.push(`Enemy ${entry.enemyId} has invalid loot chance`)
        if (!Number.isInteger(drop.minQuantity) || !Number.isInteger(drop.maxQuantity) || drop.minQuantity < 1 || drop.maxQuantity < drop.minQuantity) errors.push(`Enemy ${entry.enemyId} has invalid loot quantity`)
        if (!itemById[drop.itemId]) errors.push(`Enemy ${entry.enemyId} references missing loot item ${drop.itemId}`)
      }
    }
    if (location.sharedLoot) for (const drop of location.sharedLoot) {
      if (!Number.isFinite(drop.chance) || drop.chance < 0 || drop.chance > 1) errors.push(`Location ${location.id} has invalid shared loot chance`)
      if (!Number.isInteger(drop.minQuantity) || !Number.isInteger(drop.maxQuantity) || drop.minQuantity < 1 || drop.maxQuantity < drop.minQuantity) errors.push(`Location ${location.id} has invalid shared loot quantity`)
      if (!itemById[drop.itemId]) errors.push(`Location ${location.id} references missing shared loot item ${drop.itemId}`)
      for (const [enemyId, range] of Object.entries(drop.targetQuantityOverrides ?? {})) {
        if (!location.targets.some((target) => target.enemyId === enemyId)) errors.push(`Location ${location.id} has quantity override for non-target ${enemyId}`)
        if (!Number.isInteger(range.minQuantity) || !Number.isInteger(range.maxQuantity) || range.minQuantity < 1 || range.maxQuantity < range.minQuantity) errors.push(`Location ${location.id} has invalid quantity override for ${enemyId}`)
      }
    }
  }
  return errors
}
