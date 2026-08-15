import { useEffect, useState } from "react";
import { Bug, Check, Crosshair, Heart, Package, Shield, Sparkles, Swords, WandSparkles, X } from "lucide-react";
import { CURRENT_SAVE_VERSION } from "../../../game/persistence/saveGame";
import { useDevToolsRuntimeStore } from "../devtools/devToolsRuntimeStore";
import { useGameStore } from "../../../state/gameStore";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DebugTabContent } from "./DebugTabContent";
import type { DebugTab } from "./debugTypes";

const tabs: Array<{ id: DebugTab; label: string; icon: typeof Bug }> = [
  { id: "overview", label: "Overview", icon: Bug }, { id: "player", label: "Player", icon: Heart }, { id: "progression", label: "Progression", icon: Sparkles }, { id: "items", label: "Items", icon: Package }, { id: "collection", label: "Collection", icon: Crosshair }, { id: "combat", label: "Combat", icon: Swords }, { id: "spellbook", label: "Spellbook", icon: WandSparkles }, { id: "state", label: "State", icon: Shield }, { id: "scenarios", label: "Scenarios", icon: Bug }, { id: "stats", label: "Stats", icon: Sparkles }, { id: "validation", label: "Validate", icon: Shield }, { id: "encounter", label: "Encounter", icon: Crosshair }, { id: "save-tools", label: "Save Tools", icon: Shield },
];

export function DebugAdminPanel({ onClose, onDock, dockActive = false }: { onClose: () => void; onDock?: () => void; dockActive?: boolean }) {
  const lastConsoleTab = useDevToolsRuntimeStore((state) => state.lastConsoleTab as DebugTab);
  const setLastConsoleTab = useDevToolsRuntimeStore((state) => state.setLastConsoleTab);
  const debug = useGameStore((state) => state.debug);
  const [tab, setTabState] = useState<DebugTab>(tabs.some((entry) => entry.id === lastConsoleTab) ? lastConsoleTab : "overview");
  const setTab = (next: DebugTab) => { setTabState(next); setLastConsoleTab(next); };
  const [lastAction, setLastAction] = useState("Ready for a debug action.");
  const [confirmCollection, setConfirmCollection] = useState(false);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const run = (label: string, action: () => void) => { action(); setLastAction(label); };
  return <div className="debug-backdrop" data-debug-kind="debug-admin-backdrop">
    <section className="debug-admin-panel" role="dialog" aria-modal="true" aria-label="Developer Debug Console" data-debug-kind="debug-admin-panel">
      <header className="debug-admin-header"><div className="debug-admin-title"><span className="debug-admin-mark"><Bug size={18} /></span><div><span className="eyebrow">DEV TOOLKIT - SAVE V{CURRENT_SAVE_VERSION}</span><h2>Developer Debug Console</h2></div></div><div className="debug-admin-header-actions">{onDock && <button type="button" className="debug-dock-launch" onClick={onDock} data-debug-action="dock-to-game">{dockActive ? "DOCK ACTIVE" : "DOCK TO GAME"}</button>}<button type="button" className="debug-close" onClick={onClose} aria-label="Close Developer Debug Console" data-debug-kind="debug-action" data-debug-action="close"><X size={18} /></button></div></header>
      <nav className="debug-tabs" aria-label="Debug sections">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)} data-debug-kind="debug-tab" data-debug-tab={id}><Icon size={14} />{label}</button>)}</nav>
      <div className="debug-action-feedback" data-debug-kind="debug-feedback"><Check size={13} />{lastAction}</div>
      <div className="debug-admin-content combatbound-scroll">
        <DebugTabContent tab={tab} run={run} setTab={setTab} setConfirmCollection={setConfirmCollection} />
      </div>
    </section>
    <ConfirmDialog open={confirmCollection} title="Reset collection?" message="This removes every discovered item and target entry while preserving no collection progress." confirmLabel="Reset collection" onCancel={() => setConfirmCollection(false)} onConfirm={() => { run("Reset collection.", debug.resetCollection); setConfirmCollection(false); }} />
  </div>;
}
