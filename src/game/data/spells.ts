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
  healing?: { flatAmount: number }
  damageType?: DamageType
  canMiss?: boolean
  dodgeable?: boolean
  parryable?: boolean
  blockable?: boolean
  applyEffects?: Array<{ effectId: string; chance: number; progressionCredit?: 'hp-damage'; sourceProficiencyId?: MagicProficiencyId }>
  barrierAmount?: number
  barrierEffectId?: string
  interruptsAction?: boolean
  cleanseTags?: string[]
  cleanseMaxEffects?: number
  description: string
  icon: string
}

export const spellDefinitions = deepFreeze<SpellDefinition[]>([
  { id: 'spell.flame-blast', name: 'Flame Blast', magicProficiencyId: 'fire-magic', manaCost: 30, cooldownSeconds: 8, targetMode: 'selectedEnemy', damage: 35, damageType: 'fire', canMiss: true, dodgeable: false, parryable: false, blockable: false, applyEffects: [{ effectId: 'effect.burn', chance: 1, progressionCredit: 'hp-damage' }], description: 'Immediate fire damage and Burn on the selected enemy.', icon: 'spark' },
  { id: 'spell.protective-sign', name: 'Protective Sign', magicProficiencyId: 'light-magic', manaCost: 25, cooldownSeconds: 10, targetMode: 'self', damage: 0, barrierAmount: 65, barrierEffectId: 'effect.protective-sign', description: 'Create a temporary Light damage-absorbing barrier.', icon: 'shield' },
  { id: 'spell.disrupting-pulse', name: 'Disrupting Pulse', magicProficiencyId: 'air-magic', manaCost: 35, cooldownSeconds: 8, targetMode: 'selectedEnemy', damage: 0, interruptsAction: true, description: 'Interrupt the selected enemy special action with an Air pulse.', icon: 'zap' },
  { id: 'spell.ice-shard', name: 'Ice Shard', magicProficiencyId: 'water-magic', manaCost: 24, cooldownSeconds: 6, targetMode: 'selectedEnemy', damage: 28, damageType: 'water', canMiss: true, applyEffects: [{ effectId: 'effect.chilled', chance: 1 }], description: 'Launch a shard of condensed ice, dealing Water damage and Chilling the target.', icon: 'droplets' },
  { id: 'spell.stone-spike', name: 'Stone Spike', magicProficiencyId: 'earth-magic', manaCost: 28, cooldownSeconds: 7, targetMode: 'selectedEnemy', damage: 32, damageType: 'earth', canMiss: true, applyEffects: [{ effectId: 'effect.armor-broken', chance: .25 }], description: 'Drive a jagged stone spike into the target, dealing Earth damage with a chance to break Armor.', icon: 'mountain' },
  { id: 'spell.shadow-bolt', name: 'Shadow Bolt', magicProficiencyId: 'darkness-magic', manaCost: 27, cooldownSeconds: 7, targetMode: 'selectedEnemy', damage: 30, damageType: 'darkness', canMiss: true, applyEffects: [{ effectId: 'effect.shadow-decay', chance: 1, progressionCredit: 'hp-damage' }], description: 'Strike the target with concentrated Darkness and begin a lingering Decay.', icon: 'moon' },
])

export const spellById = Object.fromEntries(spellDefinitions.map((spell) => [spell.id, spell])) as Record<string, SpellDefinition>
