import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameTooltip } from "../app/components/tooltip/GameTooltip";
import { TooltipProvider } from "../app/components/tooltip/TooltipProvider";
import { positionTooltipAtPointer } from "../app/components/tooltip/tooltipPosition";
import { useDevToolsRuntimeStore } from "../app/debug/devtools/devToolsRuntimeStore";
import { CombatDebugDock } from "../app/debug/devtools/dock/CombatDebugDock";
import { resizeDockRect } from "../app/debug/devtools/dock/dockGeometry";
import { applyEnemyHealthDamage, createCombatContext, forceDefeatEnemiesForDebug } from "../game/combat/combatEngine";
import { applyEffect } from "../game/combat/combatEffects";
import { effectById } from "../game/data/effects";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { combatBalance } from "../game/combat/combatBalance";
import { instantiateEnemies } from "../game/combat/combatState";
import { createInitialGameState } from "../game/gameState";
import { debugCancelEnemyActions } from "../game/debug/debugActions";
import { advanceCombat, startHunt } from "../game/combat/combatEngine";

beforeEach(() => {
  cleanup();
  useDevToolsRuntimeStore.setState({
    immortalEnemyInstanceIds: [],
    dockDimensions: null,
    dockSize: "compact",
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Developer Toolkit V9.4", () => {
  it("positions pointer tooltips right-first, flips at the edge, and clamps at the bottom", () => {
    expect(positionTooltipAtPointer({ pointer: { x: 500, y: 400 }, tooltip: { width: 200, height: 100 }, viewport: { width: 1200, height: 800 } })).toEqual({ top: 410, left: 514, side: "right" });
    const flipped = positionTooltipAtPointer({ pointer: { x: 1150, y: 400 }, tooltip: { width: 200, height: 100 }, viewport: { width: 1200, height: 800 } });
    expect(flipped.side).toBe("left");
    expect(flipped.left + 200).toBeLessThanOrEqual(1190);
    const clamped = positionTooltipAtPointer({ pointer: { x: 500, y: 790 }, tooltip: { width: 200, height: 100 }, viewport: { width: 1200, height: 800 } });
    expect(clamped.top).toBe(690);
  });

  it("keeps focus tooltips element-based and remembers the latest hover pointer", () => {
    vi.useFakeTimers();
    render(<TooltipProvider><GameTooltip content={{ id: "focus-tooltip", title: "FOCUS TOOLTIP", description: "Focus content", rows: [] }}><button type="button">Target</button></GameTooltip></TooltipProvider>);
    const target = screen.getByRole("button", { name: "Target" });
    fireEvent.focus(target);
    expect(screen.getByText("FOCUS TOOLTIP")).toBeInTheDocument();
    fireEvent.blur(target);
    expect(screen.queryByText("FOCUS TOOLTIP")).not.toBeInTheDocument();

    fireEvent.mouseEnter(target, { clientX: 10, clientY: 20 });
    fireEvent.mouseMove(target, { clientX: 500, clientY: 400 });
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText("FOCUS TOOLTIP")).toBeInTheDocument();
  });

  it("applies enemy immortality per instance and leaves explicit debug defeat unrestricted", () => {
    const initial = createInitialGameState();
    const enemy = instantiateEnemies(["enemy.grey-wolf"], 1)[0];
    const combat = { ...initial.combat, enemies: [{ ...enemy, currentHealth: 10, maxHealth: 10 }], selectedEnemyInstanceId: enemy.instanceId };
    const immortalContext = createCombatContext({ next: () => 0.5 });
    immortalContext.debugHooks = { isEnemyImmortal: (instanceId) => instanceId === enemy.instanceId };
    const protectedHit = applyEnemyHealthDamage(combat, enemy.instanceId, 50, immortalContext);
    expect(protectedHit.combat.enemies[0].currentHealth).toBe(1);
    expect(protectedHit.combat.enemies[0].defeated).toBe(false);
    expect(protectedHit.wouldHaveDied).toBe(true);

    const normalContext = createCombatContext({ next: () => 0.5 });
    const normalHit = applyEnemyHealthDamage(combat, enemy.instanceId, 50, normalContext);
    expect(normalHit.combat.enemies[0].defeated).toBe(true);
    expect(forceDefeatEnemiesForDebug({ ...initial, combat: protectedHit.combat }, [enemy.instanceId], immortalContext).combat.enemies[0].defeated).toBe(true);
  });

  it("routes periodic enemy damage through the same immortal floor", () => {
    const initial = createInitialGameState();
    const stats = calculateHunterCombatStats(initial.equipment, initial.progression, initial.combat.stance, initial.combat.techniques);
    const context = createCombatContext({ next: () => 0.5 });
    const started = startHunt(initial, "location.wolf-den", stats, context);
    const target = started.combat.enemies[0];
    const withEffect = applyEffect({ ...started.combat, enemies: started.combat.enemies.map((enemy) => enemy.instanceId === target.instanceId ? { ...enemy, currentHealth: 5, attackTimer: 10 } : enemy) }, effectById["effect.ignite"], { kind: "player" }, { kind: "enemy", instanceId: target.instanceId }).combat;
    const prepared = { ...started, combat: { ...withEffect, playerAttackTimer: 10 } };
    context.debugHooks = { isEnemyImmortal: (instanceId) => instanceId === target.instanceId };
    const afterTick = advanceCombat(prepared, combatBalance.igniteInterval + 0.1, context, stats);
    const result = afterTick.combat.enemies.find((enemy) => enemy.instanceId === target.instanceId);
    expect(result?.currentHealth).toBe(1);
    expect(result?.defeated).toBe(false);
  });

  it("resets living enemy actions without touching cooldowns or defeated records", () => {
    const initial = createInitialGameState();
    const enemy = instantiateEnemies(["enemy.grey-wolf"], 1)[0];
    const currentAction = { actionId: "test-action", remainingSeconds: 1 } as NonNullable<typeof enemy.currentAction>;
    const defeated = { ...enemy, defeated: true, currentAction, attackTimer: 0.1 };
    const game = { ...initial, combat: { ...initial.combat, enemies: [{ ...enemy, currentAction, attackTimer: 0.2, attackInterval: 2.5, actionCooldowns: { "test-action": 5 } }, defeated] } };
    const next = debugCancelEnemyActions(game);
    expect(next.combat.enemies[0].currentAction).toBeNull();
    expect(next.combat.enemies[0].attackTimer).toBe(2.5);
    expect(next.combat.enemies[0].actionCooldowns).toEqual({ "test-action": 5 });
    expect(next.combat.enemies[1]).toBe(defeated);
  });

  it("resizes east, west, and south-east while enforcing minimums and viewport margins", () => {
    const viewport = { width: 1200, height: 800 };
    const start = { x: 700, y: 300, width: 320, height: 240 };
    const east = resizeDockRect(start, "e", 80, 0, viewport);
    expect(east.width).toBe(400);
    expect(east.x).toBe(700);
    const west = resizeDockRect(start, "w", -80, 0, viewport);
    expect(west.x).toBe(620);
    expect(west.width).toBe(400);
    expect(west.x + west.width).toBe(start.x + start.width);
    const corner = resizeDockRect(start, "se", 400, 400, viewport);
    expect(corner.width).toBe(720);
    expect(corner.height).toBe(640);
    expect(corner.x + corner.width).toBeLessThanOrEqual(viewport.width - 12);
    expect(corner.y + corner.height).toBeLessThanOrEqual(viewport.height - 12);
    const minimum = resizeDockRect(start, "nw", 1000, 1000, viewport);
    expect(minimum.width).toBe(300);
    expect(minimum.height).toBe(220);
    expect(minimum.x).toBeGreaterThanOrEqual(12);
    expect(minimum.y).toBeGreaterThanOrEqual(12);
  });

  it("keeps enemy immortality runtime-only and preserves custom size through minimize", () => {
    const runtime = useDevToolsRuntimeStore.getState();
    runtime.setEnemyImmortal("enemy#1", true);
    expect(useDevToolsRuntimeStore.getState().isEnemyImmortal("enemy#1")).toBe(true);
    runtime.setDockDimensions({ width: 620, height: 440 });
    runtime.setDockSize("minimized");
    expect(useDevToolsRuntimeStore.getState().dockDimensions).toEqual({ width: 620, height: 440 });
    runtime.setDockSize("compact");
    expect(useDevToolsRuntimeStore.getState().dockDimensions).toBeNull();
    expect(useDevToolsRuntimeStore.getState().isEnemyImmortal("enemy#1")).toBe(true);
  });

  it("renders all eight controlled Dock resize handles and commits geometry on pointerup", () => {
    render(<TooltipProvider><CombatDebugDock /></TooltipProvider>);
    const handles = document.querySelectorAll('[data-debug-kind="debug-dock-resize-handle"]');
    expect(handles).toHaveLength(8);
    const southeast = document.querySelector('[data-debug-direction="se"]') as HTMLButtonElement;
    fireEvent.pointerDown(southeast, { pointerId: 9, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(southeast, { pointerId: 9, clientX: 180, clientY: 160 });
    fireEvent.pointerUp(southeast, { pointerId: 9, clientX: 180, clientY: 160 });
    expect(useDevToolsRuntimeStore.getState().dockDimensions).toEqual({ width: 380, height: 280 });
  });
});
