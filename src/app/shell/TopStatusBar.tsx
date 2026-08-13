import { CircleDollarSign, Eye, Heart, Settings, Shield, Sparkles } from 'lucide-react'
import { calculateHunterCombatStats } from '../../game/equipment/derivedStats'
import { masteryLevelForXp } from '../../game/progression/masteryProgression'
import { useGameStore } from '../../state/gameStore'
import { IconButton } from '../components/IconButton'

export function TopStatusBar({ onInspect }: { onInspect: () => void }) {
  const setScreen = useGameStore((state) => state.setScreen)
  const showInspectorButton = useGameStore((state) => state.showInspectorButton)
  const game = useGameStore((state) => state.game)
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques)
  const masteryLevel = masteryLevelForXp(game.progression.masteryXp)
  const playerHp = game.combat.playerHp
  return (
    <header className="topbar" data-ui-region="header" data-debug-screen="shell">
      <div className="player-identity"><div className="avatar-badge"><Shield size={19} /></div><div><strong>Vanguard</strong><span>Mastery Lv {masteryLevel} <i /> Power {stats.attack}</span></div></div>
      <div className="topbar-stats">
        <div className="top-stat"><CircleDollarSign size={15} className="text-gold" /><span>Gold</span><strong>{game.gold.toLocaleString()}</strong></div>
        <div className="top-stat"><Heart size={15} className="text-red" /><span>HP</span><strong>{Math.floor(playerHp).toLocaleString()} <em>/ {stats.maxHealth}</em></strong></div>
        <div className="save-state"><span className="status-dot" />Saved just now</div>
      </div>
      <div className="topbar-actions">
        {import.meta.env.DEV && showInspectorButton && <button className="inspect-button" onClick={onInspect} data-debug-kind="inspector-control" data-debug-label="Inspect UI"><Eye size={15} />Inspect UI</button>}
        <IconButton icon={Settings} label="Open Settings" onClick={() => setScreen('settings')} />
      </div>
      <div className="topbar-glint"><Sparkles size={12} /></div>
    </header>
  )
}
