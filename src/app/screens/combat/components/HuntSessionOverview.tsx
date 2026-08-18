import { Zap } from 'lucide-react'
import type { GameState } from '../../../../game/gameState'
import { itemById } from '../../../../game/data/items'
import { perkById } from '../../../../game/data/proficiencyPerks'
import { proficiencyById } from '../../../../game/data/proficiencies'
import type { CombatProficiencyId } from '../../../../game/progression/progressionTypes'
import { calculateAvailablePerkPoints, getMasteryLevelProgress } from '../../../../game/progression/masteryProgression'
import { getProficiencyLevelProgress } from '../../../../game/progression/proficiencyProgression'
import { getHuntSessionRates, type HuntSessionRates } from '../../../../game/combat/combatSelectors'
import { Panel } from '../../../components/Panel'
import { ProgressBar } from '../../../components/ProgressBar'
import { SegmentedTabs } from '../../../components/SegmentedTabs'
import { SessionMetric } from './SessionMetric'
import { GameTooltip } from '../../../components/tooltip/GameTooltip'
import { PlaceholderArt } from '../../../components/PlaceholderArt'

type SessionTab = 'Session Summary' | 'Loot' | 'Progression'

interface ProficiencyHuntProgress {
  id: CombatProficiencyId
  name: string
  gainedXp: number
  totalXp: number
  xpPerHour: number
  progress: ReturnType<typeof getProficiencyLevelProgress>
}

