import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { Bug, ExternalLink, Grip, X } from "lucide-react";
import { effectById } from "../../../../game/data/effects";
import { getBarrierAmount } from "../../../../game/combat/combatEffects";
import type { DebugEffectTarget } from "../../../../game/debug/debugTypes";
import { useGameStore } from "../../../../state/gameStore";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { DebugEffectPicker } from "../../admin/components/DebugEffectPicker";
import { useDebugTelemetryStore } from "../../telemetry/debugTelemetryStore";
import { useDevToolsRuntimeStore } from "../devToolsRuntimeStore";
import { useDebugScenarioStore } from "../../scenarios/debugScenarioStore";
import { DebugDockSection } from "./DebugDockSection";
import { DebugSimulationControls } from "./DebugSimulationControls";

export function CombatDebugDock() {
  const dockSize = useDevToolsRuntimeStore((state) => state.dockSize);
  const dockAnchor = useDevToolsRuntimeStore((state) => state.dockAnchor);
  const dockPosition = useDevToolsRuntimeStore((state) => state.dockPosition);
  const setDockPosition = useDevToolsRuntimeStore((state) => state.setDockPosition);
  const setDockAnchor = useDevToolsRuntimeStore((state) => state.setDockAnchor);
  const openConsole = useDevToolsRuntimeStore((state) => state.openConsole);
  const closeDock = useDevToolsRuntimeStore((state) => state.closeDock);
  const simulationPaused = useDevToolsRuntimeStore((state) => state.simulationPaused);
  const timeScale = useDevToolsRuntimeStore((state) => state.timeScale);
  const dockRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const sizeClass = dockSize === "expanded" ? "is-expanded" : dockSize === "minimized" ? "is-minimized" : "is-compact";
  const positionStyle = dockPosition ? { left: dockPosition.x, top: dockPosition.y, right: "auto", bottom: "auto" } : undefined;

  useEffect(() => {
    const onResize = () => {
      const state = useDevToolsRuntimeStore.getState();
      const rect = dockRef.current?.getBoundingClientRect();
      if (!state.dockPosition || !rect) return;
      setDockPosition(clampPosition(state.dockPosition, rect.width, rect.height));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setDockPosition]);

  const beginDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (!useDevToolsRuntimeStore.getState().dockPosition) setDockPosition({ x: rect.left, y: rect.top });
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = dockRef.current?.getBoundingClientRect();
    if (rect) setDockPosition(clampPosition({ x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY }, rect.width, rect.height));
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const edge = 72;
    const right = window.innerWidth - event.clientX;
    const bottom = window.innerHeight - event.clientY;
    if (event.clientX < edge && event.clientY < edge) setDockAnchor("top-left");
    else if (right < edge && event.clientY < edge) setDockAnchor("top-right");
    else if (event.clientX < edge && bottom < edge) setDockAnchor("bottom-left");
    else if (right < edge && bottom < edge) setDockAnchor("bottom-right");
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return <aside ref={dockRef} className={`combat-debug-dock ${sizeClass} anchor-${dockAnchor}`} style={positionStyle} data-debug-kind="combat-debug-dock" data-debug-dock-size={dockSize} data-debug-dock-anchor={dockAnchor} data-debug-simulation-paused={simulationPaused} data-debug-time-scale={timeScale}>
    <header className="debug-dock-header"><button type="button" className="debug-dock-drag" aria-label="Drag debug dock" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><Grip size={13} /></button><Bug size={14} /><strong>COMBAT DEBUG</strong><span className="debug-dock-live">LIVE</span><button type="button" onClick={openConsole} aria-label="Open full debug console"><ExternalLink size={13} /></button><button type="button" onClick={closeDock} aria-label="Close combat debug dock"><X size={14} /></button></header>
    {dockSize === "minimized" ? <DockMinimizedSummary /> : <DockBody />}
    <footer className="debug-dock-footer"><DockSizeButtons /></footer>
  </aside>;
}

function DockBody() {
  return <div className="debug-dock-body combatbound-scroll">
    <DebugDockSection id="time" title="TIME" defaultOpen><DebugSimulationControls /><p className="debug-dock-note">One simulation clock drives combat, recovery and manual stepping.</p></DebugDockSection>
    <DebugDockSection id="player" title="PLAYER" summary={<DockPlayerSummary />} defaultOpen><DockPlayer /></DebugDockSection>
    <DebugDockSection id="enemy" title="ENEMY" summary={<DockEnemySummary />} defaultOpen><DockEnemy /></DebugDockSection>
    <DebugDockSection id="effects" title="EFFECTS" summary={<DockEffectSummary />}><DockEffects /></DebugDockSection>
    <DebugDockSection id="cooldowns-actions" title="COOLDOWNS & ACTIONS"><DockCooldownsActions /></DebugDockSection>
    <DebugDockSection id="automation" title="AUTOMATION" summary={<DockAutomationSummary />}><DockAutomation /></DebugDockSection>
    <DebugDockSection id="events" title="EVENTS" summary={<DockEventsSummary />}><DockEvents /></DebugDockSection>
    <DebugDockSection id="scenarios" title="SCENARIOS"><DockScenarios /></DebugDockSection>
  </div>;
}

function DockMinimizedSummary() {
  const hp = useGameStore((state) => state.game.combat.playerHp);
  const maxHp = useGameStore((state) => state.game.combat.maxPlayerHp);
  const selected = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.displayName ?? "No enemy");
  const immortal = useDevToolsRuntimeStore((state) => state.playerImmortal);
  const timeScale = useDevToolsRuntimeStore((state) => state.timeScale);
  return <span className="debug-dock-minimized-summary">HP {Math.round(maxHp > 0 ? hp / maxHp * 100 : 0)}% · {selected} · {immortal ? "IMMORTAL · " : ""}{timeScale}x</span>;
}

