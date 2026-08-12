import { combatBalance } from '../combat/combatBalance'
import { stanceDefinitions } from '../data/stances'
import { techniqueDefinitions } from '../data/techniques'
import { itemById } from '../data/items'
import type { EquipmentState } from './equipmentTypes'
import type { ProgressionState } from '../progression/progressionTypes'
import type { StanceId, TechniqueId } from '../combat/combatTypes'

export interface HunterCombatStats {
  maxHealth: number; attack: number; accuracy: number; defense: number; attackInterval: number; critChance: number; critDamage: number; dodge: number; parry: number; block: number; maxEnergy: number; energyRegen: number; maxAdrenaline: number; adrenalineGeneration: number
}

export function calculateHunterCombatStats(equipment: EquipmentState, progression: ProgressionState, stance: StanceId, techniques: Record<TechniqueId, boolean>): HunterCombatStats {
  const stanceData = stanceDefinitions[stance]
  const weapon = itemById[equipment.slots.weapon ?? '']
  const armor = itemById[equipment.slots.armor ?? '']
  const weaponStats = weapon?.stats ?? {}
  const armorStats = armor?.stats ?? {}
  return {
    maxHealth: combatBalance.baseMaxHealth + (armorStats.maxHealth ?? 0),
    attack: Math.round((combatBalance.baseAttack + (weaponStats.attack ?? 0)) * stanceData.damage),
    accuracy: Math.round((combatBalance.baseAccuracy + (weaponStats.accuracy ?? 0) + progression.skills.swordsmanship.level + (techniques['heightened-reflexes'] ? techniqueDefinitions['heightened-reflexes'].accuracy : 0)) * stanceData.accuracy),
    defense: Math.round((combatBalance.baseDefense + (armorStats.defense ?? 0) + progression.skills.defense.level) * stanceData.defense),
    attackInterval: (weaponStats.attackInterval ?? combatBalance.baseAttackInterval) * stanceData.attackSpeed,
    critChance: combatBalance.baseCritChance,
    critDamage: combatBalance.baseCritDamage,
    dodge: combatBalance.baseDodge + stanceData.dodge + (techniques['careful-positioning'] ? techniqueDefinitions['careful-positioning'].dodge : 0),
    parry: combatBalance.baseParry + stanceData.parry + (techniques['careful-positioning'] ? techniqueDefinitions['careful-positioning'].parry : 0),
    block: combatBalance.baseBlock,
    maxEnergy: combatBalance.baseEnergy,
    energyRegen: combatBalance.baseEnergyRegen * stanceData.energyRegen,
    maxAdrenaline: combatBalance.baseAdrenaline,
    adrenalineGeneration: stanceData.adrenaline,
  }
}
