export type EquipmentSlot = 'weapon' | 'armor'
export interface EquipmentState { slots: Partial<Record<EquipmentSlot, string>> }
export function createInitialEquipment(): EquipmentState { return { slots: { weapon: 'item.training-sword', armor: 'item.training-armor' } } }
