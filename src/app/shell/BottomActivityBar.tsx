import { ArrowRight, Crosshair, PauseCircle, Swords } from 'lucide-react'
import { effectById } from '../../game/data/effects'
import { getBarrierAmount } from '../../game/combat/combatEffects'
import { combatLocationById } from '../../game/data/world/combatLocations'
import { formatHealthWithBarrier } from '../../game/presentation/statFormatting'
import { enemyFamilyById } from '../../game/data/world/enemyFamilies'
import { useGameStore } from '../../state/gameStore'
import { ProgressBar } from '../components/ProgressBar'

export function BottomActivityBar() {
  const screen = useGameStore((state) => state.screen)
  const combat = useGameStore((state) => state.game.combat)
  const activeCombatLocationId = useGameStore((state) => state.activeCombatLocationId)
  const setScreen = useGameStore((state) => state.setScreen)
  const location = activeCombatLocationId ? combatLocationById[activeCombatLocationId] : undefined
  const family = location ? enemyFamilyById[location.familyId]?.name : undefined
  const alive = combat.enemies.filter((enemy) => !enemy.defeated).length
  const active = combat.phase === 'active' || combat.phase === 'recovery'
  const absorbShield = getBarrierAmount(combat.playerEffects, effectById)
  const playerHealth = formatHealthWithBarrier(combat.playerHp, combat.maxPlayerHp, absorbShield)
  const playerHealthLabel = `Player health ${playerHealth}`

  if (screen === 'combat') return <div className={`activity-bar is-compact ${active ? 'is-combat' : ''}`} data-ui-region="actionStrip" data-debug-kind="persistent-activity" data-debug-label={active ? 'Active combat' : 'Idle activity'}><div className="activity-icon">{active ? <Swords size={15} /> : <PauseCircle size={15} />}</div><div className="activity-copy"><span className="eyebrow">{active ? 'IN COMBAT' : 'IDLE'}</span><strong>{active ? `${location?.name ?? 'Combat Location'} · Group ${combat.groupNumber} · ${alive} alive · HP ${playerHealth}` : 'Choose a Combat Location above.'}</strong></div></div>

  return <button className={`activity-bar ${active ? 'is-combat' : ''}`} onClick={() => setScreen('combat')} data-ui-region="actionStrip" data-debug-kind="persistent-activity" data-debug-label={active ? 'Active combat' : 'Idle activity'}>
    <div className="activity-icon">{active ? <Swords size={17} /> : <PauseCircle size={17} />}</div>
    <div className="activity-copy"><span className="eyebrow">{active ? 'IN COMBAT' : 'IDLE'}</span><strong>{active ? location?.name ?? 'Combat Location' : 'No active Hunt'}</strong><small>{active ? `${family ?? 'Enemy family'} · ${combat.phase === 'recovery' ? `Recovering · next group in ${combat.recoveryRemaining.toFixed(1)}s` : `Group ${combat.groupNumber} · ${alive} enemies alive`}` : 'Choose a Combat Location from the Combat screen.'}</small></div>
    {active && <div className="activity-health"><div className="activity-health-heading"><span><span className="heart-mini">♥</span> {playerHealth}</span><span><Crosshair size={12} /> {alive} alive</span></div><ProgressBar value={(combat.playerHp / combat.maxPlayerHp) * 100} variant="health" ariaLabel={playerHealthLabel} /></div>}
    <span className="activity-action">{active ? 'RETURN TO COMBAT' : 'GO TO COMBAT'} <ArrowRight size={14} /></span>
  </button>
}
