import { Award, BookOpen, Coins, Crosshair, Shield, Sparkles, Swords, Trophy } from 'lucide-react'
import { enemyById } from '../../../game/data/enemies'
import { itemDefinitions } from '../../../game/data/items'
import { proficiencyById } from '../../../game/data/proficiencies'
import { calculateAvailablePerkPoints, calculateEarnedPerkPoints, masteryLevelForXp } from '../../../game/progression/masteryProgression'
import { getActiveWeaponProficiency } from '../../../game/progression/progressionSelectors'
import { getProficiencyLevel, getProficiencyProgress, getProficiencyXpToNextLevel, proficiencyXpForLevel } from '../../../game/progression/proficiencyProgression'
import { combatLocationById } from '../../../game/data/world/combatLocations'
import { enemyFamilyById } from '../../../game/data/world/enemyFamilies'
import { locationBreadcrumb } from '../../../game/world/worldSelectors'
import { calculateHunterCombatStats } from '../../../game/equipment/derivedStats'
import { useGameStore } from '../../../state/gameStore'
import { Panel } from '../../components/Panel'
import { ProgressBar } from '../../components/ProgressBar'
import { StatLine } from '../../components/StatLine'
import { ScreenHeading } from '../../shell/ScreenHeading'
import { proficiencyPerkDefinitions } from '../../../game/data/proficiencyPerks'

