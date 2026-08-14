export type EquipmentSlot = 'weapon' | 'offhand' | 'head' | 'chest' | 'hands' | 'feet'
export const ARMOR_TRAINING_SLOTS = ['head', 'chest', 'hands', 'feet'] as const satisfies readonly EquipmentSlot[]
export type ArmorTrainingSlot = (typeof ARMOR_TRAINING_SLOTS)[number]

/**
 * `armor` is retained only as a legacy input shape so old v3 saves and older
 * callers can be migrated safely. Runtime equipment reads the new slots.
 */
export interface EquipmentState {
  slots: Partial<Record<EquipmentSlot, string>> & { armor?: string }
}

export function createInitialEquipment(): EquipmentState { return { slots: { weapon: 'item.training-sword', chest: 'item.training-armor' } } }
