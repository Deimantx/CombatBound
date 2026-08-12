import { Zap } from 'lucide-react'
import type { GameState } from '../../../../game/gameState'
import { itemById } from '../../../../game/data/items'
import { Panel } from '../../../components/Panel'
import { SegmentedTabs } from '../../../components/SegmentedTabs'

export function HuntSessionOverview({ game, tab, onTabChange }: { game: GameState; tab: 'Session Summary' | 'Rewards' | 'Progression'; onTabChange: (tab: 'Session Summary' | 'Rewards' | 'Progression') => void }) {
  const combat = game.combat
  const summary = tab === 'Session Summary' ? [`Elapsed ${Math.floor(combat.session.elapsedSeconds)}s`, `Groups ${combat.session.groupClears}`, `Kills ${combat.session.enemiesDefeated}`, `Highest Hit ${combat.session.highestHit}`] : tab === 'Rewards' ? [`XP ${combat.session.xpGained}`, `Items ${combat.session.itemsGained}`, `Gold ${combat.session.goldGained}`, `Healing ${combat.session.healing}`] : [`Training ${game.progression.trainingFocus}`, `Hunter Rank ${game.progression.hunterRank}`, `Combat Lv ${Object.values(game.progression.skills).reduce((sum, skill) => sum + skill.level, 0)}`]
  const note = tab === 'Rewards' ? Object.entries(combat.session.lootGained).map(([itemId, quantity]) => `${itemById[itemId]?.name ?? itemId} ×${quantity}`).join(' · ') || 'No loot recorded in this Hunt yet.' : combat.stopReason ? `Last stop: ${combat.stopReason}` : tab === 'Progression' ? 'Each enemy defeat awards XP to the active training focus.' : 'Individual rewards remain permanent across the Hunt session.'
  return <Panel title="Hunt session" subtitle="Persistent rewards and progression" icon={Zap} panelId="combatOverview" screen="combat" className="combat-overview-panel" actions={<SegmentedTabs items={['Session Summary', 'Rewards', 'Progression'] as const} active={tab} onChange={onTabChange} label="Hunt overview" />}><div className="session-strip"><div className="session-stats">{summary.map((value) => <span key={value}>{value}</span>)}</div><div className="overview-note"><span className="status-dot" />{note}</div></div></Panel>
}
