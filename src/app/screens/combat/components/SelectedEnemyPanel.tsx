import { HeartPulse, Target } from 'lucide-react'
import { enemyById } from '../../../../game/data/enemies'
import type { EnemyCombatInstance } from '../../../../game/combat/combatTypes'
import type { GameState } from '../../../../game/gameState'
import { getEnemyEffectiveCombatStats } from '../../../../game/combat/combatSelectors'
import { Panel } from '../../../components/Panel'
import { PlaceholderArt } from '../../../components/PlaceholderArt'
import { EffectChips } from './EffectChips'
import type { HunterCombatStats } from '../../../../game/equipment/derivedStats'

export function SelectedEnemyPanel({ game, stats, selectedEnemy }: { game: GameState; stats: HunterCombatStats; selectedEnemy?: EnemyCombatInstance }) {
  void stats
  const enemy = selectedEnemy ?? game.combat.enemy ?? undefined
  const definition = enemy ? enemyById[enemy.enemyId] : undefined
  const effective = enemy ? getEnemyEffectiveCombatStats(enemy) : undefined

  return <Panel title="Current enemy" subtitle="Live runtime target" icon={Target} panelId="targetCombat" screen="combat" className={`target-combat-panel ${enemy ? 'has-target' : ''}`}>
    {enemy && definition && effective ? <>
      <div className="target-card-top">
        <PlaceholderArt icon={definition.icon} label={enemy.displayName} size="medium" variant={definition.accent} />
        <div><span className="tiny-label">CURRENT ENEMY</span><h3>{enemy.displayName}</h3><p>{definition.enemyTier.toUpperCase()} - {definition.family}</p><span className={`level-badge ${enemy.defeated ? 'is-defeated' : ''}`}>{enemy.defeated ? 'DEFEATED' : game.combat.phase === 'recovery' ? 'RECOVERING' : 'FIGHTING'}</span></div>
      </div>
      <div className="target-stat-grid current-enemy-live-stats" data-debug-kind="current-enemy-live-stats">
        <div><span>HP</span><strong>{Math.max(0, Math.floor(enemy.currentHealth))} / {enemy.maxHealth}</strong></div>
        <div><span>Attack</span><strong>{Math.round(effective.attackDamageMin ?? definition.baseAttackDamageMin)}-{Math.round(effective.attackDamageMax ?? definition.baseAttackDamageMax)}</strong></div>
        <div><span>Attack Interval</span><strong>{effective.attackInterval.toFixed(1)}s</strong></div>
        <div><span>Armour</span><strong>{Math.round(effective.armour ?? definition.armour)}</strong></div>
        <div><span>Phase</span><strong>{enemy.phaseId ?? 'Base'}</strong></div>
        <div><span>Preparation</span><strong>{enemy.preparedAbility ? `${enemy.preparedAbility.remainingSeconds.toFixed(1)}s` : '-'}</strong></div>
      </div>
      <div className="combat-effects-inspector"><div className="section-title"><span className="tiny-label">ACTIVE EFFECTS</span><small>{enemy.effects.length}</small></div><EffectChips effects={enemy.effects} debugId="enemy" /></div>
      <div className="current-enemy-runtime-note"><HeartPulse size={14} /><span>Live values reflect combat effects and phase modifiers.</span></div>
    </> : <div className="empty-state"><Target size={24} /><strong>NO CURRENT ENEMY</strong><p>Start a target from the Combat world to inspect its live runtime.</p></div>}
  </Panel>
}