export function HuntSessionOverview({ game, tab, onTabChange }: { game: GameState; tab: SessionTab; onTabChange: (tab: SessionTab) => void }) {
  const combat = game.combat
  const session = combat.session
  const rates = getHuntSessionRates(session)
  const sampleValue = (value: string) => rates.rateSampleReady ? value : '—'
  const masteryProgress = getMasteryLevelProgress(game.progression.masteryXp)
  const proficiencyProgress = Object.entries(session.proficiencyXpGained)
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => {
      const proficiencyId = id as CombatProficiencyId
      const definition = proficiencyById[proficiencyId]
      if (!definition) return null
      const totalXp = game.progression.proficiencies[proficiencyId]?.totalXp ?? 0
      return {
        id: proficiencyId,
        name: definition.name,
        gainedXp: amount,
        totalXp,
        xpPerHour: rates.proficiencyXpPerHourById[proficiencyId] ?? 0,
        progress: getProficiencyLevelProgress(totalXp, definition.maxLevel),
      }
    })
    .filter((entry): entry is ProficiencyHuntProgress => entry !== null)
    .sort((first, second) => first.name.localeCompare(second.name))

  const summaryMetrics = [
    metric('Elapsed', formatElapsed(session.elapsedSeconds), 'elapsed', 'Current Hunt elapsed time, including combat and recovery.'),
    metric('Kills', session.enemiesDefeated, 'kills', 'Enemies defeated during this Hunt.'),
    metric('Groups', session.groupClears, 'groups', 'Enemy groups cleared during this Hunt.'),
    metric('DPS', formatRate(rates.dps), 'dps', 'Average damage dealt per second across the current Hunt, including recovery periods.'),
    metric('Kills / hr', sampleValue(formatRate(rates.killsPerHour)), 'kills-per-hour', 'Projected enemy defeats per hour based on the current Hunt session. Rate estimates appear after 10 seconds of Hunt data.'),
    metric('Avg Kill', rates.averageKillSeconds === null ? '—' : formatDuration(rates.averageKillSeconds), 'average-kill-seconds', 'Average elapsed Hunt time per defeated enemy.'),
  ]
  const lootMetrics = [
    metric('Gold', session.goldGained, 'gold', 'Gold gained during this Hunt.'),
    metric('Gold / hr', sampleValue(formatRate(rates.goldPerHour)), 'gold-per-hour', 'Projected Gold per hour based on the current Hunt session.'),
    metric('Items', session.itemsGained, 'items', 'Item quantities gained during this Hunt.'),
    metric('Items / hr', sampleValue(formatRate(rates.itemsPerHour)), 'items-per-hour', 'Projected item quantities per hour based on the current Hunt session.'),
  ]
  const lootBreakdown = Object.entries(session.lootGained).filter(([, quantity]) => quantity > 0)
  const note = !rates.rateSampleReady ? 'Collecting rate data — hourly projections appear after 10 seconds.' : combat.stopReason ? `Last stop: ${combat.stopReason}` : tab === 'Loot' ? 'Loot totals are permanent; hourly values are projections from this Hunt.' : tab === 'Progression' ? 'Only Proficiencies that gained XP during this Hunt are shown.' : 'Cumulative metrics include combat and recovery time.'

  return <Panel title="Hunt session" subtitle="Persistent rewards and progression" icon={Zap} panelId="combatOverview" screen="combat" className="combat-overview-panel" actions={<SegmentedTabs items={['Session Summary', 'Loot', 'Progression'] as const} active={tab} onChange={onTabChange} label="Hunt overview" />}>
    <div className="session-analytics" data-debug-kind="hunt-session-analytics">
      {tab === 'Session Summary' && <div className="session-metric-grid">{summaryMetrics.map((entry) => <SessionMetric key={entry.metric} {...entry} />)}</div>}
      {tab === 'Loot' && <>
        <div className="session-metric-grid">{lootMetrics.map((entry) => <SessionMetric key={entry.metric} {...entry} />)}</div>
        <div className="session-breakdown loot-breakdown combatbound-scroll" data-debug-kind="loot-breakdown">
          <div className="session-breakdown-column"><span className="tiny-label">LOOT BREAKDOWN</span>{lootBreakdown.length > 0 ? <div className="session-breakdown-list" role="list" aria-label="Loot breakdown">{lootBreakdown.map(([id, quantity]) => { const item = itemById[id]; if (!item) return null; return <GameTooltip key={id} content={{ id: item.id, icon: item.icon, title: item.name, subtitle: item.category, description: item.description, rows: [{ label: "Quantity", value: `x${quantity}`, tone: "gold" }] }}><span role="listitem"><PlaceholderArt icon={item.icon} size="small" variant="gold" /><strong>{item.name}</strong><strong>x{quantity}</strong></span></GameTooltip>; })}</div> : <small>No loot recorded in this Hunt yet.</small>}</div>
        </div>
      </>}
      {tab === 'Progression' && <ProgressionTab game={game} rates={rates} masteryProgress={masteryProgress} proficiencyProgress={proficiencyProgress} />}
      <div className="overview-note"><span className="status-dot" />{note}</div>
    </div>
  </Panel>
}

