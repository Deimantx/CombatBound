import { ArrowRight, Crosshair, PauseCircle, Pickaxe, Swords } from 'lucide-react'
import { effectById } from '../../game/data/effects'
import { getBarrierAmount } from '../../game/combat/combatEffects'
import { combatLocationById } from '../../game/data/world/combatLocations'
import { formatHealthWithBarrier } from '../../game/presentation/statFormatting'
import { enemyFamilyById } from '../../game/data/world/enemyFamilies'
import { useGameStore } from '../../state/gameStore'
import { ProgressBar } from '../components/ProgressBar'
import { miningStageById } from '../../game/professions/mining/miningData'

export function BottomActivityBar() {
  const screen = useGameStore((state) => state.screen)
  const combat = useGameStore((state) => state.game.combat)
  const mining = useGameStore((state) => state.game.mining)
  const activeCombatLocationId = useGameStore((state) => state.activeCombatLocationId)
  const setScreen = useGameStore((state) => state.setScreen)
  const location = activeCombatLocationId ? combatLocationById[activeCombatLocationId] : undefined
  const family = location ? enemyFamilyById[location.familyId]?.name : undefined
  const active = combat.phase === 'active' || combat.phase === 'recovery'
  const miningActive = mining.active
  const targetName = combat.enemy?.displayName ?? combat.targetEnemyId ?? 'No target'
  const absorbShield = getBarrierAmount(combat.playerEffects, effectById)
  const playerHealth = formatHealthWithBarrier(combat.playerHp, combat.maxPlayerHp, absorbShield)
  const stageName = miningStageById[mining.currentStageId]?.name ?? 'Stage'

  if (screen === 'combat') return <div className={`activity-bar is-compact ${active ? 'is-combat' : miningActive ? 'is-mining' : ''}`} data-ui-region="actionStrip" data-debug-kind="persistent-activity" data-debug-label={active ? 'Active combat' : miningActive ? 'Active mining' : 'Idle activity'}><div className="activity-icon">{active ? <Swords size={15} /> : miningActive ? <Pickaxe size={15} /> : <PauseCircle size={15} />}</div><div className="activity-copy"><span className="eyebrow">{active ? 'IN COMBAT' : miningActive ? 'IN MINING' : 'IDLE'}</span><strong>{active ? `${location?.name ?? 'Combat Location'} - ${targetName} - HP ${playerHealth}` : miningActive ? `Iron Vein - ${stageName}` : 'Choose a Combat Location above.'}</strong></div></div>
  return <button className={`activity-bar ${active ? 'is-combat' : miningActive ? 'is-mining' : ''}`} onClick={() => setScreen(miningActive ? 'mining' : 'combat')} data-ui-region="actionStrip" data-debug-kind="persistent-activity" data-debug-label={active ? 'Active combat' : miningActive ? 'Active mining' : 'Idle activity'}>
    <div className="activity-icon">{active ? <Swords size={17} /> : miningActive ? <Pickaxe size={17} /> : <PauseCircle size={17} />}</div>
    <div className="activity-copy"><span className="eyebrow">{active ? 'IN COMBAT' : miningActive ? 'IN MINING' : 'IDLE'}</span><strong>{active ? location?.name ?? 'Combat Location' : miningActive ? `Iron Vein - ${stageName}` : 'No active Hunt'}</strong><small>{active ? `${family ?? 'Enemy family'} - ${combat.phase === 'recovery' ? `Recovering - next target in ${combat.recoveryRemaining.toFixed(1)}s` : targetName}` : miningActive ? `${mining.mode === 'resting' ? 'Exhausted - rest in progress' : 'Pickaxe Swing'} - Stamina ${Math.ceil(mining.miningStamina)}` : 'Choose a Combat Location from the Combat screen.'}</small></div>
    {active && <div className="activity-health"><div className="activity-health-heading"><span><span className="heart-mini">HP</span> {playerHealth}</span><span><Crosshair size={12} /> {targetName}</span></div><ProgressBar value={(combat.playerHp / combat.maxPlayerHp) * 100} variant="health" ariaLabel={`Player health ${playerHealth}`} /></div>}
    <span className="activity-action">{active ? 'RETURN TO COMBAT' : miningActive ? 'RETURN TO MINING' : 'GO TO COMBAT'} <ArrowRight size={14} /></span>
  </button>
}
