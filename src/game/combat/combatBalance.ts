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
  baseMaxHealth: 250, // [TUNING] Prototype value.
  baseAttack: 20, // [TUNING] Prototype value.
  baseAccuracy: 70, // [TUNING] Prototype value.
  baseArmor: 35, // [TUNING] Prototype value.
  baseEvasion: 35, // [TUNING] Prototype value.
  baseAttackInterval: 2.4, // [TUNING] Prototype value.
  baseCritChance: 0.05, // [TUNING] Prototype value.
  baseCritDamage: 1.5, // [TUNING] Prototype value.
  baseDodgeChance: 0.03, // [TUNING] Prototype value.
  baseParryChance: 0.03, // [TUNING] Prototype value.
  baseBlockChance: 0, // [TUNING] Prototype value.
  baseBlockPower: 0.5, // [TUNING] Prototype value.
  baseMaxStamina: 100, // [TUNING] Prototype value.
  baseStaminaRegen: 5, // [TUNING] Prototype value.
  recoveryResourceRegenMultiplier: 2, // [TUNING] Faster Stamina and Mana regeneration while out of combat.
  baseMaxMana: 100, // [TUNING] Prototype value.
  baseManaRegen: 1, // [TUNING] Prototype value.
  baseStaminaDrain: 3, // [TUNING] Prototype value.
  baseStatusResistance: 0, // [TUNING] Prototype value.
  basePhysicalResistance: 0, // [TUNING] Prototype value.
  baseFireResistance: 0, // [TUNING] Prototype value.
  baseDamageVarianceMin: 0.9, // [TUNING] Prototype value.
  baseDamageVarianceMax: 1.1, // [TUNING] Prototype value.
  baseHitChance: 0.75, // [TUNING] Prototype value.
  minHitChance: 0.15, // [TUNING] Prototype value.
  maxHitChance: 0.98, // [TUNING] Prototype value.
  armorConstant: 100, // [TUNING] Prototype value.
  minResistance: -0.75, // [TUNING] Prototype value.
  maxResistance: 0.8, // [TUNING] Prototype value.
  maxStatusResistance: 0.75, // [TUNING] Prototype value.
  maxCritChance: 1, // [TUNING] Prototype value.
  dodgeSoftCap: 0.25, // [TUNING] Diminishing returns threshold.
  dodgeHardCap: 0.5, // [TUNING] Diminishing returns ceiling.
  parrySoftCap: 0.25, // [TUNING] Diminishing returns threshold.
  parryHardCap: 0.5, // [TUNING] Diminishing returns ceiling.
  blockSoftCap: 0.4, // [TUNING] Diminishing returns threshold.
  blockHardCap: 0.7, // [TUNING] Diminishing returns ceiling.
  minimumAttackInterval: 0.05, // [TUNING] Prototype value.
  burnDuration: 6, // [TUNING] Prototype value.
  burnInterval: 2, // [TUNING] Prototype value.
  burnDamage: 5, // [TUNING] Prototype value.
  bleedDuration: 6, // [TUNING] Prototype value.
  bleedInterval: 2, // [TUNING] Prototype value.
  bleedDamage: 4, // [TUNING] Prototype value.
  armorBrokenDuration: 6, // [TUNING] Prototype value.
  exposedDuration: 6, // [TUNING] Prototype value.
  protectiveSignDuration: 10, // [TUNING] Prototype value.
  protectiveSignAmount: 65, // [TUNING] Prototype value.
  spellCooldown: 8, // [TUNING] Prototype value.
} as const

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
