import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../../../../state/gameStore";
import { useDevToolsRuntimeStore } from "../../devtools/devToolsRuntimeStore";
import { useDebugScenarioStore } from "../../scenarios/debugScenarioStore";
import type { DebugScenarioSlot, DebugScenarioSnapshotV1 } from "../../scenarios/debugScenarioTypes";
import { validateDebugScenario } from "../../scenarios/debugScenarioValidation";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { DebugButton } from "../components/DebugButton";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";

export function DebugScenariosTab({ game, debug, run }: DebugTabProps) {
  const slots = useDebugScenarioStore((state) => state.slots);
  const refresh = useDebugScenarioStore((state) => state.refresh);
  const saveNew = useDebugScenarioStore((state) => state.saveNew);
  const overwrite = useDebugScenarioStore((state) => state.overwrite);
  const rename = useDebugScenarioStore((state) => state.rename);
  const remove = useDebugScenarioStore((state) => state.remove);
  const pause = useDevToolsRuntimeStore((state) => state.setSimulationPaused);
  const openDock = useDevToolsRuntimeStore((state) => state.openDock);
  const [name, setName] = useState("Combat Test Scenario");
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteSlot, setDeleteSlot] = useState<DebugScenarioSlot | null>(null);
  const selectedContinentId = useGameStore((state) => state.selectedContinentId);
  const selectedRegionId = useGameStore((state) => state.selectedRegionId);
  const selectedAreaId = useGameStore((state) => state.selectedAreaId);
  const selectedCombatLocationId = useGameStore((state) => state.selectedCombatLocationId);
  useEffect(() => { refresh(); }, [refresh]);
  const snapshot = useMemo<DebugScenarioSnapshotV1>(() => ({ version: 1, game: { progression: game.progression, inventory: game.inventory, equipment: game.equipment, gold: game.gold, spellbook: game.spellbook, combatAutomation: game.combatAutomation, combatAbilities: game.combatAbilities, combat: game.combat }, world: { continentId: selectedContinentId, regionId: selectedRegionId, areaId: selectedAreaId, combatLocationId: selectedCombatLocationId } }), [game, selectedAreaId, selectedCombatLocationId, selectedContinentId, selectedRegionId]);
  const filled = slots.filter((slot): slot is DebugScenarioSlot => Boolean(slot));
  const save = () => { const slot = saveNew(name, snapshot); run(slot ? `Saved scenario to slot ${slot.slot}.` : "All 10 slots are occupied. Choose a slot and overwrite.", () => undefined); };
  const load = (slot: DebugScenarioSlot) => { const result = validateDebugScenario(slot.snapshot); if (!result.valid) { run(`Scenario incompatible: ${result.errors[0]}`, () => undefined); return; } debug.loadScenario(slot.snapshot); pause(true); openDock(); run(`Loaded scenario: ${slot.name}.`, () => undefined); };
  const beginRename = (slot: DebugScenarioSlot) => { setEditingSlot(slot.slot); setEditingName(slot.name); };
  const commitRename = (slot: DebugScenarioSlot) => { rename(slot, editingName); setEditingSlot(null); run(`Renamed scenario ${slot.slot}.`, () => undefined); };
  return <div className="debug-tab-content debug-column">
    <DebugSection title="Scenario Snapshots" subtitle="Ten DEV-only local slots. Collection and automation preset library remain untouched."><div className="debug-scenario-editor"><label>NAME<input className="debug-scenario-name-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={48} aria-label="Scenario name" /><small>{name.length} / 48</small></label><DebugButton action="save-scenario" onClick={save} disabled={filled.length >= 10}>SAVE NEW</DebugButton></div><p className="debug-note">{filled.length}/10 slots used. {filled.length >= 10 ? "All 10 slots are occupied. Choose a slot and OVERWRITE." : "SAVE NEW uses the first empty numbered slot."}</p></DebugSection>
    <DebugSection title="Saved Slots"><div className="debug-scenario-list">{slots.map((slot, index) => <div key={index} className={`debug-scenario-row ${slot ? "" : "is-empty"}`} data-debug-kind="debug-scenario-slot" data-debug-slot={index + 1} data-debug-compatible={slot ? validateDebugScenario(slot.snapshot).valid : false}>{slot ? <>{editingSlot === slot.slot ? <div className="debug-scenario-inline-edit"><input className="debug-scenario-name-input" value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={48} aria-label={`Rename scenario ${slot.slot}`} /><DebugButton action="save-rename-scenario" onClick={() => commitRename(slot)}>SAVE</DebugButton><DebugButton action="cancel-rename-scenario" onClick={() => setEditingSlot(null)}>CANCEL</DebugButton></div> : <div><strong>{slot.name}</strong><small>Slot {slot.slot} · {new Date(slot.updatedAt).toLocaleString()}</small></div>}<DebugButton action="load-scenario" onClick={() => load(slot)}>LOAD</DebugButton><DebugButton action="overwrite-scenario" onClick={() => { overwrite(slot, slot.name, snapshot); run(`Overwrote scenario: ${slot.name}.`, () => undefined); }}>OVERWRITE</DebugButton>{editingSlot !== slot.slot && <DebugButton action="rename-scenario" onClick={() => beginRename(slot)}>RENAME</DebugButton>}<DebugButton action="delete-scenario" onClick={() => setDeleteSlot(slot)}>DELETE</DebugButton></> : <><div><strong>Slot {index + 1}</strong><small>Empty</small></div></>}</div>)}</div></DebugSection>
    <ConfirmDialog open={Boolean(deleteSlot)} title="Delete scenario?" message={deleteSlot ? `Delete ${deleteSlot.name} from slot ${deleteSlot.slot}?` : ""} confirmLabel="Delete scenario" onCancel={() => setDeleteSlot(null)} onConfirm={() => { if (deleteSlot) { remove(deleteSlot); run(`Deleted scenario slot ${deleteSlot.slot}.`, () => undefined); } setDeleteSlot(null); }} />
  </div>;
}

