import { CombatDebugDock } from "./dock/CombatDebugDock";
import { useDevToolsRuntimeStore } from "./devToolsRuntimeStore";
import { DebugAdminPanel } from "../admin/DebugAdminPanel";

export function DevToolsHost() {
  const consoleOpen = useDevToolsRuntimeStore((state) => state.consoleOpen);
  const dockActive = useDevToolsRuntimeStore((state) => state.dockActive);
  const closeConsole = useDevToolsRuntimeStore((state) => state.closeConsole);
  const activateDockAndCloseConsole = useDevToolsRuntimeStore((state) => state.activateDockAndCloseConsole);
  if (!import.meta.env.DEV || (!consoleOpen && !dockActive)) return null;
  return <div data-debug-kind="devtools-host" data-debug-console-open={consoleOpen} data-debug-dock-active={dockActive}>
    {dockActive && <CombatDebugDock />}
    {consoleOpen && <DebugAdminPanel onClose={closeConsole} onDock={activateDockAndCloseConsole} dockActive={dockActive} />}
  </div>;
}
