import type { CombatantRef, DamageDeliveryKind, DamageSourceKind, DamageType, StatModifier } from './combatTypes'
import type { CombatProficiencyId, ProgressionCredit } from '../progression/progressionTypes'

export type EffectKind = 'buff' | 'debuff' | 'status' | 'barrier'
export type EffectStackingMode = 'refresh' | 'stack-refresh' | 'extend' | 'replace-stronger' | 'independent'
export type EffectPersistence = 'enemy-life' | 'between-enemies' | 'hunt'

export interface EffectOutgoingDamageModifier {
  sourceKind?: DamageSourceKind
  deliveryKind?: DamageDeliveryKind
  damageType?: DamageType
  operation: 'increased' | 'more'
  value: number
}

export interface EffectIncomingDamageModifier {
  sourceKind?: DamageSourceKind
  deliveryKind?: DamageDeliveryKind
  damageType?: DamageType
  operation: 'increased' | 'more'
  value: number
}

export interface EffectHealingReceivedModifier {
  operation: 'increased' | 'reduced' | 'more' | 'less'
  value: number
}

export type PeriodicOperation =
  | { type: 'damage'; damageType: DamageType; baseAmount: number; canCrit?: boolean }
  | { type: 'heal'; baseAmount: number; maxLifeFraction?: number }

export interface EffectDefinition {
  id: string
  name: string
  description: string
  icon: string
  kind: EffectKind
  tags: string[]
  durationSeconds: number | null
  stacking: {
    mode: EffectStackingMode
    maxStacks: number
  }
  statModifiers?: StatModifier[]
  resistanceModifiers?: Array<{ damageType: DamageType; operation: 'flat' | 'more'; value: number }>
  outgoingDamageModifiers?: EffectOutgoingDamageModifier[]
  incomingDamageModifiers?: EffectIncomingDamageModifier[]
  healingReceivedModifiers?: EffectHealingReceivedModifier[]
  periodic?: {
    intervalSeconds: number
    operation: PeriodicOperation
  }
  cleanseTags?: string[]
  persistence: EffectPersistence
  /** Barrier definitions use this as the initial absorb pool. */
  barrierAmount?: number
  /** Marks a positive effect for presentation and targeting classification. */
  beneficial?: boolean
}

export interface ActiveEffectInstance {
  instanceId: string
  effectId: string
  source: CombatantRef
  target: CombatantRef
  stacks: number
  remainingSeconds: number | null
  nextTickRemaining: number | null
  appliedSequence: number
  snapshot?: { power?: number; periodicPowerMultiplier?: number; effectMagnitudeMultiplier?: number }
  progressionCredit?: ProgressionCredit
  /** School/weapon ownership for source-aware perk modifiers. */
  sourceProficiencyId?: CombatProficiencyId
  runtimeValues?: { absorbRemaining?: number }
}

export interface EffectTick {
  effect: ActiveEffectInstance
  definition: EffectDefinition
}

export interface EffectTimerResult {
  effects: ActiveEffectInstance[]
  ticks: EffectTick[]
  expired: ActiveEffectInstance[]
}
