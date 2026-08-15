import { useEffect, useRef, useState } from "react";
import { Bug, Check, GripVertical, RotateCcw, X } from "lucide-react";
import { CURRENT_SAVE_VERSION } from "../../../game/persistence/saveGame";
import { useDevToolsRuntimeStore } from "../devtools/devToolsRuntimeStore";
import { useGameStore } from "../../../state/gameStore";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { DebugTabContent } from "./DebugTabContent";
import type { DebugTab } from "./debugTypes";
import { DEFAULT_DEBUG_TAB_ORDER, DEBUG_TAB_DEFINITIONS, reorderDebugTabs } from "./debugTabs";

export function DebugAdminPanel({ onClose, onDock, dockActive = false }: { onClose: () => void; onDock?: () => void; dockActive?: boolean }) {
  const lastConsoleTab = useDevToolsRuntimeStore((state) => state.lastConsoleTab as DebugTab);
  const setLastConsoleTab = useDevToolsRuntimeStore((state) => state.setLastConsoleTab);
  const consoleTabOrder = useDevToolsRuntimeStore((state) => state.consoleTabOrder);
  const setConsoleTabOrder = useDevToolsRuntimeStore((state) => state.setConsoleTabOrder);
  const resetConsoleTabOrder = useDevToolsRuntimeStore((state) => state.resetConsoleTabOrder);
  const debug = useGameStore((state) => state.debug);
  const [tab, setTabState] = useState<DebugTab>(consoleTabOrder.includes(lastConsoleTab) ? lastConsoleTab : DEFAULT_DEBUG_TAB_ORDER[0]);
  const [dragging, setDragging] = useState<DebugTab | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: DebugTab; placement: "before" | "after" } | null>(null);
  const draggingRef = useRef<DebugTab | null>(null);
  const draggedClickRef = useRef(false);
  const setTab = (next: DebugTab) => { setTabState(next); setLastConsoleTab(next); };
  const [lastAction, setLastAction] = useState("Ready for a debug action.");
  const [confirmCollection, setConfirmCollection] = useState(false);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const run = (label: string, action: () => void) => { action(); setLastAction(label); };
  const handleDrop = (targetId: DebugTab, event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const draggedId = draggingRef.current;
    if (!draggedId || draggedId === targetId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const placement = event.clientX < rect.left + rect.width / 2 ? "before" : "after";
    setConsoleTabOrder(reorderDebugTabs(consoleTabOrder, draggedId, targetId, placement));
    draggedClickRef.current = true;
    draggingRef.current = null;
    setDragging(null);
    setDropTarget(null);
  };
  const moveFocusedTab = (id: DebugTab, direction: -1 | 1) => {
    const index = consoleTabOrder.indexOf(id);
    const target = consoleTabOrder[index + direction];
    if (!target) return;
    setConsoleTabOrder(reorderDebugTabs(consoleTabOrder, id, target, direction < 0 ? "before" : "after"));
  };
  return <div className="debug-backdrop" data-debug-kind="debug-admin-backdrop">
    <section className="debug-admin-panel" role="dialog" aria-modal="true" aria-label="Developer Debug Console" data-debug-kind="debug-admin-panel">
      <header className="debug-admin-header"><div className="debug-admin-title"><span className="debug-admin-mark"><Bug size={18} /></span><div><span className="eyebrow">DEV TOOLKIT - SAVE V{CURRENT_SAVE_VERSION}</span><h2>Developer Debug Console</h2></div></div><div className="debug-admin-header-actions">{onDock && <button type="button" className="debug-dock-launch" onClick={onDock} data-debug-action="dock-to-game">{dockActive ? "DOCK ACTIVE" : "DOCK TO GAME"}</button>}<button type="button" className="debug-close" onClick={onClose} aria-label="Close Developer Debug Console" data-debug-kind="debug-action" data-debug-action="close"><X size={18} /></button></div></header>
      <nav className="debug-tabs" aria-label="Debug sections">
        {consoleTabOrder.map((id) => { const definition = DEBUG_TAB_DEFINITIONS.find((entry) => entry.id === id); if (!definition) return null; const Icon = definition.icon; const isDropTarget = dropTarget?.id === id; return <button type="button" draggable key={id} className={`${tab === id ? "is-active" : ""} ${dragging === id ? "is-dragging" : ""} ${isDropTarget ? `is-drop-${dropTarget.placement}` : ""}`} onClick={() => { if (draggedClickRef.current) { draggedClickRef.current = false; return; } setTab(id); }} onDragStart={(event) => { draggingRef.current = id; draggedClickRef.current = true; setDragging(id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); }} onDragOver={(event) => { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); setDropTarget({ id, placement: event.clientX < rect.left + rect.width / 2 ? "before" : "after" }); }} onDrop={(event) => handleDrop(id, event)} onDragEnd={() => { draggingRef.current = null; setDragging(null); setDropTarget(null); }} onKeyDown={(event) => { if (event.altKey && event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); moveFocusedTab(id, event.key === "ArrowLeft" ? -1 : 1); } }} data-debug-kind="debug-tab" data-debug-tab={id}><GripVertical className="debug-tab-grip" size={12} aria-hidden="true" /><Icon size={14} />{definition.label}</button>; })}
        <button type="button" className="debug-tabs-reset" onClick={resetConsoleTabOrder} title="Reset Debug tab order." aria-label="Reset Debug tab order." data-debug-kind="debug-action" data-debug-action="reset-debug-tab-order"><RotateCcw size={13} /></button>
      </nav>
      <div className="debug-action-feedback" data-debug-kind="debug-feedback"><Check size={13} />{lastAction}</div>
      <div className="debug-admin-content combatbound-scroll">
        <DebugTabContent tab={tab} run={run} setTab={setTab} setConfirmCollection={setConfirmCollection} />
      </div>
    </section>
    <ConfirmDialog open={confirmCollection} title="Reset collection?" message="This removes every discovered item and target entry while preserving no collection progress." confirmLabel="Reset collection" onCancel={() => setConfirmCollection(false)} onConfirm={() => { run("Reset collection.", debug.resetCollection); setConfirmCollection(false); }} />
  </div>;
}
