import { Activity, Award, BookOpen, Coins, Crosshair, Shield, Swords, Trophy } from 'lucide-react'
import { enemyById } from '../../../game/data/enemies'
import { itemDefinitions } from '../../../game/data/items'
import { combatLocationById } from '../../../game/data/world/combatLocations'
import { enemyFamilyById } from '../../../game/data/world/enemyFamilies'
import { locationBreadcrumb } from '../../../game/world/worldSelectors'
import { calculateHunterCombatStats } from '../../../game/equipment/derivedStats'
import { xpForLevel } from '../../../game/progression/experience'
import { useGameStore } from '../../../state/gameStore'
import { Panel } from '../../components/Panel'
import { ProgressBar } from '../../components/ProgressBar'
import { StatLine } from '../../components/StatLine'
import { ScreenHeading } from '../../shell/ScreenHeading'

export function HomeScreen() {
  const game = useGameStore((state) => state.game)
  const setScreen = useGameStore((state) => state.setScreen)
  const setTrainingFocus = useGameStore((state) => state.setTrainingFocus)
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques)
  const totalLevel = Object.values(game.progression.skills).reduce((sum, skill) => sum + skill.level, 0)
  const totalDefeats = Object.values(game.collection.targets).reduce((sum, entry) => sum + entry.defeats, 0)
  const discoveredTargets = Object.values(game.collection.targets).filter((entry) => entry.discovered).length
  const discoveredItems = game.collection.discoveredItems.length
  const activeLocation = game.combat.combatLocationId ? combatLocationById[game.combat.combatLocationId] : undefined
  const activeFamily = activeLocation ? enemyFamilyById[activeLocation.familyId]?.name : undefined
  return <div className="screen home-screen" data-debug-screen="home">
    <ScreenHeading screen="home" />
    <div className="home-overview-grid">
      <Panel title="Hunter overview" subtitle="Your current combat profile" icon={Shield} panelId="homeOverview" screen="home" className="home-overview">
        <div className="overview-primary"><div className="large-avatar"><Shield size={35} /></div><div><h3>Vanguard</h3><p>Hunter Rank {game.progression.hunterRank} · Combat Level {totalLevel}</p><div className="identity-tags"><span>RANK {game.progression.hunterRank}</span><span>POWER {stats.attack}</span></div></div></div>
        <div className="overview-stats"><StatLine label="Current activity" value={activeLocation ? `${activeLocation.name} · ${activeFamily ?? 'Hunt'} · Group ${game.combat.groupNumber}` : 'Idle'} accent="blue" /><StatLine label="Total kills" value={totalDefeats} accent="gold" /><StatLine label="Training focus" value={game.progression.trainingFocus} /></div>
        <div className="home-hp"><div><span>Current health</span><strong>{Math.floor(game.combat.playerHp)} <small>/ {stats.maxHealth}</small></strong></div><ProgressBar value={(game.combat.playerHp / stats.maxHealth) * 100} variant="health" /></div>
        <button className="button button-primary full-button" onClick={() => setScreen('combat')}><Swords size={15} />{game.combat.phase === 'active' ? 'View live combat' : 'Open combat'}</button>{activeLocation && <p className="home-active-breadcrumb">{locationBreadcrumb(activeLocation.id)}</p>}
      </Panel>
      <Panel title="Combat progression" subtitle="Select one active training focus" icon={Activity} panelId="homeCombatProgression" screen="home">
        <div className="progression-list">{Object.values(game.progression.skills).map((skill) => { const next = xpForLevel(skill.level + 1); const previous = xpForLevel(skill.level); const progress = next === previous ? 100 : ((skill.totalXp - previous) / (next - previous)) * 100; return <button className={`progression-row focus-progression ${game.progression.trainingFocus === skill.id ? 'is-focused' : ''}`} key={skill.id} onClick={() => setTrainingFocus(skill.id)}><div><span>{skill.id}</span><strong>Lv {skill.level}{game.progression.trainingFocus === skill.id ? ' · ACTIVE' : ''}</strong></div><ProgressBar value={Math.max(0, Math.min(100, progress))} variant="experience" showValue /></button> })}</div>
        <div className="next-unlock"><span className="tiny-label">CURRENT RANK</span><strong>Hunter Rank {game.progression.hunterRank}</strong><span>Earn XP from each enemy defeat.</span></div>
      </Panel>
    </div>
    <div className="home-secondary-grid">
      <Panel title="Combat record" subtitle="Permanent gameplay results" icon={Trophy} panelId="homeCombatRecord" screen="home" className="record-panel"><div className="record-grid"><div><strong>{totalDefeats}</strong><span>Total kills</span></div><div><strong>{game.combat.session.highestHit}</strong><span>Highest hit</span></div><div><strong>{game.combat.session.groupClears}</strong><span>Groups cleared</span></div><div><strong>{Math.floor(game.combat.session.damageDealt)}</strong><span>Session damage</span></div></div><div className="record-footer"><span><Award size={14} /> Active focus</span><strong>{game.progression.trainingFocus}</strong></div></Panel>
      <Panel title="Collection record" subtitle="Discoveries from real combat" icon={Crosshair} panelId="homeCollectionRecord" screen="home" className="record-panel"><div className="collection-record"><StatLine label="Items discovered" value={`${discoveredItems} / ${itemDefinitions.length}`} accent="gold" /><ProgressBar value={(discoveredItems / itemDefinitions.length) * 100} variant="experience" /><StatLine label="Targets discovered" value={`${discoveredTargets} / ${Object.keys(enemyById).length}`} accent="blue" /><ProgressBar value={(discoveredTargets / Object.keys(enemyById).length) * 100} variant="resource" /><div className="completion-row"><span>Collection completion</span><strong>{Math.round(((discoveredItems + discoveredTargets) / (itemDefinitions.length + Object.keys(enemyById).length)) * 100)}%</strong></div></div><button className="text-button" onClick={() => setScreen('collection')}>Open collection log <span>→</span></button></Panel>
      <Panel title="Current rewards" subtitle="Inventory-backed loot" icon={Coins} panelId="homeRewards" screen="home" className="record-panel home-rewards"><div className="reward-row"><div className="reward-icon"><Coins size={16} /></div><div><strong>Gold</strong><span>Permanent wallet balance</span></div><em>{game.gold}</em></div><div className="reward-row"><div className="reward-icon reward-blue"><BookOpen size={16} /></div><div><strong>Items discovered</strong><span>Real inventory entries</span></div><em>{discoveredItems}</em></div><div className="reward-row"><div className="reward-icon reward-red"><Crosshair size={16} /></div><div><strong>Targets tracked</strong><span>Bestiary progress</span></div><em>{discoveredTargets}</em></div></Panel>
    </div>
  </div>
}
