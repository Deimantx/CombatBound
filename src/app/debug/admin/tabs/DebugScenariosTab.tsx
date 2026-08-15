import { useMemo, useState } from "react";
import { useGameStore } from "../../../../state/gameStore";
import { useDevToolsRuntimeStore } from "../../devtools/devToolsRuntimeStore";
import { deleteDebugScenario, readDebugScenarioSlots, renameDebugScenario, saveDebugScenario } from "../../scenarios/debugScenarioStorage";
import type { DebugScenarioSlot, DebugScenarioSnapshotV1 } from "../../scenarios/debugScenarioTypes";
import { validateDebugScenario } from "../../scenarios/debugScenarioValidation";
import { DebugButton } from "../components/DebugButton";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";

export function DebugScenariosTab({ game, debug, run }: DebugTabProps) {
  const [slots, setSlots] = useState<DebugScenarioSlot[]>(() => readDebugScenarioSlots());
  const [name, setName] = useState("Combat Test Scenario");
  const runtime = useDevToolsRuntimeStore();
  const selectedContinentId = useGameStore((state) => state.selectedContinentId);
  const selectedRegionId = useGameStore((state) => state.selectedRegionId);
  const selectedAreaId = useGameStore((state) => state.selectedAreaId);
  const selectedCombatLocationId = useGameStore((state) => state.selectedCombatLocationId);
  const snapshot = useMemo<DebugScenarioSnapshotV1>(() => ({
    version: 1,
    game: { progression: game.progression, inventory: game.inventory, equipment: game.equipment, gold: game.gold, spellbook: game.spellbook, combatAutomation: game.combatAutomation, combatAbilities: game.combatAbilities, combat: game.combat },
    world: { continentId: selectedContinentId, regionId: selectedRegionId, areaId: selectedAreaId, combatLocationId: selectedCombatLocationId },
  }), [game, selectedAreaId, selectedCombatLocationId, selectedContinentId, selectedRegionId]);
  const refresh = () => setSlots(readDebugScenarioSlots());
  const save = () => {
    const id = `scenario-${Date.now()}`;
    saveDebugScenario({ id, name, createdAt: Date.now(), updatedAt: Date.now(), snapshot });
    refresh();
  };
  const load = (slot: DebugScenarioSlot) => {
    const result = validateDebugScenario(slot.snapshot);
    if (!result.valid) { run(`Scenario incompatible: ${result.errors[0]}`, () => undefined); return; }
    debug.loadScenario(slot.snapshot);
    runtime.setSimulationPaused(true);
    runtime.openDock();
    run(`Loaded scenario: ${slot.name}.`, () => undefined);
  };
  return <div className="debug-tab-content debug-column">
    <DebugSection title="Scenario Snapshots" subtitle="Ten DEV-only local slots. Collection and automation preset library remain untouched."><div className="debug-inline-control"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={48} aria-label="Scenario name" /><DebugButton action="save-scenario" onClick={() => run(`Saved scenario: ${name}.`, save)}>SAVE NEW</DebugButton></div><p className="debug-note">{slots.length}/{10} slots used. Captures progression, inventory, equipment, spellbook, abilities, automation, combat runtime and world selection.</p></DebugSection>
    <DebugSection title="Saved Slots"><div className="debug-scenario-list">{slots.length === 0 ? <p className="debug-note">No scenarios saved.</p> : slots.map((slot) => <div key={slot.id} className="debug-scenario-row" data-debug-kind="debug-scenario-slot" data-debug-slot={slot.id} data-debug-scenario-id={slot.id} data-debug-compatible={validateDebugScenario(slot.snapshot).valid}><div><strong>{slot.name}</strong><small>{new Date(slot.updatedAt).toLocaleString()}</small></div><DebugButton action="load-scenario" onClick={() => load(slot)}>LOAD</DebugButton><DebugButton action="overwrite-scenario" onClick={() => run(`Overwrote scenario: ${slot.name}.`, () => { saveDebugScenario({ ...slot, snapshot, updatedAt: Date.now() }); refresh(); })}>OVERWRITE</DebugButton><DebugButton action="rename-scenario" onClick={() => { const next = window.prompt("Rename scenario", slot.name); if (next) { renameDebugScenario(slot.id, next); refresh(); } }}>RENAME</DebugButton><DebugButton action="delete-scenario" onClick={() => { if (window.confirm(`Delete ${slot.name}?`)) { deleteDebugScenario(slot.id); refresh(); } }}>DELETE</DebugButton></div>)}</div></DebugSection>
  </div>;
}
