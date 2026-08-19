import { deepFreeze } from '../freeze'
import type { ContinentDefinition } from '../../world/worldTypes'

export const continentDefinitions = deepFreeze<ContinentDefinition[]>([
  { id: 'continent.greenvale', name: 'Greenvale', description: 'A temperate frontier of forests, old roads, marshes, coast, and highlands.', regionIds: ['region.northwood', 'region.southfen', 'region.greyspine-highlands', 'region.westmere-coast', 'region.crowmoor'], availability: 'available', recommendedHunterRank: [1, 20], presentation: { accent: 'green', iconKey: 'globe' } },
  { id: 'continent.frostmarch', name: 'Frostmarch', description: 'A distant frozen frontier beyond the current hunting route.', regionIds: [], availability: 'locked', recommendedHunterRank: [20, 40], presentation: { accent: 'blue', iconKey: 'mountain' } },
  { id: 'continent.emberreach', name: 'Emberreach', description: 'Ash plains, red rock, and volcanic ridges surround ruined fortresses.', regionIds: [], availability: 'coming-soon', recommendedHunterRank: [25, 45], presentation: { accent: 'red', iconKey: 'mountain' } },
  { id: 'continent.stormcoast', name: 'Stormcoast', description: 'Storm beaches, sea caves, and wet highlands face the open ocean.', regionIds: [], availability: 'coming-soon', recommendedHunterRank: [30, 50], presentation: { accent: 'blue', iconKey: 'map' } },
  { id: 'continent.duskmoor', name: 'Duskmoor', description: 'Dead forests, black marshes, and ancient barrows fade into the east.', regionIds: [], availability: 'coming-soon', recommendedHunterRank: [35, 55], presentation: { accent: 'green', iconKey: 'trees' } },
])

export const continentById = Object.fromEntries(continentDefinitions.map((continent) => [continent.id, continent])) as Record<string, ContinentDefinition>
