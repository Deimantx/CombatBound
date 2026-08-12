import { deepFreeze } from '../freeze'
import type { AreaDefinition } from '../../world/worldTypes'

export const areaDefinitions = deepFreeze<AreaDefinition[]>([
  { id: 'area.deep-woods', regionId: 'region.northwood', name: 'Deep Woods', description: 'A shadowed stretch of forest where wolf packs gather.', combatLocationIds: ['location.wolf-den'], availability: 'available', recommendedCombatLevel: [1, 10], presentation: { accent: 'green', iconKey: 'mountain' } },
  { id: 'area.old-road', regionId: 'region.northwood', name: 'Old Road', description: 'Broken milestones mark the approach to a fortified bandit camp.', combatLocationIds: ['location.bandit-camp'], availability: 'available', requiredCombatLevel: 2, recommendedCombatLevel: [2, 14], presentation: { accent: 'gold', iconKey: 'pin' } },
  { id: 'area.fen-edge', regionId: 'region.southfen', name: 'Fen Edge', description: 'The first visible edge of the Southfen marshlands.', combatLocationIds: [], availability: 'locked', requiredCombatLevel: 15, recommendedCombatLevel: [15, 25], presentation: { accent: 'blue', iconKey: 'mountain' } },
])

export const areaById = Object.fromEntries(areaDefinitions.map((area) => [area.id, area])) as Record<string, AreaDefinition>
