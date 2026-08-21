import { itemById, type ItemDefinition } from '../data/items'
import type { InventoryState } from '../inventory/inventoryTypes'
import { resolveItemInstance } from '../items/itemResolver'
import type { CombatProficiencyId, DefensiveProficiencyId } from '../progression/progressionTypes'
import { ARMOR_TRAINING_SLOT_IDS, EQUIPMENT_SLOT_DEFINITIONS, type EquipmentSlotId, type EquipmentState } from './equipmentTypes'
import { canEquipItemToSlot } from './equipmentRules'
import type { ResolvedEquippedItem } from '../items/itemTypes'

export const BASE_ARMOR_TRAINING_XP = 1
export const BASE_SHIELD_TRAINING_XP = 1

export interface DefensiveEquipmentContext {
  lightArmorPieces: number
  mediumArmorPieces: number
  heavyArmorPieces: number
  shieldEquipped: boolean
}

export function getResolvedEquippedItems(equipment: EquipmentState, inventory: InventoryState, items: Record<string, ItemDefinition> = itemById): ResolvedEquippedItem[] {
  return EQUIPMENT_SLOT_DEFINITIONS.flatMap((slot) => {
    const instanceId = equipment.slots[slot.id]
    if (!instanceId) return []
    const resolved = resolveItemInstance(inventory, instanceId, items)
    return resolved ? [{ slotId: slot.id, ...resolved }] : []
  })
}

export function getResolvedEquippedItem(equipment: EquipmentState, inventory: InventoryState, slotId: EquipmentSlotId, items: Record<string, ItemDefinition> = itemById) {
  const instanceId = equipment.slots[slotId]
  if (!instanceId) return null
  const resolved = resolveItemInstance(inventory, instanceId, items)
  return resolved ? { slotId, ...resolved } : null
}

/** Single source of truth for defensive training, perk activation, and UI set counts. */
export function getDefensiveEquipmentContext(equipment: EquipmentState, inventory: InventoryState, items: Record<string, ItemDefinition> = itemById): DefensiveEquipmentContext {
  const counts = { lightArmorPieces: 0, mediumArmorPieces: 0, heavyArmorPieces: 0, shieldEquipped: false }
  for (const slot of ARMOR_TRAINING_SLOT_IDS) {
    const item = getResolvedEquippedItem(equipment, inventory, slot, items)?.definition
    if (!item || !canEquipItemToSlot(item, slot)) continue
    if (item.defensiveProficiencyId === 'light-armor') counts.lightArmorPieces += 1
    if (item.defensiveProficiencyId === 'medium-armor') counts.mediumArmorPieces += 1
    if (item.defensiveProficiencyId === 'heavy-armor') counts.heavyArmorPieces += 1
  }
  const offhand = getResolvedEquippedItem(equipment, inventory, 'offhand', items)?.definition
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
  source: 'enemy-normal-attack' | 'enemy-direct-action' | 'enemy-combat-ability'
  resolved: boolean
}

export function isDefensiveProficiencyId(id: CombatProficiencyId): id is DefensiveProficiencyId {
  return id === 'light-armor' || id === 'medium-armor' || id === 'heavy-armor' || id === 'shield'
}
