import type { ReactNode } from "react";

export function DebugButton({ children, onClick, action, danger = false, disabled = false }: { children: ReactNode; onClick: () => void; action: string; danger?: boolean; disabled?: boolean }) {
  return <button type="button" className={`button ${danger ? "button-danger" : "button-ghost"}`} onClick={onClick} disabled={disabled} data-debug-kind="debug-action" data-debug-action={action}>{children}</button>;
}
