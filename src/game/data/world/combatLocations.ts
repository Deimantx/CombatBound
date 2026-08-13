import { deepFreeze } from '../freeze'
import type { CombatLocationDefinition } from '../../world/worldTypes'

export const combatLocationDefinitions = deepFreeze<CombatLocationDefinition[]>([
  {
    id: 'location.wolf-den', areaId: 'area.deep-woods', name: 'Wolf Den', description: 'A territorial den with a shifting population of hunters and pack bruisers.', familyId: 'family.wolves', availability: 'available', requiredMasteryLevel: 1, recommendedMasteryLevel: [1, 10], presentation: { accent: 'green', iconKey: 'target' },
    enemyPool: [
      { enemyId: 'enemy.grey-wolf', weight: 62, role: 'common', minCopiesPerGroup: 1 },
      { enemyId: 'enemy.wolf-stalker', weight: 25, role: 'support', maxCopiesPerGroup: 1 },
      { enemyId: 'enemy.wolf-ravager', weight: 10, role: 'dangerous', maxCopiesPerGroup: 1 },
      { enemyId: 'enemy.alpha-wolf', weight: 3, role: 'elite', maxCopiesPerGroup: 1, minMasteryLevel: 5 },
    ],
    groupGeneration: { minGroupSize: 1, maxGroupSize: 3, allowDuplicateEnemyTypes: true, minimumDistinctTypes: 1, generationMode: 'weighted-random' },
    sharedLoot: [{ itemId: 'item.wolf-pelt', chance: 0.2, minQuantity: 1, maxQuantity: 1 }],
  },
  {
    id: 'location.bandit-camp', areaId: 'area.old-road', name: 'Bandit Camp', description: 'A guarded camp where scouts, archers, and veteran raiders rotate through the road.', familyId: 'family.bandits', availability: 'available', requiredMasteryLevel: 2, recommendedMasteryLevel: [2, 14], presentation: { accent: 'gold', iconKey: 'tent' },
    enemyPool: [
      { enemyId: 'enemy.forest-bandit', weight: 55, role: 'common', minCopiesPerGroup: 1 },
      { enemyId: 'enemy.bandit-archer', weight: 25, role: 'support', maxCopiesPerGroup: 1 },
      { enemyId: 'enemy.bandit-scout', weight: 17, role: 'dangerous', maxCopiesPerGroup: 1 },
      { enemyId: 'enemy.bandit-captain', weight: 3, role: 'elite', maxCopiesPerGroup: 1, minMasteryLevel: 8 },
    ],
    groupGeneration: { minGroupSize: 2, maxGroupSize: 4, allowDuplicateEnemyTypes: true, minimumDistinctTypes: 2, generationMode: 'weighted-random' },
    sharedLoot: [{ itemId: 'item.bandit-scrap', chance: 0.25, minQuantity: 1, maxQuantity: 2 }],
  },
])

export const combatLocationById = Object.fromEntries(combatLocationDefinitions.map((location) => [location.id, location])) as Record<string, CombatLocationDefinition>
