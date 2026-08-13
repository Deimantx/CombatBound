import type { DamageType, SpellTargetMode } from '../combat/combatTypes'
import type { MagicProficiencyId } from '../progression/progressionTypes'
import { deepFreeze } from './freeze'

export interface SpellDefinition {
  id: string
  name: string
  magicProficiencyId: MagicProficiencyId
  manaCost: number
  cooldownSeconds: number
  targetMode: SpellTargetMode
  damage: number
  damageType?: DamageType
  canMiss?: boolean
  dodgeable?: boolean
  parryable?: boolean
  blockable?: boolean
  applyEffects?: Array<{ effectId: string; chance: number; progressionCredit?: 'hp-damage' }>
  barrierAmount?: number
  barrierEffectId?: string
  interruptsAction?: boolean
  description: string
  icon: string
}

export const spellDefinitions = deepFreeze<SpellDefinition[]>([
  { id: 'spell.flame-blast', name: 'Flame Blast', magicProficiencyId: 'fire-magic', manaCost: 30, cooldownSeconds: 8, targetMode: 'selectedEnemy', damage: 35, damageType: 'fire', canMiss: true, dodgeable: false, parryable: false, blockable: false, applyEffects: [{ effectId: 'effect.burn', chance: 1, progressionCredit: 'hp-damage' }], description: 'Immediate fire damage and Burn on the selected enemy.', icon: 'spark' },
  { id: 'spell.protective-sign', name: 'Protective Sign', magicProficiencyId: 'warding-magic', manaCost: 25, cooldownSeconds: 10, targetMode: 'self', damage: 0, barrierAmount: 65, barrierEffectId: 'effect.protective-sign', description: 'Create a temporary damage-absorbing barrier.', icon: 'shield' },
  { id: 'spell.disrupting-pulse', name: 'Disrupting Pulse', magicProficiencyId: 'disruption-magic', manaCost: 35, cooldownSeconds: 8, targetMode: 'selectedEnemy', damage: 0, interruptsAction: true, description: 'Interrupt the selected enemy special action.', icon: 'zap' },
])

export const spellById = Object.fromEntries(spellDefinitions.map((spell) => [spell.id, spell])) as Record<string, SpellDefinition>
