import { useMemo, useState } from "react";
import { CURRENT_SAVE_VERSION } from "../../../../game/persistence/saveGame";
import { isGameSaveV19 } from "../../../../game/persistence/saveValidation";
import { useGameStore } from "../../../../state/gameStore";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { DebugButton } from "../components/DebugButton";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";

export function DebugSaveToolsTab({ debug, run }: DebugTabProps) {
  const state = useGameStore.getState();
  const [raw, setRaw] = useState(() => JSON.stringify({ version: CURRENT_SAVE_VERSION, progression: state.game.progression, inventory: state.game.inventory, equipment: state.game.equipment, collection: state.game.collection, gold: state.game.gold, settings: { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton }, magicArts: state.game.magicArts, combatAutomation: state.game.combatAutomation, combatAutomationPresets: state.game.combatAutomationPresets, combatAbilities: state.game.combatAbilities, professions: state.game.professions, mining: state.game.mining, blacksmithing: state.game.blacksmithing }, null, 2));
  const [confirmImport, setConfirmImport] = useState(false);
  const parsed = useMemo(() => { try { return JSON.parse(raw) as unknown; } catch { return null; } }, [raw]);
  const validation = parsed && isGameSaveV19(parsed) ? "VALID V19" : parsed && typeof parsed === "object" && (parsed as { version?: unknown }).version !== 19 ? "LEGACY DETECTED - IMPORT WILL MIGRATE" : "INVALID";
  const copy = (value: string, label: string) => { void navigator.clipboard?.writeText(value); run(`${label} copied.`, () => undefined); };
  return <div className="debug-tab-content debug-column"><DebugSection title="Save Tools" subtitle="Inspect, validate, copy and import saves through the normal V8 → V9 migration pipeline."><div className="debug-button-row"><DebugButton action="copy-save-json" onClick={() => copy(raw, "Save JSON")}>COPY SAVE JSON</DebugButton><DebugButton action="copy-game-state-json" onClick={() => copy(JSON.stringify(state.game, null, 2), "GameState JSON")}>COPY GAMESTATE JSON</DebugButton><DebugButton action="validate-save-json" onClick={() => run(`Save validation: ${validation}.`, () => undefined)}>VALIDATE</DebugButton><span className={`debug-badge ${validation.startsWith("VALID") ? "is-green" : ""}`}>{validation}</span></div><textarea className="debug-save-textarea" value={raw} onChange={(event) => setRaw(event.target.value)} aria-label="Save JSON import" rows={14} /><div className="debug-button-row"><DebugButton action="import-save-json" onClick={() => setConfirmImport(true)}>IMPORT SAVE</DebugButton></div></DebugSection><ConfirmDialog open={confirmImport} title="Import save?" message="Import this save and reset active combat?" confirmLabel="Import save" onCancel={() => setConfirmImport(false)} onConfirm={() => { const result = debug.importSave(raw); run(result.ok ? "Save imported and active combat reset." : result.error ?? "Save import failed.", () => undefined); setConfirmImport(false); }} /></div>;
}
