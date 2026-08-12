export interface InventoryState { quantities: Record<string, number> }
export function createInitialInventory(): InventoryState { return { quantities: { 'item.training-sword': 1, 'item.training-armor': 1, 'item.healing-potion': 10 } } }
