import { Monitor, RotateCcw, Settings as SettingsIcon, Volume2, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useGameStore } from '../../../state/gameStore'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Panel } from '../../components/Panel'
import { Toggle } from '../../components/Toggle'
import { ScreenHeading } from '../../shell/ScreenHeading'

export function SettingsScreen() {
  const reducedMotion = useGameStore((state) => state.reducedMotion)
  const setReducedMotion = useGameStore((state) => state.setReducedMotion)
  const showInspectorButton = useGameStore((state) => state.showInspectorButton)
  const setShowInspectorButton = useGameStore((state) => state.setShowInspectorButton)
  const resetGameplay = useGameStore((state) => state.resetGameplay)
  const [dialogOpen, setDialogOpen] = useState(false)
  return <div className="screen settings-screen" data-debug-screen="settings">
    <ScreenHeading screen="settings" />
    <div className="settings-layout"><div className="settings-main"><Panel title="Presentation" subtitle="Keep the interface readable at a glance" icon={Monitor} panelId="settingsPresentation" screen="settings"><Toggle label="Sound effects" description="Presentation preference only in this prototype" checked={true} onChange={() => undefined} /><Toggle label="Music" description="No audio layer is connected yet" checked={false} onChange={() => undefined} /><Toggle label="Compact numbers" description="Use shorter formats for large values" checked={false} onChange={() => undefined} /><Toggle label="Reduced motion" description="Reduce decorative transitions" checked={reducedMotion} onChange={setReducedMotion} /></Panel><Panel title="Interface" subtitle="Small controls for scanning the prototype" icon={SettingsIcon} panelId="settingsInterface" screen="settings"><Toggle label="Tooltips" description="Show helpful labels for icon controls" checked={true} onChange={() => undefined} /><Toggle label="Compact inventory cards" description="Reduce item card density" checked={false} onChange={() => undefined} /><Toggle label="Combat log timestamps" description="Show event times in the combat log" checked={true} onChange={() => undefined} /></Panel></div><div className="settings-side"><Panel title="Developer tools" subtitle="Available in development builds" icon={Wrench} panelId="settingsDeveloper" screen="settings">{import.meta.env.DEV ? <Toggle label="Show UI Inspector Button" description="Expose the Inspector in the top status bar" checked={showInspectorButton} onChange={setShowInspectorButton} /> : <p className="muted-copy">Developer controls are hidden in production builds.</p>}<div className="settings-callout">The UI Inspector identifies semantic interface targets for design and development. It never changes layout.</div></Panel><Panel title="Gameplay MVP" subtitle="Permanent prototype state controls" icon={RotateCcw} panelId="settingsPrototype" screen="settings"><p className="muted-copy">Reset combat, progression, inventory, equipment, and collection state. Inspector preferences are kept.</p><button className="button button-danger full-button" onClick={() => setDialogOpen(true)}><RotateCcw size={14} />Reset gameplay MVP</button></Panel><Panel title="Audio status" subtitle="Presentation layer" icon={Volume2} className="settings-status"><div className="status-row"><span className="status-dot status-dot-muted" /><span>Audio is currently disabled</span></div></Panel></div></div><ConfirmDialog open={dialogOpen} title="Reset gameplay MVP?" message="This clears combat progress, inventory, equipment, and collection state. Inspector preferences are kept." onCancel={() => setDialogOpen(false)} onConfirm={() => { resetGameplay(); setDialogOpen(false) }} />
  </div>
}
