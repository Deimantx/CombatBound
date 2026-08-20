import { deepFreeze } from '../freeze'
import type { CombatLocationDefinition } from '../../world/worldTypes'

export const combatLocationDefinitions = deepFreeze<CombatLocationDefinition[]>([
  {
    id: 'location.wolf-den', areaId: 'area.deep-woods', name: 'Wolf Den', description: 'A territorial den with a shifting population of hunters and pack bruisers.', familyId: 'family.wolves', availability: 'available', requiredHunterRank: 1, recommendedHunterRank: [1, 10], presentation: { accent: 'green', iconKey: 'target' },
    targets: [
      { enemyId: 'enemy.grey-wolf' },
      { enemyId: 'enemy.wolf-stalker' },
      { enemyId: 'enemy.wolf-ravager' },
      { enemyId: 'enemy.alpha-wolf', minHunterRank: 5 },
    ],
    sharedLoot: [{ itemId: 'item.wolf-pelt', chance: 0.2, minQuantity: 1, maxQuantity: 1 }],
  },
  {
    id: 'location.bandit-camp', areaId: 'area.old-road', name: 'Bandit Camp', description: 'A guarded camp where scouts, archers, and veteran raiders rotate through the road.', familyId: 'family.bandits', availability: 'available', requiredHunterRank: 2, recommendedHunterRank: [2, 14], presentation: { accent: 'gold', iconKey: 'tent' },
    targets: [
      { enemyId: 'enemy.forest-bandit' },
      { enemyId: 'enemy.bandit-archer' },
      { enemyId: 'enemy.bandit-scout' },
      { enemyId: 'enemy.bandit-captain', minHunterRank: 8 },
    ],
    sharedLoot: [{ itemId: 'item.bandit-scrap', chance: 0.25, minQuantity: 1, maxQuantity: 2 }],
  },
])

export const combatLocationById = Object.fromEntries(combatLocationDefinitions.map((location) => [location.id, location])) as Record<string, CombatLocationDefinition>
