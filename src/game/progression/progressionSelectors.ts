import { itemById } from '../data/items'
import { perkById } from '../data/proficiencyPerks'
import type { EquipmentState } from '../equipment/equipmentTypes'
import { getPurchasedPerkRank } from './perkProgression'
import { getProficiencyLevel, getProficiencyProgress } from './proficiencyProgression'
import type { ProgressionState, ProficiencyPerkDefinition, WeaponProficiencyId } from './progressionTypes'

export function getEquippedWeaponProficiency(equipment: EquipmentState) {
  const weaponId = equipment.slots.weapon
  const weapon = weaponId ? itemById[weaponId] : undefined
  return weapon?.category === 'weapon' ? weapon.weaponProficiencyId ?? null : null
}

export function getActiveWeaponProficiency(progression: ProgressionState, equipment: EquipmentState) {
  const proficiencyId = getEquippedWeaponProficiency(equipment)
  return proficiencyId && getProficiencyProgress(progression, proficiencyId) ? { proficiencyId, level: getProficiencyLevel(progression, proficiencyId) } : proficiencyId ? { proficiencyId, level: 0 } : null
}

export function getActiveProficiencyPerks(progression: ProgressionState, equipment: EquipmentState, definitions: Record<string, ProficiencyPerkDefinition> = perkById) {
  const proficiencyId = getEquippedWeaponProficiency(equipment)
  if (!proficiencyId) return []
  return Object.values(definitions).filter((perk) => perk.proficiencyId === proficiencyId && getPurchasedPerkRank(progression, perk.id) > 0)
}
