import { ChevronRight } from 'lucide-react'
import { navigationItems } from '../navigation'
import { useGameStore } from '../../state/gameStore'

export function Sidebar() {
  const screen = useGameStore((state) => state.screen)
  const setScreen = useGameStore((state) => state.setScreen)
  return (
    <aside className="sidebar" data-ui-region="sidebar" data-debug-screen="shell">
      <div className="brand-block" data-debug-kind="brand" data-debug-label="CombatBound Idle">
        <div className="brand-mark">CB</div>
        <div><strong>COMBATBOUND</strong><span>IDLE</span><small>Combat-focused RPG</small></div>
      </div>
      <nav className="side-nav" aria-label="Primary navigation">
        <p className="nav-caption">COMMAND</p>
        {navigationItems.slice(0, 6).map((item) => {
          const Icon = item.icon
          const active = screen === item.id
          return <button key={item.id} className={`nav-item ${active ? 'is-active' : ''}`} onClick={() => setScreen(item.id)} aria-current={active ? 'page' : undefined} aria-label={item.label} data-debug-kind="navigation-item" data-debug-label={item.label}>
            <Icon size={17} strokeWidth={active ? 2.2 : 1.7} /><span>{item.label}</span>{active && <ChevronRight className="nav-arrow" size={14} />}
          </button>
        })}
        <div className="nav-spacer" />
        <p className="nav-caption">SYSTEM</p>
        {navigationItems.slice(6).map((item) => {
          const Icon = item.icon
          const active = screen === item.id
          return <button key={item.id} className={`nav-item ${active ? 'is-active' : ''}`} onClick={() => setScreen(item.id)} aria-current={active ? 'page' : undefined} aria-label={item.label} data-debug-kind="navigation-item" data-debug-label={item.label}>
            <Icon size={17} strokeWidth={active ? 2.2 : 1.7} /><span>{item.label}</span>{active && <ChevronRight className="nav-arrow" size={14} />}
          </button>
        })}
      </nav>
      <div className="sidebar-footer"><span className="status-dot" />Prototype build <span className="version">0.1</span></div>
    </aside>
  )
}
