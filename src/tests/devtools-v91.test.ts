import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { useDevToolsRuntimeStore } from "../app/debug/devtools/devToolsRuntimeStore";
import { useDebugTelemetryStore } from "../app/debug/telemetry/debugTelemetryStore";
import { DEBUG_AUTOMATION_BUFFER_LIMIT, DEBUG_EVENT_BUFFER_LIMIT, DEBUG_RNG_BUFFER_LIMIT } from "../app/debug/telemetry/debugTelemetryBuffer";
import { DEBUG_STAT_DEFINITIONS, RESISTANCE_DAMAGE_TYPES, COMBAT_STAT_KEYS } from "../game/presentation/debugStatRegistry";

describe("Developer Toolkit V9.1 foundations", () => {
  beforeEach(() => { useDevToolsRuntimeStore.getState().close(); useDebugTelemetryStore.getState().clearEvents(); useDebugTelemetryStore.getState().clearAutomationTrace(); useDebugTelemetryStore.getState().clearRngHistory(); });
  afterEach(() => vi.useRealTimers());

  it("keeps the Dock active while the Console opens and closes", () => {
    const runtime = useDevToolsRuntimeStore.getState();
    expect(runtime.consoleOpen).toBe(false);
    expect(runtime.dockActive).toBe(false);
    runtime.openConsole();
    expect(useDevToolsRuntimeStore.getState()).toMatchObject({ consoleOpen: true, dockActive: false });
    useDevToolsRuntimeStore.getState().activateDockAndCloseConsole();
    useDevToolsRuntimeStore.getState().openConsole();
    expect(useDevToolsRuntimeStore.getState()).toMatchObject({ consoleOpen: true, dockActive: true, visualMode: "console-with-dock" });
    useDevToolsRuntimeStore.getState().closeConsole();
    expect(useDevToolsRuntimeStore.getState()).toMatchObject({ consoleOpen: false, dockActive: true });
    useDevToolsRuntimeStore.getState().closeDock();
    expect(useDevToolsRuntimeStore.getState().dockActive).toBe(false);
  });

  it("batches telemetry and keeps all three buffers bounded", () => {
    vi.useFakeTimers();
    const telemetry = useDebugTelemetryStore.getState();
    for (let index = 0; index < 600; index += 1) telemetry.recordEvent({ text: "event", type: "system", eventType: "damageDealt", sequence: index });
    for (let index = 0; index < 150; index += 1) telemetry.recordAutomationTrace({ ruleId: `rule-${index}`, priority: index, actionId: "test", enabled: true, conditions: [], result: "skipped" });
    for (let index = 0; index < 150; index += 1) telemetry.recordRoll({ id: index, kind: "test", value: .5, source: "normal", at: index });
    expect(useDebugTelemetryStore.getState().events).toHaveLength(0);
    vi.advanceTimersByTime(100);
    expect(useDebugTelemetryStore.getState().events).toHaveLength(DEBUG_EVENT_BUFFER_LIMIT);
    expect(useDebugTelemetryStore.getState().automationEvaluations).toHaveLength(DEBUG_AUTOMATION_BUFFER_LIMIT);
    expect(useDebugTelemetryStore.getState().rngHistory).toHaveLength(DEBUG_RNG_BUFFER_LIMIT);
  });

  it("registers every current Combat stat and resistance exactly once", () => {
    const ids = DEBUG_STAT_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const key of COMBAT_STAT_KEYS) expect(ids).toContain(key);
    for (const damageType of RESISTANCE_DAMAGE_TYPES) expect(ids).toContain(`resistance:${damageType}`);
    expect(ids).not.toContain("resistance:true");
  });

  it("accepts a real 10x time scale", () => {
    useDevToolsRuntimeStore.getState().setTimeScale(10);
    expect(useDevToolsRuntimeStore.getState().timeScale).toBe(10);
    useDevToolsRuntimeStore.getState().setTimeScale(50);
    expect(useDevToolsRuntimeStore.getState().timeScale).toBe(10);
  });
});

