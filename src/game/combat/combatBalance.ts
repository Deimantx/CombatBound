// Central prototype balance. Every value here is intentionally temporary.
export const combatBalance = {
  maxSimulationStepSeconds: 0.1, // [TUNING] Prototype value.
  recoverySeconds: 3, // [TUNING] Prototype value.
  recoveryHealthPerSecond: 15, // [TUNING] Prototype value.
  adrenalineCarryover: 0.75, // [TUNING] Prototype value.
  stanceSwitchCooldown: 2, // [TUNING] Prototype value.
  potionCooldown: 5, // [TUNING] Prototype value.
  autoPotionThreshold: 0.35, // [TUNING] Prototype value.
  safetyStopThreshold: 0.2, // [TUNING] Prototype value.
  healingPotionAmount: 70, // [TUNING] Prototype value.
  baseMaxHealth: 250, // [TUNING] Prototype value.
  baseAttack: 20, // [TUNING] Prototype value.
  baseAccuracy: 70, // [TUNING] Prototype value.
  baseDefense: 35, // [TUNING] Prototype value.
  baseAttackInterval: 2.4, // [TUNING] Prototype value.
  baseCritChance: 0.05, // [TUNING] Prototype value.
  baseCritDamage: 1.5, // [TUNING] Prototype value.
  baseDodge: 0.03, // [TUNING] Prototype value.
  baseParry: 0.03, // [TUNING] Prototype value.
  baseBlock: 0, // [TUNING] Prototype value.
  baseEnergy: 100, // [TUNING] Prototype value.
  baseEnergyRegen: 5, // [TUNING] Prototype value.
  baseAdrenaline: 100, // [TUNING] Prototype value.
  techniqueDrain: 3, // [TUNING] Prototype value.
  adrenalinePerDamage: 0.25, // [TUNING] Prototype value.
  adrenalinePerDamageTaken: 0.2, // [TUNING] Prototype value.
  blockReduction: 0.5, // [TUNING] Prototype value.
  spellCooldown: 8, // [TUNING] Prototype value.
} as const

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
