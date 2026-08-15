import { useEffect, useState } from "react";
import { Bug, Check, Crosshair, Heart, Package, Shield, Sparkles, Swords, WandSparkles, X } from "lucide-react";
import { CURRENT_SAVE_VERSION } from "../../../game/persistence/saveGame";
import { useGameStore } from "../../../state/gameStore";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DebugCollectionTab } from "./tabs/DebugCollectionTab";
import { DebugCombatTab } from "./tabs/DebugCombatTab";
import { DebugItemsTab } from "./tabs/DebugItemsTab";
import { DebugOverviewTab } from "./tabs/DebugOverviewTab";
import { DebugPlayerTab } from "./tabs/DebugPlayerTab";
import { DebugProgressionTab } from "./tabs/DebugProgressionTab";
import { DebugSpellbookTab } from "./tabs/DebugSpellbookTab";
import { DebugStateTab } from "./tabs/DebugStateTab";
import { DebugScenariosTab } from "./tabs/DebugScenariosTab";
import { DebugStatsTab } from "./tabs/DebugStatsTab";
import { DebugValidationTab } from "./tabs/DebugValidationTab";
import { DebugEncounterTab } from "./tabs/DebugEncounterTab";
import { DebugSaveToolsTab } from "./tabs/DebugSaveToolsTab";
import type { DebugTab } from "./debugTypes";

const tabs: Array<{ id: DebugTab; label: string; icon: typeof Bug }> = [
  { id: "overview", label: "Overview", icon: Bug }, { id: "player", label: "Player", icon: Heart }, { id: "progression", label: "Progression", icon: Sparkles }, { id: "items", label: "Items", icon: Package }, { id: "collection", label: "Collection", icon: Crosshair }, { id: "combat", label: "Combat", icon: Swords }, { id: "spellbook", label: "Spellbook", icon: WandSparkles }, { id: "state", label: "State", icon: Shield }, { id: "scenarios", label: "Scenarios", icon: Bug }, { id: "stats", label: "Stats", icon: Sparkles }, { id: "validation", label: "Validate", icon: Shield }, { id: "encounter", label: "Encounter", icon: Crosshair }, { id: "save-tools", label: "Save Tools", icon: Shield },
];

export function DebugAdminPanel({ onClose, onDock }: { onClose: () => void; onDock?: () => void }) {
  const game = useGameStore((state) => state.game);
  const debug = useGameStore((state) => state.debug);
  const [tab, setTab] = useState<DebugTab>("overview");
  const [lastAction, setLastAction] = useState("Ready for a debug action.");
  const [confirmCollection, setConfirmCollection] = useState(false);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const run = (label: string, action: () => void) => { action(); setLastAction(label); };
  const selectedEnemy = game.combat.enemies.find((enemy) => enemy.instanceId === game.combat.selectedEnemyInstanceId);
  return <div className="debug-backdrop" data-debug-kind="debug-admin-backdrop">
    <section className="debug-admin-panel" role="dialog" aria-modal="true" aria-label="Developer Debug Console" data-debug-kind="debug-admin-panel">
      <header className="debug-admin-header"><div className="debug-admin-title"><span className="debug-admin-mark"><Bug size={18} /></span><div><span className="eyebrow">DEV TOOLKIT - SAVE V{CURRENT_SAVE_VERSION}</span><h2>Developer Debug Console</h2></div></div><div className="debug-admin-header-actions">{onDock && <button type="button" className="debug-dock-launch" onClick={onDock} data-debug-action="dock-to-game">DOCK TO GAME</button>}<button type="button" className="debug-close" onClick={onClose} aria-label="Close Developer Debug Console" data-debug-kind="debug-action" data-debug-action="close"><X size={18} /></button></div></header>
      <nav className="debug-tabs" aria-label="Debug sections">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)} data-debug-kind="debug-tab" data-debug-tab={id}><Icon size={14} />{label}</button>)}</nav>
      <div className="debug-action-feedback" data-debug-kind="debug-feedback"><Check size={13} />{lastAction}</div>
      <div className="debug-admin-content combatbound-scroll">
        {tab === "overview" && <DebugOverviewTab game={game} debug={debug} run={run} selectedEnemy={selectedEnemy?.displayName} setTab={setTab} />}
        {tab === "player" && <DebugPlayerTab game={game} debug={debug} run={run} />}
        {tab === "progression" && <DebugProgressionTab game={game} debug={debug} run={run} />}
        {tab === "items" && <DebugItemsTab game={game} debug={debug} run={run} />}
        {tab === "collection" && <DebugCollectionTab game={game} debug={debug} run={run} onConfirm={() => setConfirmCollection(true)} />}
        {tab === "combat" && <DebugCombatTab game={game} debug={debug} run={run} selectedEnemy={selectedEnemy?.displayName} />}
        {tab === "spellbook" && <DebugSpellbookTab game={game} debug={debug} run={run} />}
        {tab === "state" && <DebugStateTab game={game} debug={debug} run={run} />}
        {tab === "scenarios" && <DebugScenariosTab game={game} debug={debug} run={run} />}
        {tab === "stats" && <DebugStatsTab game={game} debug={debug} run={run} />}
        {tab === "validation" && <DebugValidationTab game={game} debug={debug} run={run} />}
        {tab === "encounter" && <DebugEncounterTab game={game} debug={debug} run={run} />}
        {tab === "save-tools" && <DebugSaveToolsTab game={game} debug={debug} run={run} />}
      </div>
    </section>
    <ConfirmDialog open={confirmCollection} title="Reset collection?" message="This removes every discovered item and target entry while preserving no collection progress." confirmLabel="Reset collection" onCancel={() => setConfirmCollection(false)} onConfirm={() => { run("Reset collection.", debug.resetCollection); setConfirmCollection(false); }} />
  </div>;
}
