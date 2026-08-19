import { useMemo, useState } from 'react'
import { proficiencyDefinitions } from '../../../../game/data/proficiencies'
import { perkById } from '../../../../game/data/proficiencyPerks'
import { getHunterRankProgress, MAX_HUNTER_RANK } from '../../../../game/progression/hunterRankProgression'
import { getPerkPointSummary } from '../../../../game/progression/perkProgression'
import { getProficiencyLevelProgress } from '../../../../game/progression/proficiencyProgression'
import { MAX_PROFICIENCY_LEVEL } from '../../../../game/progression/progressionBalance'
import { buildProficiencyTooltip } from '../../../../game/presentation/tooltipBuilders'
import type { CombatProficiencyId, ProficiencyCategory } from '../../../../game/progression/progressionTypes'
import { DebugButton } from '../components/DebugButton'
import { DebugCatalogueGroup } from '../components/DebugCatalogueGroup'
import { DebugCatalogueIdentity } from '../components/DebugCatalogueIdentity'
import { DebugSection } from '../components/DebugSection'
import type { DebugTabProps, DebugGameState } from '../debugTypes'
import { useGameStore } from '../../../../state/gameStore'

const proficiencyCategories: Array<{ id: ProficiencyCategory; label: string }> = [{ id: 'melee', label: 'Melee' }, { id: 'ranged', label: 'Ranged' }, { id: 'magic', label: 'Magic' }, { id: 'defense', label: 'Defense' }]

export function DebugProgressionTab({ debug, run }: DebugTabProps) {
  const game = useGameStore((state) => state.game)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['debug.proficiencies.melee']))
  const [customPoints, setCustomPoints] = useState('')
  const [bonusPoints, setBonusPoints] = useState('')
  const [rankPoints, setRankPoints] = useState('')
  const rankProgress = getHunterRankProgress(game.progression.hunterRankPoints)
  const query = search.trim().toLowerCase()
  const grouped = useMemo(() => proficiencyCategories.map((category) => ({ ...category, definitions: proficiencyDefinitions.filter((definition) => definition.category === category.id && (definition.id + ' ' + definition.name + ' ' + definition.category + ' ' + definition.description).toLowerCase().includes(query)) })).filter((category) => category.definitions.length > 0), [query])
  const perkPoints = getPerkPointSummary(game.progression, perkById)
  const grant = (amount: number) => run('Granted ' + amount + ' bonus perk points.', () => debug.grantPerkPoints(amount))
  const customAmount = Number(customPoints)
  const bonusAmount = Number(bonusPoints)
  const rankAmount = Number(rankPoints)

  return <div className='debug-tab-content debug-column'>
    <DebugSection title='Hunter Rank' subtitle={'Rank ' + rankProgress.rank + ' - ' + rankProgress.totalPoints.toLocaleString() + ' points - ' + (rankProgress.isMaxRank ? 'MAX RANK' : rankProgress.pointsToNextRank.toLocaleString() + ' to next')}>
      <div className='debug-summary-grid'><div className='debug-summary-card'><span>Current Rank</span><strong>{rankProgress.rank}</strong></div><div className='debug-summary-card'><span>Total Points</span><strong>{rankProgress.totalPoints.toLocaleString()}</strong></div><div className='debug-summary-card'><span>To Next Rank</span><strong>{rankProgress.isMaxRank ? 'MAX' : rankProgress.pointsToNextRank.toLocaleString()}</strong></div></div>
      <div className='debug-button-grid'><DebugButton action='hunter-rank-1' onClick={() => run('Set Hunter Rank to 1.', () => debug.setHunterRank(1))}>RANK 1</DebugButton><DebugButton action='hunter-rank-5' onClick={() => run('Set Hunter Rank to 5.', () => debug.setHunterRank(5))}>RANK 5</DebugButton><DebugButton action='hunter-rank-10' onClick={() => run('Set Hunter Rank to 10.', () => debug.setHunterRank(10))}>RANK 10</DebugButton><DebugButton action='hunter-rank-20' onClick={() => run('Set Hunter Rank to 20.', () => debug.setHunterRank(20))}>RANK 20</DebugButton><DebugButton action='hunter-rank-max' onClick={() => run('Set Hunter Rank to ' + MAX_HUNTER_RANK + '.', () => debug.setHunterRank(MAX_HUNTER_RANK))}>MAX</DebugButton></div>
      <div className='debug-button-row'><DebugButton action='add-hunter-rank-points-1' onClick={() => run('Added 1 Hunter Rank point.', () => debug.addHunterRankPoints(1))}>+1 POINT</DebugButton><DebugButton action='add-hunter-rank-points-10' onClick={() => run('Added 10 Hunter Rank points.', () => debug.addHunterRankPoints(10))}>+10 POINTS</DebugButton><label className='debug-custom-control'>SET POINTS <input value={rankPoints} onChange={(event) => setRankPoints(event.target.value)} inputMode='numeric' aria-label='Hunter Rank points' /><DebugButton action='set-hunter-rank-points' onClick={() => Number.isFinite(rankAmount) && rankAmount >= 0 ? run('Set Hunter Rank points to ' + rankAmount + '.', () => debug.setHunterRankPoints(rankAmount)) : run('Enter a non-negative Hunter Rank point amount.', () => undefined)}>SET</DebugButton></label></div>
    </DebugSection>
    <DebugSection title='Perk Points' subtitle='Bonus perk points are independent from Hunter Rank and Proficiency XP.'>
      <div className='debug-summary-grid debug-perk-summary'><div className='debug-summary-card'><span>Bonus / Granted</span><strong>{perkPoints.bonus}</strong></div><div className='debug-summary-card'><span>Spent</span><strong>{perkPoints.spent}</strong></div><div className='debug-summary-card'><span>Available</span><strong>{perkPoints.available}</strong></div></div>
      <div className='debug-button-row'><DebugButton action='grant-perk-points-1' onClick={() => grant(1)}>+1</DebugButton><DebugButton action='grant-perk-points-5' onClick={() => grant(5)}>+5</DebugButton><DebugButton action='grant-perk-points-10' onClick={() => grant(10)}>+10</DebugButton><DebugButton action='grant-perk-points-25' onClick={() => grant(25)}>+25</DebugButton><DebugButton action='grant-perk-points-100' onClick={() => grant(100)}>+100</DebugButton><label className='debug-custom-control'>CUSTOM AMOUNT <input value={customPoints} onChange={(event) => setCustomPoints(event.target.value)} inputMode='numeric' aria-label='Custom bonus perk point amount' /><DebugButton action='grant-custom-perk-points' onClick={() => Number.isInteger(customAmount) && customAmount > 0 ? grant(customAmount) : run('Enter a positive whole-number bonus amount.', () => undefined)}>GRANT</DebugButton></label><label className='debug-custom-control'>SET BONUS <input value={bonusPoints} onChange={(event) => setBonusPoints(event.target.value)} inputMode='numeric' aria-label='Bonus perk point amount' /><DebugButton action='set-bonus-perk-points' onClick={() => Number.isInteger(bonusAmount) && bonusAmount >= 0 ? run('Set bonus perk points to ' + bonusAmount + '.', () => debug.setBonusPerkPoints(bonusAmount)) : run('Enter a non-negative whole-number bonus amount.', () => undefined)}>SET</DebugButton></label><DebugButton action='reset-bonus-perk-points' onClick={() => run('Reset bonus perk points.', debug.resetBonusPerkPoints)}>RESET BONUS</DebugButton></div>
    </DebugSection>
    <DebugSection title='Proficiencies' subtitle='Direct setters change only Proficiency XP; they never award Hunter Rank points.' actions={<input className='debug-search-input' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search proficiencies...' aria-label='Search proficiencies' data-debug-kind='debug-proficiency-search' />}>
      <div className='debug-button-row'><DebugButton action='set-all-proficiencies-lv-1' onClick={() => run('Set all proficiencies to level 1.', () => debug.setAllProficiencyLevels(1))}>ALL LV 1</DebugButton><DebugButton action='set-all-proficiencies-lv-10' onClick={() => run('Set all proficiencies to level 10.', () => debug.setAllProficiencyLevels(10))}>ALL LV 10</DebugButton><DebugButton action='set-all-proficiencies-max' onClick={() => run('Set all proficiencies to level ' + MAX_PROFICIENCY_LEVEL + '.', () => debug.setAllProficiencyLevels(MAX_PROFICIENCY_LEVEL))}>ALL MAX</DebugButton><DebugButton action='reset-all-proficiencies' onClick={() => run('Reset all proficiencies to level 0.', () => debug.setAllProficiencyLevels(0))}>RESET ALL</DebugButton><DebugButton action='discover-all-proficiencies' onClick={() => run('Discovered all proficiencies.', debug.discoverAllProficiencies)}>DISCOVER ALL</DebugButton></div>
      <div className='debug-catalogue'>{grouped.map((category) => { const id = 'debug.proficiencies.' + category.id; const isOpen = query ? true : expanded.has(id); return <DebugCatalogueGroup key={id} id={id} label={category.label} count={category.definitions.length} icon={category.id === 'melee' ? 'sword' : category.id === 'ranged' ? 'bow' : category.id === 'magic' ? 'spark' : 'shield'} expanded={isOpen} onToggle={() => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })} debugGroupType='proficiency'>{category.definitions.map((definition) => <DebugProficiencyRow key={definition.id} definition={definition} game={game} run={run} debug={debug} />)}</DebugCatalogueGroup> })}</div>
    </DebugSection>
  </div>
}