export function HomeScreen() {
  const game = useGameStore((state) => state.game)
  const setScreen = useGameStore((state) => state.setScreen)
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques)
  const active = getActiveWeaponProficiency(game.progression, game.equipment)
  const activeDefinition = active ? proficiencyById[active.proficiencyId] : undefined
  const activeProgress = active ? getProficiencyProgress(game.progression, active.proficiencyId) : undefined
  const level = active ? getProficiencyLevel(game.progression, active.proficiencyId) : 0
  const xp = activeProgress?.totalXp ?? 0
  const currentThreshold = level > 0 ? proficiencyXpForLevel(level) : 0
  const nextThreshold = level >= 100 ? currentThreshold : proficiencyXpForLevel(Math.max(1, level + 1))
  const proficiencyPercent = nextThreshold <= currentThreshold ? 100 : ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100
  const earnedPoints = calculateEarnedPerkPoints(game.progression.masteryXp)
  const availablePoints = calculateAvailablePerkPoints(game.progression, Object.fromEntries(proficiencyPerkDefinitions.map((perk) => [perk.id, perk])))
  const totalDefeats = Object.values(game.collection.targets).reduce((sum, entry) => sum + entry.defeats, 0)
  const discoveredTargets = Object.values(game.collection.targets).filter((entry) => entry.discovered).length
  const discoveredItems = game.collection.discoveredItems.length
  const activeLocation = game.combat.combatLocationId ? combatLocationById[game.combat.combatLocationId] : undefined
  const activeFamily = activeLocation ? enemyFamilyById[activeLocation.familyId]?.name : undefined

  return <div className="screen home-screen" data-debug-screen="home">
    <ScreenHeading screen="home" />
    <div className="home-overview-grid">
      <Panel title="Hunter overview" subtitle="Your current combat profile" icon={Shield} panelId="homeOverview" screen="home" className="home-overview">
        <div className="overview-primary"><div className="large-avatar"><Shield size={35} /></div><div><h3>Vanguard</h3><p>{activeDefinition?.name ?? 'No weapon proficiency'} · {stats.attackPower} Attack Power</p><div className="identity-tags"><span>MASTERY {Math.floor(game.progression.masteryXp).toLocaleString()} XP</span><span>POWER {stats.attack}</span></div></div></div>
        <div className="overview-stats"><StatLine label="Current activity" value={activeLocation ? `${activeLocation.name} · ${activeFamily ?? 'Hunt'} · Group ${game.combat.groupNumber}` : 'Idle'} accent="blue" /><StatLine label="Total kills" value={totalDefeats} accent="gold" /><StatLine label="Active proficiency" value={activeDefinition ? `${activeDefinition.name} · Lv ${level}` : 'Untrained'} /></div>
        <div className="home-hp"><div className="home-hp-heading"><span>Current health</span><strong>{Math.floor(game.combat.playerHp)} <small>/ {stats.maxHealth}</small></strong></div><ProgressBar value={(game.combat.playerHp / stats.maxHealth) * 100} variant="health" ariaLabel={`Player health ${Math.floor(game.combat.playerHp)} of ${stats.maxHealth}`} /></div>
        <button className="button button-primary full-button" onClick={() => setScreen('combat')}><Swords size={15} />{game.combat.phase === 'active' ? 'View live combat' : 'Open combat'}</button>{activeLocation && <p className="home-active-breadcrumb">{locationBreadcrumb(activeLocation.id)}</p>}
      </Panel>
      <Panel title="Combat Mastery" subtitle="Weapon use becomes permanent progression" icon={Sparkles} panelId="homeCombatMastery" screen="home">
        <div className="mastery-home-grid"><div><span className="tiny-label">MASTERY LEVEL</span><strong>Lv {masteryLevelForXp(game.progression.masteryXp)}</strong></div><div><span className="tiny-label">MASTERY XP</span><strong>{Math.floor(game.progression.masteryXp).toLocaleString()}</strong></div><div><span className="tiny-label">PERK POINTS</span><strong>{availablePoints}</strong><small>{earnedPoints} earned</small></div></div>
        <div className="active-proficiency-home"><span className="tiny-label">ACTIVE WEAPON PROFICIENCY</span><strong>{activeDefinition ? `${activeDefinition.name} · Lv ${level}` : 'UNTRAINED'}</strong><small>{active ? `${getProficiencyXpToNextLevel(game.progression, active.proficiencyId).toLocaleString()} XP to next level` : 'Equip a weapon to begin.'}</small>{activeDefinition && <ProgressBar value={Math.max(0, Math.min(100, proficiencyPercent))} variant="experience" ariaLabel="Active proficiency progress" />}</div>
        <button className="button button-ghost full-button" onClick={() => setScreen('proficiencies')}><Award size={15} />Open Proficiencies</button>
      </Panel>
    </div>
    <div className="home-secondary-grid">
      <Panel title="Combat record" subtitle="Permanent gameplay results" icon={Trophy} panelId="homeCombatRecord" screen="home" className="record-panel"><div className="record-grid"><div><strong>{totalDefeats}</strong><span>Total kills</span></div><div><strong>{game.combat.session.highestHit}</strong><span>Highest hit</span></div><div><strong>{game.combat.session.groupClears}</strong><span>Groups cleared</span></div><div><strong>{Math.floor(game.combat.session.damageDealt)}</strong><span>Session damage</span></div></div><div className="record-footer"><span><Award size={14} /> Active proficiency</span><strong>{activeDefinition?.name ?? 'Untrained'}</strong></div></Panel>
      <Panel title="Collection record" subtitle="Discoveries from real combat" icon={Crosshair} panelId="homeCollectionRecord" screen="home" className="record-panel"><div className="collection-record"><StatLine label="Items discovered" value={`${discoveredItems} / ${itemDefinitions.length}`} accent="gold" /><ProgressBar value={(discoveredItems / itemDefinitions.length) * 100} variant="experience" ariaLabel="Items discovered progress" /><StatLine label="Targets discovered" value={`${discoveredTargets} / ${Object.keys(enemyById).length}`} accent="blue" /><ProgressBar value={(discoveredTargets / Object.keys(enemyById).length) * 100} variant="resource" ariaLabel="Targets discovered progress" /><div className="completion-row"><span>Collection completion</span><strong>{Math.round(((discoveredItems + discoveredTargets) / (itemDefinitions.length + Object.keys(enemyById).length)) * 100)}%</strong></div></div><button className="text-button" onClick={() => setScreen('collection')}>Open collection log <span>→</span></button></Panel>
      <Panel title="Current rewards" subtitle="Inventory-backed loot" icon={Coins} panelId="homeRewards" screen="home" className="record-panel home-rewards"><div className="reward-row"><div className="reward-icon"><Coins size={16} /></div><div><strong>Gold</strong><span>Permanent wallet balance</span></div><em>{game.gold}</em></div><div className="reward-row"><div className="reward-icon reward-blue"><BookOpen size={16} /></div><div><strong>Items discovered</strong><span>Real inventory entries</span></div><em>{discoveredItems}</em></div><div className="reward-row"><div className="reward-icon reward-red"><Crosshair size={16} /></div><div><strong>Targets tracked</strong><span>Bestiary progress</span></div><em>{discoveredTargets}</em></div></Panel>
    </div>
  </div>
}
