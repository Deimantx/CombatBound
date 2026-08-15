import type { ReactNode } from "react";

export function DebugButton({ children, onClick, action, danger = false }: { children: ReactNode; onClick: () => void; action: string; danger?: boolean }) {
  return <button type="button" className={`button ${danger ? "button-danger" : "button-ghost"}`} onClick={onClick} data-debug-kind="debug-action" data-debug-action={action}>{children}</button>;
}
