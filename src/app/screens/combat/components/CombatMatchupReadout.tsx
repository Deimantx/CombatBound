import type { GameState } from '../../../../game/gameState'
import { getSelectedTargetMatchup, type CombatMatchupView } from '../../../../game/combat/combatSelectors'
import type { HunterCombatStats } from '../../../../game/equipment/derivedStats'
import type { EnemyCombatInstance } from '../../../../game/combat/combatTypes'
import { formatPercent } from './combatUi'
import { GameTooltip } from '../../../components/tooltip/GameTooltip'

export function CombatMatchupReadout({ game, stats, selectedEnemy }: { game: GameState; stats: HunterCombatStats; selectedEnemy?: EnemyCombatInstance }) {
  const matchup = getSelectedTargetMatchup(game.combat, stats, game.progression, selectedEnemy)
  return <div className="combat-matchup" data-debug-kind="combat-matchup" data-debug-hit-chance={matchup?.playerHitChance ?? ''} data-debug-enemy-hit-chance={matchup?.enemyHitChance ?? ''}>
    <span className="tiny-label">TARGETING</span>
    {matchup ? <>
      <strong className="combat-matchup-target">{matchup.targetName}</strong>
      <MatchupMetric label="Hit Chance" value={formatPercent(matchup.playerHitChance)} tone="gold" tooltip={{ id: 'combat.matchup-hit-chance', title: 'Hit Chance', description: 'Your Accuracy Rating is compared against the target Evasion Rating. Blocks are resolved separately and spells bypass Accuracy.', rows: [{ label: 'Your Accuracy Rating', value: `${Math.round(matchup.playerAccuracy)}`, tone: 'blue' }, { label: 'Target Evasion Rating', value: `${Math.round(matchup.targetEvasion)}`, tone: 'blue' }, { label: 'Result', value: formatPercent(matchup.playerHitChance), tone: 'gold' }] }} />
      <MatchupMetric label="Target Evasion" value={`${Math.round(matchup.targetEvasion)}`} />
      <MatchupMetric label="Attack Block" value={formatPercent(matchup.targetAttackBlockChance)} />
      <MatchupMetric label="Spell Block" value={formatPercent(matchup.targetSpellBlockChance)} />
      <MatchupMetric label="Spell Suppression" value={formatPercent(matchup.targetSpellSuppressionChance)} />
      <MatchupMetric label="Enemy Hit Chance" value={formatPercent(matchup.enemyHitChance)} tone="red" tooltip={{ id: 'combat.matchup-enemy-hit-chance', title: 'Enemy Hit Chance', description: 'The selected enemy Accuracy compared against your effective Evasion.', rows: [{ label: 'Enemy Accuracy', value: `${Math.round(matchup.enemyAccuracy)}`, tone: 'red' }, { label: 'Your Evasion', value: `${Math.round(matchup.playerEvasion)}`, tone: 'blue' }, { label: 'Result', value: formatPercent(matchup.enemyHitChance), tone: 'red' }] }} />
      <MatchupMetric label="Crit Chance" value={formatPercent(matchup.playerCritChance)} />
    </> : <div className="combat-matchup-empty"><strong>No active target</strong><small>Select an enemy to view matchup.</small></div>}
  </div>
}

export function MatchupSummary({ matchup }: { matchup: CombatMatchupView }) {
  return <div className="target-matchup-strip" data-debug-kind="combat-matchup-summary"><span>YOUR HIT <strong>{formatPercent(matchup.playerHitChance)}</strong></span><span>THEIR HIT <strong>{formatPercent(matchup.enemyHitChance)}</strong></span></div>
}

function MatchupMetric({ label, value, tone = 'default', tooltip }: { label: string; value: string; tone?: 'default' | 'gold' | 'red'; tooltip?: Parameters<typeof GameTooltip>[0]['content'] }) {
  const content = <div className={`combat-matchup-row is-${tone}`}><span>{label}</span><strong>{value}</strong></div>
  return tooltip ? <GameTooltip content={tooltip}>{content}</GameTooltip> : content
}
