import { useEffect, useRef, useState } from "react";
import { Bug, ExternalLink, Grip, X } from "lucide-react";
import { effectById } from "../../../../game/data/effects";
import { calculateHunterCombatStats } from "../../../../game/equipment/derivedStats";
import { getPerkPointSummary } from "../../../../game/progression/masteryProgression";
import { perkById } from "../../../../game/data/proficiencyPerks";
import { useGameStore } from "../../../../state/gameStore";
import { useDevToolsRuntimeStore } from "../devToolsRuntimeStore";
import { readDebugScenarioSlots } from "../../scenarios/debugScenarioStorage";
import { DebugDockSection } from "./DebugDockSection";
import { DebugSimulationControls } from "./DebugSimulationControls";

export function CombatDebugDock() {
  const game = useGameStore((state) => state.game);
  const debug = useGameStore((state) => state.debug);
  const runtime = useDevToolsRuntimeStore();
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dockRef = useRef<HTMLElement>(null);
  const sizeClass = runtime.dockSize === "expanded" ? "is-expanded" : runtime.dockSize === "minimized" ? "is-minimized" : "is-compact";
  const positionStyle = runtime.dockPosition ? { left: runtime.dockPosition.x, top: runtime.dockPosition.y, right: "auto", bottom: "auto" } : undefined;
  const selected = game.combat.enemies.find((enemy) => enemy.instanceId === game.combat.selectedEnemyInstanceId) ?? game.combat.enemies.find((enemy) => !enemy.defeated);
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques);
  const perkPoints = getPerkPointSummary(game.progression, perkById);
  const [scenarioSlots] = useState(() => readDebugScenarioSlots());
  const move = (event: React.PointerEvent) => {
    if (!dragStart.current) return;
    const rect = dockRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 340;
    const height = rect?.height ?? 240;
    const x = Math.max(4, Math.min(window.innerWidth - width - 4, event.clientX - dragStart.current.x));
    const y = Math.max(4, Math.min(window.innerHeight - height - 4, event.clientY - dragStart.current.y));
    runtime.setDockPosition({ x, y });
  };
  useEffect(() => {
    const onResize = () => {
      if (!runtime.dockPosition || !dockRef.current) return;
      const rect = dockRef.current.getBoundingClientRect();
      runtime.setDockPosition({ x: Math.max(4, Math.min(window.innerWidth - rect.width - 4, runtime.dockPosition.x)), y: Math.max(4, Math.min(window.innerHeight - rect.height - 4, runtime.dockPosition.y)) });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [runtime]);
  return <aside ref={dockRef} className={`combat-debug-dock ${sizeClass} anchor-${runtime.dockAnchor}`} style={positionStyle} data-debug-kind="combat-debug-dock" data-debug-dock-size={runtime.dockSize} data-debug-dock-anchor={runtime.dockAnchor} data-debug-simulation-paused={runtime.simulationPaused} data-debug-time-scale={runtime.timeScale}>
      <header className="debug-dock-header" onPointerMove={move} onPointerUp={(event) => { if (dragStart.current) { const edge = 72; const right = window.innerWidth - event.clientX; const bottom = window.innerHeight - event.clientY; if (event.clientX < edge && event.clientY < edge) runtime.setDockAnchor("top-left"); else if (right < edge && event.clientY < edge) runtime.setDockAnchor("top-right"); else if (event.clientX < edge && bottom < edge) runtime.setDockAnchor("bottom-left"); else if (right < edge && bottom < edge) runtime.setDockAnchor("bottom-right"); } dragStart.current = null; }}>
        {runtime.dockSize === "minimized" && <span className="debug-dock-minimized-summary">HP {Math.round(game.combat.maxPlayerHp > 0 ? game.combat.playerHp / game.combat.maxPlayerHp * 100 : 0)}% · {selected?.displayName ?? "No enemy"} · {runtime.timeScale}x</span>}
      <button type="button" className="debug-dock-drag" aria-label="Drag debug dock" onPointerDown={(event) => { dragStart.current = { x: event.clientX - (runtime.dockPosition?.x ?? event.clientX), y: event.clientY - (runtime.dockPosition?.y ?? event.clientY) }; }}><Grip size={13} /></button><Bug size={14} /><strong>COMBAT DEBUG</strong><span className="debug-dock-live">LIVE</span><button type="button" onClick={runtime.openConsole} aria-label="Open full debug console"><ExternalLink size={13} /></button><button type="button" onClick={runtime.close} aria-label="Close combat debug dock"><X size={14} /></button>
    </header>
    {runtime.dockSize !== "minimized" && <div className="debug-dock-body combatbound-scroll">
      <DebugDockSection id="time" title="TIME"><DebugSimulationControls /><p className="debug-dock-note">One simulation clock drives combat, recovery and manual stepping.</p></DebugDockSection>
      <DebugDockSection id="player" title="PLAYER" defaultOpen><div className="debug-dock-grid"><Meter label="HP" value={game.combat.playerHp} max={game.combat.maxPlayerHp} /><Meter label="STAMINA" value={game.combat.stamina} max={game.combat.maxStamina} /><Meter label="MANA" value={game.combat.mana} max={game.combat.maxMana} /></div><div className="debug-dock-actions"><button type="button" onClick={debug.fillAllResources}>FILL RESOURCES</button><button type="button" onClick={debug.revive}>REVIVE</button></div></DebugDockSection>
      <DebugDockSection id="enemy" title="ENEMY"><p className="debug-dock-value">{selected?.displayName ?? "No active enemy"}</p>{selected && <><Meter label="HP" value={selected.currentHealth} max={selected.maxHealth} /><div className="debug-dock-actions"><button type="button" onClick={debug.killSelectedEnemy}>DEFEAT SELECTED</button><button type="button" onClick={() => debug.damagePlayer(10)}>DAMAGE PLAYER</button></div></>}</DebugDockSection>
      <DebugDockSection id="effects" title="EFFECTS"><div className="debug-dock-list">{game.combat.playerEffects.length === 0 ? <span className="debug-dock-muted">No active player effects.</span> : game.combat.playerEffects.map((effect) => <span key={effect.instanceId}>{effectById[effect.effectId]?.name ?? effect.effectId} x{effect.stacks}</span>)}</div><div className="debug-dock-actions"><button type="button" onClick={debug.clearPlayerEffects}>CLEAR PLAYER EFFECTS</button><button type="button" onClick={debug.clearAllEnemyEffects}>CLEAR ENEMY EFFECTS</button></div></DebugDockSection>
      <DebugDockSection id="rng" title="RNG"><div className="debug-dock-actions" data-debug-kind="debug-rng" data-debug-rng-mode={runtime.rngMode} data-debug-rng-seed={runtime.rngSeed}><button type="button" className={runtime.rngMode === "normal" ? "is-active" : ""} onClick={() => runtime.setRngMode("normal")}>NORMAL</button><button type="button" className={runtime.rngMode === "seeded" ? "is-active" : ""} onClick={() => runtime.setRngMode("seeded")}>SEEDED</button><button type="button" onClick={() => runtime.setRngOverride("hit", "hit")} data-debug-action="force-next-hit">FORCE HIT</button><button type="button" onClick={() => runtime.setRngOverride("hit", "miss")} data-debug-action="force-next-miss">FORCE MISS</button><button type="button" onClick={() => runtime.setRngOverride("crit", "crit")} data-debug-action="force-next-crit">FORCE CRIT</button><button type="button" onClick={() => runtime.setRngOverride("dodge", "dodge")} data-debug-action="force-next-dodge">DODGE</button><button type="button" onClick={() => runtime.setRngOverride("parry", "parry")} data-debug-action="force-next-parry">PARRY</button><button type="button" onClick={() => runtime.setRngOverride("block", "block")} data-debug-action="force-next-block">BLOCK</button></div><label className="debug-dock-input">SEED <input type="number" value={runtime.rngSeed} onChange={(event) => runtime.setRngSeed(Number(event.target.value))} /></label><p className="debug-dock-note">Rolls: {runtime.rngRollIndex} · Last: {runtime.rngHistory.at(-1)?.value.toFixed(4) ?? "-"}</p></DebugDockSection>
      <DebugDockSection id="automation" title="AUTOMATION"><p className="debug-dock-value">{game.combatAutomation.enabled ? "ON" : "OFF"} · {game.combat.lastAutomationFailure ?? game.combat.lastAutomationAction?.actionId ?? "idle"}</p><label className="debug-dock-check"><input type="checkbox" checked={runtime.automationTraceEnabled} onChange={(event) => runtime.setAutomationTraceEnabled(event.target.checked)} /> TRACE EVALUATION</label>{runtime.automationTrace.slice(-5).map((entry) => <p key={entry.id} className={entry.passed ? "debug-dock-pass" : "debug-dock-muted"}>{entry.passed ? "PASS" : "SKIP"} · {entry.text}</p>)}</DebugDockSection>
      <DebugDockSection id="events" title="EVENTS"><div className="debug-dock-list">{runtime.events.slice(-8).reverse().map((event) => <span key={event.id}>{event.type}</span>)}</div><button type="button" onClick={runtime.clearEvents}>CLEAR DEBUG EVENTS</button></DebugDockSection>
      <DebugDockSection id="stats" title="STATS"><div className="debug-dock-stats"><span>Attack Power <b>{stats.attackPower.toFixed(1)}</b></span><span>Accuracy <b>{stats.accuracy.toFixed(1)}</b></span><span>Armor <b>{stats.armor.toFixed(1)}</b></span><span>Crit <b>{(stats.critChance * 100).toFixed(1)}%</b></span><span>Perks available <b>{perkPoints.available}</b></span></div></DebugDockSection>
      <DebugDockSection id="scenarios" title="SCENARIOS"><div className="debug-dock-list">{scenarioSlots.length === 0 ? <span className="debug-dock-muted">No saved scenarios.</span> : scenarioSlots.map((slot) => <button type="button" key={slot.id} data-debug-kind="debug-scenario-slot" data-debug-slot={slot.id} onClick={() => { debug.loadScenario(slot.snapshot); runtime.setSimulationPaused(true); }}>{slot.name}</button>)}</div></DebugDockSection>
    </div>}
    <footer className="debug-dock-footer"><button type="button" onClick={() => runtime.setDockSize(runtime.dockSize === "expanded" ? "compact" : "expanded")}>{runtime.dockSize === "expanded" ? "COMPACT" : "EXPAND"}</button><button type="button" onClick={() => runtime.setDockSize(runtime.dockSize === "minimized" ? "compact" : "minimized")}>{runtime.dockSize === "minimized" ? "RESTORE" : "MINIMIZE"}</button></footer>
  </aside>;
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return <div className="debug-dock-meter"><div><span>{label}</span><b>{Math.round(value)} / {Math.round(max)}</b></div><i style={{ width: `${fraction * 100}%` }} /></div>;
}
