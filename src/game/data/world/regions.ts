import { deepFreeze } from '../freeze'
import type { RegionDefinition } from '../../world/worldTypes'

export const regionDefinitions = deepFreeze<RegionDefinition[]>([
  { id: 'region.northwood', continentId: 'continent.greenvale', name: 'Northwood', description: 'A forested northern region where predators and raiders compete for old trails.', areaIds: ['area.deep-woods', 'area.old-road'], availability: 'available', recommendedHunterRank: [1, 15], presentation: { accent: 'green', iconKey: 'map' } },
  { id: 'region.southfen', continentId: 'continent.greenvale', name: 'Southfen', description: 'Marshes, reedlands, mud roads, and flooded ruins wait beyond the starter route.', areaIds: ['area.fen-edge', 'area.drowned-reeds', 'area.mirewatch', 'area.rotwater-crossing'], availability: 'coming-soon', requiredHunterRank: 15, recommendedHunterRank: [15, 30], presentation: { accent: 'blue', iconKey: 'map' } },
  { id: 'region.greyspine-highlands', continentId: 'continent.greenvale', name: 'Greyspine Highlands', description: 'Rocky uplands, mountain foothills, ravines, and old mines rise along Greenvale\'s eastern rim.', areaIds: [], availability: 'locked', requiredHunterRank: 20, recommendedHunterRank: [20, 35], presentation: { accent: 'blue', iconKey: 'mountain' } },
  { id: 'region.westmere-coast', continentId: 'continent.greenvale', name: 'Westmere Coast', description: 'Salt marsh, cliffs, fishing villages, and broken piers line the western reach.', areaIds: [], availability: 'locked', requiredHunterRank: 20, recommendedHunterRank: [20, 35], presentation: { accent: 'blue', iconKey: 'map' } },
  { id: 'region.crowmoor', continentId: 'continent.greenvale', name: 'Crowmoor', description: 'Fogbound heathland and black pine conceal old barrows and ruined settlements.', areaIds: [], availability: 'locked', requiredHunterRank: 20, recommendedHunterRank: [20, 40], presentation: { accent: 'green', iconKey: 'trees' } },
])

export const regionById = Object.fromEntries(regionDefinitions.map((region) => [region.id, region])) as Record<string, RegionDefinition>
