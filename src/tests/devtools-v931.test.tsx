import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../app/components/tooltip/TooltipProvider";
import { DebugCombatTab } from "../app/debug/admin/tabs/DebugCombatTab";
import { DebugAdminPanel } from "../app/debug/admin/DebugAdminPanel";
import { DevToolsHost } from "../app/debug/devtools/DevToolsHost";
import { DEVTOOLS_PREFERENCES_KEY } from "../app/debug/devtools/devToolsPreferences";
import { CombatDebugDock } from "../app/debug/devtools/dock/CombatDebugDock";
import { useDevToolsRuntimeStore } from "../app/debug/devtools/devToolsRuntimeStore";
import { useGameStore } from "../state/gameStore";

describe("Developer Toolkit V9.3.1 selector stability", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let previousPreferences: string | null;

  beforeEach(() => {
    cleanup();
    previousPreferences = localStorage.getItem(DEVTOOLS_PREFERENCES_KEY);
    useGameStore.getState().resetGameplay();
    useDevToolsRuntimeStore.setState({
      consoleOpen: false,
      dockActive: false,
      lastConsoleTab: "overview",
      expandedSections: ["time", "player", "enemy"],
    });
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    consoleError.mockRestore();
    if (previousPreferences === null) localStorage.removeItem(DEVTOOLS_PREFERENCES_KEY);
    else localStorage.setItem(DEVTOOLS_PREFERENCES_KEY, previousPreferences);
  });

  it("opens the remembered Combat console tab safely with no selected enemy", () => {
    localStorage.setItem(DEVTOOLS_PREFERENCES_KEY, JSON.stringify({ lastConsoleTab: "combat" }));
    useDevToolsRuntimeStore.setState({ lastConsoleTab: "combat" });
    useDevToolsRuntimeStore.getState().openConsole();

    render(<TooltipProvider><DevToolsHost /></TooltipProvider>);

    expect(screen.getByText("LIVE COMBAT STATE")).toBeInTheDocument();
    expect(selectorErrors(consoleError)).toHaveLength(0);
  });

  it("switches from Overview to Combat safely with no selected enemy", () => {
    useDevToolsRuntimeStore.getState().openConsole();

    render(<TooltipProvider><DebugAdminPanel onClose={() => undefined} /></TooltipProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Combat" }));

    expect(screen.getByText("LIVE COMBAT STATE")).toBeInTheDocument();
    expect(selectorErrors(consoleError)).toHaveLength(0);
  });

  it("opens Dock Effects safely with no selected enemy", () => {
    useDevToolsRuntimeStore.setState({ dockActive: true, expandedSections: ["time", "player", "enemy"] });

    render(<TooltipProvider><CombatDebugDock /></TooltipProvider>);
    const effectsSection = document.querySelector('[data-debug-section="effects"]');
    expect(effectsSection).not.toBeNull();
    fireEvent.click(effectsSection!.querySelector(".debug-dock-section-header")!);

    expect(screen.getByLabelText("Search effects")).toBeInTheDocument();
    expect(selectorErrors(consoleError)).toHaveLength(0);
  });

  it("keeps an isolated DevToolsHost safe when no outer TooltipProvider exists", () => {
    useDevToolsRuntimeStore.setState({ dockActive: true });
    render(<DevToolsHost />);
    expect(screen.getByText("COMBAT DEBUG")).toBeInTheDocument();
    expect(selectorErrors(consoleError)).toHaveLength(0);
  });
});

function selectorErrors(consoleError: { mock: { calls: unknown[][] } }) {
  return consoleError.mock.calls.filter(([message]) => /Maximum update depth exceeded|The result of getSnapshot should be cached/.test(String(message)));
}
