import type { SpellTargetMode } from '../combat/combatTypes'
import { deepFreeze } from './freeze'

export interface SpellDefinition { id: string; name: string; cost: number; cooldownSeconds: number; targetMode: SpellTargetMode; damage: number; description: string; icon: string }

export const spellDefinitions = deepFreeze<SpellDefinition[]>([
  { id: 'spell.flame-blast', name: 'Flame Blast', cost: 30, cooldownSeconds: 8, targetMode: 'selectedEnemy', damage: 35, description: 'Immediate fire damage to the selected enemy.', icon: 'spark' },
  { id: 'spell.protective-sign', name: 'Protective Sign', cost: 25, cooldownSeconds: 10, targetMode: 'self', damage: 0, description: 'Create a temporary damage-absorbing shield.', icon: 'shield' },
  { id: 'spell.disrupting-pulse', name: 'Disrupting Pulse', cost: 35, cooldownSeconds: 8, targetMode: 'selectedEnemy', damage: 0, description: 'Interrupt the selected enemy special action.', icon: 'zap' },
])

export const spellById = Object.fromEntries(spellDefinitions.map((spell) => [spell.id, spell])) as Record<string, SpellDefinition>
