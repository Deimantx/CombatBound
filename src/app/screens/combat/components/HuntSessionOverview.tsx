import { Zap } from 'lucide-react'
import type { GameState } from '../../../../game/gameState'
import { itemById } from '../../../../game/data/items'
import { proficiencyById } from '../../../../game/data/proficiencies'
import { perkById } from '../../../../game/data/proficiencyPerks'
import { getActiveWeaponProficiency } from '../../../../game/progression/progressionSelectors'
import { calculateAvailablePerkPoints, masteryLevelForXp } from '../../../../game/progression/masteryProgression'
import { Panel } from '../../../components/Panel'
import { SegmentedTabs } from '../../../components/SegmentedTabs'

export function HuntSessionOverview({ game, tab, onTabChange }: { game: GameState; tab: 'Session Summary' | 'Rewards' | 'Progression'; onTabChange: (tab: 'Session Summary' | 'Rewards' | 'Progression') => void }) {
  const combat = game.combat
  const activeWeapon = getActiveWeaponProficiency(game.progression, game.equipment)
  const proficiencyRewards = Object.entries(combat.session.proficiencyXpGained).filter(([, amount]) => amount > 0).map(([id, amount]) => `${proficiencyById[id]?.name ?? id} +${Math.floor(amount)}`).join(' · ') || 'No proficiency XP'
  const summary = tab === 'Session Summary' ? [`Elapsed ${Math.floor(combat.session.elapsedSeconds)}s`, `Groups ${combat.session.groupClears}`, `Kills ${combat.session.enemiesDefeated}`, `Highest Hit ${combat.session.highestHit}`] : tab === 'Rewards' ? [proficiencyRewards, `Mastery XP ${Math.floor(combat.session.masteryXpGained)}`, `Items ${combat.session.itemsGained}`, `Gold ${combat.session.goldGained}`] : [`Mastery Lv ${masteryLevelForXp(game.progression.masteryXp)}`, activeWeapon ? `${proficiencyById[activeWeapon.proficiencyId].name} Lv ${activeWeapon.level}` : 'No active weapon proficiency', `Available perk points ${calculateAvailablePerkPoints(game.progression, perkById)}`]
  const note = tab === 'Rewards' ? Object.entries(combat.session.lootGained).map(([itemId, quantity]) => `${itemById[itemId]?.name ?? itemId} ×${quantity}`).join(' · ') || 'No loot recorded in this Hunt yet.' : combat.stopReason ? `Last stop: ${combat.stopReason}` : tab === 'Progression' ? 'Weapons and magic award their own Proficiency XP; every point also awards global Mastery XP.' : 'Individual rewards remain permanent across the Hunt session.'
  return <Panel title="Hunt session" subtitle="Persistent rewards and progression" icon={Zap} panelId="combatOverview" screen="combat" className="combat-overview-panel" actions={<SegmentedTabs items={['Session Summary', 'Rewards', 'Progression'] as const} active={tab} onChange={onTabChange} label="Hunt overview" />}><div className="session-strip"><div className="session-stats">{summary.map((value) => <span key={value}>{value}</span>)}</div><div className="overview-note"><span className="status-dot" />{note}</div></div></Panel>
}
