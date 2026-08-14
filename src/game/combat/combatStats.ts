import { combatBalance, clamp } from './combatBalance'
import type { ActiveEffectInstance, EffectDefinition } from './combatEffectTypes'
import type { CombatStats, EnemyDefinition } from './combatTypes'

const finite = (value: number | undefined, fallback = 0) => value !== undefined && Number.isFinite(value) ? value : fallback

export function normalizeCombatStats(stats: Partial<CombatStats> & Record<string, unknown>): CombatStats {
  const legacy = stats as Partial<CombatStats> & { attack?: number; defense?: number; dodge?: number; parry?: number; block?: number }
  return {
    maxHealth: Math.max(1, finite(stats.maxHealth, combatBalance.baseMaxHealth)),
    attackPower: finite(legacy.attack, finite(stats.attackPower, combatBalance.baseAttack)),
    accuracy: finite(stats.accuracy, combatBalance.baseAccuracy),
    attackInterval: Math.max(combatBalance.minimumAttackInterval, finite(stats.attackInterval, combatBalance.baseAttackInterval)),
    armor: Math.max(0, finite(legacy.defense, finite(stats.armor, combatBalance.baseArmor))),
    evasion: Math.max(0, finite(stats.evasion, combatBalance.baseEvasion)),
    critChance: clamp(finite(stats.critChance, combatBalance.baseCritChance), 0, combatBalance.maxCritChance),
    critDamage: Math.max(1, finite(stats.critDamage, combatBalance.baseCritDamage)),
    dodgeChance: clamp(finite(legacy.dodge, finite(stats.dodgeChance, combatBalance.baseDodgeChance)), 0, combatBalance.maxAvoidanceChance),
    parryChance: clamp(finite(legacy.parry, finite(stats.parryChance, combatBalance.baseParryChance)), 0, combatBalance.maxAvoidanceChance),
    blockChance: clamp(finite(legacy.block, finite(stats.blockChance, combatBalance.baseBlockChance)), 0, combatBalance.maxAvoidanceChance),
    blockPower: clamp(finite(stats.blockPower, combatBalance.baseBlockPower), 0, 0.95),
    maxStamina: Math.max(0, finite(stats.maxStamina, combatBalance.baseMaxStamina)),
    staminaRegen: finite(stats.staminaRegen, combatBalance.baseStaminaRegen),
    maxMana: Math.max(0, finite(stats.maxMana, combatBalance.baseMaxMana)),
    manaRegen: finite(stats.manaRegen, combatBalance.baseManaRegen),
    statusResistance: clamp(finite(stats.statusResistance, combatBalance.baseStatusResistance), 0, combatBalance.maxStatusResistance),
    healthRegen: Math.max(0, finite(stats.healthRegen, 0)),
    resistances: { ...(stats.resistances ?? {}) },
  }
}

export function calculateEffectiveCombatStats(baseStats: CombatStats, activeEffects: ActiveEffectInstance[], effectDefinitions: Record<string, EffectDefinition>): CombatStats {
  const result = normalizeCombatStats(baseStats as CombatStats & Record<string, unknown>)
  const flat: Partial<Record<keyof CombatStats, number>> = {}
  const additive: Partial<Record<keyof CombatStats, number>> = {}
  const multiplicative: Partial<Record<keyof CombatStats, number>> = {}

  for (const instance of activeEffects) {
    const definition = effectDefinitions[instance.effectId]
    if (!definition?.statModifiers) continue
    for (const modifier of definition.statModifiers) {
      const value = finite(modifier.value) * Math.max(1, instance.stacks)
      if (modifier.operation === 'flat') flat[modifier.stat] = (flat[modifier.stat] ?? 0) + value
      if (modifier.operation === 'addPercent') additive[modifier.stat] = (additive[modifier.stat] ?? 0) + modifier.value * Math.max(1, instance.stacks)
      if (modifier.operation === 'multiply') multiplicative[modifier.stat] = (multiplicative[modifier.stat] ?? 1) * modifier.value
    }
  }

  const statKeys: Array<keyof CombatStats> = ['maxHealth', 'attackPower', 'accuracy', 'attackInterval', 'armor', 'evasion', 'critChance', 'critDamage', 'dodgeChance', 'parryChance', 'blockChance', 'blockPower', 'maxStamina', 'staminaRegen', 'maxMana', 'manaRegen', 'statusResistance', 'healthRegen']
  for (const stat of statKeys) {
    const base = result[stat]
    if (typeof base !== 'number') continue
    const withFlat = base + (flat[stat] ?? 0)
    const withAdditive = withFlat * (1 + (additive[stat] ?? 0))
    result[stat] = withAdditive * (multiplicative[stat] ?? 1)
  }

  result.maxHealth = Math.max(1, finite(result.maxHealth, combatBalance.baseMaxHealth))
  result.maxStamina = Math.max(0, finite(result.maxStamina, combatBalance.baseMaxStamina))
  result.maxMana = Math.max(0, finite(result.maxMana, combatBalance.baseMaxMana))
  result.attackInterval = Math.max(combatBalance.minimumAttackInterval, finite(result.attackInterval, combatBalance.baseAttackInterval))
  result.armor = Math.max(0, finite(result.armor))
  result.evasion = Math.max(0, finite(result.evasion))
  result.critChance = clamp(finite(result.critChance), 0, combatBalance.maxCritChance)
  result.critDamage = Math.max(1, finite(result.critDamage, 1))
  result.dodgeChance = clamp(finite(result.dodgeChance), 0, combatBalance.maxAvoidanceChance)
  result.parryChance = clamp(finite(result.parryChance), 0, combatBalance.maxAvoidanceChance)
  result.blockChance = clamp(finite(result.blockChance), 0, combatBalance.maxAvoidanceChance)
  result.blockPower = clamp(finite(result.blockPower), 0, 0.95)
  result.statusResistance = clamp(finite(result.statusResistance), 0, combatBalance.maxStatusResistance)
  result.healthRegen = Math.max(0, finite(result.healthRegen))
  return result
}

export function calculateEnemyBaseCombatStats(definition: EnemyDefinition): CombatStats {
  return normalizeCombatStats({
    maxHealth: definition.maxHealth,
    attackPower: definition.attackPower,
    accuracy: definition.accuracy,
    attackInterval: definition.attackInterval,
    armor: definition.armor,
    evasion: definition.evasion,
    dodgeChance: definition.dodgeChance,
    parryChance: definition.parryChance,
    blockChance: definition.blockChance,
    blockPower: definition.blockPower,
    maxStamina: 0,
    staminaRegen: 0,
    maxMana: 0,
    manaRegen: 0,
    statusResistance: 0,
    resistances: definition.resistances,
  })
}

export function getResistance(stats: CombatStats, damageType: keyof CombatStats['resistances']) {
  if (damageType === 'true') return 0
  return clamp(finite(stats.resistances[damageType] ?? 0), combatBalance.minResistance, combatBalance.maxResistance)
}
