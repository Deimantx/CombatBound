import { createInitialCollection } from './collection/collectionTypes'
import { createInitialEquipment, type EquipmentState } from './equipment/equipmentTypes'
import type { CombatState } from './combat/combatTypes'
import { createCombatState } from './combat/combatState'
import { enemyDefinitions } from './data/enemies'
import { createInitialInventory, type InventoryState } from './inventory/inventoryTypes'
import { createInitialProgression } from './progression/proficiencyProgression'
import type { ProgressionState } from './progression/progressionTypes'

export interface GameState {
  combat: CombatState
  progression: ProgressionState
  inventory: InventoryState
  equipment: EquipmentState
  collection: ReturnType<typeof createInitialCollection>
  gold: number
}

export function createInitialGameState(): GameState {
  return {
    combat: createCombatState(),
    progression: createInitialProgression(),
    inventory: createInitialInventory(),
    equipment: createInitialEquipment(),
    collection: { ...createInitialCollection(enemyDefinitions.map((enemy) => enemy.id)), discoveredItems: ['item.training-sword', 'item.training-armor', 'item.healing-potion'] },
    gold: 0,
  }
}