function DockPlayerSummary() {
  const hp = useGameStore((state) => state.game.combat.playerHp);
  const maxHp = useGameStore((state) => state.game.combat.maxPlayerHp);
  const playerEffects = useGameStore((state) => state.game.combat.playerEffects);
  const immortal = useDevToolsRuntimeStore((state) => state.playerImmortal);
  const barrier = getBarrierAmount(playerEffects, effectById);
  return <span>HP {Math.round(maxHp > 0 ? hp / maxHp * 100 : 0)}%{immortal ? " · IMMORTAL" : ""} · B{Math.round(barrier)}</span>;
}

function DockEnemySummary() {
  const name = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.displayName);
  const currentHealth = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.currentHealth ?? 0);
  const maxHealth = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.maxHealth ?? 0);
  return <span>{name ? `${name} · ${Math.round(maxHealth > 0 ? currentHealth / maxHealth * 100 : 0)}%` : "None"}</span>;
}

function DockPlayer() {
  const hp = useGameStore((state) => state.game.combat.playerHp);
  const maxHp = useGameStore((state) => state.game.combat.maxPlayerHp);
  const stamina = useGameStore((state) => state.game.combat.stamina);
  const maxStamina = useGameStore((state) => state.game.combat.maxStamina);
  const mana = useGameStore((state) => state.game.combat.mana);
  const maxMana = useGameStore((state) => state.game.combat.maxMana);
  const playerEffects = useGameStore((state) => state.game.combat.playerEffects);
  const fillAllResources = useGameStore((state) => state.debug.fillAllResources);
  const revive = useGameStore((state) => state.debug.revive);
  const setResourcePercent = useGameStore((state) => state.debug.setResourcePercent);
  const applyBarrier = useGameStore((state) => state.debug.applyPlayerMaxHpBarrier);
  const immortal = useDevToolsRuntimeStore((state) => state.playerImmortal);
  const setImmortal = useDevToolsRuntimeStore((state) => state.setPlayerImmortal);
  const barrier = getBarrierAmount(playerEffects, effectById);
  const immortalTooltip = { id: "debug-dock-immortal", title: "IMMORTAL", description: "Combat damage can reduce you to 1 HP but cannot defeat you. Explicit Debug defeat actions still work.", rows: [] };
  return <>
    <div className="debug-dock-grid"><Meter label="HP" value={hp} max={maxHp} /><Meter label="STAMINA" value={stamina} max={maxStamina} /><Meter label="MANA" value={mana} max={maxMana} /></div>
    <div className="debug-dock-actions"><button type="button" onClick={() => setResourcePercent("health", 25)}>HP 25%</button><button type="button" onClick={() => setResourcePercent("health", 50)}>HP 50%</button><button type="button" onClick={() => setResourcePercent("health", 100)}>FULL HP</button></div>
    <div className="debug-dock-actions"><button type="button" onClick={fillAllResources}>FILL RESOURCES</button><button type="button" onClick={revive}>REVIVE</button></div>
    <div className="debug-dock-actions"><GameTooltip content={immortalTooltip}><button type="button" className={immortal ? "is-active" : ""} onClick={() => setImmortal(!immortal)} aria-pressed={immortal}>{immortal ? "IMMORTAL" : "IMMORTAL OFF"}</button></GameTooltip><GameTooltip content={{ id: "debug-dock-max-hp-barrier", title: "MAX HP BARRIER", description: "Applies the canonical Protective Sign barrier using the player's current maximum HP. Barrier absorption still follows normal rules.", rows: [] }}><button type="button" onClick={applyBarrier}>ADD 100% HP BARRIER</button></GameTooltip></div>
    <p className="debug-dock-note">BARRIER {Math.round(barrier)} / {Math.round(maxHp)}</p>
  </>;
}

