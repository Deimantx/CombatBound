import { Shield } from 'lucide-react'
import { stanceDefinitions } from '../../../../game/data/stances'
import { techniqueDefinitions } from '../../../../game/data/techniques'
import type { TechniqueId } from '../../../../game/combat/combatTypes'
import type { GameState } from '../../../../game/gameState'
import type { HunterCombatStats } from '../../../../game/equipment/derivedStats'
import { Panel } from '../../../components/Panel'
import { PlaceholderArt } from '../../../components/PlaceholderArt'
import { StatLine } from '../../../components/StatLine'
import { techniqueDrain } from './combatUi'

interface HunterCombatPanelProps {
  game: GameState
  stats: HunterCombatStats
  onSetStance: (stance: 'high' | 'mid' | 'low') => void
  onToggleTechnique: (id: TechniqueId) => void
}

export function HunterCombatPanel({ game, stats, onSetStance, onToggleTechnique }: HunterCombatPanelProps) {
  const combat = game.combat
  const totalLevel = Object.values(game.progression.skills).reduce((sum, skill) => sum + skill.level, 0)
  const drain = techniqueDrain(combat)
  return <Panel title="Hunter" subtitle="Preparation and derived stats" icon={Shield} panelId="playerCombat" screen="combat" className="player-combat-panel">
    <div className="combat-identity"><PlaceholderArt icon="shield" label="Vanguard" size="medium" variant="blue" /><div><h3>Vanguard</h3><p>Hunter Rank {game.progression.hunterRank} · Combat Lv {totalLevel}</p><span className="identity-level">{game.progression.trainingFocus} training</span></div></div>
    <div className="training-row"><span className="tiny-label">TRAINING</span><strong>{game.progression.trainingFocus}</strong><small>Enemy kills award XP here.</small></div>
    <div className="stance-section"><div className="section-title"><span className="tiny-label">STANCE</span><small>{combat.stanceCooldownRemaining > 0 ? `${combat.stanceCooldownRemaining.toFixed(1)}s cooldown` : 'Ready'}</small></div><div className="stance-buttons">{(Object.keys(stanceDefinitions) as Array<'high' | 'mid' | 'low'>).map((stance) => <button key={stance} className={combat.stance === stance ? 'stance-button is-active' : 'stance-button'} onClick={() => onSetStance(stance)} disabled={combat.stanceCooldownRemaining > 0} aria-pressed={combat.stance === stance} data-debug-kind="stance" data-debug-stance-id={`stance.${stance}`}>{stanceDefinitions[stance].name}</button>)}</div><p className="micro-copy">{stanceDefinitions[combat.stance].description}</p></div>
    <div className="stat-stack"><StatLine label="Attack" value={stats.attack} accent="gold" /><StatLine label="Accuracy" value={stats.accuracy} /><StatLine label="Defense" value={stats.defense} accent="blue" /><StatLine label="Attack interval" value={`${stats.attackInterval.toFixed(1)}s`} /></div>
    <div className="technique-list"><div className="technique-heading"><span className="tiny-label">SUSTAINED TECHNIQUES</span>{drain > 0 && <small>-{drain.toFixed(1)} Energy/s</small>}</div>{(Object.keys(techniqueDefinitions) as TechniqueId[]).map((id) => <button key={id} className={`technique-row ${combat.techniques[id] ? 'is-active' : ''}`} onClick={() => onToggleTechnique(id)} aria-pressed={combat.techniques[id]} title={techniqueDefinitions[id].description} data-debug-kind="technique" data-debug-technique-id={`technique.${id}`}><span className="technique-toggle" /><span><strong>{techniqueDefinitions[id].name}</strong><small>{techniqueDefinitions[id].description}</small></span><em>-{techniqueDefinitions[id].drainPerSecond} E/s</em></button>)}</div>
  </Panel>
}
