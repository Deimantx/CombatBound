import { itemById, type ItemDefinition } from '../data/items'
import type { CombatProficiencyId, DefensiveProficiencyId } from '../progression/progressionTypes'
import { ARMOR_TRAINING_SLOT_IDS, EQUIPMENT_SLOT_DEFINITIONS, type EquipmentState } from './equipmentTypes'
import { canEquipItemToSlot } from './equipmentRules'

export const BASE_ARMOR_TRAINING_XP = 1
export const BASE_SHIELD_TRAINING_XP = 1

export interface DefensiveEquipmentContext {
  lightArmorPieces: number
  mediumArmorPieces: number
  heavyArmorPieces: number
  shieldEquipped: boolean
}

export function getEquippedItems(equipment: EquipmentState, items: Record<string, ItemDefinition> = itemById) {
  return EQUIPMENT_SLOT_DEFINITIONS.map((slot) => equipment.slots[slot.id])
    .filter((itemId): itemId is string => typeof itemId === 'string')
    .map((itemId) => items[itemId])
    .filter((item): item is ItemDefinition => Boolean(item))
}

/** Single source of truth for defensive training, perk activation, and UI set counts. */
export function getDefensiveEquipmentContext(equipment: EquipmentState, items: Record<string, ItemDefinition> = itemById): DefensiveEquipmentContext {
  const counts = { lightArmorPieces: 0, mediumArmorPieces: 0, heavyArmorPieces: 0, shieldEquipped: false }
  for (const slot of ARMOR_TRAINING_SLOT_IDS) {
    const item = equipment.slots[slot] ? items[equipment.slots[slot] as string] : undefined
    if (!item || !canEquipItemToSlot(item, slot)) continue
    if (item.defensiveProficiencyId === 'light-armor') counts.lightArmorPieces += 1
    if (item.defensiveProficiencyId === 'medium-armor') counts.mediumArmorPieces += 1
    if (item.defensiveProficiencyId === 'heavy-armor') counts.heavyArmorPieces += 1
  }
  const offhand = equipment.slots.offhand ? items[equipment.slots.offhand] : undefined
  counts.shieldEquipped = Boolean(offhand && canEquipItemToSlot(offhand, 'offhand') && offhand.defensiveProficiencyId === 'shield')
  return counts
}

export function calculateDefensiveTrainingAwards(context: DefensiveEquipmentContext): Partial<Record<DefensiveProficiencyId, number>> {
  return {
    'light-armor': BASE_ARMOR_TRAINING_XP * context.lightArmorPieces / ARMOR_TRAINING_SLOT_IDS.length,
    'medium-armor': BASE_ARMOR_TRAINING_XP * context.mediumArmorPieces / ARMOR_TRAINING_SLOT_IDS.length,
    'heavy-armor': BASE_ARMOR_TRAINING_XP * context.heavyArmorPieces / ARMOR_TRAINING_SLOT_IDS.length,
    shield: context.shieldEquipped ? BASE_SHIELD_TRAINING_XP : 0,
  }
}

export interface DefensiveTrainingEvent {
  source: 'enemy-normal-attack' | 'enemy-direct-action'
  resolved: boolean
}

export function isDefensiveProficiencyId(id: CombatProficiencyId): id is DefensiveProficiencyId {
  return id === 'light-armor' || id === 'medium-armor' || id === 'heavy-armor' || id === 'shield'
}
