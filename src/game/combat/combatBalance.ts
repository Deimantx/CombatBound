// Central prototype balance. Every value here is intentionally temporary.
export const combatBalance = {
  maxSimulationStepSeconds: 0.1, // [TUNING] Prototype value.
  recoverySeconds: 3, // [TUNING] Prototype value.
  recoveryHealthFractionPerSecond: 0.01 / 3, // [TUNING] 1% of max HP every 3 seconds while out of combat.
  stanceSwitchCooldown: 2, // [TUNING] Prototype value.
  potionCooldown: 5, // [TUNING] Prototype value.
  standardGlobalCooldown: 0.75, // [TUNING] Shared player action GCD.
  enforceWeaponSkillLevelRequirements: false, // [TUNING] Prototype weapon skills are unlocked for testing.
  autoPotionThreshold: 0.35, // [TUNING] Prototype value.
  safetyStopThreshold: 0.2, // [TUNING] Prototype value.
  healingPotionAmount: 70, // [TUNING] Prototype value.
  baseMaxLife: 250, // [TUNING] Prototype value.
  baseAttackDamage: 20, // [TUNING] Prototype value.
  baseAccuracy: 70, // [TUNING] Prototype value. Migrated to Accuracy Rating.
  baseArmour: 35, // [TUNING] Prototype value.
  baseEvasion: 35, // [TUNING] Prototype value.
  baseAttackInterval: 2.4, // [TUNING] Prototype value.
  baseCritChance: 0.05, // [TUNING] Prototype value.
  baseCritDamage: 1.5, // [TUNING] Prototype value.
  baseAttackBlockChance: 0, // [TUNING] Prototype value.
  baseSpellBlockChance: 0, // [TUNING] Prototype value.
  defaultMaximumResistance: 0.75,
  hardMaximumResistance: 0.9,
  minimumResistance: -2,
  maximumBlockChance: 0.75,
  hardMaximumBlockChance: 0.9,
  suppressedSpellDamagePrevented: 0.4,
  baseMaxStamina: 100, // [TUNING] Prototype value.
  baseStaminaRegen: 5, // [TUNING] Prototype value.
  recoveryResourceRegenMultiplier: 2, // [TUNING] Faster Stamina and Mana regeneration while out of combat.
  baseMaxMana: 100, // [TUNING] Prototype value.
  baseManaRegen: 1, // [TUNING] Prototype value.
  baseStaminaDrain: 3, // [TUNING] Prototype value.
  baseDamageVarianceMin: 0.9, // [TUNING] Prototype value.
  baseDamageVarianceMax: 1.1, // [TUNING] Prototype value.
  minHitChance: 0.05,
  maxHitChance: 1,
  maxCritChance: 1, // [TUNING] Prototype value.
  minimumAttackInterval: 0.05, // [TUNING] Prototype value.
  igniteDuration: 6, // [TUNING] Prototype value.
  igniteInterval: 2, // [TUNING] Prototype value.
  igniteDamage: 5, // [TUNING] Prototype value.
  bleedDuration: 6, // [TUNING] Prototype value.
  bleedInterval: 2, // [TUNING] Prototype value.
  bleedDamage: 4, // [TUNING] Prototype value.
  armorBrokenDuration: 6, // [TUNING] Prototype value.
  offBalanceDuration: 6, // [TUNING] Prototype value.
  spellCooldown: 8, // [TUNING] Prototype value.
} as const

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
