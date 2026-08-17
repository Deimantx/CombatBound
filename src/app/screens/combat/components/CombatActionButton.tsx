import type { ReactNode } from "react";

export function CombatActionButton({ icon, title, detail, disabled, className = "", onClick, debugKind, debugId, debugLabel, cooldown = 0, cooldownTotal = 0 }: { icon: ReactNode; title: string; detail: string; disabled?: boolean; className?: string; onClick?: () => void; debugKind: string; debugId?: string; debugLabel?: string; cooldown?: number; cooldownTotal?: number }) {
  const cooldownPercent = cooldownTotal > 0 ? Math.min(100, Math.max(0, (cooldown / cooldownTotal) * 100)) : 0;
  return <button className={`spell-button ${className}`} onClick={onClick} disabled={disabled} data-debug-kind={debugKind} data-debug-action-id={debugId} data-debug-label={debugLabel ?? title}><span className="combat-action-button-icon">{icon}</span><span><strong>{title}</strong><small>{detail}</small></span>{cooldown > 0 && <span className="combat-action-cooldown" aria-hidden="true"><span style={{ width: `${cooldownPercent}%` }} /></span>}</button>;
}
