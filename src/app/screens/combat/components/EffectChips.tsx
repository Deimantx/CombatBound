import { effectById } from '../../../../game/data/effects'
import type { ActiveEffectInstance } from '../../../../game/combat/combatTypes'

export function EffectChips({ effects, debugId }: { effects: ActiveEffectInstance[]; debugId: 'player' | 'enemy' }) {
  return <div className="combat-effect-row" data-debug-combat={`${debugId}-effects`} data-debug-combat-player-effects={debugId === 'player' ? 'true' : undefined} data-debug-combat-enemy-effects={debugId === 'enemy' ? 'true' : undefined}>
    {effects.length === 0 ? <span className="combat-effect-empty">No active effects</span> : effects.map((effect) => {
      const definition = effectById[effect.effectId]
      if (!definition) return null
      const duration = effect.remainingSeconds === null ? '∞' : `${Math.max(0, effect.remainingSeconds).toFixed(1)}s`
      const barrier = definition.kind === 'barrier' ? ` · ${Math.floor(effect.runtimeValues?.absorbRemaining ?? 0)} barrier` : ''
      return <span key={effect.instanceId} className={`combat-effect-chip effect-${definition.kind}`} data-debug-combat-effect={effect.effectId} title={`${definition.description} · Source: ${effect.source.kind === 'player' ? 'Hunter' : effect.source.instanceId} · Stacks: ${effect.stacks} · Remaining: ${duration}${barrier}`}><span className="combat-effect-icon">{definition.icon.slice(0, 1).toUpperCase()}</span><strong>{definition.name}</strong>{effect.stacks > 1 && <em>x{effect.stacks}</em>}<small>{duration}{barrier}</small></span>
    })}
  </div>
}
