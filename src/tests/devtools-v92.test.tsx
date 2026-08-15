import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DebugSection } from "../app/debug/admin/components/DebugSection";
import { CombatDebugDock } from "../app/debug/devtools/dock/CombatDebugDock";
import { useDevToolsRuntimeStore } from "../app/debug/devtools/devToolsRuntimeStore";
import { DEFAULT_DEBUG_TAB_ORDER, normalizeDebugTabOrder, reorderDebugTabs } from "../app/debug/admin/debugTabs";
import { useDebugTelemetryStore } from "../app/debug/telemetry/debugTelemetryStore";
import { buildStatBreakdownTooltip } from "../game/presentation/debugStatTooltip";
import { DEBUG_STAT_DEFINITIONS } from "../game/presentation/debugStatRegistry";

describe("Developer Toolkit V9.2 hotfixes", () => {
  beforeEach(() => {
    useDevToolsRuntimeStore.getState().close();
    useDevToolsRuntimeStore.setState({ expandedSections: ["automation", "events"] });
    useDebugTelemetryStore.getState().clearEvents();
    useDebugTelemetryStore.getState().clearAutomationTrace();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("mounts the Dock with populated telemetry without destabilized selector updates", () => {
    vi.useFakeTimers();
    const telemetry = useDebugTelemetryStore.getState();
    telemetry.recordEvent({ text: "damage", type: "system", eventType: "damageDealt" });
    telemetry.recordAutomationTrace({ ruleId: "rule.test", priority: 1, actionId: "action.test", enabled: true, conditions: [{ type: "always", passed: true }], result: "executed" });
    vi.advanceTimersByTime(100);
    render(<><div data-testid="game-content">game</div><CombatDebugDock /></>);
    expect(screen.getByTestId("game-content")).toBeInTheDocument();
    expect(document.querySelector('[data-debug-kind="combat-debug-dock"]')).toBeInTheDocument();
    expect(screen.getByText(/damageDealt/)).toBeInTheDocument();
  });

  it("normalizes and reorders persisted Debug tabs", () => {
    expect(normalizeDebugTabOrder(["combat", "combat", "old-removed-tab", "stats"])).toEqual(["combat", "stats", ...DEFAULT_DEBUG_TAB_ORDER.filter((id) => id !== "combat" && id !== "stats")]);
    expect(reorderDebugTabs(["overview", "player", "combat", "stats"], "combat", "overview", "before")).toEqual(["combat", "overview", "player", "stats", ...DEFAULT_DEBUG_TAB_ORDER.filter((id) => !["overview", "player", "combat", "stats"].includes(id))]);
    expect(reorderDebugTabs(["overview", "player", "combat", "stats"], "combat", "stats", "after")).toEqual(["overview", "player", "stats", "combat", ...DEFAULT_DEBUG_TAB_ORDER.filter((id) => !["overview", "player", "combat", "stats"].includes(id))]);
  });

  it("uses the shared chevron for DebugSection disclosure", () => {
    function Harness() {
      return <DebugSection title="Test Section" collapsible open={false} onToggle={() => undefined}><span>hidden content</span></DebugSection>;
    }
    render(<Harness />);
    const button = screen.getByRole("button", { name: "Test Section" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("EXPAND")).not.toBeInTheDocument();
    expect(screen.queryByText("hidden content")).not.toBeInTheDocument();
  });

  it("builds bounded stat tooltips from the same breakdown", () => {
    const definition = DEBUG_STAT_DEFINITIONS.find((entry) => entry.id === "accuracyRating")!;
    const tooltip = buildStatBreakdownTooltip(definition, { stat: definition.id, mode: "build", finalValue: 82, contributions: [
      { stat: definition.id, sourceType: "base", sourceId: "base", sourceLabel: "Combat Base", operation: "flat", before: 0, value: 20, after: 20, amount: 20, label: "Combat Base" },
      { stat: definition.id, sourceType: "stance", sourceId: "stance.high", sourceLabel: "High Stance", operation: "more", before: 20, value: 4, after: 24, amount: 4, label: "High Stance" },
    ] });
    expect(tooltip.rows?.map((row) => row.value)).toEqual(["82", "+20", "×1.20"]);
    expect(tooltip.notes).toContain("Click for full breakdown.");
  });
});
