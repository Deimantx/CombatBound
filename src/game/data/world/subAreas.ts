import { deepFreeze } from '../freeze'
import type { SubAreaDefinition } from '../../world/worldTypes'

export const subAreaDefinitions = deepFreeze<SubAreaDefinition[]>([
  { id: 'subarea.deep-woods', areaId: 'area.greenvale-forest', name: 'Deep Woods', description: 'A shadowed stretch of forest where wolf packs gather.', combatLocationIds: ['location.wolf-den'], availability: 'available', recommendedCombatLevel: [1, 10], presentation: { accent: 'green', iconKey: 'mountain' } },
  { id: 'subarea.old-road', areaId: 'area.frontier-road', name: 'Old Road', description: 'Broken milestones mark the approach to a fortified bandit camp.', combatLocationIds: ['location.bandit-camp'], availability: 'available', requiredCombatLevel: 2, recommendedCombatLevel: [2, 14], presentation: { accent: 'gold', iconKey: 'pin' } },
])

export const subAreaById = Object.fromEntries(subAreaDefinitions.map((subArea) => [subArea.id, subArea])) as Record<string, SubAreaDefinition>
