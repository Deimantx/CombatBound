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
  baseDamageMin: number
  baseDamageMax: number
  healing?: { flatAmount: number }
  damageType?: DamageType
  canMiss?: boolean
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
  { id: 'spell.flame-blast', name: 'Flame Blast', magicProficiencyId: 'fire-magic', manaCost: 30, cooldownSeconds: 8, targetMode: 'selectedEnemy', baseDamageMin: 35, baseDamageMax: 35, damageType: 'fire', blockable: true, applyEffects: [{ effectId: 'effect.ignite', chance: 1, progressionCredit: 'hp-damage' }], description: 'Immediate fire damage and Ignite on the selected enemy.', icon: 'spark' },
  { id: 'spell.disrupting-pulse', name: 'Disrupting Pulse', magicProficiencyId: 'air-magic', manaCost: 35, cooldownSeconds: 8, targetMode: 'selectedEnemy', baseDamageMin: 0, baseDamageMax: 0, interruptsAction: true, description: 'Interrupt the selected enemy special action with an Air pulse.', icon: 'zap' },
  { id: 'spell.ice-shard', name: 'Ice Shard', magicProficiencyId: 'water-magic', manaCost: 24, cooldownSeconds: 6, targetMode: 'selectedEnemy', baseDamageMin: 28, baseDamageMax: 28, damageType: 'cold', blockable: true, applyEffects: [{ effectId: 'effect.chilled', chance: 1 }], description: 'Launch a shard of condensed ice, dealing Cold damage and Chilling the target.', icon: 'droplets' },
  { id: 'spell.stone-spike', name: 'Stone Spike', magicProficiencyId: 'earth-magic', manaCost: 28, cooldownSeconds: 7, targetMode: 'selectedEnemy', baseDamageMin: 32, baseDamageMax: 32, damageType: 'physical', blockable: true, applyEffects: [{ effectId: 'effect.armor-broken', chance: .25 }], description: 'Drive a jagged stone spike into the target, dealing Physical damage with a chance to break Armour.', icon: 'mountain' },
  { id: 'spell.shadow-bolt', name: 'Shadow Bolt', magicProficiencyId: 'darkness-magic', manaCost: 27, cooldownSeconds: 7, targetMode: 'selectedEnemy', baseDamageMin: 30, baseDamageMax: 30, damageType: 'chaos', blockable: true, applyEffects: [{ effectId: 'effect.shadow-decay', chance: 1, progressionCredit: 'hp-damage' }], description: 'Strike the target with concentrated Darkness and begin a lingering Decay.', icon: 'moon' },
])

export const spellById = Object.fromEntries(spellDefinitions.map((spell) => [spell.id, spell])) as Record<string, SpellDefinition>
