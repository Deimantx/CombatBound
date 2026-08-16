import { grantItem } from '../items/itemOwnership'
import type { ItemInstance } from '../items/itemTypes'
import type { ItemDefinitionId, ItemInstanceId } from '../items/itemTypes'

export interface InventoryState {
  stackables: Record<ItemDefinitionId, number>
  instances: Record<ItemInstanceId, ItemInstance>
  nextInstanceSequence: number
}

export function createInitialInventory(): InventoryState {
  let inventory: InventoryState = { stackables: {}, instances: {}, nextInstanceSequence: 1 }
  for (const definitionId of [
    'item.training-sword',
    'item.training-armor',
    'item.training-hood',
    'item.training-gloves',
    'item.training-boots',
    'item.training-shield',
  ]) inventory = grantItem(inventory, definitionId, 1).inventory
  inventory = grantItem(inventory, 'item.healing-potion', 10).inventory
  return inventory
}
