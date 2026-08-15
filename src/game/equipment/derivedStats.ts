import { combatBalance } from '../combat/combatBalance'
import { stanceDefinitions } from '../data/stances'
import { techniqueDefinitions } from '../data/techniques'
import { itemById } from '../data/items'
import { normalizeCombatStats } from '../combat/combatStats'
import { applyProficiencyStatModifiers, getActiveGlobalMagicStatModifiers, getActiveProficiencyStatModifiers } from '../progression/perkProgression'
import { getEquippedWeaponProficiency } from '../progression/progressionSelectors'
import { perkById } from '../data/proficiencyPerks'
import { getDefensiveEquipmentContext, getEquippedItems } from './defensiveEquipment'
import { getActiveDefensiveEquipmentModifiers } from '../progression/perkProgression'
import type { CombatStats, StanceId, TechniqueId, StatModifier, CombatStatContributionCollector, CombatStatKey } from '../combat/combatTypes'
import type { EquipmentState } from './equipmentTypes'
import type { ItemDefinition } from '../data/items'
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

export function calculateHunterCombatStats(equipment: EquipmentState, progression: ProgressionState, stance: StanceId, techniques: Record<TechniqueId, boolean>, items: Record<string, ItemDefinition> = itemById, collector?: CombatStatContributionCollector): HunterCombatStats {
  const stanceData = stanceDefinitions[stance]
  const weapon = items[equipment.slots.weapon ?? '']
  const weaponStats = weapon?.stats ?? {}
  const equippedItems = getEquippedItems(equipment, items)
  const equipmentStats = equippedItems.map((item) => item.stats ?? {})
  const total = (key: keyof NonNullable<import('../data/items').ItemDefinition['stats']>) => equipmentStats.reduce((sum, stats) => sum + (stats[key] ?? 0), 0)
  const base = normalizeCombatStats({
    maxHealth: combatBalance.baseMaxHealth + total('maxHealth'),
    attackPower: combatBalance.baseAttack + total('attackPower') + total('attack'),
    accuracy: combatBalance.baseAccuracy + total('accuracy') + (techniques['heightened-reflexes'] ? techniqueDefinitions['heightened-reflexes'].accuracy : 0),
    armor: combatBalance.baseArmor + total('armor') + total('defense'),
    evasion: combatBalance.baseEvasion + total('evasion'),
    attackInterval: weaponStats.attackInterval ?? combatBalance.baseAttackInterval,
    critChance: combatBalance.baseCritChance + total('critChance'),
    critDamage: combatBalance.baseCritDamage + total('critDamage'),
    dodgeChance: combatBalance.baseDodgeChance + total('dodgeChance') + (techniques['careful-positioning'] ? techniqueDefinitions['careful-positioning'].dodge : 0),
    parryChance: combatBalance.baseParryChance + total('parryChance') + (techniques['careful-positioning'] ? techniqueDefinitions['careful-positioning'].parry : 0),
    blockChance: combatBalance.baseBlockChance + total('blockChance'),
    blockPower: combatBalance.baseBlockPower + total('blockPower'),
    maxStamina: combatBalance.baseMaxStamina + total('maxStamina'),
    staminaRegen: (combatBalance.baseStaminaRegen + total('staminaRegen')) * stanceData.staminaRegenMultiplier,
    maxMana: combatBalance.baseMaxMana + total('maxMana'),
    manaRegen: combatBalance.baseManaRegen + total('manaRegen'),
    statusResistance: combatBalance.baseStatusResistance + total('statusResistance'),
    healthRegen: total('healthRegen'),
    resistances: {
      physical: combatBalance.basePhysicalResistance + total('physicalResistance'),
      fire: combatBalance.baseFireResistance + total('fireResistance'),
      water: total('waterResistance'),
      earth: total('earthResistance'),
      air: total('airResistance'),
      light: total('lightResistance'),
      darkness: total('darknessResistance'),
      nature: total('natureResistance'),
      mystic: total('mysticResistance'),
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
  const defensivePerks = getActiveDefensiveEquipmentModifiers(progression, getDefensiveEquipmentContext(equipment, items), perkById)
  const weaponScopedStats: StatModifier[] = []
  for (const modifier of defensivePerks.weaponModifiers) {
    if (modifier.modifier === 'accuracy') weaponScopedStats.push({ stat: 'accuracy', operation: 'flat', value: modifier.value })
    if (modifier.modifier === 'attackInterval') weaponScopedStats.push({ stat: 'attackInterval', operation: 'addPercent', value: modifier.value })
  }
  const withPerks = applyProficiencyStatModifiers(canonical, [...getActiveProficiencyStatModifiers(progression, weaponProficiencyId, perkById, { stance, activeTechniqueCount }), ...getActiveGlobalMagicStatModifiers(progression, perkById), ...defensivePerks.statModifiers, ...weaponScopedStats])
  for (const modifier of defensivePerks.resistanceModifiers) withPerks.resistances[modifier.damageType] = (withPerks.resistances[modifier.damageType] ?? 0) + modifier.value
  const stats = { ...withPerks, attack: Math.round(withPerks.attackPower), defense: Math.round(withPerks.armor), dodge: withPerks.dodgeChance, parry: withPerks.parryChance, block: withPerks.blockChance, weaponProficiencyId }
  if (collector) {
    const keys: CombatStatKey[] = ['maxHealth', 'attackPower', 'accuracy', 'attackInterval', 'armor', 'evasion', 'critChance', 'critDamage', 'dodgeChance', 'parryChance', 'blockChance', 'blockPower', 'maxStamina', 'staminaRegen', 'maxMana', 'manaRegen', 'statusResistance', 'healthRegen']
    for (const key of keys) {
      const baseValue = Number(base[key] ?? 0)
      const canonicalValue = Number(canonical[key] ?? 0)
      const perkValue = Number(withPerks[key] ?? 0)
      if (baseValue !== 0) collector.record({ stat: key, sourceType: 'base', sourceId: 'combat-derived-base', sourceLabel: 'Canonical base + equipment pipeline', operation: 'flat', value: baseValue, before: 0, after: baseValue })
      if (canonicalValue !== baseValue) collector.record({ stat: key, sourceType: 'stance', sourceId: `stance.${stance}`, sourceLabel: `${stance} stance canonical adjustment`, operation: 'flat', value: canonicalValue - baseValue, before: baseValue, after: canonicalValue })
      if (perkValue !== canonicalValue) collector.record({ stat: key, sourceType: 'perk', sourceId: 'active-proficiency-modifiers', sourceLabel: 'Active proficiency modifiers', operation: 'flat', value: perkValue - canonicalValue, before: canonicalValue, after: perkValue })
    }
    for (const damageType of Object.keys(withPerks.resistances) as Array<Exclude<import('../combat/combatTypes').DamageType, 'true'>>) {
      const baseValue = base.resistances[damageType] ?? 0
      const after = withPerks.resistances[damageType] ?? 0
      if (after !== baseValue) collector.record({ stat: `resistance:${damageType}`, sourceType: 'perk', sourceId: 'defensive-resistance-modifiers', sourceLabel: 'Defensive resistance modifiers', operation: 'flat', value: after - baseValue, before: baseValue, after })
    }
  }
  return stats
}
