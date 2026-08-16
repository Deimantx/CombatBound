import type { CombatantRef, DamageType, StatModifier } from './combatTypes'
import type { CombatProficiencyId, ProgressionCredit } from '../progression/progressionTypes'

export type EffectKind = 'buff' | 'debuff' | 'status' | 'barrier'
export type EffectStackingMode = 'refresh' | 'stack-refresh' | 'extend' | 'replace-stronger' | 'independent'
export type EffectPersistence = 'enemy-life' | 'between-enemies' | 'hunt'

export type PeriodicOperation =
  | { type: 'damage'; damageType: DamageType; baseAmount: number; canCrit?: boolean }
  | { type: 'heal'; baseAmount: number }

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
  periodic?: {
    intervalSeconds: number
    operation: PeriodicOperation
  }
  cleanseTags?: string[]
  persistence: EffectPersistence
  /** Barrier definitions use this as the initial absorb pool. */
  barrierAmount?: number
  /** Beneficial effects are not shortened by ailment-duration reduction. */
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
