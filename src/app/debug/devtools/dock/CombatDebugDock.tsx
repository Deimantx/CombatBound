import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Bug, ExternalLink, Grip, X } from "lucide-react";
import { effectById } from "../../../../game/data/effects";
import { getBarrierAmount } from "../../../../game/combat/combatEffects";
import type { ActiveEffectInstance } from "../../../../game/combat/combatEffectTypes";
import type { DebugEffectTarget } from "../../../../game/debug/debugTypes";
import { useGameStore } from "../../../../state/gameStore";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { DebugEffectPicker } from "../../admin/components/DebugEffectPicker";
import { useDebugTelemetryStore } from "../../telemetry/debugTelemetryStore";
import { useDevToolsRuntimeStore } from "../devToolsRuntimeStore";
import { useDebugScenarioStore } from "../../scenarios/debugScenarioStore";
import { DebugDockSection } from "./DebugDockSection";
import { DebugSimulationControls } from "./DebugSimulationControls";
import { clampDockRect, resizeDockRect, type DockRect, type DockResizeDirection } from "./dockGeometry";

const EMPTY_ACTIVE_EFFECTS: ActiveEffectInstance[] = [];

export function CombatDebugDock() {
  const dockSize = useDevToolsRuntimeStore((state) => state.dockSize);
  const dockAnchor = useDevToolsRuntimeStore((state) => state.dockAnchor);
  const dockPosition = useDevToolsRuntimeStore((state) => state.dockPosition);
  const dockDimensions = useDevToolsRuntimeStore((state) => state.dockDimensions);
  const commitDockGeometry = useDevToolsRuntimeStore((state) => state.commitDockGeometry);
  const setDockAnchor = useDevToolsRuntimeStore((state) => state.setDockAnchor);
  const openConsole = useDevToolsRuntimeStore((state) => state.openConsole);
  const closeDock = useDevToolsRuntimeStore((state) => state.closeDock);
  const simulationPaused = useDevToolsRuntimeStore((state) => state.simulationPaused);
  const timeScale = useDevToolsRuntimeStore((state) => state.timeScale);
  const dockRef = useRef<HTMLElement>(null);
  const [transientRect, setTransientRect] = useState<DockRect | null>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number; startRect: DockRect } | null>(null);
  const resizeRef = useRef<{ pointerId: number; direction: DockResizeDirection; startPointerX: number; startPointerY: number; startRect: DockRect } | null>(null);
  const sizeClass = dockSize === "expanded" ? "is-expanded" : dockSize === "minimized" ? "is-minimized" : "is-compact";
  const positionStyle = transientRect
    ? { left: transientRect.x, top: transientRect.y, right: "auto", bottom: "auto", width: transientRect.width, height: dockSize === "minimized" ? undefined : transientRect.height }
    : {
        ...(dockPosition ? { left: dockPosition.x, top: dockPosition.y, right: "auto", bottom: "auto" } : {}),
        ...(dockDimensions ? { width: dockDimensions.width, height: dockSize === "minimized" ? undefined : dockDimensions.height } : {}),
      };

  useEffect(() => {
    const onResize = () => {
      const state = useDevToolsRuntimeStore.getState();
      const rect = dockRef.current?.getBoundingClientRect();
      if (!state.dockPosition || !rect) return;
      const clamped = clampDockRect({ x: state.dockPosition.x, y: state.dockPosition.y, width: rect.width, height: rect.height }, { width: window.innerWidth, height: window.innerHeight });
      commitDockGeometry({ x: clamped.x, y: clamped.y }, state.dockDimensions);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [commitDockGeometry]);

  const beginDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startRect = clampDockRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height }, { width: window.innerWidth, height: window.innerHeight });
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - startRect.x, offsetY: event.clientY - startRect.y, startRect };
    setTransientRect(startRect);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setTransientRect(clampDockRect({ ...drag.startRect, x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY }, { width: window.innerWidth, height: window.innerHeight }));
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const finalRect = transientRect ?? clampDockRect({ ...drag.startRect, x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY }, { width: window.innerWidth, height: window.innerHeight });
    const edge = 72;
    const right = window.innerWidth - event.clientX;
    const bottom = window.innerHeight - event.clientY;
    if (event.clientX < edge && event.clientY < edge) setDockAnchor("top-left");
    else if (right < edge && event.clientY < edge) setDockAnchor("top-right");
    else if (event.clientX < edge && bottom < edge) setDockAnchor("bottom-left");
    else if (right < edge && bottom < edge) setDockAnchor("bottom-right");
    else commitDockGeometry({ x: finalRect.x, y: finalRect.y }, useDevToolsRuntimeStore.getState().dockDimensions);
    dragRef.current = null;
    setTransientRect(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const beginResize = (direction: DockResizeDirection, event: PointerEvent<HTMLButtonElement>) => {
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startRect = clampDockRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height }, { width: window.innerWidth, height: window.innerHeight });
    resizeRef.current = { pointerId: event.pointerId, direction, startPointerX: event.clientX, startPointerY: event.clientY, startRect };
    setTransientRect(startRect);
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    setTransientRect(resizeDockRect(resize.startRect, resize.direction, event.clientX - resize.startPointerX, event.clientY - resize.startPointerY, { width: window.innerWidth, height: window.innerHeight }));
  };
  const endResize = (event: PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const finalRect = transientRect ?? resize.startRect;
    commitDockGeometry({ x: finalRect.x, y: finalRect.y }, { width: finalRect.width, height: finalRect.height });
    resizeRef.current = null;
    setTransientRect(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return <aside ref={dockRef} className={`combat-debug-dock ${sizeClass} anchor-${dockAnchor}`} style={positionStyle} data-debug-kind="combat-debug-dock" data-debug-dock-size={dockSize} data-debug-dock-anchor={dockAnchor} data-debug-simulation-paused={simulationPaused} data-debug-time-scale={timeScale} data-debug-resizable="true" data-debug-width={transientRect?.width ?? dockDimensions?.width ?? "preset"} data-debug-height={transientRect?.height ?? dockDimensions?.height ?? "preset"} data-debug-custom-size={Boolean(dockDimensions)}>
    <header className="debug-dock-header"><button type="button" className="debug-dock-drag" aria-label="Drag debug dock" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><Grip size={13} /></button><Bug size={14} /><strong>COMBAT DEBUG</strong><span className="debug-dock-live">LIVE</span><button type="button" onClick={openConsole} aria-label="Open full debug console"><ExternalLink size={13} /></button><button type="button" onClick={closeDock} aria-label="Close combat debug dock"><X size={14} /></button></header>
    {dockSize === "minimized" ? <DockMinimizedSummary /> : <DockBody />}
    <footer className="debug-dock-footer"><DockSizeButtons /></footer>
    {(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as DockResizeDirection[]).map((direction) => <button key={direction} type="button" className={`debug-dock-resize-handle handle-${direction}`} aria-label={`Resize debug dock ${direction}`} data-debug-kind="debug-dock-resize-handle" data-debug-direction={direction} onPointerDown={(event) => beginResize(direction, event)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} />)}
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
  const selectedId = useGameStore((state) => state.game.combat.selectedEnemyInstanceId);
  const name = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.displayName);
  const currentHealth = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.currentHealth ?? 0);
  const maxHealth = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.maxHealth ?? 0);
  const immortal = useDevToolsRuntimeStore((state) => Boolean(selectedId && state.immortalEnemyInstanceIds.includes(selectedId)));
  return <span>{name ? `${name} · ${Math.round(maxHealth > 0 ? currentHealth / maxHealth * 100 : 0)}%${immortal ? " · IMMORTAL" : ""}` : "None"}</span>;
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
    <div className="debug-dock-actions"><GameTooltip content={immortalTooltip}><button type="button" className={immortal ? "is-active" : ""} onClick={() => setImmortal(!immortal)} aria-pressed={immortal}>{immortal ? "IMMORTAL" : "IMMORTAL OFF"}</button></GameTooltip><GameTooltip content={{ id: "debug-dock-max-hp-barrier", title: "MAX HP BARRIER", description: "Applies the canonical Earthen Ward barrier using the player's current maximum Life. Barrier absorption still follows normal rules.", rows: [] }}><button type="button" onClick={applyBarrier}>ADD 100% LIFE BARRIER</button></GameTooltip></div>
    <p className="debug-dock-note">BARRIER {Math.round(barrier)} / {Math.round(maxHp)}</p>
  </>;
}

