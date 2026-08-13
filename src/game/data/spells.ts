import type { DamageType, SpellTargetMode } from '../combat/combatTypes'
import { deepFreeze } from './freeze'

export interface SpellDefinition {
  id: string
  name: string
  cost: number
  cooldownSeconds: number
  targetMode: SpellTargetMode
  damage: number
  damageType?: DamageType
  canMiss?: boolean
  dodgeable?: boolean
  parryable?: boolean
  blockable?: boolean
  applyEffects?: Array<{ effectId: string; chance: number }>
  barrierAmount?: number
  barrierEffectId?: string
  interruptsAction?: boolean
  description: string
  icon: string
}

export const spellDefinitions = deepFreeze<SpellDefinition[]>([
  { id: 'spell.flame-blast', name: 'Flame Blast', cost: 30, cooldownSeconds: 8, targetMode: 'selectedEnemy', damage: 35, damageType: 'fire', canMiss: true, dodgeable: false, parryable: false, blockable: false, applyEffects: [{ effectId: 'effect.burn', chance: 1 }], description: 'Immediate fire damage and Burn on the selected enemy.', icon: 'spark' },
  { id: 'spell.protective-sign', name: 'Protective Sign', cost: 25, cooldownSeconds: 10, targetMode: 'self', damage: 0, barrierAmount: 65, barrierEffectId: 'effect.protective-sign', description: 'Create a temporary damage-absorbing barrier.', icon: 'shield' },
  { id: 'spell.disrupting-pulse', name: 'Disrupting Pulse', cost: 35, cooldownSeconds: 8, targetMode: 'selectedEnemy', damage: 0, interruptsAction: true, description: 'Interrupt the selected enemy special action.', icon: 'zap' },
])

export const spellById = Object.fromEntries(spellDefinitions.map((spell) => [spell.id, spell])) as Record<string, SpellDefinition>
