import { useEffect, useState } from 'react'
import { BottomActivityBar } from './BottomActivityBar'
import { Sidebar } from './Sidebar'
import { TopStatusBar } from './TopStatusBar'
import { useGameStore } from '../../state/gameStore'
import { HomeScreen } from '../screens/home/HomeScreen'
import { CombatScreen } from '../screens/combat/CombatScreen'
import { HeroScreen } from '../screens/hero/HeroScreen'
import { ProficienciesScreen } from '../screens/proficiencies/ProficienciesScreen'
import { MiningScreen } from '../screens/mining/MiningScreen'
import { BlacksmithingScreen } from '../screens/blacksmithing/BlacksmithingScreen'
import { InventoryScreen } from '../screens/inventory/InventoryScreen'
import { CollectionScreen } from '../screens/collection/CollectionScreen'
import { SettingsScreen } from '../screens/settings/SettingsScreen'
import { InfoScreen } from '../screens/info/InfoScreen'
import { UiInspector } from '../debug/ui-inspector/UiInspector'
import { readInspectorPreferences, writeInspectorPreferences } from '../debug/ui-inspector/uiInspectorPreferences'
import { DevToolsHost } from '../debug/devtools/DevToolsHost'
import { useDevToolsRuntimeStore } from '../debug/devtools/devToolsRuntimeStore'
import { SimulationDriver } from '../simulation/SimulationDriver'

export function AppShell() {
  const screen = useGameStore((state) => state.screen)
  const reducedMotion = useGameStore((state) => state.reducedMotion)
  const showInspectorButton = useGameStore((state) => state.showInspectorButton)
  const setReducedMotion = useGameStore((state) => state.setReducedMotion)
  const setShowInspectorButton = useGameStore((state) => state.setShowInspectorButton)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const openDebugConsole = useDevToolsRuntimeStore((state) => state.openConsole)

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

  const content = { home: <HomeScreen />, combat: <CombatScreen />, hero: <HeroScreen />, proficiencies: <ProficienciesScreen />, mining: <MiningScreen />, blacksmithing: <BlacksmithingScreen />, inventory: <InventoryScreen />, collection: <CollectionScreen />, settings: <SettingsScreen />, info: <InfoScreen /> }[screen]

  return <div className="app-shell"><SimulationDriver /><Sidebar /><div className="app-frame"><TopStatusBar onInspect={() => setInspectorOpen(true)} onDebug={openDebugConsole} /><main className="screen-content" data-ui-region="content">{content}</main><BottomActivityBar /></div>{inspectorOpen && <UiInspector onExit={() => setInspectorOpen(false)} />}<DevToolsHost /></div>
}
