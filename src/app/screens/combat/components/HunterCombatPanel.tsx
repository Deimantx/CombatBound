import { Shield } from 'lucide-react'
import { techniqueDefinitions } from '../../../../game/data/techniques'
import { buildTechniqueTooltip } from '../../../../game/presentation/tooltipBuilders'
import type { TechniqueId } from '../../../../game/combat/combatTypes'
import type { GameState } from '../../../../game/gameState'
import type { HunterCombatStats } from '../../../../game/equipment/derivedStats'
import { GameTooltip } from '../../../components/tooltip/GameTooltip'
import { Panel } from '../../../components/Panel'
import { PlaceholderArt } from '../../../components/PlaceholderArt'
import { StatLine } from '../../../components/StatLine'
import { techniqueStaminaDrain } from './combatUi'
import { EffectChips } from './EffectChips'
import { getActiveWeaponProficiency } from '../../../../game/progression/progressionSelectors'
import { proficiencyById } from '../../../../game/data/proficiencies'
import { formatDamageRange } from '../../../../game/presentation/statFormatting'

interface HunterCombatPanelProps {
  game: GameState
  stats: HunterCombatStats
  onToggleTechnique: (id: TechniqueId) => void
}

export function HunterCombatPanel({ game, stats, onToggleTechnique }: HunterCombatPanelProps) {
  const combat = game.combat
  const activeProficiency = getActiveWeaponProficiency(game.progression, game.equipment, game.inventory)
  const drain = techniqueStaminaDrain(combat)
  return <Panel title="Hunter" subtitle="Preparation and derived stats" icon={Shield} panelId="playerCombat" screen="combat" className="player-combat-panel">
    <div className="combat-identity"><PlaceholderArt icon="shield" label="Vanguard" size="medium" variant="blue" /><div><h3>Vanguard</h3><p>{activeProficiency ? `${proficiencyById[activeProficiency.proficiencyId]?.name} · Lv ${activeProficiency.level}` : 'No weapon proficiency'}</p><span className="identity-level">Use the equipped weapon to improve it.</span></div></div>
    <div className="stat-stack"><StatLine label="Weapon Damage" value={formatDamageRange(stats.attackDamageMin ?? stats.attackDamage, stats.attackDamageMax ?? stats.attackDamage)} accent="gold" statKey="attackDamage" statValue={stats.attackDamage} statRange={{ min: stats.attackDamageMin ?? stats.attackDamage, max: stats.attackDamageMax ?? stats.attackDamage }} /><StatLine label="Accuracy Rating" value={Math.round(stats.accuracyRating ?? 0)} statKey="accuracyRating" statValue={stats.accuracyRating ?? 0} /><StatLine label="Armour" value={Math.round(stats.armour ?? 0)} accent="blue" statKey="armour" statValue={stats.armour ?? 0} /><StatLine label="Evasion Rating" value={Math.round(stats.evasionRating ?? 0)} statKey="evasionRating" statValue={stats.evasionRating ?? 0} /><StatLine label="Attack interval" value={`${stats.attackInterval.toFixed(1)}s`} statKey="attackInterval" statValue={stats.attackInterval} /></div>
    <div className="combat-effects-inspector"><div className="section-title"><span className="tiny-label">ACTIVE EFFECTS</span><small>{game.combat.playerEffects.length}</small></div><EffectChips effects={game.combat.playerEffects} debugId="player" /></div>
    <div className="technique-list"><div className="technique-heading"><span className="tiny-label">SUSTAINED TECHNIQUES</span><small>{game.combatAbilities.techniqueSlots.filter(Boolean).length} equipped{drain > 0 ? ` · -${drain.toFixed(1)} Stamina/s` : ""}</small></div>{game.combatAbilities.techniqueSlots.filter((id): id is TechniqueId => Boolean(id)).map((id) => <GameTooltip key={id} content={buildTechniqueTooltip(id)}><button className={`technique-row ${combat.techniques[id] ? 'is-active' : ''}`} onClick={() => onToggleTechnique(id)} aria-pressed={combat.techniques[id]} data-debug-kind="technique" data-debug-technique-id={`technique.${id}`} data-debug-label={techniqueDefinitions[id].name}><span className="technique-toggle" /><span><strong>{techniqueDefinitions[id].name}</strong><small>{techniqueDefinitions[id].description}</small></span><em>-{techniqueDefinitions[id].staminaDrainPerSecond} S/s</em></button></GameTooltip>)}</div>
  </Panel>
}
