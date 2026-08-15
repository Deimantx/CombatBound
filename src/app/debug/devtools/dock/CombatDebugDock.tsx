import { useEffect, useRef } from "react";
import { Bug, ExternalLink, Grip, X } from "lucide-react";
import { effectById } from "../../../../game/data/effects";
import { calculateHunterCombatStats } from "../../../../game/equipment/derivedStats";
import { getPerkPointSummary } from "../../../../game/progression/masteryProgression";
import { perkById } from "../../../../game/data/proficiencyPerks";
import { useGameStore } from "../../../../state/gameStore";
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

  const beginDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = dockRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (!useDevToolsRuntimeStore.getState().dockPosition) setDockPosition({ x: rect.left, y: rect.top });
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = dockRef.current?.getBoundingClientRect();
    if (rect) setDockPosition(clampPosition({ x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY }, rect.width, rect.height));
  };
  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
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
  return <div className="debug-dock-body combatbound-scroll"><DebugDockSection id="time" title="TIME"><DebugSimulationControls /><p className="debug-dock-note">One simulation clock drives combat, recovery and manual stepping.</p></DebugDockSection><DebugDockSection id="player" title="PLAYER" defaultOpen><DockPlayer /></DebugDockSection><DebugDockSection id="enemy" title="ENEMY"><DockEnemy /></DebugDockSection><DebugDockSection id="effects" title="EFFECTS"><DockEffects /></DebugDockSection><DebugDockSection id="rng" title="RNG"><DockRng /></DebugDockSection><DebugDockSection id="automation" title="AUTOMATION"><DockAutomation /></DebugDockSection><DebugDockSection id="events" title="EVENTS"><DockEvents /></DebugDockSection><DebugDockSection id="stats" title="STATS"><DockStats /></DebugDockSection><DebugDockSection id="scenarios" title="SCENARIOS"><DockScenarios /></DebugDockSection></div>;
}

function DockMinimizedSummary() {
  const hp = useGameStore((state) => state.game.combat.playerHp);
  const maxHp = useGameStore((state) => state.game.combat.maxPlayerHp);
  const selected = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId)?.displayName ?? "No enemy");
  const timeScale = useDevToolsRuntimeStore((state) => state.timeScale);
  return <span className="debug-dock-minimized-summary">HP {Math.round(maxHp > 0 ? hp / maxHp * 100 : 0)}% · {selected} · {timeScale}x</span>;
}

function DockPlayer() {
  const combat = useGameStore((state) => state.game.combat);
  const fillAllResources = useGameStore((state) => state.debug.fillAllResources);
  const revive = useGameStore((state) => state.debug.revive);
  return <><div className="debug-dock-grid"><Meter label="HP" value={combat.playerHp} max={combat.maxPlayerHp} /><Meter label="STAMINA" value={combat.stamina} max={combat.maxStamina} /><Meter label="MANA" value={combat.mana} max={combat.maxMana} /></div><div className="debug-dock-actions"><button type="button" onClick={fillAllResources}>FILL RESOURCES</button><button type="button" onClick={revive}>REVIVE</button></div></>;
}

function DockEnemy() {
  const selected = useGameStore((state) => state.game.combat.enemies.find((enemy) => enemy.instanceId === state.game.combat.selectedEnemyInstanceId) ?? state.game.combat.enemies.find((enemy) => !enemy.defeated));
  const kill = useGameStore((state) => state.debug.killSelectedEnemy);
  const damage = useGameStore((state) => state.debug.damagePlayer);
  return <><p className="debug-dock-value">{selected?.displayName ?? "No active enemy"}</p>{selected && <><Meter label="HP" value={selected.currentHealth} max={selected.maxHealth} /><div className="debug-dock-actions"><button type="button" onClick={kill}>DEFEAT SELECTED</button><button type="button" onClick={() => damage(10)}>DAMAGE PLAYER</button></div></>}</>;
}

function DockEffects() {
  const effects = useGameStore((state) => state.game.combat.playerEffects);
  const clearPlayer = useGameStore((state) => state.debug.clearPlayerEffects);
  const clearEnemy = useGameStore((state) => state.debug.clearAllEnemyEffects);
  return <><div className="debug-dock-list">{effects.length === 0 ? <span className="debug-dock-muted">No active player effects.</span> : effects.map((effect) => <span key={effect.instanceId}>{effectById[effect.effectId]?.name ?? effect.effectId} x{effect.stacks}</span>)}</div><div className="debug-dock-actions"><button type="button" onClick={clearPlayer}>CLEAR PLAYER EFFECTS</button><button type="button" onClick={clearEnemy}>CLEAR ENEMY EFFECTS</button></div></>;
}

