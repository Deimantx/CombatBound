import { combatEffectById } from '../../../../game/data/effects'
import type { ActiveEffectInstance } from '../../../../game/combat/combatTypes'
import { buildEffectTooltip } from '../../../../game/presentation/tooltipBuilders'
import { GameTooltip } from '../../../components/tooltip/GameTooltip'
import { PlaceholderArt } from '../../../components/PlaceholderArt'

export function EffectChips({ effects, debugId }: { effects: ActiveEffectInstance[]; debugId: 'player' | 'enemy' }) {
  return <div className="combat-effect-row" data-debug-combat={`${debugId}-effects`} data-debug-combat-player-effects={debugId === 'player' ? 'true' : undefined} data-debug-combat-enemy-effects={debugId === 'enemy' ? 'true' : undefined}>
    {effects.length === 0 ? <span className="combat-effect-empty">No active effects</span> : effects.map((effect) => {
      const definition = combatEffectById[effect.effectId]
      if (!definition) return null
      const duration = effect.remainingSeconds === null ? 'Permanent' : `${Math.max(0, effect.remainingSeconds).toFixed(1)}s`
      const barrier = definition.kind === 'barrier' ? Math.floor(effect.runtimeValues?.absorbRemaining ?? 0) : 0
      return <GameTooltip key={effect.instanceId} content={buildEffectTooltip(effect, definition)}><span className={`combat-effect-chip effect-${definition.kind}`} data-debug-combat-effect={effect.effectId} data-debug-effect-id={effect.effectId} data-debug-target-id={effect.instanceId}><PlaceholderArt icon={definition.icon} size="small" variant={definition.kind === 'debuff' || definition.kind === 'status' ? 'red' : 'gold'} /><strong>{definition.name}</strong>{effect.stacks > 1 && <em>x{effect.stacks}</em>}<small>{duration}</small>{barrier > 0 && <small>{barrier} barrier</small>}</span></GameTooltip>
    })}
  </div>
}
