import type { LucideIcon } from 'lucide-react'
import { CloudFog, Flame, Globe2, Map, MapPin, Mountain, Snowflake, Swords, Target, Tent, Trees, Waves, Moon } from 'lucide-react'
import { areaById } from '../../../../game/data/world/areas'
import { combatLocationById } from '../../../../game/data/world/combatLocations'
import { continentById } from '../../../../game/data/world/continents'
import { regionById } from '../../../../game/data/world/regions'
import { getAreasForRegion, getLocationsForArea, getRegionsForContinent, isCombatLocationAvailable, isWorldNodeAvailable } from '../../../../game/world/worldSelectors'
import type { ContentAvailability } from '../../../../game/world/worldTypes'
import type { AtlasIconKey, CombatAtlasNodeLayout } from './combatAtlasTypes'

export interface CombatAtlasNodeDetails {
  name: string
  description: string
  availability: ContentAvailability
  available: boolean
  requiredMasteryLevel?: number
  recommendedMasteryLevel?: [number, number]
  childCount?: number
  childLabel?: 'Regions' | 'Areas' | 'Arenas'
}

export const atlasIconByKey: Record<AtlasIconKey, LucideIcon> = {
  globe: Globe2,
  map: Map,
  mountain: Mountain,
  trees: Trees,
  pin: MapPin,
  target: Target,
  tent: Tent,
  shield: CloudFog,
  snowflake: Snowflake,
  flame: Flame,
  waves: Waves,
  moon: Moon,
  swords: Swords,
}

export function combatAtlasNodeDetails(node: CombatAtlasNodeLayout, masteryLevel: number): CombatAtlasNodeDetails {
  if (node.kind === 'continent') {
    const definition = continentById[node.sourceId]
    return {
      name: definition?.name ?? node.sourceId,
      description: definition?.description ?? 'A distant territory in the CombatBound frontier.',
      availability: definition?.availability ?? 'locked',
      available: isWorldNodeAvailable(definition?.availability, undefined, masteryLevel),
      recommendedMasteryLevel: definition?.recommendedMasteryLevel,
      childCount: definition ? getRegionsForContinent(definition.id).length : undefined,
      childLabel: 'Regions',
    }
  }

  if (node.kind === 'region') {
    const definition = regionById[node.sourceId]
    return {
      name: definition?.name ?? node.sourceId,
      description: definition?.description ?? 'A region waiting to be charted.',
      availability: definition?.availability ?? 'locked',
      available: isWorldNodeAvailable(definition?.availability, definition?.requiredMasteryLevel, masteryLevel),
      requiredMasteryLevel: definition?.requiredMasteryLevel,
      recommendedMasteryLevel: definition?.recommendedMasteryLevel,
      childCount: definition ? getAreasForRegion(definition.id).length : undefined,
      childLabel: 'Areas',
    }
  }

  if (node.kind === 'area') {
    const definition = areaById[node.sourceId]
    return {
      name: definition?.name ?? node.sourceId,
      description: definition?.description ?? 'A combat area waiting to be charted.',
      availability: definition?.availability ?? 'locked',
      available: isWorldNodeAvailable(definition?.availability, definition?.requiredMasteryLevel, masteryLevel),
      requiredMasteryLevel: definition?.requiredMasteryLevel,
      recommendedMasteryLevel: definition?.recommendedMasteryLevel,
      childCount: definition ? getLocationsForArea(definition.id).length : undefined,
      childLabel: 'Arenas',
    }
  }

  const definition = combatLocationById[node.sourceId]
  return {
    name: definition?.name ?? node.sourceId,
    description: definition?.description ?? 'A combat destination waiting to be discovered.',
    availability: definition?.availability ?? 'locked',
    available: isCombatLocationAvailable(node.sourceId, masteryLevel),
    requiredMasteryLevel: definition?.requiredMasteryLevel,
    recommendedMasteryLevel: definition?.recommendedMasteryLevel,
  }
}

export function atlasStatusLabel(details: CombatAtlasNodeDetails, selected: boolean, active: boolean) {
  if (active) return 'ACTIVE'
  if (selected) return 'SELECTED'
  if (details.available) return 'AVAILABLE'
  return details.availability === 'coming-soon' ? 'COMING SOON' : 'LOCKED'
}
