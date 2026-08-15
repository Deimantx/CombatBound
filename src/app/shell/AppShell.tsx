import { useEffect, useState } from 'react'
import { BottomActivityBar } from './BottomActivityBar'
import { Sidebar } from './Sidebar'
import { TopStatusBar } from './TopStatusBar'
import { useGameStore } from '../../state/gameStore'
import { HomeScreen } from '../screens/home/HomeScreen'
import { CombatScreen } from '../screens/combat/CombatScreen'
import { HeroScreen } from '../screens/hero/HeroScreen'
import { ProficienciesScreen } from '../screens/proficiencies/ProficienciesScreen'
import { InventoryScreen } from '../screens/inventory/InventoryScreen'
import { CollectionScreen } from '../screens/collection/CollectionScreen'
import { SettingsScreen } from '../screens/settings/SettingsScreen'
import { InfoScreen } from '../screens/info/InfoScreen'
import { UiInspector } from '../debug/ui-inspector/UiInspector'
import { readInspectorPreferences, writeInspectorPreferences } from '../debug/ui-inspector/uiInspectorPreferences'
import { DebugAdminPanel } from '../debug/admin/DebugAdminPanel'

export function AppShell() {
  const screen = useGameStore((state) => state.screen)
  const combatActive = useGameStore((state) => state.combatActive)
  const outOfCombatRecoveryActive = useGameStore((state) => {
    const combat = state.game.combat
    if (combat.phase !== 'inactive' && combat.phase !== 'stopped') return false
    return combat.playerHp < combat.maxPlayerHp || combat.stamina < combat.maxStamina || combat.mana < combat.maxMana
  })
  const tickCombat = useGameStore((state) => state.tickCombat)
  const reducedMotion = useGameStore((state) => state.reducedMotion)
  const showInspectorButton = useGameStore((state) => state.showInspectorButton)
  const setReducedMotion = useGameStore((state) => state.setReducedMotion)
  const setShowInspectorButton = useGameStore((state) => state.setShowInspectorButton)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)

  useEffect(() => {
    if (!combatActive && !outOfCombatRecoveryActive) return
    const interval = window.setInterval(() => tickCombat(0.1), 100)
    return () => window.clearInterval(interval)
  }, [combatActive, outOfCombatRecoveryActive, tickCombat])

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false'
  }, [reducedMotion])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('combatbound-idle-settings')
      const saved = raw ? JSON.parse(raw) as { reducedMotion?: boolean; showInspectorButton?: boolean } : {}
      setReducedMotion(saved.reducedMotion === true)
      setShowInspectorButton(saved.showInspectorButton ?? readInspectorPreferences().showButton)
    } catch {
      setShowInspectorButton(readInspectorPreferences().showButton)
    }
  }, [setReducedMotion, setShowInspectorButton])

  useEffect(() => {
    localStorage.setItem('combatbound-idle-settings', JSON.stringify({ reducedMotion, showInspectorButton }))
    writeInspectorPreferences({ showButton: showInspectorButton })
  }, [reducedMotion, showInspectorButton])

  const content = { home: <HomeScreen />, combat: <CombatScreen />, hero: <HeroScreen />, proficiencies: <ProficienciesScreen />, inventory: <InventoryScreen />, collection: <CollectionScreen />, settings: <SettingsScreen />, info: <InfoScreen /> }[screen]

  return <div className="app-shell"><Sidebar /><div className="app-frame"><TopStatusBar onInspect={() => setInspectorOpen(true)} onDebug={() => setDebugOpen(true)} /><main className="screen-content" data-ui-region="content">{content}</main><BottomActivityBar /></div>{inspectorOpen && <UiInspector onExit={() => setInspectorOpen(false)} />}{debugOpen && import.meta.env.DEV && <DebugAdminPanel onClose={() => setDebugOpen(false)} />}</div>
}