function DebugProficiencyRow({ definition, game, run, debug }: { definition: (typeof proficiencyDefinitions)[number]; game: DebugGameState; run: DebugTabProps['run']; debug: DebugTabProps['debug'] }) {
  const [level, setLevel] = useState(String(getProficiencyLevelProgress(game.progression.proficiencies[definition.id]?.totalXp ?? 0, definition.maxLevel).level))
  const current = getProficiencyLevelProgress(game.progression.proficiencies[definition.id]?.totalXp ?? 0, definition.maxLevel)
  return <div className='debug-catalogue-row' data-debug-kind='debug-proficiency' data-debug-proficiency-id={definition.id}><DebugCatalogueIdentity tooltip={buildProficiencyTooltip(definition)} icon={definition.icon} kind='debug-proficiency-identity' targetId={definition.id} label={definition.name}><strong>{definition.name}</strong><small>{definition.category} - Lv {current.level} - {(game.progression.proficiencies[definition.id]?.totalXp ?? 0).toLocaleString()} XP</small></DebugCatalogueIdentity><input value={level} onChange={(event) => setLevel(event.target.value)} aria-label={'Set ' + definition.name + ' level'} inputMode='numeric' /><button type='button' onClick={() => run('Set ' + definition.name + ' to level ' + level + '.', () => debug.setProficiencyLevel(definition.id as CombatProficiencyId, Number(level)))} data-debug-kind='debug-action' data-debug-action='set-proficiency-level' data-debug-proficiency-id={definition.id}>SET</button><button type='button' onClick={() => run('Increased ' + definition.name + ' by one level.', () => debug.setProficiencyLevel(definition.id as CombatProficiencyId, current.level + 1))} data-debug-kind='debug-action' data-debug-action='increment-proficiency' data-debug-proficiency-id={definition.id}>+1</button></div>
}