function DockEnemy() {
  const selectedId = useGameStore((state) => state.game.combat.selectedEnemyInstanceId);
  const selectedName = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.displayName);
  const currentHealth = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.currentHealth ?? 0);
  const maxHealth = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.maxHealth ?? 0);
  const defeated = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.defeated ?? true);
  const kill = useGameStore((state) => state.debug.killSelectedEnemy);
  const heal = useGameStore((state) => state.debug.healSelectedEnemyToFull);
  const immortal = useDevToolsRuntimeStore((state) => Boolean(selectedId && state.immortalEnemyInstanceIds.includes(selectedId)));
  const setImmortal = useDevToolsRuntimeStore((state) => state.setEnemyImmortal);
  const immortalTooltip = { id: "debug-dock-enemy-immortal", title: "ENEMY IMMORTAL", description: "Canonical Combat damage can reduce this Enemy to 1 HP but cannot defeat it. Debug DEFEAT SELECTED and KILL GROUP still bypass this protection.", rows: [] };
  return <><p className="debug-dock-value">{selectedName ?? "No selected enemy"}{selectedName && immortal ? " · IMMORTAL" : ""}</p>{selectedName && <><Meter label="HP" value={currentHealth} max={maxHealth} /><div className="debug-dock-actions"><GameTooltip content={immortalTooltip}><button type="button" className={immortal ? "is-active" : ""} onClick={() => selectedId && setImmortal(selectedId, !immortal)} disabled={!selectedId || defeated} aria-pressed={immortal}>{immortal ? "IMMORTAL" : "IMMORTAL OFF"}</button></GameTooltip><GameTooltip content={{ id: "debug-dock-heal-enemy", title: "FULL HEAL SELECTED ENEMY", description: "Restores a living selected enemy to maximum HP without resetting effects, cooldowns, actions, phases, or rewards.", rows: [] }}><button type="button" onClick={heal} disabled={defeated}>HEAL TO FULL</button></GameTooltip><button type="button" onClick={kill} disabled={defeated}>DEFEAT SELECTED</button></div></>}</>;
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
  const selectedEnemyInstance = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId));
  const selectedEnemyEffects = selectedEnemyInstance?.effects ?? EMPTY_ACTIVE_EFFECTS;
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
  return <div className="debug-dock-actions"><button type="button" onClick={resetPlayer}>RESET PLAYER COOLDOWNS</button><GameTooltip content={{ id: "debug-dock-reset-enemy-cooldowns", title: "RESET ENEMY COOLDOWNS", description: "Clears cooldown timers on enemy actions without changing their current action or phase.", rows: [] }}><button type="button" onClick={resetEnemy}>RESET ENEMY COOLDOWNS</button></GameTooltip><GameTooltip content={{ id: "debug-dock-cancel-enemy-actions", title: "CANCEL ENEMY ACTIONS", description: "Cancels current Enemy special actions/casts and restarts each living Enemy's basic attack timer from a full interval. Does not reset special-action cooldowns.", rows: [] }}><button type="button" onClick={cancelEnemy}>CANCEL ENEMY ACTIONS</button></GameTooltip></div>;
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
  const customSize = useDevToolsRuntimeStore((state) => Boolean(state.dockDimensions));
  const setSize = useDevToolsRuntimeStore((state) => state.setDockSize);
  return <><button type="button" onClick={() => setSize(size === "expanded" ? "compact" : "expanded")}>{size === "expanded" ? "COMPACT" : "EXPAND"}</button><button type="button" onClick={() => setSize(size === "minimized" ? "compact" : "minimized")}>{size === "minimized" ? "RESTORE" : "MINIMIZE"}</button>{customSize && <GameTooltip content={{ id: "debug-dock-reset-size", title: "RESET SIZE", description: "Return Combat Debug Dock to the current preset size.", rows: [] }}><button type="button" onClick={() => setSize(size === "minimized" ? "compact" : size)}>RESET SIZE</button></GameTooltip>}</>;
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return <div className="debug-dock-meter"><div><span>{label}</span><b>{Math.round(value)} / {Math.round(max)}</b></div><i style={{ width: `${fraction * 100}%` }} /></div>;
}
