import { stanceDefinitions } from '../../../../game/data/stances'
import { techniqueDefinitions } from '../../../../game/data/techniques'
import type { CombatState, EnemyActionDefinition, SpellRuntime } from '../../../../game/combat/combatTypes'
import type { SpellDefinition } from '../../../../game/data/spells'

export function combatProgress(remaining: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, (1 - remaining / total) * 100))
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function techniqueDrain(combat: CombatState) {
  return Object.entries(combat.techniques).reduce((sum, [id, enabled]) => sum + (enabled ? techniqueDefinitions[id as keyof typeof techniqueDefinitions].drainPerSecond : 0), 0) * stanceDefinitions[combat.stance].techniqueDrain
}

export interface SpellUiState {
  enabled: boolean
  status: string
  tone: 'ready' | 'cooldown' | 'invalid' | 'inactive'
}

export function getSpellUiState(spell: SpellDefinition, runtime: SpellRuntime | undefined, combat: CombatState, selectedAction?: EnemyActionDefinition): SpellUiState {
  if (combat.phase !== 'active') return { enabled: false, status: 'INACTIVE', tone: 'inactive' }
  if ((runtime?.cooldownRemaining ?? 0) > 0) return { enabled: false, status: `COOLDOWN ${runtime!.cooldownRemaining.toFixed(1)}s`, tone: 'cooldown' }
  if (combat.adrenaline < spell.cost) return { enabled: false, status: `NEED ${spell.cost} ADR`, tone: 'invalid' }
  if (spell.id === 'spell.disrupting-pulse' && !selectedAction?.interruptible) return { enabled: false, status: 'NO INTERRUPTIBLE TARGET', tone: 'invalid' }
  return { enabled: true, status: spell.id === 'spell.disrupting-pulse' ? 'INTERRUPT NOW' : 'READY', tone: 'ready' }
}
