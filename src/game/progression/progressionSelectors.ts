import { itemById } from '../data/items'
import type { InventoryState } from '../inventory/inventoryTypes'
import { resolveItemInstance } from '../items/itemResolver'
import { perkById } from '../data/proficiencyPerks'
import type { EquipmentState } from '../equipment/equipmentTypes'
import { getPurchasedPerkRank } from './perkProgression'
import { getProficiencyLevel, getProficiencyProgress } from './proficiencyProgression'
import type { ProgressionState, ProficiencyPerkDefinition } from './progressionTypes'

export function getEquippedWeaponProficiency(equipment: EquipmentState, inventory: InventoryState) {
  const instanceId = equipment.slots.weapon
  const weapon = instanceId ? resolveItemInstance(inventory, instanceId, itemById)?.definition : undefined
  return weapon?.category === 'weapon' ? weapon.weaponProficiencyId ?? null : null
}

export function getActiveWeaponProficiency(progression: ProgressionState, equipment: EquipmentState, inventory: InventoryState) {
  const proficiencyId = getEquippedWeaponProficiency(equipment, inventory)
  return proficiencyId && getProficiencyProgress(progression, proficiencyId) ? { proficiencyId, level: getProficiencyLevel(progression, proficiencyId) } : proficiencyId ? { proficiencyId, level: 0 } : null
}

export function getActiveProficiencyPerks(progression: ProgressionState, equipment: EquipmentState, inventory: InventoryState, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  const proficiencyId = getEquippedWeaponProficiency(equipment, inventory)
  if (!proficiencyId) return []
  return Object.values(definitions).filter((perk) => perk.proficiencyId === proficiencyId && getPurchasedPerkRank(progression, perk.id) > 0)
}
