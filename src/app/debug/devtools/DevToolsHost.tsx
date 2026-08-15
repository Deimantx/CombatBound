import { CombatDebugDock } from "./dock/CombatDebugDock";
import { useDevToolsRuntimeStore } from "./devToolsRuntimeStore";
import { DebugAdminPanel } from "../admin/DebugAdminPanel";
import { DevToolsErrorBoundary } from "./DevToolsErrorBoundary";
import { TooltipProvider } from "../../components/tooltip/TooltipProvider";

export function DevToolsHost() {
  const consoleOpen = useDevToolsRuntimeStore((state) => state.consoleOpen);
  const dockActive = useDevToolsRuntimeStore((state) => state.dockActive);
  const closeConsole = useDevToolsRuntimeStore((state) => state.closeConsole);
  const closeDock = useDevToolsRuntimeStore((state) => state.closeDock);
  const activateDockAndCloseConsole = useDevToolsRuntimeStore((state) => state.activateDockAndCloseConsole);
  if (!import.meta.env.DEV || (!consoleOpen && !dockActive)) return null;
  return <TooltipProvider><div data-debug-kind="devtools-host" data-debug-console-open={consoleOpen} data-debug-dock-active={dockActive}>
    {dockActive && <DevToolsErrorBoundary kind="dock" onClose={closeDock}><CombatDebugDock /></DevToolsErrorBoundary>}
    {consoleOpen && <DevToolsErrorBoundary kind="console" onClose={closeConsole}><DebugAdminPanel onClose={closeConsole} onDock={activateDockAndCloseConsole} dockActive={dockActive} /></DevToolsErrorBoundary>}
  </div></TooltipProvider>;
}
