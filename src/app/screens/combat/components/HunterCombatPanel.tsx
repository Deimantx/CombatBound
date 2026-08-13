import { Shield } from 'lucide-react'
import { stanceDefinitions } from '../../../../game/data/stances'
import { techniqueDefinitions } from '../../../../game/data/techniques'
import { buildStanceTooltip, buildTechniqueTooltip } from '../../../../game/presentation/tooltipBuilders'
import type { TechniqueId } from '../../../../game/combat/combatTypes'
import type { GameState } from '../../../../game/gameState'
import type { HunterCombatStats } from '../../../../game/equipment/derivedStats'
import { GameTooltip } from '../../../components/tooltip/GameTooltip'
import { Panel } from '../../../components/Panel'
import { PlaceholderArt } from '../../../components/PlaceholderArt'
import { StatLine } from '../../../components/StatLine'
import { techniqueStaminaDrain } from './combatUi'
import { EffectChips } from './EffectChips'

interface HunterCombatPanelProps {
  game: GameState
  stats: HunterCombatStats
  onSetStance: (stance: 'high' | 'mid' | 'low') => void
  onToggleTechnique: (id: TechniqueId) => void
}

export function HunterCombatPanel({ game, stats, onSetStance, onToggleTechnique }: HunterCombatPanelProps) {
  const combat = game.combat
  const totalLevel = Object.values(game.progression.skills).reduce((sum, skill) => sum + skill.level, 0)
  const drain = techniqueStaminaDrain(combat)
  return <Panel title="Hunter" subtitle="Preparation and derived stats" icon={Shield} panelId="playerCombat" screen="combat" className="player-combat-panel">
    <div className="combat-identity"><PlaceholderArt icon="shield" label="Vanguard" size="medium" variant="blue" /><div><h3>Vanguard</h3><p>Hunter Rank {game.progression.hunterRank} · Combat Lv {totalLevel}</p><span className="identity-level">{game.progression.trainingFocus} training</span></div></div>
    <div className="training-row"><span className="tiny-label">TRAINING</span><strong>{game.progression.trainingFocus}</strong><small>Enemy kills award XP here.</small></div>
    <div className="stance-section"><div className="section-title"><span className="tiny-label">STANCE</span><small>{combat.stanceCooldownRemaining > 0 ? `${combat.stanceCooldownRemaining.toFixed(1)}s cooldown` : 'Ready'}</small></div><div className="stance-buttons">{(Object.keys(stanceDefinitions) as Array<'high' | 'mid' | 'low'>).map((stance) => <GameTooltip key={stance} content={buildStanceTooltip(stance)}><button className={combat.stance === stance ? 'stance-button is-active' : 'stance-button'} onClick={() => onSetStance(stance)} disabled={combat.stanceCooldownRemaining > 0} aria-pressed={combat.stance === stance} data-debug-kind="stance" data-debug-stance-id={`stance.${stance}`} data-debug-label={stanceDefinitions[stance].name}>{stanceDefinitions[stance].name}</button></GameTooltip>)}</div><p className="micro-copy">{stanceDefinitions[combat.stance].description}</p></div>
    <div className="stat-stack"><StatLine label="Attack Power" value={stats.attackPower} accent="gold" statKey="attackPower" statValue={stats.attackPower} /><StatLine label="Accuracy" value={Math.round(stats.accuracy)} statKey="accuracy" statValue={stats.accuracy} /><StatLine label="Armor" value={Math.round(stats.armor)} accent="blue" statKey="armor" statValue={stats.armor} /><StatLine label="Evasion" value={Math.round(stats.evasion)} statKey="evasion" statValue={stats.evasion} /><StatLine label="Attack interval" value={`${stats.attackInterval.toFixed(1)}s`} statKey="attackInterval" statValue={stats.attackInterval} /></div>
    <div className="combat-effects-inspector"><div className="section-title"><span className="tiny-label">ACTIVE EFFECTS</span><small>{game.combat.playerEffects.length}</small></div><EffectChips effects={game.combat.playerEffects} debugId="player" /></div>
    <div className="technique-list"><div className="technique-heading"><span className="tiny-label">SUSTAINED TECHNIQUES</span>{drain > 0 && <small>-{drain.toFixed(1)} Stamina/s</small>}</div>{(Object.keys(techniqueDefinitions) as TechniqueId[]).map((id) => <GameTooltip key={id} content={buildTechniqueTooltip(id)}><button className={`technique-row ${combat.techniques[id] ? 'is-active' : ''}`} onClick={() => onToggleTechnique(id)} aria-pressed={combat.techniques[id]} data-debug-kind="technique" data-debug-technique-id={`technique.${id}`} data-debug-label={techniqueDefinitions[id].name}><span className="technique-toggle" /><span><strong>{techniqueDefinitions[id].name}</strong><small>{techniqueDefinitions[id].description}</small></span><em>-{techniqueDefinitions[id].staminaDrainPerSecond} S/s</em></button></GameTooltip>)}</div>
  </Panel>
}
