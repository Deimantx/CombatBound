import { deepFreeze } from '../freeze'
import type { AreaDefinition } from '../../world/worldTypes'

export const areaDefinitions = deepFreeze<AreaDefinition[]>([
  { id: 'area.greenvale-forest', regionId: 'region.northwood', name: 'Greenvale Forest', description: 'Deep cover, game trails, and dens hidden beneath the canopy.', subAreaIds: ['subarea.deep-woods'], availability: 'available', recommendedCombatLevel: [1, 10], presentation: { accent: 'green', iconKey: 'trees' } },
  { id: 'area.frontier-road', regionId: 'region.northwood', name: 'Frontier Road', description: 'A weathered road connecting abandoned farms and bandit camps.', subAreaIds: ['subarea.old-road'], availability: 'available', requiredCombatLevel: 2, recommendedCombatLevel: [2, 14], presentation: { accent: 'gold', iconKey: 'map' } },
  { id: 'area.fen-edge', regionId: 'region.southfen', name: 'Fen Edge', description: 'The first visible edge of the Southfen marshlands.', subAreaIds: [], availability: 'locked', requiredCombatLevel: 15, recommendedCombatLevel: [15, 25], presentation: { accent: 'blue', iconKey: 'mountain' } },
])

export const areaById = Object.fromEntries(areaDefinitions.map((area) => [area.id, area])) as Record<string, AreaDefinition>
