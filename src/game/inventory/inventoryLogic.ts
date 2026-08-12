import type { InventoryState } from './inventoryTypes'

export function addItem(inventory: InventoryState, itemId: string, quantity: number): InventoryState { return { quantities: { ...inventory.quantities, [itemId]: (inventory.quantities[itemId] ?? 0) + quantity } } }
export function removeItem(inventory: InventoryState, itemId: string, quantity: number): InventoryState {
  const next = Math.max(0, (inventory.quantities[itemId] ?? 0) - quantity)
  return { quantities: { ...inventory.quantities, [itemId]: next } }
}
export function itemQuantity(inventory: InventoryState, itemId: string) { return inventory.quantities[itemId] ?? 0 }
