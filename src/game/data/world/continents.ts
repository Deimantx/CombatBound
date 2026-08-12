import { deepFreeze } from '../freeze'
import type { ContinentDefinition } from '../../world/worldTypes'

export const continentDefinitions = deepFreeze<ContinentDefinition[]>([
  { id: 'continent.greenvale', name: 'Greenvale', description: 'A broad frontier of forests, old roads, and unsettled hunting grounds.', regionIds: ['region.northwood', 'region.southfen'], availability: 'available', recommendedCombatLevel: [1, 20], presentation: { accent: 'green', iconKey: 'globe' } },
  { id: 'continent.frostmarch', name: 'Frostmarch', description: 'A distant frozen frontier beyond the current hunting route.', regionIds: [], availability: 'locked', recommendedCombatLevel: [20, 40], presentation: { accent: 'blue', iconKey: 'mountain' } },
])

export const continentById = Object.fromEntries(continentDefinitions.map((continent) => [continent.id, continent])) as Record<string, ContinentDefinition>
