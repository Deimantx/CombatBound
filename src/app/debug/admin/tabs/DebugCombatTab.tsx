import { useEffect, useMemo, useRef, useState } from "react";
import { effectById } from "../../../../game/data/effects";
import { buildEffectTooltip } from "../../../../game/presentation/tooltipBuilders";
import type { ActiveEffectInstance } from "../../../../game/combat/combatEffectTypes";
import { useGameStore } from "../../../../state/gameStore";
import { DebugButton } from "../components/DebugButton";
import { DebugCatalogueIdentity } from "../components/DebugCatalogueIdentity";
import { DebugEffectPicker } from "../components/DebugEffectPicker";
import { DebugSection } from "../components/DebugSection";
import { DebugSummaryCard } from "../components/DebugSummaryCard";
import type { DebugTabProps } from "../debugTypes";
import { useDevToolsRuntimeStore } from "../../devtools/devToolsRuntimeStore";
import { useDebugTelemetryStore } from "../../telemetry/debugTelemetryStore";

const EMPTY_ACTIVE_EFFECTS: ActiveEffectInstance[] = [];

export function DebugCombatTab({ run, debug }: DebugTabProps) {
  const [sections, setSections] = useState<Set<string>>(() => new Set(["live-combat-state", "simulation-time"]));
  const combatPhase = useGameStore((state) => state.game.combat.phase);
  const combatLocationId = useGameStore((state) => state.game.combat.combatLocationId);
  const selectedEnemy = useGameStore((state) => state.game.combat.enemy?.displayName);
  const currentEnemyInstanceId = useGameStore((state) => state.game.combat.enemy?.instanceId);
  const selectedEnemyInstance = useGameStore((state) => state.game.combat.enemy ?? undefined);
  const selectedEnemyEffects = selectedEnemyInstance?.effects ?? EMPTY_ACTIVE_EFFECTS;
  const aliveEnemyCount = useGameStore((state) => state.game.combat.enemy && !state.game.combat.enemy.defeated ? 1 : 0);
  const enemyCount = useGameStore((state) => state.game.combat.enemy ? 1 : 0);
  const globalCooldown = useGameStore((state) => state.game.combat.globalCooldownRemaining);
  const playerCooldownCount = useGameStore((state) => Object.keys(state.game.combat.actionCooldowns).length);
  const playerEffects = useGameStore((state) => state.game.combat.playerEffects);
  const enemyEffectCount = useGameStore((state) => state.game.combat.enemy?.effects.length ?? 0);
  const traceCapture = useDevToolsRuntimeStore((state) => state.automationTraceEnabled);
  const setTraceCapture = useDevToolsRuntimeStore((state) => state.setAutomationTraceEnabled);
  const eventCapture = useDevToolsRuntimeStore((state) => state.eventsEnabled);
  const setEventCapture = useDevToolsRuntimeStore((state) => state.setEventsEnabled);
  const traceCount = useDebugTelemetryStore((state) => state.automationEvaluations.length);
  const eventCount = useDebugTelemetryStore((state) => state.events.length);
  const clearTraces = useDebugTelemetryStore((state) => state.clearAutomationTrace);
  const clearEvents = useDebugTelemetryStore((state) => state.clearEvents);
  const isOpen = (id: string) => sections.has(id);
  const toggle = (id: string) => setSections((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  return <div className="debug-tab-content debug-column">
    <DebugSection id="live-combat-state" title="LIVE COMBAT STATE" subtitle={`${combatPhase.toUpperCase()} - ${combatLocationId ?? "no location"} - Target ${selectedEnemy ?? "none"}`} collapsible open={isOpen("live-combat-state")} onToggle={() => toggle("live-combat-state")}><div className="debug-summary-grid"><DebugSummaryCard label="Current target" value={selectedEnemy ?? "None"} detail={`${aliveEnemyCount}/${enemyCount} active`} /><DebugSummaryCard label="GCD" value={`${globalCooldown.toFixed(2)}s`} detail={`${playerCooldownCount} player cooldowns`} /><DebugSummaryCard label="Effects" value={playerEffects.length} detail={`${enemyEffectCount} enemy effects`} /></div></DebugSection>
    <DebugSection id="simulation-time" title="SIMULATION TIME" collapsible open={isOpen("simulation-time")} onToggle={() => toggle("simulation-time")}><p className="debug-note">Use the persistent Combat Dock for pause, stepping and time scale controls.</p></DebugSection>
    <DebugSection id="cooldowns-casts" title="COOLDOWNS & CASTS" collapsible open={isOpen("cooldowns-casts")} onToggle={() => toggle("cooldowns-casts")}><div className="debug-button-row"><DebugButton action="reset-player-cooldowns" onClick={() => run("Reset all player cooldowns.", debug.resetPlayerCooldowns)}>RESET PLAYER COOLDOWNS</DebugButton><DebugButton action="reset-enemy-cooldowns" onClick={() => run("Reset all enemy ability cooldowns.", debug.resetEnemyCooldowns)}>RESET ENEMY ABILITY COOLDOWNS</DebugButton><DebugButton action="cancel-enemy-abilities" onClick={() => run("Cancelled the current enemy preparation.", debug.cancelEnemyAbilities)}>CANCEL ENEMY ABILITY</DebugButton></div></DebugSection>
    <DebugSection id="effects" title="EFFECTS" subtitle="Application routes through canonical stacking, duration, resistance, and barrier rules." collapsible open={isOpen("effects")} onToggle={() => toggle("effects")}><DebugEffectPicker variant="full" enemyAvailable={Boolean(currentEnemyInstanceId)} onApply={(effectId, target) => { const definition = effectById[effectId]; if (definition) run(`Applied ${definition.name} to ${target}.`, () => debug.applyEffect(effectId, target)); }} /></DebugSection>
    <DebugSection id="active-effects" title="ACTIVE EFFECTS" collapsible open={isOpen("active-effects")} onToggle={() => toggle("active-effects")}><DebugActiveEffects title="Active Player Effects" effects={playerEffects} /><DebugActiveEffects title="Active Selected Enemy Effects" effects={selectedEnemyEffects} /></DebugSection>
    <DebugSection id="defeat-recovery" title="DEFEAT & RECOVERY" collapsible open={isOpen("defeat-recovery")} onToggle={() => toggle("defeat-recovery")}><div className="debug-button-grid"><DebugButton action="kill-selected-enemy" onClick={() => run("Resolved target defeat through canonical rewards.", debug.killSelectedEnemy)}>DEFEAT TARGET</DebugButton><DebugButton action="kill-current-enemy" onClick={() => run("Resolved current target defeat through canonical rewards.", debug.killCurrentEnemy)}>DEFEAT CURRENT TARGET</DebugButton><DebugButton action="revive" onClick={() => run("Revived player to full resources and stopped combat.", debug.revive)}>REVIVE</DebugButton><DebugButton action="suicide" danger onClick={() => run("Forced player defeat.", debug.suicide)}>SUICIDE</DebugButton></div></DebugSection>
    <DebugSection id="automation-trace" title="AUTOMATION RULE TRACE" subtitle={`${traceCount} rule traces captured`} collapsible open={isOpen("automation-trace")} onToggle={() => toggle("automation-trace")}><div className="debug-button-row"><label className="debug-custom-control"><input type="checkbox" checked={traceCapture} onChange={(event) => setTraceCapture(event.target.checked)} /> CAPTURE TRACE</label><DebugButton action="clear-automation-trace" onClick={clearTraces}>CLEAR TRACE</DebugButton></div>{isOpen("automation-trace") && <AutomationTraceViewer />}</DebugSection>
    <DebugSection id="combat-event-viewer" title="COMBAT EVENT VIEWER" subtitle={`${eventCount} debug events captured`} collapsible open={isOpen("combat-event-viewer")} onToggle={() => toggle("combat-event-viewer")}><div className="debug-button-row"><DebugButton action="clear-debug-events" onClick={clearEvents}>CLEAR EVENTS</DebugButton><label className="debug-custom-control"><input type="checkbox" checked={eventCapture} onChange={(event) => setEventCapture(event.target.checked)} /> CAPTURE EVENTS</label></div>{isOpen("combat-event-viewer") && <CombatEventViewer />}</DebugSection>
  </div>;
}

function AutomationTraceViewer() {
  const entries = useDebugTelemetryStore((state) => state.automationEvaluations);
  const [paused, setPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [frozen, setFrozen] = useState(entries);
  const [lastVisibleSequence, setLastVisibleSequence] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!paused) { setFrozen(entries); if (listRef.current) listRef.current.scrollTop = 0; } }, [entries, paused]);
  const shown = useMemo(() => (paused ? frozen : entries).slice(-visibleCount).reverse(), [entries, frozen, paused, visibleCount]);
  const newer = paused ? entries.filter((entry) => entry.sequence > lastVisibleSequence).length : 0;
  const pause = () => { setFrozen(entries); setLastVisibleSequence(entries.at(-1)?.sequence ?? 0); setPaused(true); };
  return <><TelemetryViewerControls paused={paused} newer={newer} onPause={pause} onResume={() => setPaused(false)} onLatest={() => { setPaused(false); if (listRef.current) listRef.current.scrollTop = 0; }} visibleCount={visibleCount} setVisibleCount={setVisibleCount} label="RULE TRACE" /><div ref={listRef} className="debug-trace-list combatbound-scroll" onScroll={(event) => { if (!paused && event.currentTarget.scrollTop > 12) pause(); }}>{shown.map((entry) => entry.traces.map((trace) => { const passed = trace.conditions.filter((condition) => condition.passed).length; return <div key={`${entry.id}-${trace.ruleId}`} data-debug-kind="automation-trace" data-debug-evaluation-id={entry.id} data-debug-rule-id={trace.ruleId} data-debug-result={trace.result}><strong>#{entry.id} · {trace.actionId} · {trace.result.toUpperCase()}</strong><span>{passed} / {trace.conditions.length} conditions · {trace.validationReason ?? ""}</span></div>; }))}</div></>;
}

function CombatEventViewer() {
  const events = useDebugTelemetryStore((state) => state.events);
  const [paused, setPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [frozen, setFrozen] = useState(events);
  const [lastVisibleSequence, setLastVisibleSequence] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!paused) { setFrozen(events); if (listRef.current) listRef.current.scrollTop = 0; } }, [events, paused]);
  const shown = useMemo(() => (paused ? frozen : events).slice(-visibleCount).reverse(), [events, frozen, paused, visibleCount]);
  const newer = paused ? events.filter((event) => event.sequence > lastVisibleSequence).length : 0;
  const pause = () => { setFrozen(events); setLastVisibleSequence(events.at(-1)?.sequence ?? 0); setPaused(true); };
  return <><TelemetryViewerControls paused={paused} newer={newer} onPause={pause} onResume={() => setPaused(false)} onLatest={() => { setPaused(false); if (listRef.current) listRef.current.scrollTop = 0; }} visibleCount={visibleCount} setVisibleCount={setVisibleCount} label="EVENTS" /><div ref={listRef} className="debug-event-list combatbound-scroll" onScroll={(event) => { if (!paused && event.currentTarget.scrollTop > 12) pause(); }}>{shown.map((event) => <div key={event.id} data-debug-kind="debug-combat-event" data-debug-event-type={event.eventType} data-debug-sequence={event.sequence}><strong>#{event.sequence} {event.eventType}</strong><span>{event.source?.kind ?? "system"} → {event.target?.kind ?? "system"}</span></div>)}</div></>;
}

function TelemetryViewerControls({ paused, newer, onPause, onResume, onLatest, visibleCount, setVisibleCount, label }: { paused: boolean; newer: number; onPause: () => void; onResume: () => void; onLatest: () => void; visibleCount: number; setVisibleCount: (value: number) => void; label: string }) {
  return <div className="debug-telemetry-controls"><button type="button" onClick={paused ? onResume : onPause}>{paused ? "LIVE VIEW" : "PAUSE VIEW"}</button>{newer > 0 && <><span>{newer} NEW {label}</span><button type="button" onClick={onLatest}>JUMP TO LATEST</button></>}<label>SHOW <select value={visibleCount} onChange={(event) => setVisibleCount(Number(event.target.value))}><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label></div>;
}

function DebugActiveEffects({ title, effects }: { title: string; effects: ActiveEffectInstance[] }) {
  return <div className="debug-active-effects"><span className="tiny-label">{title}</span><div className="debug-catalogue">{effects.length ? effects.map((instance) => { const definition = effectById[instance.effectId]; return definition ? <div className="debug-catalogue-row" key={instance.instanceId} data-debug-kind="debug-active-effect" data-debug-effect-id={instance.effectId}><DebugCatalogueIdentity tooltip={buildEffectTooltip(instance, definition)} icon={definition.icon} variant={definition.kind === "barrier" ? "blue" : definition.kind === "buff" ? "gold" : "red"} kind="debug-active-effect-identity" targetId={instance.instanceId} label={definition.name}><strong>{definition.name}</strong><small>{definition.kind} - {instance.stacks} stack{instance.stacks === 1 ? "" : "s"}</small></DebugCatalogueIdentity></div> : null; }) : <p className="debug-note">No active effects.</p>}</div></div>;
}