function DockRng() {
  const mode = useDevToolsRuntimeStore((state) => state.rngMode);
  const seed = useDevToolsRuntimeStore((state) => state.rngSeed);
  const rollIndex = useDevToolsRuntimeStore((state) => state.rngRollIndex);
  const setMode = useDevToolsRuntimeStore((state) => state.setRngMode);
  const setSeed = useDevToolsRuntimeStore((state) => state.setRngSeed);
  const setOverride = useDevToolsRuntimeStore((state) => state.setRngOverride);
  const capture = useDevToolsRuntimeStore((state) => state.rngCaptureEnabled);
  const setCapture = useDevToolsRuntimeStore((state) => state.setRngCaptureEnabled);
  const last = useDebugTelemetryStore((state) => state.rngHistory.at(-1));
  return <><div className="debug-dock-actions" data-debug-kind="debug-rng" data-debug-rng-mode={mode} data-debug-rng-seed={seed}><button type="button" className={mode === "normal" ? "is-active" : ""} onClick={() => setMode("normal")}>NORMAL</button><button type="button" className={mode === "seeded" ? "is-active" : ""} onClick={() => setMode("seeded")}>SEEDED</button><button type="button" onClick={() => setOverride("hit", "hit")}>FORCE HIT</button><button type="button" onClick={() => setOverride("hit", "miss")}>FORCE MISS</button><button type="button" onClick={() => setOverride("crit", "crit")}>FORCE CRIT</button></div><label className="debug-dock-input">SEED <input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))} /></label><label className="debug-dock-check"><input type="checkbox" checked={capture} onChange={(event) => setCapture(event.target.checked)} /> CAPTURE ROLLS</label><p className="debug-dock-note">Rolls: {rollIndex} · Last: {last?.value.toFixed(4) ?? "-"}</p></>;
}

function DockAutomation() {
  const enabled = useGameStore((state) => state.game.combatAutomation.enabled);
  const failure = useGameStore((state) => state.game.combat.lastAutomationFailure);
  const action = useGameStore((state) => state.game.combat.lastAutomationAction?.actionId);
  const capture = useDevToolsRuntimeStore((state) => state.automationTraceEnabled);
  const setCapture = useDevToolsRuntimeStore((state) => state.setAutomationTraceEnabled);
  const entries = useDebugTelemetryStore((state) => state.automationEvaluations.slice(-5));
  return <><p className="debug-dock-value">{enabled ? "ON" : "OFF"} · {failure ?? action ?? "idle"}</p><label className="debug-dock-check"><input type="checkbox" checked={capture} onChange={(event) => setCapture(event.target.checked)} /> CAPTURE TRACE</label>{entries.map((entry) => entry.traces.map((trace) => <p key={`${entry.id}-${trace.ruleId}`} className={trace.result === "executed" ? "debug-dock-pass" : "debug-dock-muted"}>{trace.result.toUpperCase()} · {trace.ruleId} · {trace.actionId}</p>))}</>;
}

function DockEvents() {
  const capture = useDevToolsRuntimeStore((state) => state.eventsEnabled);
  const setCapture = useDevToolsRuntimeStore((state) => state.setEventsEnabled);
  const clear = useDebugTelemetryStore((state) => state.clearEvents);
  const events = useDebugTelemetryStore((state) => state.events.slice(-8).reverse());
  return <><label className="debug-dock-check"><input type="checkbox" checked={capture} onChange={(event) => setCapture(event.target.checked)} /> CAPTURE EVENTS</label><div className="debug-dock-list">{events.map((event) => <span key={event.id}>#{event.sequence} {event.eventType}</span>)}</div><button type="button" onClick={clear}>CLEAR DEBUG EVENTS</button></>;
}

function DockStats() {
  const game = useGameStore((state) => state.game);
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques);
  const perkPoints = getPerkPointSummary(game.progression, perkById);
  return <div className="debug-dock-stats"><span>Accuracy <b>{stats.accuracy.toFixed(1)}</b></span><span>Armor <b>{stats.armor.toFixed(1)}</b></span><span>Evasion <b>{stats.evasion.toFixed(1)}</b></span><span>Max HP <b>{stats.maxHealth.toFixed(1)}</b></span><span>Mana Regen <b>{stats.manaRegen.toFixed(1)}</b></span><span>Perks available <b>{perkPoints.available}</b></span></div>;
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

