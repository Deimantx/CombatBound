import { combatBalance } from '../combat/combatBalance'
import { stanceDefinitions } from '../data/stances'
import { techniqueDefinitions } from '../data/techniques'
import { itemById } from '../data/items'
import { normalizeCombatStats } from '../combat/combatStats'
import { applyProficiencyStatModifiers, getActiveGlobalMagicStatModifiers, getActiveProficiencyStatModifiers } from '../progression/perkProgression'
import { getEquippedWeaponProficiency } from '../progression/progressionSelectors'
import { perkById } from '../data/proficiencyPerks'
import type { CombatStats, StanceId, TechniqueId } from '../combat/combatTypes'
import type { EquipmentState } from './equipmentTypes'
import type { ProgressionState, WeaponProficiencyId } from '../progression/progressionTypes'

/**
 * Canonical stats plus the old display names. The aliases are intentionally
 * kept for current UI/save callers while combat resolution consumes the
 * canonical fields.
 */
export interface HunterCombatStats extends CombatStats {
  attack: number
  defense: number
  dodge: number
  parry: number
  block: number
  weaponProficiencyId?: WeaponProficiencyId | null
}

export function calculateHunterCombatStats(equipment: EquipmentState, progression: ProgressionState, stance: StanceId, techniques: Record<TechniqueId, boolean>): HunterCombatStats {
  const stanceData = stanceDefinitions[stance]
  const weapon = itemById[equipment.slots.weapon ?? '']
  const armor = itemById[equipment.slots.armor ?? '']
  const weaponStats = weapon?.stats ?? {}
  const armorStats = armor?.stats ?? {}
  const base = normalizeCombatStats({
    maxHealth: combatBalance.baseMaxHealth + (armorStats.maxHealth ?? 0),
    attackPower: combatBalance.baseAttack + (weaponStats.attackPower ?? weaponStats.attack ?? 0),
    accuracy: combatBalance.baseAccuracy + (weaponStats.accuracy ?? 0) + (techniques['heightened-reflexes'] ? techniqueDefinitions['heightened-reflexes'].accuracy : 0),
    armor: combatBalance.baseArmor + (armorStats.armor ?? armorStats.defense ?? 0),
    evasion: combatBalance.baseEvasion + (armorStats.evasion ?? 0),
    attackInterval: weaponStats.attackInterval ?? combatBalance.baseAttackInterval,
    critChance: combatBalance.baseCritChance + (weaponStats.critChance ?? 0),
    critDamage: weaponStats.critDamage ?? combatBalance.baseCritDamage,
    dodgeChance: combatBalance.baseDodgeChance + (armorStats.dodgeChance ?? 0) + (techniques['careful-positioning'] ? techniqueDefinitions['careful-positioning'].dodge : 0),
    parryChance: combatBalance.baseParryChance + (armorStats.parryChance ?? 0) + (techniques['careful-positioning'] ? techniqueDefinitions['careful-positioning'].parry : 0),
    blockChance: combatBalance.baseBlockChance + (armorStats.blockChance ?? 0),
    blockPower: armorStats.blockPower ?? combatBalance.baseBlockPower,
    maxStamina: combatBalance.baseMaxStamina,
    staminaRegen: combatBalance.baseStaminaRegen * stanceData.staminaRegenMultiplier,
    maxMana: combatBalance.baseMaxMana,
    manaRegen: combatBalance.baseManaRegen,
    statusResistance: combatBalance.baseStatusResistance,
    resistances: {
      physical: combatBalance.basePhysicalResistance + (weaponStats.physicalResistance ?? 0) + (armorStats.physicalResistance ?? 0),
      fire: combatBalance.baseFireResistance + (weaponStats.fireResistance ?? 0) + (armorStats.fireResistance ?? 0),
      earth: (weaponStats.earthResistance ?? 0) + (armorStats.earthResistance ?? 0),
      air: (weaponStats.airResistance ?? 0) + (armorStats.airResistance ?? 0),
      nature: (weaponStats.natureResistance ?? 0) + (armorStats.natureResistance ?? 0),
      mystic: (weaponStats.mysticResistance ?? 0) + (armorStats.mysticResistance ?? 0),
    },
  })

  const canonical: CombatStats = {
    ...base,
    attackPower: base.attackPower * stanceData.damage,
    armor: base.armor * stanceData.armor,
    accuracy: base.accuracy * stanceData.accuracy,
    attackInterval: base.attackInterval * stanceData.attackIntervalMultiplier,
    dodgeChance: base.dodgeChance + stanceData.dodge,
    parryChance: base.parryChance + stanceData.parry,
  }
  const activeTechniqueCount = Object.values(techniques).filter(Boolean).length
  const weaponProficiencyId = getEquippedWeaponProficiency(equipment)
  const withPerks = applyProficiencyStatModifiers(canonical, [...getActiveProficiencyStatModifiers(progression, weaponProficiencyId, perkById, { stance, activeTechniqueCount }), ...getActiveGlobalMagicStatModifiers(progression, perkById)])
  const stats = { ...withPerks, attack: Math.round(withPerks.attackPower), defense: Math.round(withPerks.armor), dodge: withPerks.dodgeChance, parry: withPerks.parryChance, block: withPerks.blockChance, weaponProficiencyId }
  return stats
}
