import { deepFreeze } from '../freeze'
import type { RegionDefinition } from '../../world/worldTypes'

export const regionDefinitions = deepFreeze<RegionDefinition[]>([
  { id: 'region.northwood', continentId: 'continent.greenvale', name: 'Northwood', description: 'A forested northern region where predators and raiders compete for old trails.', areaIds: ['area.greenvale-forest', 'area.frontier-road'], availability: 'available', recommendedCombatLevel: [1, 15], presentation: { accent: 'green', iconKey: 'map' } },
  { id: 'region.southfen', continentId: 'continent.greenvale', name: 'Southfen', description: 'Marsh country reserved for a later hunting phase.', areaIds: ['area.fen-edge'], availability: 'coming-soon', requiredCombatLevel: 15, recommendedCombatLevel: [15, 30], presentation: { accent: 'blue', iconKey: 'map' } },
])

export const regionById = Object.fromEntries(regionDefinitions.map((region) => [region.id, region])) as Record<string, RegionDefinition>