function ProgressionTab({ game, rates, masteryProgress, proficiencyProgress }: { game: GameState; rates: HuntSessionRates; masteryProgress: ReturnType<typeof getMasteryLevelProgress>; proficiencyProgress: ProficiencyHuntProgress[] }) {
  return <div className="progression-session" data-debug-kind="hunt-progression-session">
    <div className="progression-section" data-debug-kind="mastery-progression">
      <div className="progression-section-heading"><span className="tiny-label">MASTERY PROGRESSION</span><strong>Lv {masteryProgress.level}</strong></div>
      <ProgressionLevelBar label="Mastery XP" progress={masteryProgress} kind="mastery" />
      <div className="progression-value-grid"><ProgressionValue label="Mastery XP" value={formatInteger(game.progression.masteryXp)} /><ProgressionValue label="Mastery XP / hr" value={rates.rateSampleReady ? formatRate(rates.masteryXpPerHour) : '—'} /><ProgressionValue label="Mastery ETA to next Level" value={formatEta(masteryProgress.xpToNextLevel, rates.masteryXpPerHour, rates.rateSampleReady, masteryProgress.isMaxLevel)} /></div>
    </div>
    <div className="progression-section proficiency-progress-section" data-debug-kind="proficiency-progression">
      <div className="progression-section-heading"><span className="tiny-label">PROFICIENCY XP</span><strong>{proficiencyProgress.length} active</strong></div>
      {proficiencyProgress.length > 0 ? <div className="proficiency-progress-list">{proficiencyProgress.map((entry) => <div className="proficiency-progress-card" key={entry.id} data-debug-kind="hunt-proficiency-progress" data-debug-proficiency-id={entry.id}><div className="proficiency-progress-heading"><strong>{entry.name}</strong><span>+{formatInteger(entry.gainedXp)} this Hunt</span></div><ProgressionLevelBar label="Proficiency XP" progress={entry.progress} kind={`proficiency-${entry.id}`} /><div className="progression-value-grid"><ProgressionValue label="Proficiency XP" value={formatInteger(entry.totalXp)} /><ProgressionValue label="Proficiency XP / hr" value={rates.rateSampleReady ? formatRate(entry.xpPerHour) : '—'} /><ProgressionValue label="Proficiency ETA to next level" value={formatEta(entry.progress.xpToNextLevel, entry.xpPerHour, rates.rateSampleReady, entry.progress.isMaxLevel)} /></div></div>)}</div> : <small className="progression-empty">Proficiency progress appears after this Hunt awards XP.</small>}
    </div>
    <div className="progression-utility"><span>Available Perk Points</span><strong>{calculateAvailablePerkPoints(game.progression, perkById)}</strong></div>
  </div>
}

function ProgressionLevelBar({ label, progress, kind }: { label: string; progress: { level: number; progressFraction: number; isMaxLevel: boolean }; kind: string }) {
  const percent = Math.round(progress.progressFraction * 100)
  return <div className="progression-level-bar" data-debug-kind="progression-level-bar" data-debug-progress-kind={kind}><div className="progression-level-bar-heading"><span>{label}</span><strong>{progress.isMaxLevel ? 'MAX LEVEL' : `${progress.level} → ${progress.level + 1}`}</strong></div><div className="progression-level-bar-labels"><span>{progress.level}</span><strong>{percent}%</strong><span>{progress.isMaxLevel ? 'MAX' : progress.level + 1}</span></div><ProgressBar value={percent} variant="experience" ariaLabel={`${label} level ${progress.level} progress`} /></div>
}

function ProgressionValue({ label, value }: { label: string; value: string | number }) {
  return <div className="progression-value"><span>{label}</span><strong>{value}</strong></div>
}

function formatEta(xpToNextLevel: number, xpPerHour: number, rateReady: boolean, isMaxLevel: boolean) {
  if (isMaxLevel) return 'MAX LEVEL'
  if (!rateReady || xpPerHour <= 0 || xpToNextLevel <= 0) return '—'
  const minutes = (xpToNextLevel / xpPerHour) * 60
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${Math.ceil(minutes)}m`
  const hours = minutes / 60
  if (hours < 24) return `${hours.toFixed(1)}h`
  const days = Math.floor(hours / 24)
  return `${days}d ${Math.round(hours % 24)}h`
}

function metric(label: string, value: string | number, metricId: string, description: string) {
  return { label, value, metric: metricId, tooltip: { id: `combat.session.${metricId}`, title: label, description, subtitle: 'Hunt session analytics' } }
}

function formatInteger(value: number) { return Math.floor(Math.max(0, value)).toLocaleString() }
function formatElapsed(seconds: number) { const safe = Math.max(0, Math.floor(seconds)); const minutes = Math.floor(safe / 60); return minutes > 0 ? `${minutes}m ${safe % 60}s` : `${safe}s` }
function formatDuration(seconds: number) { return `${seconds.toFixed(1)}s` }
function formatRate(value: number) { const safe = Math.max(0, value); if (safe >= 1000) return `${(safe / 1000).toFixed(safe >= 10000 ? 0 : 1)}k`; if (safe >= 100) return `${Math.round(safe)}`; return safe.toFixed(1) }