function DockEnemy() {
  const selectedName = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.displayName);
  const currentHealth = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.currentHealth ?? 0);
  const maxHealth = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.maxHealth ?? 0);
  const defeated = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.defeated ?? true);
  const kill = useGameStore((state) => state.debug.killSelectedEnemy);
  const heal = useGameStore((state) => state.debug.healSelectedEnemyToFull);
  return <><p className="debug-dock-value">{selectedName ?? "No selected enemy"}</p>{selectedName && <><Meter label="HP" value={currentHealth} max={maxHealth} /><div className="debug-dock-actions"><GameTooltip content={{ id: "debug-dock-heal-enemy", title: "FULL HEAL SELECTED ENEMY", description: "Restores a living selected enemy to maximum HP without resetting effects, cooldowns, actions, phases, or rewards.", rows: [] }}><button type="button" onClick={heal} disabled={defeated}>HEAL TO FULL</button></GameTooltip><button type="button" onClick={kill} disabled={defeated}>DEFEAT SELECTED</button></div></>}</>;
}

function DockEffectSummary() {
  const playerCount = useGameStore((state) => state.game.combat.playerEffects.length);
  const enemyCount = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.effects.length ?? 0);
  return <span>P{playerCount} · E{enemyCount}</span>;
}

function DockEffects() {
  const playerEffects = useGameStore((state) => state.game.combat.playerEffects);
  const selectedEnemyId = useGameStore((state) => state.game.combat.selectedEnemyInstanceId);
  const selectedEnemyDefeated = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.defeated ?? true);
  const selectedEnemyEffects = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.effects ?? []);
  const clearPlayer = useGameStore((state) => state.debug.clearPlayerEffects);
  const clearSelectedEnemy = useGameStore((state) => state.debug.clearSelectedEnemyEffects);
  const clearAllEnemies = useGameStore((state) => state.debug.clearAllEnemyEffects);
  const applyEffect = useGameStore((state) => state.debug.applyEffect);
  const list = (effects: typeof playerEffects) => effects.length === 0 ? <span className="debug-dock-muted">None</span> : effects.map((effect) => <span key={effect.instanceId}>{effectById[effect.effectId]?.name ?? effect.effectId} x{effect.stacks}</span>);
  return <><div className="debug-dock-list"><strong>PLAYER</strong>{list(playerEffects)}<strong>SELECTED ENEMY</strong>{list(selectedEnemyEffects)}</div><DebugEffectPicker variant="dock" enemyAvailable={Boolean(selectedEnemyId && !selectedEnemyDefeated)} onApply={(effectId, target: DebugEffectTarget) => applyEffect(effectId, target)} /><div className="debug-dock-actions"><button type="button" onClick={clearPlayer}>CLEAR PLAYER</button><button type="button" onClick={clearSelectedEnemy} disabled={!selectedEnemyId}>CLEAR SELECTED</button><button type="button" onClick={clearAllEnemies}>CLEAR ALL ENEMIES</button></div></>;
}

function DockCooldownsActions() {
  const resetPlayer = useGameStore((state) => state.debug.resetPlayerCooldowns);
  const resetEnemy = useGameStore((state) => state.debug.resetEnemyCooldowns);
  const cancelEnemy = useGameStore((state) => state.debug.cancelEnemyActions);
  return <div className="debug-dock-actions"><button type="button" onClick={resetPlayer}>RESET PLAYER COOLDOWNS</button><GameTooltip content={{ id: "debug-dock-reset-enemy-cooldowns", title: "RESET ENEMY COOLDOWNS", description: "Clears cooldown timers on enemy actions without changing their current action or phase.", rows: [] }}><button type="button" onClick={resetEnemy}>RESET ENEMY COOLDOWNS</button></GameTooltip><GameTooltip content={{ id: "debug-dock-cancel-enemy-actions", title: "CANCEL ENEMY ACTIONS", description: "Cancels active enemy casts and actions; it does not defeat or heal enemies.", rows: [] }}><button type="button" onClick={cancelEnemy}>CANCEL ENEMY ACTIONS</button></GameTooltip></div>;
}

