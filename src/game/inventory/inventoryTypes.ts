export interface InventoryState { quantities: Record<string, number> }
export function createInitialInventory(): InventoryState { return { quantities: { 'item.training-sword': 1, 'item.training-armor': 1, 'item.training-hood': 1, 'item.training-gloves': 1, 'item.training-boots': 1, 'item.training-shield': 1, 'item.healing-potion': 10 } } }
