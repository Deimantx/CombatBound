import { CombatDebugDock } from "./dock/CombatDebugDock";
import { useDevToolsRuntimeStore } from "./devToolsRuntimeStore";
import { DebugAdminPanel } from "../admin/DebugAdminPanel";

export function DevToolsHost() {
  const mode = useDevToolsRuntimeStore((state) => state.mode);
  const close = useDevToolsRuntimeStore((state) => state.close);
  const openDock = useDevToolsRuntimeStore((state) => state.openDock);
  if (!import.meta.env.DEV || mode === "closed") return null;
  return <div data-debug-kind="devtools-host" data-debug-mode={mode}>{mode === "console" && <DebugAdminPanel onClose={close} onDock={openDock} />}{mode === "dock" && <CombatDebugDock />}</div>;
}