function DockAutomation() {
  const enabled = useGameStore((state) => state.game.combatAutomation.enabled);
  const failure = useGameStore((state) => state.game.combat.lastAutomationFailure);
  const action = useGameStore((state) => state.game.combat.lastAutomationAction?.actionId);
  const capture = useDevToolsRuntimeStore((state) => state.automationTraceEnabled);
  const setCapture = useDevToolsRuntimeStore((state) => state.setAutomationTraceEnabled);
  const allEntries = useDebugTelemetryStore((state) => state.automationEvaluations);
  const entries = useMemo(() => allEntries.slice(-5), [allEntries]);
  return <><p className="debug-dock-value">{enabled ? "ON" : "OFF"} · {failure ?? action ?? "idle"}</p><label className="debug-dock-check"><input type="checkbox" checked={capture} onChange={(event) => setCapture(event.target.checked)} /> CAPTURE TRACE</label>{entries.map((entry) => entry.traces.map((trace) => <p key={`${entry.id}-${trace.ruleId}`} className={trace.result === "executed" ? "debug-dock-pass" : "debug-dock-muted"}>{trace.result.toUpperCase()} · {trace.ruleId} · {trace.actionId}</p>))}</>;
}

function DockAutomationSummary() {
  const enabled = useGameStore((state) => state.game.combatAutomation.enabled);
  const action = useGameStore((state) => state.game.combat.lastAutomationAction?.actionId);
  return <span>{enabled ? "ON" : "OFF"} · {action ?? "idle"}</span>;
}

function DockEvents() {
  const capture = useDevToolsRuntimeStore((state) => state.eventsEnabled);
  const setCapture = useDevToolsRuntimeStore((state) => state.setEventsEnabled);
  const clear = useDebugTelemetryStore((state) => state.clearEvents);
  const allEvents = useDebugTelemetryStore((state) => state.events);
  const events = useMemo(() => allEvents.slice(-8).reverse(), [allEvents]);
  return <><label className="debug-dock-check"><input type="checkbox" checked={capture} onChange={(event) => setCapture(event.target.checked)} /> CAPTURE EVENTS</label><div className="debug-dock-list">{events.map((event) => <span key={event.id}>#{event.sequence} {event.eventType}</span>)}</div><button type="button" onClick={clear}>CLEAR DEBUG EVENTS</button></>;
}

function DockEventsSummary() {
  const count = useDebugTelemetryStore((state) => state.events.length);
  return <span>{count}</span>;
}

function DockScenarios() {
  const slots = useDebugScenarioStore((state) => state.slots);
  const loadScenario = useGameStore((state) => state.debug.loadScenario);
  const pause = useDevToolsRuntimeStore((state) => state.setSimulationPaused);
  const filled = slots.filter((slot): slot is NonNullable<typeof slot> => Boolean(slot));
  return <div className="debug-dock-list">{filled.length === 0 ? <span className="debug-dock-muted">No saved scenarios.</span> : filled.map((slot) => <button type="button" key={slot.slot} data-debug-kind="debug-scenario-slot" data-debug-slot={slot.slot} data-debug-compatible={true} onClick={() => { loadScenario(slot.snapshot); pause(true); }}>{slot.name}</button>)}</div>;
}

function DockSizeButtons() {
  const size = useDevToolsRuntimeStore((state) => state.dockSize);
  const setSize = useDevToolsRuntimeStore((state) => state.setDockSize);
  return <><button type="button" onClick={() => setSize(size === "expanded" ? "compact" : "expanded")}>{size === "expanded" ? "COMPACT" : "EXPAND"}</button><button type="button" onClick={() => setSize(size === "minimized" ? "compact" : "minimized")}>{size === "minimized" ? "RESTORE" : "MINIMIZE"}</button></>;
}

function clampPosition(position: { x: number; y: number }, width: number, height: number) {
  return { x: Math.max(4, Math.min(Math.max(4, window.innerWidth - width - 4), position.x)), y: Math.max(4, Math.min(Math.max(4, window.innerHeight - height - 4), position.y)) };
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return <div className="debug-dock-meter"><div><span>{label}</span><b>{Math.round(value)} / {Math.round(max)}</b></div><i style={{ width: `${fraction * 100}%` }} /></div>;
}
